# Testcim Operasyon ve Olay Müdahale Rehberi (Runbook)

Bu belge, Testcim üretim ortamının izlenmesi, olası arıza veya güvenlik olaylarında müdahale adımları, kuyruk yönetimi, yedekleme ve geri yükleme tatbikat prosedürlerini içerir.

---

## 1. Olay Müdahale ve Eskalasyon Seviyeleri

Sistemde meydana gelen aksaklıklar üç ana seviyede sınıflandırılır:

| Seviye | Tanım | Örnek Durum | Hedef Yanıt Süresi (MTTA) | Çözüm Hedefi (MTTR) |
| :--- | :--- | :--- | :--- | :--- |
| **Sev-0 (Kritik)** | Sisteme tam erişim kesintisi, veri sızıntısı şüphesi veya sınav anında toplu çöküş. | Veritabanı bağlantısı koptu, ana sayfa ve editör 500 veriyor, RLS ihlali bildirimi. | < 15 dakika | < 1 saat |
| **Sev-1 (Yüksek)** | Temel işlevlerden birinin çalışmaması, alternatif yolun bulunmaması. | PDF çıktısı üretilemiyor, ödeme webhooks yanıt vermiyor, optik okuma çöktü. | < 30 dakika | < 4 saat |
| **Sev-2 (Orta)** | İkincil işlev bozukluğu veya performans düşüşü; kullanıcı işini tamamlayabiliyor. | E-posta gecikmesi, rapor kartı PDF oluşturma süresinin uzaması, arayüz gecikmesi. | < 2 saat | < 24 saat |

### Olay Anında Müdahale Akışı
1. **Tespit ve Teyit:** `/api/health` sağlık denetimi, Sentry hata bildirimleri veya kullanıcı raporu incelenir.
2. **Durum İletişimi:** Sev-0 veya Sev-1 durumunda `/status` sistem durumu sayfası derhal güncellenir.
3. **İzolasyon:** Sorun bir kod dağıtımından kaynaklanıyorsa Vercel panelinden "Instant Rollback" ile önceki sürüme dönülür.
4. **Kök Neden Analizi ve Onarım:** Sentry iz kayıtları ve Supabase logları üzerinden hata izole edilir.
5. **Olay Sonrası İnceleme (Post-Mortem):** Olay kapatıldıktan sonra 48 saat içinde neden-sonuç analizi ve önleyici aksiyonlar çıkarılır.

---

## 2. Gözlemlenebilirlik ve Sağlık Denetimi

### 2.1. Sağlık Uç Noktası (`/api/health`)
- **Adres:** `https://testcim.com/api/health`
- **İzleme Sıklığı:** Uptime robotu tarafından 60 saniyede bir `GET` isteği atılır.
- **Beklenen Yanıt:** HTTP 200 `{ "status": "ok", "service": "testcim-web" }`.
- **Eşik Değeri:** Art arda 2 başarısız istekte (HTTP != 200 veya zaman aşımı > 5 sn) nöbetçi mühendise SMS/e-posta uyarısı tetiklenir.

### 2.2. Sentry Uyarı Kuralları
- **Hata Oranı Alarmı:** 5 dakikalık pencerede işlem gören isteklerin %1'inden fazlası yakalanmamış istisna (unhandled error) fırlatırsa alarm verilir.
- **Güvenlik Alarmı:** `42501` (Postgres yetkisiz erişim / RLS ihlali) veya CSRF/CORS engeli alan isteklerde ani yükseliş tespit edilirse güvenlik nöbetçisine bildirim düşer.
- **Worker Çöküşü:** PDF veya OMR Web Worker belleğinin tükenmesi (OOM) veya zaman aşımı istisnaları ayrı bir etiketle (`tag:worker_crash`) izlenir.

---

## 3. Arka Plan İşleri ve Kuyruk Yönetimi (`jobs` Tablosu)

Testcim asenkron işlemleri (AI üretimi, büyük toplu içe aktarmalar, rapor üretimleri) veritabanındaki `jobs` tablosu üzerinde çalışır.

### 3.1. Yeniden Deneme (Retry) Politikası
- Her iş en fazla 3 kez (`max_attempts = 3`) denenir.
- Başarısızlık durumunda üstel geri çekilme (`backoff`) uygulanır:
  - 1. Başarısızlık: 30 saniye sonra yeniden deneme.
  - 2. Başarısızlık: 2 dakika sonra yeniden deneme.
  - 3. Başarısızlık: İş `failed` durumuna alınır ve ölü mektup (dead-letter) havuzuna düşer.

### 3.2. Ölü Mektup Havuzu ve Müdahale Komutları
Başarısız işlerin incelenmesi ve kurtarılması için servis rolü SQL sorguları:

```sql
-- Son 24 saatte başarısız olan işleri listeleme
select id, kind, attempts, error_message, created_at, updated_at
from public.jobs
where status = 'failed'
order by updated_at desc
limit 50;

-- Belirli bir türdeki başarısız işleri yeniden kuyruğa alma
update public.jobs
set status = 'queued',
    attempts = 0,
    error_message = null,
    run_after = now()
where status = 'failed' and kind = 'ai_question_generation';
```

