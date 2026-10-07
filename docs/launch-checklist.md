# Testcim Genel Yayın Kontrol Listesi (Launch Checklist)

Bu belge, Testcim platformunun kapalı betadan genel yayına (public release) geçiş sürecinde tamamlanması gereken teknik, operasyonel, altyapı ve hukuki kontrol adımlarını içerir.

---

## 1. Alan Adı, DNS ve Ağ Güvenliği

| Kontrol Maddesi | Beklenen Durum | Sorumlu | Durum |
| :--- | :--- | :--- | :--- |
| **DNS Yönlendirmeleri** | `testcim.com` ve `www.testcim.com` CNAME/A kayıtları Vercel Anycast ağına yönlendirilmiş olmalıdır. | DevOps | Beklemede |
| **SSL/TLS Sertifikası** | TLS 1.3 zorunlu, TLS 1.0 ve 1.1 devre dışı. Otomatik yenilenen Let's Encrypt sertifikası devrede olmalıdır. | DevOps | Doğrulanmadı |
| **HSTS ve Güvenlik Başlıkları** | `max-age=63072000; includeSubDomains; preload` ve nosniff/DENY başlıkları devrede olmalıdır. | Kod Tabanı | Tamamlandı |
| **Dinamik CSP Nonce** | Next.js middleware katmanında her istek için 128-bit kriptografik nonce üretilmeli ve CSP başlığına enjekte edilmelidir. | Kod Tabanı | Tamamlandı |

---

## 2. E-posta İletimi ve Doğrulama (SPF / DKIM / DMARC)

| Kontrol Maddesi | Beklenen Durum | Sorumlu | Durum |
| :--- | :--- | :--- | :--- |
| **E-posta Servis Sağlayıcısı** | İşlemsel e-postalar (OTP giriş, hesap doğrulama, fatura) Resend üzerinden gönderilmelidir. | Backend | Beklemede |
| **SPF Kaydı** | `v=spf1 include:amazonses.com ~all` (veya ilgili sağlayıcı kaydı) DNS'e işlenmiş olmalıdır. | DevOps | Beklemede |
| **DKIM İmzası** | 2048-bit CNAME DKIM kayıtları doğrulanmış olmalıdır. | DevOps | Beklemede |
| **DMARC Politikası** | `v=DMARC1; p=reject; rua=mailto:dmarc-reports@testcim.com` politikası tanımlanmış olmalıdır. | DevOps | Beklemede |

---

## 3. Supabase Üretim Veritabanı ve Depolama

| Kontrol Maddesi | Beklenen Durum | Sorumlu | Durum |
| :--- | :--- | :--- | :--- |
| **Veri Merkezi Konumu** | Türkiye'ye en düşük gecikmeyi sağlayan `eu-central-1` (Frankfurt) seçilmiş olmalıdır. | Altyapı | Doğrulanmadı |
| **Bağlantı Havuzu (PgBouncer)** | Transaction pooler modu aktif olmalı; 300 eşzamanlı sınav kullanıcısı bağlantı havuzunu aşmamalıdır. | Altyapı | Doğrulanmadı |
| **RLS ve Kiracı İzolasyonu** | Tüm kiracı tablolarında (45/45) RLS aktif olmalı ve çapraz kiracı pgTAP testleri geçmelidir. Testlerin varlığı `pnpm check:tenancy` ile doğrulanıyor; pgTAP bu ortamda çalıştırılamadı. | Kod Tabanı | Kısmen (pgTAP çalıştırılmadı) |
| **PITR (Point-in-Time Recovery)** | 7 günlük sürekli yedekleme ve kurtarma mekanizması aktif olmalıdır. | Altyapı | Doğrulanmadı |
| **Depolama (Storage) Kotaları** | Varlıklar için dosya boyutu sınırı (görseller 10MB, PDF 50MB) ve imzalı URL süreleri (15 dk) devrede olmalıdır. | Kod Tabanı | Tamamlandı |

---

## 4. Vercel Üretim ve Çalışma Zamanı

| Kontrol Maddesi | Beklenen Durum | Sorumlu | Durum |
| :--- | :--- | :--- | :--- |
| **Çevre Değişkenleri** | Üretim anahtarları Vercel Secrets üzerinden tanımlanmalı, hiçbir `.env` dosyası repoda yer almamalıdır. | DevOps | Doğrulanmadı |
| **Servis Rolü İzolasyonu** | `SUPABASE_SERVICE_ROLE_KEY` yalnızca sunucu ortamında tanımlı olmalı, istemci paketlerine sızmamalıdır. | Güvenlik | Tamamlandı |
| **Bölge (Region)** | Vercel Serverless Functions bölgesi `fra1` (Frankfurt) olarak ayarlanmalıdır. | DevOps | Doğrulanmadı |
| **Paket Boyutu Bütçesi** | `pnpm check:budget` CI kapısında yeşil olmalıdır. | CI/CD | Tamamlandı |

---

## 5. Ödeme ve Faturalandırma Canlı Modu

| Kontrol Maddesi | Beklenen Durum | Sorumlu | Durum |
| :--- | :--- | :--- | :--- |
| **Canlı API Anahtarları** | İyzico / Paddle canlı üretim kimlik bilgileri sisteme girilmelidir. | Finans / Dev | Beklemede |
| **Webhook İmzası Doğrulaması** | Sağlayıcıdan gelen webhook istekleri HMAC-SHA256 imzası doğrulanmadan işlenmemelidir. | Kod Tabanı | Tamamlandı |
| **Test Kartı Kontrolü** | Canlı ortamda test ödeme anahtarlarının ve sahte kartların engellendiği doğrulanmalıdır. | Finans | Beklemede |
| **E-Arşiv / Fatura Bilgileri** | Kurumsal fatura alanları (`billing_profiles`) vergi numarası ve dairesi doğrulamasıyla saklanmalıdır. | Kod Tabanı | Tamamlandı |

