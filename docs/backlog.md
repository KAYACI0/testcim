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

## Dilim 08'den kalanlar

- **Müfredat kapsamı yalnızca Matematik + Fen Bilimleri, 5-8. sınıf.** Diğer düzey/dersler
  (ilkokul, lise, diğer branşlar) bu dilimde eklenmedi; kullanıcı onayı bu şekildeydi
  ("ileride diğerlerini ekleriz"). `scripts/curriculum/parse-source.mjs` + elle gözden
  geçirme akışı diğer dersler için de kullanılabilir.
- **Kazanım açıklamaları yalnızca öğrenme çıktısı başlığı.** Her `MAT.5.1.1` gibi kodun
  altındaki a/b/c... süreç bileşenleri ve "İçerik Çerçevesi" (anahtar kavramlar, sembol
  ve gösterimler) alınmadı — yalnızca başlık metni `curriculum_outcomes.description`'a
  girdi. İhtiyaç olursa `scripts/curriculum/data/*.json`'a `processComponents` gibi bir
  alan eklenip yeniden içe aktarılabilir.
- **MEB PDF'lerinde açık bir lisans/kullanım koşulu ibaresi bulunamadı.** mufredat.meb.gov.tr
  üzerindeki resmi öğretim programı PDF'leri kamu kurumu yayını olarak serbestçe
  erişilebilir durumda, ancak sayfa/PDF üzerinde CC-BY vb. açık bir lisans etiketi
  görülmedi; ticari kullanım öncesi MEB'e doğrulatılması önerilir.
- **pHash tabanlı yakın-mükerrer tespiti yok.** `findDuplicates` yalnızca `assets.sha256`
  (görsel sorular) ve tam `stem_text` eşleşmesi (zengin sorular) kontrol ediyor;
  `assets.phash` bit-mesafesi karşılaştırması ayrı bir RPC gerektirir (bkz.
  `apps/web/src/features/bank/actions.server.ts` içindeki not).
- **pgTAP ve Playwright e2e bu oturumda çalıştırılamadı.** Yerel ortamda Docker/Supabase
  CLI yok (dilim 04/06/07'deki aynı bilinen kısıt); `supabase/tests/085_question_bank.sql`
  ve `apps/web/e2e/bank.spec.ts` yazıldı ama `pnpm db:test`/`pnpm test:e2e` ile
  doğrulanmadı. `bank.spec.ts` ayrıca projede hâlâ eksik olan bir kimlik doğrulama/tohum
  fixture'ına bağımlı olduğu için `test.skip` ile işaretli.
- **`/bank`'ın 1440/1024/390 ekran görüntüleri ve docs/03 öz eleştirisi alınmadı**
  (tarayıcı çalıştırma ortamı bu oturumda kullanılmadı — zaman bütçesi).
- **5.000 soruluk sentetik banka üzerinde gerçek `EXPLAIN ANALYZE` ölçümü yapılmadı**
  (yerel Supabase yok); `questions_workspace_id_idx` + `stem_text` trigram indeksi zaten
  var, 300ms hedefi tasarım gereği karşılanmalı ama ölçülmedi.

## Dilim 09'dan kalanlar

- **Canlı (live) mod arayüzü yok.** Şema (`online_exams.mode='live'`) ve tehdit modeli
  kararı (docs/adr/0004 §9) hazır, ama öğretmen paneli için Realtime Presence tabanlı
  lobi/ilerleme ekranı uygulanmadı. `async` mod uçtan uca çalışıyor.
- **300 eşzamanlı öğrenci yük testi (k6) çalıştırılmadı.** Bu ortamda k6, Docker veya
  gerçek bir Supabase/Vercel dağıtımı yok; betik yazılıp gerçek bir ortama karşı
  çalıştırılmalı.
- **Hız sınırı Upstash yerine Postgres tabanlı.** `check_exam_rate_limit()` RPC'si aynı
  true/false sözleşmesini sağlıyor ama dağıtık Redis'e göre daha az hassas (bkz.
  docs/adr/0004 §5). Gerçek Upstash kimlik bilgileri eklenirse değiştirilebilir.
- **Öğretmen tarafında açık uçlu soru elle puanlama arayüzü yok.** `regradeOpenAnswer`
  server action'ı ve `ensureAttemptScored`'ın "elle verilen puan kalıcıdır" mantığı
  yazılıp test edildi, ama `/exams/[id]` sonuç ekranında bunu tetikleyen bir arayüz
  (soru bazlı açık uçlu cevap görüntüleme + puan girişi) henüz yok.
