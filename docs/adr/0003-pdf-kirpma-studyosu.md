# ADR 0003: PDF kırpma stüdyosu — pdf.js kurulumu ve otomatik bölme algoritması

- Durum: Taslak (onay bekliyor)
- Tarih: 2026-09-29
- Kapsam: Dilim 06 (PDF kırpma stüdyosu)

## Bağlam

`source_documents` ve `crop_sessions` tabloları dilim 01'de zaten oluşturuldu (RLS dahil,
`supabase/migrations/20250101000006_files_and_curriculum.sql`). `assets` kovası
`application/pdf` MIME'ına ve 25 MB dosya boyutuna zaten izin veriyor. Dilim 04'te kurulan
yakalama hattı (`apps/web/src/features/capture`) iyimser ekleme desenini (Command/op-log,
`apply_test_ops`, `registerCapturedQuestion`) zaten sağlıyor; bu dilim onu `source: 'pdf_crop'`
ile yeniden kullanır, yeniden icat etmez. `packages/image-tools/src/auto-trim.ts` (dilim 04)
kenar boşluğu kırpma algoritmasını da sağlıyor; bu ADR onu genişletmiyor, olduğu gibi çağırıyor.

Bu ADR iki somut karar alanını kapsıyor: (1) `pdfjs-dist`'in bu depoya (Next.js/Turbopack,
Worker) nasıl bağlanacağı, (2) sayfayı soru bloklarına bölen ve soru numarasını maskeleyen
algoritmanın tasarımı.

## Kararlar

### 1. `pdfjs-dist` kurulumu

Güncel sürüm doğrulandı: **`pdfjs-dist@6.3.289`** (npm registry, 2026-09-29). Paket artık
yalnızca ESM (`main: "build/pdf.mjs"`, tip tanımları `types/src/pdf.d.ts`). Resmî örnekler
(`examples/node/getinfo.mjs`, `examples/webpack/main.mjs`) şu deseni doğruluyor:

```ts
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
// ...
const task = getDocument({ url });
const pdf = await task.promise;
const page = await pdf.getPage(1);
const { items } = await page.getTextContent(); // { str, transform, width, height, hasEOL, fontName }
```

**Worker kaynağı:** `docs/backlog.md` "Dilim 02'den kalanlar" bu makinede Turbopack'in
WebSocket/HMR ile ilgili tuhaflıkları olduğunu not ediyor; bundler'ın `pdf.worker.min.mjs`'i
otomatik çözümlemesine güvenmek yerine — tıpkı `apps/web/public/fonts/` deseninde IBM Plex
Sans'ın yapıldığı gibi — worker dosyası **derleme zamanında `public/pdf/pdf.worker.min.mjs`'e
kopyalanır** (bir `scripts/copy-pdf-worker.mjs`, `postinstall` ve `predev`/`prebuild`'e
bağlanır) ve statik yoldan okunur:

```ts
GlobalWorkerOptions.workerSrc = '/pdf/pdf.worker.min.mjs';
```

Bu, bundler'ın worker'ı yeniden paketlemesini tamamen devre dışı bırakır; tarayıcı dosyayı
düz bir statik varlık olarak indirir. `.gitignore`'a `apps/web/public/pdf/` eklenir (üretilen
dosya, `node_modules/pdfjs-dist`'ten kopyalanır, commit edilmez — script `predev`/`prebuild`'de
her zaman çalışır).