---

## 6. Gözlemlenebilirlik ve Destek Kanalları

| Kontrol Maddesi | Beklenen Durum | Sorumlu | Durum |
| :--- | :--- | :--- | :--- |
| **Sentry Hata İzleme** | İstemci ve sunucu hataları kaynak haritaları yüklenerek (`sourcemaps`) canlı ortamda izlenmelidir. | Frontend | Doğrulanmadı |
| **Sistem Durumu Sayfası** | `/status` sayfası tüm temel servislerin durumunu ziyaretçilere yansıtmalıdır. | Ürün | Tamamlandı |
| **Sürüm Notları Sayfası** | `/changelog` sayfası genel yayın sürüm yeniliklerini listelemelidir. | Ürün | Tamamlandı |
| **Destek E-postası** | `destek@testcim.com` gelen kutusu açılmış, yönlendirmeleri test edilmiş olmalıdır. | Operasyon | Beklemede |
| **Geri Bildirim Kanalı** | Uygulama içi iletişim formu (`/contact`) ve hata bildirimi çalışır durumda olmalıdır. | Frontend | Tamamlandı |

---

## 7. KVKK ve Hukuki Hazırlık Kontrol Listesi

> [!IMPORTANT]
> Aşağıdaki liste, Testcim'in veri işleme ve yasal süreçlerini düzenlemek üzere **hukuk müşavirliği / şirket avukatı incelemesine sunulacak kontrol maddeleridir**. Bu maddeler hukuki uygunluk veya onay iddiası taşımamaktadır.

- [ ] **Kişisel Veri Envanteri:** Öğretmen hesap bilgileri, öğrenci ad-soyad ve okul numarası verilerinin işleme amaçları, hukuki sebepleri ve saklama süreleri belgelenmiştir.
- [ ] **Öğrenci Verisi Korunumu:** Öğrenci kimlik bilgileri veli izni veya okul sözleşmesi kapsamında işlenmektedir; platform üzerinden üçüncü taraflara pazarlama amacıyla aktarılmaz.
- [ ] **Alt Veri İşleyenler (Sub-processors) Listesi:**
  - Supabase Inc. (Veritabanı ve Depolama - Almanya Veri Merkezi)
  - Vercel Inc. (Uygulama Dağıtımı ve Sunucusuz Fonksiyonlar)
  - Resend Inc. / AWS SES (İşlemsel E-posta Gönderimi)
  - Functional Software Inc. / Sentry (Hata ve Performans İzleme)
  - İyzico / Paddle (Ödeme Hizmeti Sağlayıcısı)
  - PostHog Inc. (Yalnızca çerez izni alındığında anonim ürün analitiği)
  - Anthropic / OpenAI (Yapay zekâ destekli soru üretimi - Kullanıcı verisi model eğitiminde kullanılmaz)
- [ ] **Veri Sahibi Hakları (KVKK Madde 11):** Kullanıcıların verilerini dışa aktarma (JSON dökümü) ve hesaplarını tüm ilişkili verileriyle birlikte kalıcı olarak silme hakkı sistemde kodlanmıştır (`/settings/account`).
- [ ] **Çerez Onay Mekanizması:** Analitik çerezler (`posthog-js`) kullanıcı açık onay vermedikçe yüklenmez ve çalıştırılmaz.
- [ ] **Telif Hakkı Bildirim ve Kaldırma Süreci (Notice-and-Takedown):** Hak sahiplerinin ihlal bildirimi yapabileceği form (`/copyright`) ve bildirimlerin incelenme süreci hazırdır.
- [ ] **Yapay Zekâ ve İçerik Şartları:** Kullanım koşullarında, öğretmenlerin girdiği soruların ve içeriklerin üçüncü taraf yapay zekâ modellerinin genel eğitiminde kullanılmadığı açıkça belirtilmiştir.

---

## 8. Yayın Kararı ve Önerisi (Go / No-Go)

- **Teknik Karar:** **HAYIR (henüz değil)**. Aşağıdaki koşullar kapanmadan genel yayın önerilmez.
- **Koşullar:**
  1. Geri yükleme tatbikatının yapılıp `docs/runbook.md` bölüm 5.1 tablosuna kaydedilmesi.
  2. `pnpm db:test` (pgTAP) çıktısının yeşil olarak alınması.
  3. Yük testi (300 sınav katılımcısı, 50 editör: `loadtest/exam.js` ve `loadtest/editor.js` hazır, k6 ile bir hazırlık ortamında çalıştırılacak) ve eksik E2E akışlarının (kayıt, optik, ödeme test modu) tamamlanması. Erişilebilirlik (axe) taraması yapıldı: 14 genel ve 9 oturum açık sayfa temiz.
  4. (Yapıldı) Özellik bayrağı altyapısı kuruldu, bkz. `docs/runbook.md` bölüm 7.
  5. Hukuki metinlerin şirket avukatı tarafından hazırlanıp onaylanması.
  6. DNS SPF/DKIM/DMARC kayıtlarının canlı etki alanında doğrulanması.
  7. İyzico/Paddle canlı mağaza anahtarlarının Vercel ortam değişkenlerine girilmesi.