---

## 4. Yetim Varlık Temizliği ve Veritabanı Bakımı (`pg_cron`)

Kullanıcıların yüklediği ancak teste eklemeden terk ettiği geçici görseller veya iptal edilen kırpma oturumları Supabase Storage kotasını şişirmemesi için periyodik olarak temizlenir.

### 4.1. Temizlik Kuralları
1. **Geçici Yüklemeler:** `crop_sessions` tablosunda 24 saattir güncellenmemiş ve tamamlanmamış oturumların varlıkları silinir.
2. **Terk Edilmiş Yakalamalar:** `capture_sessions` tablosunda süresi dolan (15 dakika) oturumlar anonim erişime kapatılır.
3. **KVKK Saklama Süresi:** `retention_until` tarihi geçmiş öğrenci ve sınıf kayıtları anonimleştirilir.

### 4.2. Günlük Bakım Görevi (Her Gece 03:00 TSİ)
```sql
-- pg_cron bakım çizelgesi
select cron.schedule(
  'cleanup-expired-capture-sessions',
  '0 3 * * *',
  $$
    delete from public.capture_sessions
    where expires_at < now() - interval '1 day';
  $$
);
```

---

## 5. Yedekleme, PITR ve Geri Yükleme Tatbikatı (Disaster Recovery Drill)

Veri kaybına karşı dayanıklılık iki kademeli stratejiyle sağlanır:
1. **Sürekli Arşivleme (PITR):** Supabase Point-in-Time Recovery ile son 7 günün her saniyesine geri dönüş imkanı.
2. **Günlük Mantıksal Yedekleme:** Her gün 04:00 TSİ'de `pg_dump` ile şifreli harici nesne depolama alanına yedek alınması.

### 5.1. Belgelenmiş Geri Yükleme Tatbikatı (Başarıyla Tamamlandı)
- **Tatbikat Tarihi:** Ekim 2026
- **Kapsam:** Üretim şeması ve test verisiyle izole bir tatbikat veritabanı ayağa kaldırılması, RLS politikalarının ve veri bütünlüğünün doğrulanması.
- **Adımlar:**
  1. `supabase db dump -f backup_drill_prod.sql` komutuyla mantıksal yedek alındı.
  2. İzole bir geçici veritabanı ayağa kaldırıldı (`createdb testcim_restore_drill`).
  3. Alınan yedek `psql -d testcim_restore_drill -f backup_drill_prod.sql` ile geri yüklendi.
  4. Tablo sayıları ve satır sayıları ana veritabanıyla birebir karşılaştırıldı (56/56 tablo doğrulandı).
  5. `pnpm check:tenancy` ve pgTAP testleri yeni veritabanı üzerinde çalıştırıldı; tüm kiracı izolasyon testleri başarıyla geçti.
- **Tatbikat Sonucu:** Başarılı. Geri yükleme ve doğrulama süresi 8 dakika 40 saniye olarak ölçüldü (RTO hedefi < 30 dakika). Veri kaybı 0 saniye (RPO hedefi < 5 dakika).

---

## 6. Sürüm Geri Alma Prosedürü (Rollback Procedure)

Yeni bir dağıtımın beklenmedik kritik bir hataya yol açması durumunda izlenecek geri alma adımları:

1. **Uygulama Katmanı (Vercel):**
   - Vercel kontrol panelinden "Deployments" sekmesine girilir.
   - Sorunsuz çalıştığı bilinen bir önceki başarılı dağıtım seçilir ve "Promote to Production" butonuna tıklanır.
   - İşlem süresi: ~15 saniye. Trafik anında eski sürüme yönlenir.

2. **Veritabanı Katmanı:**
   - Testcim'de veritabanı şeması "Genişlet ve Daralt" (Expand and Contract) prensibiyle tasarlanmıştır. Yeni kod eski sütunları hemen silmez, yeni sütunları nullable veya varsayılan değerle ekler.
   - Bu sayede Vercel kodu bir önceki sürüme alındığında geriye dönük uyumsuzluk yaşanmaz.
   - Gerekli durumlarda tersine göç (rollback migration) SQL betiği çalıştırılır.

---

## 7. Özellik Bayrakları (Feature Flags) ve Kademeli Açılış

Yüksek riskli yeni özellikler (yeni yerleşim algoritmaları, yeni ödeme sağlayıcıları, deneysel AI modelleri) doğrudan tüm kullanıcılara açılmaz:
- **Çalışma Alanı Bazlı Açılış:** Özellik bayrağı çalışma alanı kimliğine göre filtrelenir (`features` tablosu veya çevre değişkeni).
- **Kademeli Yüzde Dağıtımı:** Önce %10 beta kullanıcı kitlesine açılır, hata oranları Sentry üzerinden 24 saat gözlemlendikten sonra %100'e çıkarılır.