- **`roster` erişim modu, sınıf listesine karşı doğrulanmıyor.** Öğrenci serbest metin
  olarak ad/numara giriyor; `students`/`class_students` tablolarına karşı eşleşme
  kontrolü yapılmıyor (yalnızca `max_attempts` için serbest metnin hash'i tekilleştirme
  amacıyla kullanılıyor).
- **`fill`/`match`/`order` öğrenci arayüzü basitleştirildi.** `mcq`/`tf`/`numeric` tam;
  `fill` yalnızca boşluk sayısını (`blankCount`, içeriği değil) güvenle açığa çıkarıp
  metin kutuları gösteriyor; `match` her seçenek için serbest metin eşleştirmesi
  istiyor (büyük/küçük harf duyarlı, tam eşleşme); `order` yukarı/aşağı düğmeleriyle
  sıralanıyor (sürükle-bırak yok).
- **iframe gömme (Pro) ertelendi.** CSP `frame-ancestors` `next.config.ts`'de sabit
  `'none'`; çalışma alanına özel dinamik değer bir middleware gerektirir.
- **E2E ve pgTAP bu oturumda çalıştırılamadı** (dilim 08'deki aynı bilinen kısıt: yerel
  Docker/Supabase CLI yok). `supabase/tests/095_online_exam_runtime.sql` ve
  `apps/web/e2e/online-exam.spec.ts` (`test.skip`, kimlik doğrulama fixture'ı eksik)
  yazıldı ama doğrulanmadı; birim testler (puanlama, KR-20/ayırt edicilik, süre hesabı,
  belirteç hash'i) 228 testle yeşil.

## Dilim 10'dan kalanlar

- **Sunucu uçları ve arayüz uygulanmadı.** Bu dilimde yalnızca `packages/omr` çekirdeği
  (form geometrisi, PDF üretimi, saf TypeScript okuyucu: köşe bulma, homografi, doluluk
  skorlama, belirsizlik sınıflandırması) yazıldı ve test edildi (25 test, doğruluk
  regresyonu dahil, hepsi yeşil). `apps/web/src/features/omr/actions.server.ts`
  (form/oturum/tarama server action'ları), Worker sarmalayıcısı
  (`apps/web/src/features/omr/worker/`), form oluşturma/okuma oturumu/inceleme
  kuyruğu/sonuçlar ekranları ve `messages/tr.json`+`en.json` metinleri henüz yok.
  `docs/adr/0005-optik-okuma.md`'de planlanan mimari hazır; uygulama sonraki bir
  PR'da yapılmalı.
- **Canlı kamera yakalama yok.** ADR 0005'te bilinçli kapsam dışı (kullanıcıyla
  netleşti): köşe algılanınca çerçeve gösterip otomatik yakalayan canlı mod, toplu
  yükleme akışı oturduktan sonra ayrı bir dilimde eklenmeli.
- **Gerçek QR üretimi/okuma yok.** Form üzerinde yalnızca form kimliğinin yazılı olduğu
  bir yer tutucu kutu var; `qrcode` (üretim) ve `jsqr` (okuma) gibi bağımlılıklar
  eklenip gerçek bir barkod akışı kurulmadı. Öğrenci no baloncuk ızgarası otomatik
  eşleme için zaten yeterli olduğundan bu, kapsam dışı bırakıldı.
- **Gerçek taranmış/fotoğraflanmış kâğıtla doğrulanmadı.** Doğruluk regresyonu yalnızca
  `packages/omr/src/fixtures/synthetic.ts`'in ürettiği sentetik piksel görüntüleriyle
  çalışıyor (gürültü ve gölge fikstürleri var, gerçek eğik/döndürülmüş bir fotoğraf
  fikstürü yok — homografi matematiği eğimi doğru tolere eder ama bu ayrıca sentetik
  bir fikstürle kanıtlanmadı). `docs/omr-manual-test.md` (gerçek cihaz test kontrol
  listesi) henüz yazılmadı.
- **PDF'lerde Türkçe karakter (ı/İ/ğ/Ğ/ş/Ş) desteği yok.** `renderOmrFormPdf` pdf-lib'in
  yerleşik WinAnsi Helvetica fontunu kullanıyor; bu karakterleri kodlayamıyor. Bu yüzden
  paket hiçbir Türkçe metni kendi içinde sabit yazmıyor (etiketler çağırandan parametre
  olarak gelir), ama gerçek Unicode font + `@pdf-lib/fontkit` entegrasyonu yapılmadı.
  `packages/renderers`'ın ana PDF motoru da aynı çözülmemiş soruyu taşıyor (docs/adr/0002);
  ikisi için ortak bir font kararı (hangi OFL lisanslı font, nereden bundle edilecek)
  ayrı bir iş kalemi olarak ele alınmalı.
- **Çok sütunlu cevap ızgarası yok.** 200 soruya kadar tek sütun + otomatik çok sayfa ile
  destekleniyor; yan yana sütunlarla daha az sayfa kullanan bir yerleşim ileride eklenebilir.
- **pgTAP ve Playwright bu oturumda çalıştırılamadı** (önceki dilimlerdeki aynı bilinen
  kısıt: yerel Docker/Supabase CLI yok). Şema zaten değişmedi (mevcut
  `supabase/tests/100_omr.sql` çapraz kiracı testini geçiyor); yeni sunucu uçları
  yazıldığında aynı testin gerekirse genişletilmesi ve `pnpm db:test`/`pnpm test:e2e`
  ile doğrulanması gerekiyor.

## Dilim 11'den kalanlar (yapay zekâ altyapısı)

- **Hiçbir gerçek özellik promptu yok.** Bu dilim yalnızca altyapıyı
  (`AiProvider`, kredi/hız sınırı/kayıt hattı, model seçimi, prompt
  sürümleme mekanizması) kurdu. docs/prompts/11-yapay-zeka-paketi.md § 2'deki
  11 özellik (soru üret, görselden metne, çeldirici, çözüm, benzer soru,
  metinden soru, kalite kontrolü, cevap anahtarı okuma, otomatik etiketleme,
  sayfa bölme, doğal dil komutu) hâlâ ayrı dilimler; "inceleme tepsisi"
  (taslak onay akışı) ve kredi/`UsageMeter` arayüzü de dahil.
- **`@anthropic-ai/sdk@0.70.1`'de yapılandırılmış çıktı yalnızca beta ad
  alanında.** `ClaudeAiProvider`, `client.beta.messages.parse()` +
  `betaZodOutputFormat` kullanıyor (bkz. docs/adr/0006 § 2). SDK
  yükseltildiğinde `client.messages.parse` beta olmayan yola taşınabilir mi
  kontrol edilmeli.
- **Gerçek bir Claude API çağrısı hiç yapılmadı.** `ANTHROPIC_API_KEY`
  yoktu (bu ortamda ağ/kimlik bilgisi yok); `ClaudeAiProvider` yalnızca
  tip kontrolünden geçti, `FakeAiProvider` ile birim testleri yazıldı.
  Gerçek bir anahtarla en az bir manuel doğrulama (`pnpm test:ai-live`
  tarzı, docs/prompts/11 § Testler'in istediği gibi) henüz yok.
- **Upstash Redis bağlı değil.** `UPSTASH_REDIS_REST_URL`/`TOKEN` yok;
  `InMemoryAiRateLimiter`'a düşülüyor (bkz. docs/adr/0006 § 6). Üretime
  çıkmadan önce gerçek Upstash kimlik bilgileriyle `UpstashAiRateLimiter`
  yolu doğrulanmalı.
- **`supabase/tests/115_ai_pipeline.sql` bu oturumda çalıştırılamadı**
  (önceki tüm dilimlerdeki aynı bilinen kısıt: yerel Docker/Supabase CLI
  yok). `refund_credits`/`create_ai_job`/`complete_ai_job`/`fail_ai_job`
  RPC'leri ve çapraz kiracı reddi testleri yazıldı ama `pnpm db:test` ile
  doğrulanmadı.
- **`apps/web/src/lib/supabase/types.ts`'e dört yeni RPC (`refund_credits`,
  `create_ai_job`, `complete_ai_job`, `fail_ai_job`) ve eksik olan
  `spend_credits` elle eklendi** (dilim 03'ten kalan not hâlâ geçerli:
  Docker yok, `pnpm db:types` çalıştırılamadı).
- **Embedding/vektör arama sağlayıcısı seçilmedi.** Anthropic'in embedding
  uç noktası yok; docs/prompts/11 § 6 (vektör arama) için ayrı bir
  sağlayıcı (örn. Voyage AI) o dilimde seçilmeli.
- **Aylık kredi yükleme cron'u yok.** `ai_credits_per_month` kadar otomatik
  `credit_ledger` girişi Prompt 13 (faturalandırma) kapsamına ait.
- **Maliyet tahmini yaklaşık.** `ai_jobs.cost_micro`, statik bir
  USD/1M-token tablosundan hesaplanıyor (`features/ai/models.ts`); gerçek
  faturayla kuruş hassasiyetinde eşleşmez, yalnızca panelde yön göstermek
  için.

## Dilim 12'den kalanlar (sınıflar, raporlar, işbirliği)

- **Prompt 05 seviyesinde tam genel amaçlı yerleşim motoru yok.**
  `packages/layout-engine` hâlâ yalnızca tip iskeleti (`LayoutDocument` gerçek
  soru/blok içeriği taşımıyor). PR3'teki karne/kişisel baskı/DOCX/PPTX
  renderer'ları bu yüzden `LayoutDocument`'ı hiç okumuyor; kendi dar amaçlı
  girdi tiplerini alıyorlar (rapor/fatura üretici deseni, `packages/omr/src/pdf.ts`
  örnek alınarak). Çoklu sütun/kitapçık/soru karıştırma gerektiren tam genel
  motor ayrı bir iş (muhtemelen Prompt 05) olarak kalmalı.
- **"Kişiye özel baskı" dar yorumlandı.** `docs/prompts/12` § 5, öğrenci başına
  tam soru kağıdını yeniden dizmek olarak da okunabilir; bu, genel yerleşim
  motorunu gerektirir ve yapılmadı. Bunun yerine `addPersonalizedCoverPage`
  mevcut sınav PDF'inin başına öğrenci adı/numarası + QR yer tutuculu bir kapak
  sayfası ekliyor, tüm sayfalara filigran döşüyor. Kullanıcıyla konuşulup
  onaylanan yorum buydu; genel motor kurulursa yeniden değerlendirilmeli.
- **PDF'lerde Türkçe karakter sorunu karneleri de etkiliyor.** `renderReportCardPdf`
  ve `addPersonalizedCoverPage`, `renderOmrFormPdf` ile aynı bilinen kısıtı
  miras alıyor (yukarı bakınız, "Dilim 00'den kalanlar"): pdf-lib'in yerleşik
  WinAnsi Helvetica'sı ı/İ/ğ/Ğ/ş/Ş'yi kodlayamıyor. OMR formunda bu çoğunlukla
  sayı/baloncuktu; karnede gerçek öğrenci/sınıf adları olduğu için etkisi çok
  daha büyük. Gerçek bir OFL Unicode font (`@pdf-lib/fontkit` ile) bundle
  edilip embed edilmeden çözülmeyecek; bu oturumda internet erişimi
  olmadığından gerçek bir font dosyası indirilemedi.
- **DOCX/PPTX export'un gerçek soru verisiyle bağlanması yapılmadı.**
  `features/exports/actions.server.ts`, `requireFlag('docx_pptx_export')`'ı
  gerçek bir çağrı noktasına bağlıyor ve `@testcim/renderers`'ın
  `renderTestDocx`/`renderTestPptx` fonksiyonlarını çağırıyor, ama
  `test_items`/`questions` satırlarını renderer'ın beklediği dar
  `ExportQuestion`/`PptxQuestion` şekline (zengin/formül/görsel içerik için
  render edilmiş PNG dahil) çeviren kod yok. Bu, `rich-editor`'ın HTML render
  yolunu (yalnızca tarayıcı içi önizleme için var) bir HTML→görsel
  rasterizasyon hattına (muhtemelen headless tarayıcı) genişletmeyi
  gerektiriyor — API'sini doğrulamadan uydurmamak için ayrı bir dilimde ele
  alınmalı.
- **QTI vs Moodle XML kararı verilmedi** (plandaki ADR 12.2 uygulayıcıya
  bırakılmıştı, henüz araştırılmadı).
- **Toplu karne/kişisel baskı üretimi (Web Worker + ilerleme + ZIP) yapılmadı.**
  PR4'te yalnızca tek öğrenci karne PDF'i (`generateReportCardPdf`) ve AI özet
  taslak/onay akışı kuruldu (`features/report-cards/`). Planın 0.3 bölümündeki
  "tüm sınıf için toplu üretim, Worker'da, ilerleme mesajlı, ZIP çıktı" akışı
  ayrı bir iş olarak kalmalı — `features/capture/worker/client.ts`'in
  request/response deseni temel alınabilir, ama Worker-güvenli bir zip
  kütüphanesi (`fflate` vb.) seçimi güncel belgeye bakılmadan yapılmamalı.
- **Kişiye özel baskı (`addPersonalizedCoverPage`) hiçbir UI'a bağlanmadı.**
  PR3'te yazılan fonksiyon PR4'te de kullanılmadı — gerçek bir sınav PDF'i
  üreten bir kaynağa (Prompt 05/09 render çıktısı) ihtiyaç duyuyor, bu da genel
  yerleşim motoruyla aynı bağımlılık zincirine giriyor.
- **Karne puan satırlarında OMR "maxScore=100" varsayımı doğrulanmadı.**
  `features/report-cards/build-scores.ts`, `omr_scans.score`'u zaten 0-100
  normalize edilmiş kabul ediyor; PR5'in rapor RPC'leri tek bir paylaşılan
  puanlama modeli tanımladığında bu varsayım gözden geçirilmeli.
- **PR5'in rapor RPC'leri (`get_class_report`, `get_outcome_report`,
  `get_student_progress`, `get_weak_topics`) yalnızca çevrimiçi sınav
  sonuçlarını (`exam_attempts`/`attempt_answers`) topluyor; optik okuma
  sonuçları hariç.** `omr_scans.answers` baloncuk pozisyonuyla anahtarlanıyor,
  `test_items.id`'ye eşlenmiyor — bu eşleme `omr_forms.template` +
  `test_versions.item_order` gerektiriyor ve gerçek OMR verisiyle
  doğrulanmadan yazılmamalı (planın kendi işaret ettiği en riskli madde,
  bkz. migration'ın kapsam notu). Bir sınıfın kazanım/konu raporları şu an
  yalnızca o sınıfın öğrencilerinin çevrimiçi sınav sonuçlarını yansıtıyor.
- **Toplu karne üretimi sayfası (`reports/[classId]/report-cards`) kurulmadı**
  — PR4'ün backlog notuyla aynı Worker/ZIP bağımlılığı.
- **Sürüm geçmişi geri yükleme yapıldı ama planın önerdiği "periyodik kontrol
  noktası + replay" tasarımıyla değil.** PR6, her `apply_test_ops` çağrısında
  tam durumu (`test_snapshots.full_state`) kaydetme yaklaşımını seçti —
  replay mantığı canlı veritabanı testi olmadan güvenilir yazılamazdı. Bkz.
  docs/adr/0008. Depolama maliyeti şu an kabul edilebilir varsayılıyor;
  büyük testler/sık düzenleme gerçek kullanımda sorun çıkarırsa periyodik
  kontrol noktasına geçilebilir (full_state nullable, geriye uyumlu).
- **Resend e-posta entegrasyonu hâlâ yok.** PR6'nın mention/onay-isteği
  bildirimleri yalnızca uygulama içi `notifications` tablosu + zil ikonu
  üzerinden çalışıyor; gerçek e-posta gönderimi yapılmıyor (bkz. docs/adr/0008).
  Prompt 03'ten kalan `inviteMember` e-posta borcuyla (yukarıda, "Dilim 03'ten
  kalanlar") aynı nedenle (kimlik bilgisi/ağ erişimi yok) aynı kapsamda
  bırakıldı; gerçek Resend kimlik bilgileriyle ikisi birlikte kurulmalı.
- **`apply_test_ops`'un `add_group`/`update_group` op tiplerini hiç işlememesi
  (mevcut, bu PR'dan önceki bir tutarsızlık) `full_state` geri yüklemesinin
  kapsamını da etkiliyor** — yalnızca `test_items` + başlık/ayarlar geri
  yükleniyor, bölüm/grup yapısı değil (bkz. docs/adr/0008 "Kapsam sınırı").
- **`comments`/`notifications` UI'ı yalnızca test seviyesinde (`resource_type
  = 'test'`) bağlandı.** `resource_type = 'question'` şeması ve RLS'i var
  ama soru editörüne bir yorum paneli eklenmedi — v1 kapsamı test editörüyle
  sınırlı tutuldu.
- **`supabase/tests/120_result_linking.sql` ve `080_classes.sql`'e eklenen PR1/PR2
  testleri bu oturumda çalıştırılamadı** (önceki dilimlerdeki aynı bilinen
  kısıt: yerel Docker/Supabase CLI yok).

## Dilim 13'ten kalanlar (faturalandırma ve pazarlama)

- **Gerçek ödeme sağlayıcısı (iyzico / Paddle) adaptörleri bağlanmadı.**
  Canlı kurumsal hesap ve API anahtarları olmaksızın harici ödeme servisleri test
  edilemeyeceğinden `BillingProvider` soyutlaması üzerinden tam uçtan uca çalışan
  `FakeBillingProvider` ve testleri kuruldu (`apps/web/src/features/billing/fake-provider.ts`).
  Canlı anahtarlar temin edildiğinde iyzico adaptörü `registry.server.ts`'e eklenmelidir.
- **e-Arşiv / e-Fatura entegrasyonu otomasyonu.**
  iyzico MoR olmadığı için fatura kesmez; `payment.succeeded` olayında bir e-arşiv
  entegratörüne (Paraşüt, KolayBi vb.) bağlanma ihtiyacı muhasebe süreçleriyle
  birlikte kurulmalıdır.
- **Hukuki metinler yer tutucu durumda.**
  `/privacy`, `/terms`, `/kvkk`, `/refund` sayfaları `LegalPlaceholder` ile
  "hukuki metin bekleniyor" uyarısı vermektedir; avukat tarafından hazırlanacak
  resmi sözleşmeler beklenmektedir.
- **Resend e-posta entegrasyonu.**
  İletişim ve telif bildirimi formları `public_submissions` tablosuna yazılmaktadır;
  yöneticiye e-posta bildirimi Resend kimlik bilgileri geldiğinde tek bir dilimde
  kurulmalıdır.
- **pgTAP testleri bu oturumda çalıştırılamadı.**
  Yerel ortamda Docker/Supabase CLI bulunmadığı için `supabase/tests/180_billing.sql`
  yerel Postgres üzerinde çalıştırılamadı; SQL mantığı ve TypeScript birim testleri
  tamamlandı ve yeşildir.

## Faz 0'dan kalanlar (2026-10-07)

- **`lib/supabase/types.ts` hala elle yazilmis.** Gercek `database.types.ts` uretildi
  (`pnpm db:types`) ama ona gecmek 60 tip hatasi uretiyor: `Json` alanlari (`apply_test_ops`
  sonucu, `jobs.input`, sinav icerigi) ve enum yerine `string` donen sutunlar (durum, mod,
  erisim). Her birine Zod ayristirma veya dar tip donusumu gerekiyor. Ayri bir refaktor
  dilimi olmali; bittiginde elle yazilan dosya silinir.
- **pgTAP `throws_ok` kontrolleri hata kodu belirtmiyor.** 44 cagri duzeltilirken kodu olmayanlar
  `null` aldi (herhangi bir istisna gecer). Capraz kiraci testlerinde `42501` beklentisi
  geri eklenerek sikilastirilmali.
- **CI `database` isi** GitHub Actions'ta henuz calistirilmadi.
- **CI `e2e` isi** artik yerel Supabase baslatiyor (kimlikli akislar icin); GitHub Actions'ta henuz
  calistirilmadi, ilk PR'da dogrulanmali.
- **`/capture` ve `/invite` yollari** `PUBLIC_PATHS` icinde degil. Telefondan yakalama oturum acmadan
  calismali mi, davet kabul sayfasi giris oncesi acilmali mi: dogrulanmadi, kullanici akisiyla E2E
  yazilirken netlestirilmeli (`/s` ayni nedenle acildi).
- **Ogrenci cevap kaydi yaris durumu (dogrulanmadi).** `exam-client.tsx` `saveAnswer` isteklerini
  beklemeden `Sinavi teslim et` istegini gonderiyor; yavas agda son cevap kaydedilmeden puanlanabilir.
  Teslimden once bekleyen kayitlarin tamamlanmasi (veya cevaplarin teslimle birlikte gonderilmesi)
  gerekir. Bu yuzden E2E testi cevaplar arasinda kayit tamamlanmasini beklemiyor, hatayi yeniden
  uretmek icin ayri bir test yazilmali.

## Sonraki dilimlerden beklenenler (docs/01-analiz-ve-strateji.md açık sorular)

- Vektör PDF için ayrı bir Chromium servisi gerekir mi.
- Masaüstü yardımcı: Tauri mi Electron mu.

