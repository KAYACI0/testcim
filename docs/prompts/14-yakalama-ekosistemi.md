# Prompt 14: Yakalama ekosistemi (uzantı, telefon, masaüstü)

## Amaç
"Kopyala = eklendi" hızına ulaş: web dışına taşan yakalama araçları. Bu araçlar ücretsizdir ve ürünün edinim kaldıracıdır.

## Önce oku
CLAUDE.md, docs/01 bölüm 5 (madde 12), docs/02 bölüm 5.1 ve 10 (açık soru 5).

## Başlamadan
Plan modunda başla ve üç bileşeni ayrı ayrı planla; öncelik sırasını benimle onayla (öneri: 1. telefon, 2. tarayıcı uzantısı, 3. masaüstü yardımcı). Masaüstü için Tauri ile Electron'u karşılaştır, kararı ADR'ye yaz.

## Kapsam

### A. Telefondan yakalama
- Masaüstü editörde "Telefondan ekle": QR kodu (kısa ömürlü, tek kullanımlık eşleme jetonu). Telefonda açılan sade sayfa (giriş gerektirmez, jeton yetkisiyle): kamera ile çekim, **perspektif düzeltme ve otomatik kenar bulma**, kırp/döndür, gönder. Gönderilen görseller Realtime ile masaüstünde anında şeride düşer (Prompt 04 hattı).
- Jeton süresi, tek test kapsamı, iptal edilebilirlik, hız sınırı.

### B. Tarayıcı uzantısı (Manifest V3, Chrome ve Edge)
- Sayfada bölge seçimi (Win+Shift+S benzeri kaplama), seçilen bölge Testcim'e doğrudan gönderilir. Yan panel: aktif test seçimi, yakalanan sayısı, A–E ile doğru cevap. PDF görüntüleyicide (tarayıcı içi) çalışır. Yakalama görseli `captureVisibleTab` ve kırpma ile.
- Kimlik doğrulama: web oturumuyla bağlantılı, en az izin (yalnızca gereken `host_permissions`), gizlilik politikası.
- Mağaza yayını için gereken açıklamalar ve ekran görüntüleri kontrol listesi.

### C. Masaüstü yardımcı (Windows önce)
- Sistem tepsisi uygulaması: panoyu dinler; Win+Shift+S ile yeni bir görsel panoya düşünce **otomatik olarak aktif teste ekler** (kullanıcı ayarıyla açılır/kapanır, açıkça görünür durum). Cihaz kodu akışıyla (device code) giriş. Yakalama hattını (imzalı URL yükleme) yeniden kullanır. Otomatik güncelleme, imzalı yükleyici.
- Gizlilik ilkeleri: yalnızca görsel panoya düşünce ve yalnızca yakalama açıkken çalışır; metin panoyu asla okumaz/göndermez; durum ikonu net.

### D. Ortak
- `image-tools` paketi üç bileşende yeniden kullanılır.
- Aktif test seçimi ve "yakalama oturumu" kavramı sunucuda (`capture_sessions`, kısa ömürlü): hangi cihazlar hangi teste yazıyor.

## Testler
- Eşleme jetonu güvenliği (süre, tek kullanım, başka teste yazamama).
- Uzantı ve masaüstü için otomatik test mümkün olduğunca (Playwright ile uzantı yükleme), kalanı elle kontrol listesi.
- Telefon sayfası için mobil E2E (cihaz taklidi).

## Kabul kriterleri
- Telefonla çekilen bir soru 2 sn içinde masaüstü şeridinde beliriyor.
- Uzantı ile bir PDF sorusu iki tuşla teste ekleniyor.
- Masaüstü yardımcı: Win+Shift+S sonrası ek bir eylem olmadan soru teste düşüyor ve durum görünür.
- Tümü yeşil; ekran görüntüleri ve öz eleştiri raporda.

## Yapma
- Panoda görsel dışındakini okuma.
- Gizli/arka planda görünmeyen çalışma.
- Emoji/gradyan/süs.

## Bitirince
Dağıtım adımları (mağaza, imzalama), gizlilik değerlendirmesi, bilinen sınırlar.
