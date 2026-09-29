# Backlog

Kapsam dışı bırakılanlar veya sonraki dilimlere ertelenenler. Her satır neden ertelendiğini
söyler.

## Dilim 00'den kalanlar

- **TypeScript 7 / ESLint 10'a yükseltme.** `typescript-eslint@8` henüz TypeScript 7'yi
  (peer aralığı `<6.1.0`) desteklemiyor; `eslint-plugin-import@2` (eslint-config-next
  bağımlılığı) ESLint 9'u üst sınır olarak bildiriyor. Bu paketler yetişince yükselt.
- **Paket boyutu bütçesi CI denetimi.** docs/02-mimari.md bölüm 8'de "sıkı bir tavan
  belirle ve CI'da denetle" deniyor; tavan değeri ve ölçüm aracı henüz seçilmedi.
- **`packages/*` içinde react/next bağımlılığı olmadığını otomatik doğrulama.** Şu an
  yalnızca ADR ve kod incelemesiyle korunuyor; bir script veya ESLint kuralı eklenebilir.
- **CSP'yi nonce tabanlı sıkılaştırma.** Taslak politika `next.config.ts` içinde
  `'unsafe-inline'` taşıyor (script ve style). Prod için nonce/hash geçişi dilim 15
  (Sertleştirme ve yayın) kapsamında.
- **Migrasyon lint.** docs/02-mimari.md bölüm 9'da anılıyor; şema geldiğinde (dilim 01)
  eklenir.
- **Koyu tema.** Token'lar buna izin verecek şekilde yazıldı (docs/03 bölüm 2) ama
  uygulanması sonraya kaldı.
- **Playwright duman testinin bu makinede CI dışında doğrulanması.** Geliştirme
  makinesinde 3000 portu `test-maker` adlı ilgisiz bir projenin sunucusu tarafından
  kullanılıyor; bu depoda hiçbir şey değiştirilmedi. CI, temiz bir kapsayıcıda bu sorunu
  yaşamaz.

## Sonraki dilimlerden beklenenler (docs/01-analiz-ve-strateji.md açık sorular)

- iyzico abonelik ve e-arşiv fatura akışının ayrıntıları.
- MEB kazanım verisinin resmi kaynaktan alınma biçimi ve lisans durumu.
- Çizim aracı: Konva mı, JSXGraph hibrit mi (lisans doğrulanarak).
- Vektör PDF için ayrı bir Chromium servisi gerekir mi.
- Masaüstü yardımcı: Tauri mi Electron mu.
