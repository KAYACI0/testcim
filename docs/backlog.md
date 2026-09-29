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

## Dilim 04'ten kalanlar

- **Docker olmadığı için doğrulanamayanlar.** `20250101000013_apply_test_ops_quota.sql`
  migrasyonu ve `supabase/tests/075_apply_test_ops_quota.sql` pgTAP testi gerçek bir
  Postgres'e karşı hiç çalıştırılmadı; `apps/web/src/lib/supabase/types.ts` bu dilimde
  `tests`/`test_items`/`questions`/`question_revisions`/`assets` tablolarıyla genişletildi
  ama yine elle yazıldı (dilim 03'ten kalan not hâlâ geçerli).
- **Uçtan uca (Playwright) yakalama testi yazılmadı.** docs/prompts/04 "ClipboardEvent +
  DataTransfer ile yapıştırma simülasyonu" istiyor, ama gerçek bir Supabase projesi
  (auth + storage + RPC) olmadan bu testi yazıp da çalıştığını doğrulamak mümkün değildi;
  yanlış/kırık bir test dosyası bırakmaktansa hiç yazmamayı tercih ettim. Docker/canlı proje
  geldiğinde eklenmeli. Saf mantık (autoTrim, hash, op-log, undo/redo, kuyruk, eşzamanlılık
  sınırlayıcı, yinelenen tespiti, toplu cevap ayrıştırma) birim testleriyle kapsandı.
- **"Kayıpsız orijinal: PNG veya WebP, hangisi küçükse" tam uygulanmadı.** Tarayıcı
  `OffscreenCanvas.convertToBlob` WebP için gerçek kayıpsız modu desteklemiyor (yalnızca
  kalite parametresi var); bu yüzden orijinal her zaman PNG olarak kaydediliyor
  (`apps/web/src/features/capture/worker/encode.ts`). Gerçek kayıpsız WebP gerekiyorsa
  bir WASM kodlayıcı (örn. Squoosh'un webp kodeği) eklenmeli.
- **480px WebP küçük resim Storage'a yüklenmiyor.** `questions` tablosunda küçük resme
  ayrı bir referans kolonu yok (yalnızca `stem_asset_id`); küçük resim yalnızca istemcide
  o oturum için tutuluyor, sayfa yenilenince orijinalin imzalı URL'i kullanılıyor. Soru
  bankası ızgara görünümü (dilim 08) küçük resmi gerçekten önemli kılarsa, `questions`'a
  bir `thumb_asset_id` eklenmeli.
- **Yinelenen tespiti yalnızca geçerli test oturumundaki sorularla sınırlı.** docs/02
  §5.1 çalışma alanı genelini ima ediyor olabilir; tüm soru bankasına karşı kontrol dilim
  08'in (soru bankası) kapsamına daha uygun.
- **`apply_test_ops` artık `questions_per_test` kotasını kontrol ediyor**; `storage_mb`
  kontrolü `registerCapturedQuestion`'da (görsel yakalama) zaten vardı, dilim 06'da
  `beginSourceDocumentUpload`'a da taşındı (bkz. "Dilim 06'dan kalanlar").
- **Odağa dönünce otomatik ekleme (`navigator.clipboard.read()`) eklenmedi.** docs/prompts/04
  bunu "isteğe bağlı ayar" olarak işaretliyor; kapsam dışı bırakıldı.
- **Tarayıcı uzantısı, telefon QR, masaüstü yardımcı yakalama yolları eklenmedi** —
  bunlar dilim 14'ün (yakalama ekosistemi) kapsamı.
- **Ekran görüntüleri alınamadı.** `/tests`, `/tests/new`, `/tests/[id]` oturum
  gerektiriyor; dilim 03'te olduğu gibi canlı bir Supabase projesi olmadan giriş
  yapılamadığından 1440/1024/390 ekran görüntüleri bu dilimde üretilemedi.

## Dilim 06'dan kalanlar

- **Kırpma stüdyosu arayüzü (`/tests/[id]/crop`) henüz yok.** Bu oturumda yalnızca
  docs/adr/0003 §A-C tamamlandı: `pdfjs-dist` kurulumu, saf bölme/maskeleme algoritmaları
  (`packages/image-tools`) ve yükleme + sunucu doğrulaması
  (`apps/web/src/features/crop/{actions.server,pdf-validate,use-source-document-upload,limits}.ts`).
  Sol küçük resim şeridi, orta pdf.js/OffscreenCanvas çizimi, sağ soru listesi, elle
  kırpma, "sayfayı otomatik böl", numara maskeleme arayüzü ve cevap anahtarı eşleme
  ekranı (§D) hâlâ kapsam dışı — sıradaki adım.
- **E2E ve ekran görüntüleri yok (§E).** Arayüz gelmeden mümkün değil.
- **`apps/web/src/lib/supabase/types.ts`'e `source_documents`/`crop_sessions` elle
  eklendi** (dilim 03'ten kalan not hâlâ geçerli: Docker yok, `pnpm db:types`
  çalıştırılamadı). Docker geldiğinde gerçek şemadan yeniden üretilmeli.
- **`finalizeSourceDocument` yüklenen dosyayı `sha256` ile tekilleştirmiyor**
  (`registerCapturedQuestion`'daki `assets_workspace_sha256_kind_unique_idx` çakışma
  kurtarma mantığının aksine). Aynı PDF'in iki kez yüklenmesi iki ayrı `source_documents`
  satırı üretir — veri kaybı değil ama gereksiz depolama; küçük bir iyileştirme olarak
  bırakıldı, kapsam dışı değildi ama zaman bütçesi bu oturumda §D'ye ayrıldı.
- **TUS ve doğrudan yükleme yolları canlı bir Supabase projesine karşı hiç denenmedi**
  (yine Docker/canlı proje eksikliği); yalnızca `readPdfPageCount` gerçek fixture PDF'lere
  karşı test edildi (`pdf-validate.test.ts`).
- **`docs/adr/0003` §"Açık kalan ve onay istenen noktalar" madde 1** (60 sayfa/50 MB
  sınırları) bu oturumda onaylanmış kabul edilip uygulandı (`limits.ts`,
  `20250101000014_source_document_upload_limit.sql` — assets kovası 25 MB'tan 50 MB'a
  çıkarıldı); farklı bir tavan isteniyorsa değiştirilebilir.

## Dilim 07'den kalanlar

- **Grup/pasaj gruplama UX'i tam değil.** `GroupPanel` bir grup oluşturup passage_rich
  yazabiliyor (`add_group` op), ama soru şeridinden (question-strip.tsx) var olan bir
  soruyu o gruba atayan arayüz yok — `set_group` op'u ve RPC desteği zaten var (dilim
  01/08'den), yalnızca şerit satırına bir "gruba ata" seçici eklenmedi. `editor/store.ts`'e
  de bir `setGroup` action'ı eklenmedi.
- **MCQ şık sayısı 2–6 değil, 2–5.** Mevcut `AnswerSelector` (dilim 04) A–E (5) harfle
  sınırlı; `QuestionEditorPanel` bunu olduğu gibi kullandı. docs/prompts/07 "2–6 şık"
  istiyor; F şıkkı eklemek `AnswerSelector`'ı da güncellemeyi gerektirir, kapsam dışı
  bırakıldı.
- **Render varlığı `phash` içermiyor.** Yakalama hattındaki yinelenen tespiti pasaj
  ekran görüntüleri için `sha256`+`phash` kullanıyor; elle yazılan bir sorunun render
  PNG'si için `phash` hesaplanmadı (aynı soru iki kez yazılırsa `sha256` eşleşmesi zaten
  yakalar, yalnızca "görsel olarak çok benzer" tespiti eksik — düşük öncelik).
- **`renderElementToPng` (docs/02 §5.2 render hattı) canlı bir tarayıcıda hiç
  çalıştırılmadı.** SVG `foreignObject` tekniği yaygın ve KaTeX/Konva SVG çıktısıyla
  uyumlu olmalı, ama Playwright E2E olmadan (bkz. altta) doğrulanmadı; cross-origin
  stylesheet varsa (bugün yok) sessizce atlanıyor — kod içindeki not bunu işaretliyor.
- **E2E ve ekran görüntüleri yok.** docs/prompts/07 kabul kriteri "yaz → denklem ekle →
  şekil çiz → teste ekle → PDF'te piksel karşılaştırma" senaryosunu Playwright'la istiyor;
  bu oturumda yazılmadı (dilim 00/02'deki bilinen yerel `next dev` HMR sorunu + zaman
  bütçesi). Birim testler (LaTeX/drawing-attrs şema, SVG serileştirme, mm→px, TipTap-JSON
  → HTML) yazıldı ve yeşil; 1440/1024/390 ekran görüntüleri ve docs/03 öz eleştirisi
  alınmadı.
- **Çizim aracının bazı jestleri basitleştirildi:** dik açı işareti sabit boyut/dönüşle
  tek tıkla yerleşiyor (yeniden boyutlandırma yok), yay/açı işareti başlangıç açısı 0'da
  sabit (yalnızca bitiş açısı sürüklemeyle belirleniyor), tam hizalama kılavuzları
  (başka nesnelere yapışma) yok — yalnızca ızgaraya yakalama var.
- **`packages/shared`'ın `richDocSchema`'sı TipTap düğüm/mark şemasını derinlemesine
  doğrulamıyor** (kasıtlı, bkz. kod yorumu): yalnızca `{type:'doc', content}` zarfı ve
  200 KB tavanı. Sunucu tarafında kötü biçimli bir düğüm türü sessizce yutulabilir
  (render aşamasında `doc-to-html.ts`'in `default` dalı çocuklarını basar).

## Sonraki dilimlerden beklenenler (docs/01-analiz-ve-strateji.md açık sorular)

- iyzico abonelik ve e-arşiv fatura akışının ayrıntıları.
- MEB kazanım verisinin resmi kaynaktan alınma biçimi ve lisans durumu.
- Vektör PDF için ayrı bir Chromium servisi gerekir mi.
- Masaüstü yardımcı: Tauri mi Electron mu.
