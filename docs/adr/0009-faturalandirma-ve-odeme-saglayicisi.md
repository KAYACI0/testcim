# ADR 0009: Faturalandırma Mimarisi ve Ödeme Sağlayıcısı Seçimi

## Durum

Kabul edildi (Prompt 13, Dilim 13).

## Bağlam

Testcim, öğretmenler ve eğitim kurumları için aylık ve yıllık abonelik planları sunar (Ücretsiz, Plus, Pro, Kurum). docs/01 bölüm 6 ve docs/02 bölüm 5.6 uyarınca:
1. Plan sınırları kodda değil, veritabanında (`plans.entitlements`) saklanır.
2. Kart bilgileri asla uygulamamızın sunucusuna uğramaz; kullanıcı sağlayıcı tarafından barındırılan ödeme sayfasına yönlendirilir (PCI DSS kapsamı dışında kalma).
3. Ödeme sağlayıcısının onayladığı webhook olayları abonelik durumunu güncelleyen tek kaynaktır.

Prompt 13 kapsamında ödeme sağlayıcıları değerlendirilmiş ve entegrasyon mimarisi tasarlanmıştır.

## Ödeme Sağlayıcıları Değerlendirmesi

### 1. iyzico (Abonelik / Recurring) - Türkiye Birincil Seçeneği
- **Artıları:** Türkiye'deki yerel kredi ve banka kartlarıyla (Troy, yerli bankalar, debit kartlar) en yüksek ödeme başarı oranı; TRY cinsinden komisyon ve yerel mevzuata tam uyum; abonelik (tekrarlayan ödeme) API'si mevcut.
- **Eksileri:** iyzico bir "Merchant of Record (MoR)" değildir; yalnızca ödeme ağ geçididir. Bu nedenle her tahsilatta müşteriye e-Arşiv / e-Fatura kesme yükümlülüğü Testcim'e aittir. Kurumsal hesap onayı ve Türkiye'de vergi levhalı bir şirket (şahıs veya sermaye şirketi) gerektirir.
- **Webhook Güvenliği:** İstek gövdesi üzerinde HMAC-SHA256 imzası (`x-iyzico-signature`).

### 2. Paddle / Lemon Squeezy (Merchant of Record - MoR) - Küresel Alternatif
- **Artıları:** Fatura ve KDV/vergi yükümlülüğünü doğrudan üstlenir (MoR); kullanıcıya faturayı Paddle/Lemon Squeezy keser. Global satış ve yurt dışı kartlar için idealdir.
- **Eksileri:** Türkiye'deki yerel kartlarda (özellikle Troy ve bazı kamu bankası debit kartlarında) 3D Secure / yerel kısıtlar nedeniyle ret oranı yüksektir; ödeme para birimi dönüşümünde ek komisyonlar doğabilir; para çekimlerinde yerel banka transfer gecikmeleri yaşanabilir.

### 3. PayTR
- **Artıları:** Düşük komisyon oranları ve hızlı onay süreci; yerel kart desteği güçlü.
- **Eksileri:** iyzico gibi MoR değildir; abonelik akışında kart saklama (tokenization) ve periyodik çekim API'si iyzico'ya göre daha manuel yönetim gerektirebilir.

### 4. Stripe
- Türkiye'de doğrudan şirket kaydı bulunmamaktadır. Stripe Atlas ile ABD şirketi açılmadıkça Türkiye'deki bir işletme tarafından doğrudan kullanılamaz.

## Karar

1. **Sağlayıcı Bağımsız Arayüz (`BillingProvider`):**
   `apps/web/src/features/billing/provider.ts` altında `BillingProvider` arayüzü tanımlandı.
   - `createCheckout(context)`
   - `cancel(subscription)`
   - `resume(subscription)`
   - `changePlan(subscription, next)`
   - `parseWebhook(rawBody, headers)`

2. **Tek Doğruluk Kaynağı ve İdempotent Webhook (`apply_billing_event`):**
   - Sağlayıcıdan gelen webhook, sağlayıcı adaptörünce doğrulanır ve standart `BillingEvent` şemasına dönüştürülür.
   - `apply_billing_event(p_event jsonb)` PostgreSQL RPC fonksiyonu çağrılır.
   - `billing_events` tablosunda `(provider, event_id)` tekil anahtarı ile tekrar eden istekler ("duplicate") sessizce yutulur.
   - `subscriptions.last_event_at` kontrolü ile gecikmiş / sıra dışı gelen eski olaylar ("stale") yeni abonelik durumunu ezemez.
   - Fatura bilgileri her durumda `billing_invoices` tablosuna kaydedilir.

3. **Geliştirme ve Test İçin Sahte Sağlayıcı (`createFakeProvider`):**
   - Canlı ortamda dış bağımlılık veya kart bilgisi gerektirmeksizin uçtan uca ödeme, iptal, plan değişimi ve webhook döngüsünü test eden `fake` sağlayıcı yazıldı.
   - `registry.server.ts` üretim ortamında (`NODE_ENV === 'production'`) fake sağlayıcının başlatılmasını engeller.

4. **Kullanıcı Hakları ve İçerik Koruma (Downgrade Politikası):**
   - Abonelik iptal edildiğinde mevcut içerikler, testler veya sorular asla silinmez.
   - Çalışma alanı `free` plana düşürülür; fazla koltuk geçersiz kılmaları kaldırılır; sınır aşımları arayüzde satır içi (`InlineNotice`) olarak açıklanır.

5. **Kredi Yenileme (`renew_monthly_credits`):**
   - `pg_cron` aracılığıyla her ayın 1'inde (`5 0 1 * *`) aktif ücretli planlara ait yapay zekâ kredileri sıfırlanıp yenilenir. Ücretsiz plan bir defalık deneme kredisi alır.

## Hukuki ve Mali Yol Haritası (Mali Müşavir ve Avukat ile Yapılacaklar)

Canlı ödeme açılmadan önce tamamlanması gereken adımlar:
1. **Şirket ve Vergi Kaydı:** Türkiye'de şahıs veya limited/anonim şirket kuruluşu, NACE kodunun tespiti (web portalı ve yazılım hizmetleri).
2. **KDV ve e-Fatura/e-Arşiv:** Dijital hizmet satışlarında geçerli KDV oranı (%20). Her satışta otomatik e-Arşiv fatura kesilmesi için bir entegratör (Paraşüt, KolayBi vb.) ile anlaşılması ve webhook sonrasına fatura tetikleyicisinin bağlanması.
3. **iyzico Başvurusu:** Kurumsal iyzico hesabı açılması, abonelik ürününün aktif edilmesi ve canlı API/Webhook anahtarlarının temini.
4. **Hukuki Metinler:** Avukat tarafından hazırlanacak Kullanım Koşulları, Gizlilik Politikası, KVKK Açık Rıza ve Aydınlatma Metni, Mesafeli Satış Sözleşmesi ve İptal/İade Politikası metinlerinin `/privacy`, `/terms`, `/kvkk`, `/refund` sayfalarına yerleştirilmesi.
