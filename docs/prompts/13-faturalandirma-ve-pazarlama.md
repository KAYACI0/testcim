# Prompt 13: Faturalandırma ve pazarlama sitesi

## Amaç
Plan yükseltme ve abonelik yönetimi çalışsın; herkese açık pazarlama sitesi ürünü dürüstçe ve sakin bir dille anlatsın. Açılış sayfasının kahramanı çalışan bir "yapıştır ve dene" demosu olsun.

## Önce oku
CLAUDE.md, docs/01 bölüm 6, docs/02 bölüm 5.6, docs/03 bölüm 7 (Açılış sayfası).

## Başlamadan
Plan modunda başla. **Ödeme sağlayıcısını doğrula:** iyzico'nun abonelik (recurring) ürününün güncel durumunu, webhook güvenliğini, TRY fiyatlandırmayı, e-arşiv fatura ihtiyacını resmi belgeden araştır. Uygun değilse alternatifleri (PayTR, Paddle/Lemon Squeezy gibi satıcı-kaydı modelleri, Stripe uygunluğu) artı/eksileriyle sun ve onayımı bekle. Fatura ve vergi (KDV) ayrıntılarını muhasebeciyle netleştirmem gerektiğini açıkça belirt.

## Kapsam

### A. Faturalandırma
1. `BillingProvider` arayüzü ve seçilen sağlayıcı uygulaması: ödeme sayfası/oturumu oluşturma, abonelik durumu, iptal, plan değişimi, yeniden deneme davranışı.
2. **Webhook uçları:** imza doğrulama, idempotent işleme, `subscriptions` güncelleme, olay günlüğü. Abonelik durumu tek doğruluk kaynağı; plan değişince `workspaces.plan_id` ve yetkiler anında yansır.
3. **Plan ve fatura ekranı (`/settings/billing`):** mevcut plan, sonraki yenileme, kullanım, planı değiştir/iptal, fatura geçmişi, kurumsal fatura bilgileri (unvan, vergi dairesi/numarası). Çoklu koltuk (Pro/Kurum) yönetimi.
4. **Düşürme davranışı:** plan düşünce mevcut içerik silinmez; yalnızca yeni oluşturma sınırlanır ve satır içi açıklanır.
5. **Kredi yenileme:** aylık yapay zekâ kredisi dönem başında pg_cron ile sıfırlanır/yüklenir (`credit_ledger`).
6. **Deneme ve kupon:** Plus için deneme süresi ve kupon kodu altyapısı (basit).
7. **Testler:** webhook tekrar oynatma, sıra dışı olaylar, iptal/yeniden etkinleştirme, yetki değişimi; sağlayıcıyı taklit eden sahte uygulama.

### B. Pazarlama sitesi (`apps/web` içinde herkese açık rotalar, ayrı yerleşim)
- Sayfalar: Ana sayfa, Özellikler, Fiyatlandırma, Yardım merkezi (SSS + kullanım kılavuzu), Hakkımızda, İletişim, Gizlilik, KVKK aydınlatma, Kullanım şartları, İptal ve iade, Telif bildirimi formu.
- **Ana sayfa:** kahraman alanı ürünün kendisi: "Bir görsel yapıştırın" alanı. Ziyaretçi Ctrl+V yapınca görsel gerçekten bir sınav kâğıdı önizlemesine soru olarak yerleşir (kayıtsız, yalnızca tarayıcıda, Prompt 04/05 bileşenleri yeniden kullanılır; veri sunucuya gitmez). Altında tek satır: "Kaydetmek için ücretsiz hesap açın." Başlık büyük, sade, sola hizalı. İllüstrasyon yok. Ardından özellik anlatımı: her özellik için gerçek ürün ekran görüntüsü veya çalışan mini demo (gerçek içerikle), kısa ve somut metin.
- **Fiyatlandırma:** çizgili karşılaştırma tablosu (docs/01 bölüm 6'daki yetki anahtarlarının insan diliyle ifadesi), aylık/yıllık geçişi, SSS. Fiyatlar `plans` verisinden (veya yapılandırmadan) okunur; kodda sabit yazılmaz.
- SEO: her sayfada başlık, açıklama, kanonik URL, Open Graph (metin tabanlı, üretilen sade görsel), `sitemap.xml`, `robots.txt`, yapılandırılmış veri (SoftwareApplication, FAQ). Türkçe odaklı anahtar kelimeler (ör. "online test hazırlama", "PDF'ten soru kırpma", "optik okuma") doğal metin içinde.
- Hız: pazarlama rotaları statik/ISR, editör kütüphaneleri bu rotalara yüklenmez. Hedef Lighthouse performans 95+, erişilebilirlik 100.
- Analitik: PostHog, çerez onayı arkasında; onay yoksa hiçbir izleyici yüklenmez.
- Yasal sayfalar için yer tutucu metin ve "hukuki metin bekleniyor" işareti (metinleri avukata yazdır).

## Kabul kriterleri
- Test ortamında uçtan uca yükseltme ve iptal çalışıyor; webhook yeniden oynatmada çift işlem yok.
- Ana sayfadaki demo kayıtsız çalışıyor ve veri göndermiyor (ağ trafiği testi).
- Lighthouse hedefleri sağlanıyor; docs/03 kontrol listesi sağlanıyor.
- Tümü yeşil; ekran görüntüleri ve öz eleştiri raporda.

## Yapma
- Kart bilgisi saklama veya işleme (yalnızca sağlayıcı).
- Stok fotoğraf, illüstrasyon, "mutlu öğretmen" görselleri, sahte müşteri yorumu veya uydurma istatistik.
- Gradyan, cam, büyük harf etiket, emoji.

## Bitirince
Sağlayıcı kararı ve gerekçesi, senin yapman gereken hesap, vergi ve hukuki adımlar listesi.
