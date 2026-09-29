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

## Dilim 01'den kalanlar

- **CI'da `pnpm db:test` / `pnpm db:start` çalıştırma.** docs/02-mimari.md bölüm 9
  bunu istiyor ama şema bu dilimde geldiği için kapsam dışı bırakıldı (dilim = dal = PR
  kuralı); ayrı bir PR'da eklenmeli (Supabase CLI + Docker gerektiren bir GitHub Actions
  job'u).
- **Migrasyon lint.** Şema artık var; hangi aracın (örn. `supabase db lint` veya özel bir
  script) kullanılacağına karar verilip CI'a eklenmeli.
- **`embedding vector(1536)` boyutu.** Yapay zekâ sağlayıcısı henüz seçilmedi
  (docs/01 bölüm 10, açık soru); 1536 OpenAI `text-embedding-3-small` varsayımıyla
  konuldu, dilim 11'de gerçek sağlayıcıya göre değişebilir.

## Dilim 02'den kalanlar

- **`design-system.spec.ts` referans görüntülerinin bu makinede üretilememesi.** Playwright
  `webServer`, dilim 00'ın notundaki aynı sebeple (3000 portu ilgisiz `test-maker`
  projesince kullanılıyor) yerelde `pnpm dev`'i başlatamıyor. İlk CI çalıştırması
  `--update-snapshots` ile taban görüntüleri üretmeli.
- **Bu makinede `next dev` (Turbopack) HMR WebSocket'i el sıkışamıyor ve bu durumda istemci
  hiç hidrate olmuyor (hiçbir buton/diyalog tepki vermiyor).** Kod hatası değil: aynı
  bileşenler `next build && next start` ile denendiğinde (diyalog, açılır menü, sekme,
  komut paleti, tost) sorunsuz çalıştı — ekran görüntüleriyle doğrulandı. Muhtemelen bu
  makineye özgü bir proxy/güvenlik yazılımı WebSocket yükseltmesini bozuyor. CI'da ve
  normal geliştirici makinelerinde beklenmiyor; yine de biri aynı belirtiyi görürse
  (butonlar tepkisiz, `ws://.../_next/hmr` el sıkışma hatası) önce prod derlemesiyle
  doğrulasın.
- **`DataTable` sanallaştırma taşımıyor.** docs/03 bölüm 5 "DataTable (sıralama, seçim,
  sanal kaydırma)" diyor; bu dilimin kapsamı (Prompt 02) yalnızca "sıralama, seçim, boş
  durum" istiyor. Gerçek büyük listeler (yüzlerce test/soru) dilim 04/08'de TanStack
  Virtual ile eklenmeli.
- **`Combobox`/`Select` bileşenlerinde başlangıç değeri gösterimi.** Radix Select,
  `SelectValue`'nun metnini yalnızca `Content` en az bir kez mount olduktan sonra
  hesaplıyor; bu yüzden kontrollü kullanımda etiketi `children` olarak elle geçirmek
  gerekiyor (`design-system-client.tsx`'teki `Test türü` alanına bakın). Bileşen
  dokümantasyonuna (`/design-system` sayfası) bu not eklenebilir.

## Dilim 03'ten kalanlar

- **`packages/shared/src/database.types.ts` henüz `pnpm db:types` ile üretilmedi.** Bu
  makinede Docker yok, dolayısıyla `pnpm db:start`/`db:reset`/`db:types`/`db:test`
  çalıştırılamadı. Yerine `apps/web/src/lib/supabase/types.ts` elle yazıldı — yalnızca bu
  dilimin dokunduğu tablo/RPC'leri kapsıyor, gerçek şemadan üretilmedi. Docker mevcut
  olduğunda `db:types` çalıştırılıp bu dosya silinmeli/gerçek dosyaya yönlendirilmeli.
- **Davet e-postası gönderimi (Resend) bağlanmadı.** `inviteMember` daveti oluşturuyor ve
  kabul bağlantısını (`/invite/[token]`) ekranda gösteriyor; davet eden kişi bağlantıyı
  elle paylaşıyor. docs/02-mimari.md bölüm 2 Resend'i işlemsel e-posta sağlayıcısı olarak
  belirliyor; e-posta gönderimi ayrı bir küçük dilimde eklenmeli.
- **Auth ve davet akışlarının Playwright E2E'si yok.** Gerçek bir Supabase projesi
  (Inbucket/e-posta yakalama, Google OAuth test hesabı) olmadan e-posta bağlantısı ve
  OAuth akışını uçtan uca simüle etmek bu ortamda mümkün olmadı. `pnpm typecheck && lint
  && check:design && test` yeşil ve `next build`/`next dev` ile rota derlemesi ve statik
  sayfa render'ı (giriş, kullanım şartları) doğrulandı; canlı Supabase ile manuel/E2E
  doğrulama gerekiyor.
- **pgTAP bu dilimde çalıştırılamadı** (aynı Docker eksikliği). Bu dilim yeni tablo
  eklemedi (hepsi Prompt 01'den), dolayısıyla yeni çapraz kiracı testi gerekmiyor; ama
  mevcut `supabase/tests/030_identity_and_tenancy.sql` ve `040_usage_and_billing.sql`
  paketlerinin bu dilimin RPC kullanım şekliyle (`get_entitlements`, `has_role`) hâlâ
  uyumlu olduğu Docker geldiğinde doğrulanmalı.
- **Çalışma alanı logosu yükleme.** docs/prompts/03 madde 4 "logo yükleme: imzalı URL ile
  `branding` kovasına" istiyor; bu dilimde yalnızca kurum adı (`branding.schoolName`)
  eklendi. Dosya yükleme akışı imzalı URL altyapısı gerektirdiğinden (birden çok dilimde
  tekrar kullanılacak ortak bir yapı) ayrı ele alınmalı.
- **KVKK "hesabı sil" / "veri dışa aktar" talepleri yalnızca `jobs` tablosuna kayıt
  düşüyor** (docs/prompts/03 madde 6'nın istediği gibi, "şimdilik iş kaydı oluşturur").
  Talebi gerçekten işleyen bir cron/worker henüz yok.
- **Gizlilik/kullanım şartları sayfaları yer tutucu.** Hukuki metinler bekleniyor
  (docs/prompts/03 madde 6).

## Sonraki dilimlerden beklenenler (docs/01-analiz-ve-strateji.md açık sorular)

- iyzico abonelik ve e-arşiv fatura akışının ayrıntıları.
- MEB kazanım verisinin resmi kaynaktan alınma biçimi ve lisans durumu.
- Çizim aracı: Konva mı, JSXGraph hibrit mi (lisans doğrulanarak).
- Vektör PDF için ayrı bir Chromium servisi gerekir mi.
- Masaüstü yardımcı: Tauri mi Electron mu.
