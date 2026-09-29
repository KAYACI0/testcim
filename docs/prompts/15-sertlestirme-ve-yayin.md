# Prompt 15: Sertleştirme ve yayın

## Amaç
Kapalı betadan genel yayına: güvenlik, erişilebilirlik, performans, dayanıklılık, gözlemlenebilirlik ve operasyon hazırlığı.

## Önce oku
CLAUDE.md, docs/02 (tümü, özellikle 7, 8, 9), docs/01 bölüm 7 (riskler), docs/03 bölüm 8.

## Başlamadan
Plan modunda başla. Önce bağımsız bir "kırmızı takım" gözüyle depoyu incele ve bulguları önceliklendirilmiş bir rapor olarak yaz (`docs/security-review.md`); sonra düzeltmeleri planla. Onayımı bekle.

## Kapsam
1. **Güvenlik incelemesi:** RLS ve Storage politikalarının baştan sona gözden geçirilmesi (tablo başına çapraz kiracı testinin varlığını denetleyen betik); servis rolü kullanım noktalarının envanteri; Zod doğrulamasız uç taraması; SSRF, açık yönlendirme, XSS (zengin metin temizleme), CSRF (Server Actions ve rota işleyicileri), dosya yükleme kötüye kullanımı, hız sınırı boşlukları; bağımlılık açıkları (`pnpm audit`, Dependabot); gizli tarama ve push protection; CSP sıkılaştırma (nonce); anonim öğrenci uçları için yeniden tehdit modeli.
2. **Erişilebilirlik:** WCAG AA denetimi (axe otomasyonu + elle klavye/ekran okuyucu geçişi) tüm ana akışlarda; öğrenci sınav ekranı ve optik okuma için özel geçiş.
3. **Performans:** paket boyutu bütçeleri CI'da; Core Web Vitals; editör 200 soruda akıcılık; PDF/OMR Worker'ları bellek profili; görsel ve Storage okuma maliyetleri; veri tabanı sorgu planları (EXPLAIN), eksik indeksler; büyük hesaplar için yük testi (300 eşzamanlı sınav katılımcısı, 50 eşzamanlı editör).
4. **Dayanıklılık ve operasyon:** Sentry uyarı kuralları, sağlık uçları, uptime izleme, `jobs` yeniden deneme ve ölü mektup davranışı, yetim asset temizliği (pg_cron), yedekleme/PITR doğrulaması ve **geri yükleme tatbikatı**, olay müdahale rehberi (`docs/runbook.md`), özellik bayrakları ile kademeli açılış, geri alma prosedürü.
5. **KVKK ve yasal hazırlık:** veri envanteri, saklama ve silme işlerinin çalıştığının testi, hesap silme ve dışa aktarma uçtan uca, çerez onayı davranışı, alt işleyici listesi, veri işleme sözleşmesi kontrol listesi, telif bildirimi ve kaldırma sürecinin çalıştığı, kullanım şartlarında yapay zekâ ve telif maddeleri. Hukuki metinler avukat onayına gönderilecek liste olarak hazırlanır (kendin hukuki metin yazıp "hazır" deme).
6. **Kalite:** kritik akışlar için E2E paketi (kayıt, yapıştır, PDF, sınav, optik, ödeme test modu) CI'da; görsel regresyon; ölü kod ve kullanılmayan bağımlılık temizliği; `check:design` tüm depoda temiz.
7. **Beta ve yayın hazırlığı:** hata bildirimi ve geri bildirim kanalı (uygulama içi, sade), sürüm notları sayfası, durum sayfası, onboarding ölçümü (ilk PDF süresi metriği panosu), destek e-postası ve SSS güncel.
8. **Yayın kontrol listesi** (`docs/launch-checklist.md`): alan adı ve DNS, e-posta (SPF/DKIM/DMARC), Supabase üretim projesi ve ortam değişkenleri, Vercel üretim, ödeme canlı mod, izleme, yedek, hukuki metinler, destek süreci.

## Kabul kriterleri
- Güvenlik raporundaki yüksek ve orta bulguların tümü kapalı; kalanlar gerekçeyle listelenmiş.
- Geri yükleme tatbikatı belgelenmiş ve başarılı.
- Erişilebilirlik ve performans bütçeleri CI'da denetleniyor ve geçiyor.
- Yük testi hedefleri sağlanıyor.
- Yayın kontrol listesi tamam veya kalan maddeler sahipleriyle açık.

## Yapma
- Bulguları gizleme veya "sonra" listesine atıp yayına alma (yüksek/orta olanlar).
- Hukuki uygunluk iddiası yazma.

## Bitirince
Güvenlik ve performans özeti, kalan risk listesi, yayın önerisi (evet/hayır ve koşullar).