**Sayfa sınırı/boyut doğrulaması (sunucu):** docs/02 "Sayfa sınırı ve boyut sınırı sunucuda
doğrulanır" diyor; bu doğrulama tarayıcıda "ağır iş" (render/OMR) değil, yalnızca sayfa sayısı
okuma olduğundan, sunucu tarafında `pdfjs-dist/legacy/build/pdf.mjs` (Node için `legacy` build,
resmî `examples/node` örneğiyle aynı) kullanılarak `numPages` okunur ve reddedilir/onaylanır —
render yapılmaz, yalnızca belge açılır ve kapatılır (`loadingTask.destroy()`). Varsayılan
sınırlar (bu ADR'de sabitleniyor, ölçülebilir/değiştirilebilir): **60 sayfa, 50 MB**. 20 MB
üstü TUS ile yüklenir (bkz. §3), 50 MB üstü tamamen reddedilir.

**Sayfa çizimi (Worker + OffscreenCanvas):** `apps/web/src/features/crop/worker/pdf.worker.ts`
adlı özel bir Worker, `pdfjsLib.getDocument` ile belgeyi açar, her `render(pageIndex, scale)`
isteğinde `new OffscreenCanvas(w, h)` üzerine `page.render({ canvasContext, viewport })` çizer,
`canvas.transferToImageBitmap()` ile `ImageBitmap`'e çevirip ana iş parçacığına transfer eder.
Ana iş parçacığı bunu `<canvas>` üzerinde `ctx.transferFromImageBitmap(bitmap)` (bitmaprenderer
context) ile gösterir — piksel kopyalama yok, yalnızca transfer. Küçük resimler (sol şerit) ve
orta panel aynı worker'ın aynı belge örneğine farklı `scale` değerleriyle istek yapar (kuyruklu,
görünür sayfalar önce). Metin katmanı (`getTextContent`) da aynı worker içinde, aynı `page`
nesnesinden okunur ve yalnızca JSON-serileştirilebilir sonuç (`items` dizisi, `viewport`
boyutları) ana iş parçacığına döner — otomatik bölme hesaplaması (§2) ana iş parçacığında saf
bir fonksiyon olarak çalışır (test edilebilir, DOM'suz, `packages/image-tools` içinde).

### 2. Otomatik bölme algoritması (`packages/image-tools/src/pdf-split.ts`)

Girdi: `{ items: PdfTextItem[], pageWidth: number, pageHeight: number }` (pt biriminde, pdf.js
`getTextContent` çıktısından ana iş parçacığında derlenir). Çıktı: `CropBoxSuggestion[]`
(`{ x, y, w, h, confidence, anchorItemIndexes }`, pt biriminde — piksele çevirme çağıran tarafın
işi, saf/DOM'suz kalması için).

**Metin katmanı varsa:**

1. **Koordinat normalizasyonu**: pdf.js `transform` matrisi alt-sol orijinli; her item için
   `yTop = pageHeight - transform[5]` hesaplanır (üst-sol orijine çevrim), `x = transform[4]`.
2. **Sütun tespiti**: tüm item'ların `x` başlangıçlarından bir histogram çıkarılır (bucket
   genişliği ≈ 10 pt); ardışık dolu bucket'lar kümelenir. 1 küme → tek sütun; 2 ayrı küme
   (aralarında sayfa genişliğinin en az %5'i kadar boşluk) → iki sütun, sütun sınırı boşluğun
   ortası. (Şimdilik en fazla 2 sütun desteklenir — 3 sütunlu kaynak dilim 06 kapsamında
   gözlenmedi; 3+ sütun tek sütun gibi ele alınır, "Sınırlar" bölümünde not edilir.)
3. **Numara desenini bulma**: satırlar, `y` değeri ±2 pt toleransla gruplanan item'lardan
   kurulur (basit satır kümeleme — tam bir metin şekillendirici değil). Her satırın **sütun
   sınırına en yakın ilk token'ı** `^\d{1,3}[.)]$` veya `^\d{1,3}[.)]\S` desenine karşı test
   edilir (regex `packages/image-tools/src/pdf-split.ts` içinde sabit, birim testli). Eşleşen
   satır bir "soru başlangıcı" adayı olur; adayın x'i sütunun sol kenarına yakın olmalı (± sütun
   genişliğinin %15'i) — aksi halde (örn. bir kesrin payı "1)" gibi görünebilir) aday reddedilir.
4. **Okuma sırası**: sütunlar soldan sağa, her sütun içinde adaylar yukarıdan aşağıya sıralanır.
5. **Blok sınırları**: bloğun üst kenarı adayın `yTop`'u (6 pt üst boşluk payı); alt kenarı aynı
   sütundaki bir sonraki adayın `yTop`'u (6 pt pay), son aday için sütunun/sayfanın alt kenarı.
   Sol/sağ kenar başlangıçta sütun x-aralığıdır; ardından **o y-aralığındaki tüm item'ların
   gerçek x-min/x-max'ına** daraltılır (dar/geniş içerik — örn. tek satırlık kısa soru — sütunu
   doldurmasın diye). Bu adım yalnızca metin kapsar; görsel (şekil/grafik) içeren sorularda
   pdf.js metin katmanı görselleri raporlamadığından blok sınırı eksik kalabilir — bu yüzden
   öneri kutusu **çizilen sayfa üzerinde her zaman öğretmen tarafından sürüklenip
   düzeltilebilir** (kapsam madde 4, kutu asla "kesin" değil, öneridir) ve blok görüntüye
   dönüştürüldükten sonra `autoTrim` (dilim 04) tekrar çalıştırılıp gerçek içerik sınırına
   daraltılır (kutunun sağ/alt fazlalığını temizler; sol/üst boşluğu numara maskesi için
   korur — bkz. §3).
6. **Güven skoru**: aday sayısı ile "1, 2, 3, ..." ardışıklığı ne kadar örtüşüyorsa (beklenen
   sıradaki numaraya kaç aday tam eşleşti) `confidence` 0–1 arası hesaplanır; düşük güven
   (`< 0.6`) önerileri arayüzde farklı bir çizgi stiliyle (kesikli kenarlık) işaretlenir ama
   yine de "Tümünü ekle"ye dahildir (öğretmen düzeltir/siler — sessiz veri kaybı yok).

**Metin katmanı yoksa (taranmış sayfa):** `pdf-split.ts` bu durumda çağrılmaz; bunun yerine
`packages/image-tools/src/projection-split.ts`, işlenmiş bir gri tonlama `ImageData` alır
(worker'da `OffscreenCanvas` üzerinden pdf.js render çıktısından üretilir) ve iki geçişli izdüşüm
histogramı uygular: (1) dikey izdüşüm (sütun x-boşlukları) → sütunlara böl, (2) her sütun için
yatay izdüşüm (satır/blok y-boşlukları) → eşik altı (`< %2` dolu piksel) ardışık satır aralıkları
blok sınırı sayılır. Bu, `autoTrim`'in tek-boyutlu izdüşüm mantığının iki boyuta genişletilmiş
hâlidir (aynı "kenar taraması + tolerans" ilkesi, `packages/image-tools/src/auto-trim.ts` ile
kod paylaşmaz ama aynı deseni izler — ikisi de saf, senkron, `Uint8ClampedArray` üzerinde
çalışır). Numara deseni burada **bulunamaz** (OCR yok); numara maskeleme bu yolda elle silgi
aracına düşer (kapsam madde 5), belirsiz blok sınırları için arayüz yuvası + `crop.aiBlockDetect`
özellik bayrağı (dilim 11'e bağlanacak, şimdilik kapalı) bırakılır — spec ile birebir.

### 3. Soru numarasını maskeleme

Metin katmanı yolunda: §2 adım 3'te bulunan aday token'ın (yalnızca numara token'ı, satırın geri
kalanı değil) `transform`'undan **kendi** bounding box'ı çıkarılır (`x, yTop, width, height`,
küçük bir kenar payıyla büyütülür). Blok görüntüye render edildikten sonra bu box, render
ölçeğine göre piksele çevrilip `OffscreenCanvas` 2D context'inde `fillStyle = '#FFFFFF'` (kâğıt
zemini; ileride sayfa rengi ayarı eklenirse token'dan okunur) ile `fillRect` edilir — tek tıkla,
geri alınabilir (maskeleme öncesi bitmap ayrıca tutulur, "önce/sonra" tek tıkla bunlar arasında
`toggle` eder). Taranmış yolda: fare tekeriyle boyutlandırılan dairesel bir fırça, sürüklenen
noktalar arasını da dolduran (iki nokta arası çizgi enterpolasyonu) beyaz `fillRect`/`arc`
darbeleri uygular; her darbe bir undo adımı olarak `crop_sessions.state`'e değil (çok gürültülü
olur), yalnızca istemci bellekte tutulan bir bitmap yığınına (ImageBitmap snapshot, en fazla 20
adım) kaydedilir.

### 4. `crop_sessions.state` şekli

```ts
interface CropSessionState {
  readonly resolutionScale: number; // yalnızca yeni kırpmaları etkiler (kapsam madde 2)
  readonly pages: Readonly<Record<number, CropPageState>>; // 0 tabanlı sayfa index'i
}
interface CropPageState {
  readonly suggestions: readonly CropBoxSuggestion[]; // son "otomatik böl" sonucu, düzenlenebilir
  readonly confirmedItemIds: readonly string[]; // bu sayfadan zaten teste eklenmiş item'lar
  readonly numberMaskOverrides: Readonly<Record<string, PixelRect | null>>; // suggestion id -> elle düzeltme
}
```

`state` her düzenlemede debounce'lı (750 ms) `crop_sessions` satırına `update` edilir (op-log'a
girmez — bu yalnızca stüdyo içi taslak, teste eklenen sorular zaten `apply_test_ops` ile kalıcı
olur). Oturum `source_document_id` ile açılır; yoksa oluşturulur (upsert).

### 5. Cevap anahtarı tablosu ayrıştırma

`packages/image-tools/src/answer-key-parse.ts`: son sayfa(lar)ın metin katmanında
`/(\d{1,3})\s*[-.)]\s*([A-E])\b/g` deseniyle tüm eşleşmeler toplanır; aynı numara birden fazla
kez farklı harfle eşleşirse (yanlış pozitif ihtimali) o numara **dahil edilmez** (belirsiz →
sessizce yanlış eşlemek yerine dışarıda bırakılır). Sonuç `{ number, letter, confidence }[]`
olarak öneri listesi halinde sunulur; öğretmen onaylamadan hiçbir `questions.correct` yazılmaz
(spec madde 7 ve docs/02 ilke 5 ile aynı: taslak, onaysız işlenmez).

## Sınırlar (baştan bilinen)

- 2'den fazla sütun, tek sütun gibi ele alınır (yanlış blok sınırları üretebilir).
- Numara deseni yalnızca `12.`/`12)` biçimlerini yakalar; "Soru 12" biçimi bu dilimde
  desteklenmez (backlog'a not düşülür, dilim 11'de AI şablonuyla genişletilebilir).
- Taranmış sayfalarda blok tespiti izdüşüm tabanlıdır; iç içe geçmiş şekil/soru düzenlerinde
  yanlış bölebilir — öğretmen düzeltmesi her zaman gerekli kabul edilir (kabul kriteri yalnızca
  metin katmanlı PDF'ler için %90 hedefi taşıyor, taranmış sayfalar için sayısal hedef yok).

## Açık kalan ve onay istenen noktalar

1. Sayfa/boyut sınırları (60 sayfa, 50 MB) — bu ADR'de varsayılan olarak sabitlendi; farklı bir
   tavan isteniyorsa değiştirilebilir.
2. `crop.aiBlockDetect` özellik bayrağının nerede tutulacağı (workspace `settings jsonb` mı,
   yoksa ortam değişkeni mi) — bu dilimde basitçe `false` sabit değer olarak kapalı tutulacak,
   gerçek bayrak altyapısı dilim 11'de.

Onay alındıktan sonra sıra: (A) `pdfjs-dist` kurulumu + worker kopyalama script'i, (B)
`packages/image-tools` saf algoritmalar + testler, (C) yükleme (signed URL + TUS) ve sunucu
doğrulaması, (D) `/tests/[id]/crop` arayüzü, (E) e2e + ekran görüntüleri + öz eleştiri.
