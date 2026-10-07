# ADR 0002: Yerleşim motoru, kitapçık karıştırma ve PDF çıktısı

- Durum: Kabul edildi, A bölümü (layout-engine) uygulandı; renderers ve arayüz bekliyor
- Tarih: 2026-09-29
- Kapsam: Dilim 05 (Yerleşim motoru, canlı önizleme ve PDF çıktısı)

## Bağlam

Dilim 00'da `packages/layout-engine` ve `packages/renderers` iskelet olarak açıldı:
`LayoutDocument`/`LayoutBlock`/`LayoutColumn`/`LayoutPage` tipleri ve mm yardımcıları
(`units.ts`) ile `RenderTarget`/`Renderer` arayüzü zaten var. `packages/shared`'da da
`testSettingsSchema` (sayfa, sütun, kenar boşluğu, yerleşim modu) ve `testItemRowSchema`
(`test_items` satırı) v1 olarak tanımlı. Bu ADR, dilim 05'in gerektirdiği eksik parçalar
için somut tasarım kararlarını sabitliyor: `LayoutDocument`'ın soru numarası/grup/ölçek
taşıyacak şekilde genişletilmesi, yerleştirme algoritmaları, tohumlu kitapçık karıştırma
ve cevap anahtarı/eşleme modeli, PDF üretim boru hattı.

## Kararlar

### 1. `LayoutDocument` genişletmesi (`packages/layout-engine/src/types.ts`)

Mevcut `LayoutBlock` yalnızca `{ itemId, x, y, w, h }` taşıyor. Soru grupları (ortak
paragraf) için ayrı bir blok türü ve numaralandırma/ölçek bilgisi eksik:

```ts
export type LayoutBlockKind = 'item' | 'passage';

export interface LayoutBlock {
  readonly kind: LayoutBlockKind;
  readonly itemId: string | null;   // kind = 'passage' iken null
  readonly groupId: string | null;  // gruba ait item'larda ve passage bloğunda dolu
  readonly number: number | null;   // görünen soru numarası; passage bloğunda null
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly scale: number;           // 1 varsayılan; fit-pages'te 0.85–1 arası küçülme
}
```

`LayoutPage`'e `sectionId: string | null` eklenir (bölüm başlığı ve kota gösterimi için,
bölümün hangi sayfada başladığını renderer'ın bilmesi gerekir).

`LayoutDocument` düzeyine şunlar eklenir:

```ts
export interface LayoutHeader {
  readonly institution?: string;
  readonly subject?: string;
  readonly className?: string;
  readonly date?: string;
  readonly studentInfoBox: boolean;
  readonly instructions?: string;
}

export interface LayoutFooter {
  readonly showPageNumber: boolean;
  readonly brandingLine?: string; // Serbest planda remove_branding kapalıysa dolu
}

export interface LayoutWarning {
  readonly code:
    | 'fit_pages_target_exceeded'
    | 'group_does_not_fit_column'
    | 'scale_clamped';
  readonly message: string;
  readonly itemIds: readonly string[];
}

export interface LayoutDocument {
  readonly pageSize: PageSize;
  readonly orientation: PageOrientation;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly pageColor?: string;
  readonly watermark?: {
    readonly text?: string;
    readonly imageAssetId?: string;
    readonly angle: number;
    readonly opacity: number;
  };
  readonly header: LayoutHeader;
  readonly footer: LayoutFooter;
  readonly pages: readonly LayoutPage[];
  readonly warnings: readonly LayoutWarning[];
}
```

Tek bir `LayoutDocument`, tek bir kitapçık türünü (versionCode) temsil eder. 4 kitapçık
istenirse `layoutTest()` 4 kez çağrılır (bkz. §3); sayfa boyutu/ayarlar aynı kalır, yalnızca
soru sırası ve şık permütasyonu değişir. Bu, "önizleme ile PDF aynı yerleşimi gösteriyor"
kabul kriterini basitleştirir: her ikisi de aynı `LayoutDocument`'ı okur.

### 2. `TestSettings` şemasının genişletilmesi (`packages/shared/src/schemas.ts`)

Mevcut şema yalnızca `a4|letter` ve `numeric|alpha` destekliyor; dilim 05 A3/özel boyut ve
`1.`/`1)`/`Soru 1` biçimlerini istiyor. Geriye uyumlu (yalnızca ekleyerek) genişletme:

```ts
export const PAGE_SIZES = ['a4', 'a3', 'letter', 'custom'] as const;
export const NUMBERING_FORMATS = ['dot', 'paren', 'labeled'] as const; // "1.", "1)", "Soru 1"
export const COLUMN_BALANCE_MODES = ['off', 'balance'] as const;
```

`numeric|alpha` iki farklı ekseni (numaralandırma biçimi vs. harf/rakam) karıştırıyordu;
dilim 05 yalnızca biçim istediği için `dot|paren|labeled` olarak netleştiriliyor
(`alpha` harf kitapçık kodları A–D ile karışıyordu, kaldırılıyor). `customWidthMm`/
`customHeightMm` (yalnızca `pageSize = 'custom'` iken zorunlu), `columnBalance`, ve
`header`/`footer`/`watermark` alanları düz string yerine yapılandırılmış nesnelere
taşınıyor (`LayoutHeader`/`LayoutFooter`/watermark ile birebir eşleşecek şekilde).
`schemas.test.ts`'teki mevcut testler bu değişikliklerle güncellenecek (davranış kırılıyor,
ama dilim 04 bu alanları henüz UI'da tüketmiyor — bkz. `git status`, ayarlar sekmesi bu
dilimde geliyor).

Var olan `versions_per_test`, `pinned` (test_items), `test_sections.quota` zaten veri
modelinde var; bu ADR onlara dokunmuyor.

### 3. Yerleştirme algoritması

`layoutTest(input, versionCode): LayoutDocument` tek giriş noktası. Adımlar:

1. **Kitapçık sırası** (§4) uygulanır → `orderedItemIds` (grup sınırı ve sabitleme
   korunarak).
2. **Yükseklik ölçümü**: `measure(itemId, columnWidthMm): { heightMm: number }` senkron
   callback'i her item için çağrılır. Genişlik her zaman sütun genişliğine eşitlenir
   (görsel bu genişliğe oranlı ölçeklenmiş kabul edilir); bu yüzden `measure` sütun
   genişliğini parametre alır — tek sütunda ve üç sütunda aynı görsel farklı yükseklik
   verir. `apps/web` tarafında bu callback, asset genişlik/yükseklik oranından hesaplanan
   saf bir fonksiyondur (DOM ölçümü gerekmez), böylece motor saf ve senkron kalır.
3. **Yerleştirme modu**:
   - `strict`: `orderedItemIds` sırasıyla sütunları soldan sağa, üstten alta doldurur.
     Grup bloğu (passage + üyeleri) bölünmezse olduğu gibi yerleşir; sığmıyorsa bir
     sonraki sütuna/sayfaya taşınır (`group_does_not_fit_column` uyarısı yalnızca grup
     tek bir sütuna hiç sığmıyorsa — örn. sayfa yüksekliğinden büyük).
   - `flexible`: aynı doldurma, ama bir öğe mevcut sütuna sığmıyorsa ileriye bakma
     penceresi `k` (varsayılan 3) içinde sığan bir sonraki öğeyle yer değiştirilir
     (boşluk doldurma). Görünen numaralar yeniden atanır (`number` alanı, orijinal
     `test_items.position` sırasından bağımsızlaşır) — cevap anahtarı yine `itemId`
     üzerinden eşlenir, numara yalnızca görünümdür.
   - `fit-pages`: hedef sayfa sayısı `fitPagesTarget`. `scale = 1.0`'dan başlayıp
     `fitPagesScaleMin` (0.85) sınırına kadar 0.01 adımlarla azaltarak her adımda tam bir
     `strict` yerleştirme denemesi yapılır (item yükseklikleri `scale` ile çarpılır);
     hedef sayfa sayısına ilk ulaşan `scale` kullanılır. `scaleMin`'de bile sığmıyorsa
     `scaleMin` ile yerleştirilir ve `fit_pages_target_exceeded` uyarısı eklenir (sayfa
     sayısı hedefi aşar, veri kaybı olmaz — "Yapma" bölümü sessiz veri kaybını yasaklıyor).
   - **Sütun dengeleme** (`columnBalance: 'balance'`): bir sayfa/bölüm için toplam içerik
     yüksekliği sütun sayısına bölünür, doldurma bu hedefe göre sütun değiştirir (klasik
     "dolu-boş" değil, toplam yükseklik dengeli dağıtılır). Yalnızca `strict`'te farklı
     davranır; `flexible` zaten boşluk doldurduğu için dengelemeyi zımnen yapar.
4. **Bölüm sınırları**: `section.startsNewPage` true ise, o bölümün ilk öğesi yeni sayfanın
   ilk sütununda başlar (mevcut sayfa yarım da olsa).
5. **Numaralandırma**: `flexible` dışında `test_items` sırasına bağlı sabit numara;
   `flexible`'da yerleşim sırasına göre yeniden numaralandırma.

Motor **saf ve senkron**dır; hiçbir I/O yapmaz, `measure` dışında yan etkisi yoktur. Bu,
100 soru < 100 ms bütçesini test edilebilir kılar (fast-check + `performance.now()`
benchmark testi, CI'da alt sınır değil üst sınır olarak izlenir).

### 4. Kitapçık karıştırma (A–D)

`packages/layout-engine/src/prng.ts`: mulberry32 (32-bit, bağımlılıksız, ~10 satır,
literatürde yaygın referans implementasyon). Tohum türetimi:

```ts
function versionSeed(baseSeed: number, versionCode: string): number {
  // versionCode 'A' = 0, 'B' = 1, ... — 'A' için offset 0, şart: A hep sıradadır.
  const index = versionCode.charCodeAt(0) - 'A'.charCodeAt(0);
  return (baseSeed + index * 0x9e3779b9) >>> 0; // golden-ratio karıştırma, taşma sarmalanır
}
```

`versionCode === 'A'` için karıştırma hiç uygulanmaz (spec: "A sıradadır"), diğerleri için
`versionSeed` ile başlatılan mulberry32 akışı kullanılır.

Algoritma (Fisher–Yates, kısıtlı):
1. Öğeler bölüm bazında gruplanır (bölüm sınırı asla aşılmaz).
2. Her bölüm içinde, `pinned = true` öğeler konumlarında sabit kalır; kalan konumlar için
   bir "karıştırılabilir konum listesi" çıkarılır.
3. Gruba ait (`group_id` dolu) öğeler tek bir birim olarak ele alınır: grup, grubun ilk
   üyesinin orijinal konumuna yerleştirilir ve grup *içindeki* sıra da aynı PRNG akışıyla
   ayrıca karıştırılır (spec: "grup içinde karıştırma serbest").
4. Kısıtlı Fisher–Yates: karıştırılabilir birimler (tekil öğe veya grup) mulberry32 akışıyla
   permüte edilir; sabitlenmiş konumlar sabit kalır, diğerleri kalan konumlara sırayla
   dağıtılır.
5. **Şık permütasyonu**: yalnızca `item.kind === 'rich'` (görsel değil, metin/zengin soru)
   ve `item.optionCount` tanımlıysa, aynı PRNG akışından bir sonraki değerlerle
   `optionCount` elemanlı bir permütasyon üretilir → `option_permutations[itemId]`.
   Görsel sorularda şıklar görselin içinde olduğu için hiç karıştırılmaz (yalnızca soru
   sırası karışır) — spec ile birebir.

Belirlenimcilik testi: aynı `(items, groups, sections, seed, versionCode)` girdisiyle iki
ayrı çağrı bit-bir-bit aynı `orderedItemIds` ve `option_permutations` üretir (fast-check
ile rastgele girdi kümeleri üzerinde doğrulanır).

### 5. Cevap anahtarı ve eşleme tablosu

`packages/layout-engine/src/answer-key.ts`, `layoutTest`'ten bağımsız ama aynı sıralama
çıktısını (`orderedItemIds`, `optionPermutations`) girdi alan saf bir fonksiyon:

```ts
export interface BookletAnswerEntry {
  readonly itemId: string;
  readonly questionId: string;
  readonly number: number;               // bu kitapçıktaki görünen numara
  readonly correct: AnswerKey;           // option_permutations uygulanmış hâliyle
}

export interface VersionMappingRow {
  readonly questionId: string;
  readonly byVersion: Readonly<Record<string, number>>; // versionCode -> o kitapçıktaki numara
}

export interface AnswerKeyBundle {
  readonly booklets: Readonly<Record<string, readonly BookletAnswerEntry[]>>; // versionCode -> liste
  readonly mapping: readonly VersionMappingRow[]; // A'nın sırasına göre satırlar
}
```

`correct` alanı, mcq/match/order tiplerinde `option_permutations`'a göre yeniden
etiketlenir (öğrencinin gördüğü şık harfi ile eşleşsin diye); görsel sorularda değişmez.
Bu bundle, `renderers`'ın "cevap anahtarı" ve "eşleştirme tablosu" çıktısı için tek
kaynaktır; `test_versions.item_order`/`option_permutations` sütunlarına da aynı veri
yazılır (yeniden üretilebilirlik — dışa aktarımda `test_snapshots`'a gömülür).

### 6. Renderer ayrımı (`packages/renderers`)

- **HTML önizleme**: `renderHtml(doc: LayoutDocument): string` — kaçışlı (escaped) HTML
  string üretir, DOM API'sine dokunmaz (paket kuralı: React/DOM bağımlılığı yok).
  `apps/web`'deki `PaperCanvas` bunu `dangerouslySetInnerHTML` ile monte eder; tüm serbest
  metin alanları (kurum adı, yönerge, marka satırı) renderer içinde HTML-escape edilir.
  Worker'da çalışır (ayar değiştikçe < 100 ms yeniden hesap bütçesi `layoutTest` +
  `renderHtml` toplamına aittir).
- **PDF**: `renderPdf(doc: LayoutDocument, assets: PdfAssetInput[], fontBytes: Uint8Array, options): Promise<Uint8Array>`
  saf/async ama I/O'suz bir fonksiyon — `pdf-lib` kullanır, görsel indirme/DPI yeniden
  örnekleme ve font dosyası okuma çağıran tarafın (apps/web Worker sarmalayıcısı) işidir.
  Yinelenen görseller `sha256`'a göre tekilleştirilip PDF'e bir kez gömülür (`assets`
  girdisi `sha256 -> bytes` map'i olarak, `LayoutBlock.itemId -> sha256` eşlemesi ayrı
  geçilir). IBM Plex Sans alt kümesi `apps/web/public/fonts/`'tan okunup Worker'a
  aktarılır; `ğ ş ı İ` glifleri için subset script'i `scripts/`'e eklenir (ayrı görev,
  bu ADR kapsamı dışı — backlog'a not düşülür).
- Her iki renderer da `LayoutDocument`'ı okuyucu (read-only) olarak alır; hiçbiri
  yerleştirme kararı vermez (piksel/mm dönüşümü hariç — bu saf bir birim çevrimi).

### 7. Test stratejisi (özet)

- `packages/layout-engine`: fast-check ile üstteki 6 özellik (sayfa sınırı aşılmaz,
  çakışma yok, her soru tam bir kez, grup bölünmez, determinizm, permütasyon geçerliliği)
  + `versionSeed`/mulberry32 birim testleri + 100 soru < 100 ms benchmark testi (Vitest
  `bench` değil, `performance.now()` ile üst sınır assert — CI ortam farklılıkları için
  gevşek bir tavan, örn. 300 ms, kullanılır; ADR'de not: sıkı 100 ms yerel geliştirme
  hedefi, CI toleransı ayrı sabit).
- `packages/renderers`: `renderPdf` çıktısının sayfa sayısı/boyutu `pdf-lib` ile geri
  okunup doğrulanır; piksel karşılaştırması (rasterleştirme) dilim 05 kapsamında `pdfjs-dist`
  ile sayfa render edip küçük toleranslı görüntü diff'i olarak eklenir.

## Uygulama notları (2026-10-07)

Kullanıcı Faz 1'i onayladı (docs/04); aşağıdaki üç açık nokta ADR'nin kendi önerileriyle kapatıldı:

1. **Numaralandırma biçimi:** kırıcı değişiklik yapılmadı. Yeni değerler (`dot|paren|labeled`) arayüz bu alanı okumaya başladığında eskilerin yanına eklenecek. `layout-engine` şu an numara biçimi üretmez, yalnızca sıra numarasını (`number`) verir.
2. **Sütun dengeleme:** "en boş sütuna ekle" yerine sıra korunarak sayfa başına en küçük sütun yüksekliğinin ikili aramayla bulunması uygulandı (okuma sırası bozulmaz, belirlenimci, özellik testi: sayfa sayısı ve sıra değişmez, hiçbir sayfa uzamaz).
3. **Font:** tam IBM Plex Sans gömülür, altkümeleme PDF gömme sırasında yapılır (docs/adr/0011).

Uygulanan (`packages/layout-engine`): tipler (§1, `LayoutBlock.kind/number/scale`, uyarılar, `LayoutResult`), `layoutTest` (strict, flexible, fit-pages, sütun dengeleme, bölüm yeni sayfa, grup bölünmez), `orderBooklet` (mulberry32, sabitleme, bölüm sınırı, grup tek birim, şık permütasyonu yalnızca metin çoktan seçmeli), `buildAnswerKeys` (kitapçık başına anahtar, sürüm eşleme tablosu), `pageDimensions` (A3, A4, A5, Letter, özel). Motor saf ve senkrondur, `zod`/DOM bağımlılığı yoktur; yükseklikler `measure` geri çağrısıyla gelir.

Doğrulama: 48 test (birim + fast-check: her soru ve metin bloğu tam bir kez, sayfa gövdesi ve kenar boşluğu aşılmaz, çakışma yok, numaralar 1..n, belirlenimcilik, dengeleme sırayı korur, fit-pages alt sınırı ve uyarısı, kitapçık kısıtları, cevap anahtarındaki harfin görünen doğru şıkkı göstermesi). Motoru bilerek bozan dört mutasyon testler tarafından yakalandı. 100 soru, 3 sütun, esnek mod ve dengeleme 300 ms tavanının çok altında (ürün hedefi 100 ms).

Editördeki `features/editor/paper/paginate.ts` artık ayrı bir algoritma değil, motorun strict modunun ince bir adaptörü. Eski algoritma testte referans (oracle) olarak tutuldu; 1500 rastgele girdide birebir aynı sonucu verir.

**Uygulama notları, B bölümü (renderers ve arayüz):** §6'daki iki ayrı renderer yerine tek bir ara katman yazıldı: `paintTest(LayoutDocument, içerik)` her sayfayı çizim komutlarına (metin, çizgi, kutu, görsel; mm cinsinden) çevirir, `renderPaintPdf` bunları pdf-lib'e (gömülü Plex, vektör metin, görsel orijinal çözünürlükte) ve `renderPaintHtml` bunları kaçışlı mutlak konumlu HTML'e çizer. Önizleme, yazdırma ve PDF aynı komut listesini çizdiği için birbirinden ayrışamaz. Üstbilgi/altbilgi yükseklikleri motora çizilerek ölçülür (`frameMetrics`), yani motorun ayırdığı yer ile çizilen yer aynıdır. Metin, gömülen fontun glif genişlikleriyle ölçülür (`createTextMeasure`), PDF'in çizdiğiyle birebir.

Editör (`features/editor/paper`): `paper-layout.ts` (saf: öğeler ve ayarlar girdi, çizim sayfaları çıktı), `paper-view.tsx` (sayfaları bağlar, seçim ve şablon düzenleme düğmesi), PDF ayrı bir Web Worker'da (`paper-pdf.worker.ts`). Eski DOM akışlı kâğıt (`paper-parts`, `use-paper-model`, `paginate`) ve `html2canvas-pro`/`jspdf` bağımlılıkları kaldırıldı.

Doğrulama: renderers 40 test (PDF `pdfjs` ile geri okundu: Türkçe metin, görsel sayısı, sayfa boyutu, altkümeleme; HTML kaçışı ve adres allowlist'i; palet `tokens.css` ile aynı). Gerçek veriyle E2E (`e2e/paper-pdf.spec.ts`): yerel Storage'a yüklenen gerçek PNG'ler, çapraz kaynak görsel yükleme, kâğıtta seçim, yazdırma kopyası, PDF indirme ve geri okuma (12 görsel, Türkçe metin, cevap formu ve anahtarı, sayfa numaraları). Ekran görüntüleri 1440/1024/390 alındı.

Kalan: `TestSettings` şemasının genişletilmesi (§2, arayüz tüketince).

## Açık kalan ve onay istenen noktalar

1. `NUMBERING_FORMATS`'ı `numeric|alpha` → `dot|paren|labeled` olarak değiştirmek
   (§2) `schemas.test.ts`'te var olan testleri kırıyor ama henüz hiçbir UI/RPC bu alanı
   okumuyor. Onay: değiştirilsin mi, yoksa yeni değerler eskiyle birlikte mi tutulsun?
2. Sütun dengeleme (§3.3) için "toplam yükseklik dengeleme" mi yoksa daha basit
   "en boş sütuna ekle" (greedy) mi tercih edilsin? Öneri: greedy — daha basit, deterministik
   ve fast-check ile test edilmesi daha kolay; "dengeleme" hissi pratikte yeterli.
3. Font alt kümeleme script'i (§6) bu dilimde mi yazılsın yoksa var olan bir tam IBM Plex
   Sans TTF/OTF mu gömülsün (alt kümeleme performans/boyut optimizasyonu, MVP'yi
   engellemez)? Öneri: MVP'de tam font gömülsün, alt kümeleme `docs/backlog.md`'ye.

Onay alındıktan sonra kapsam A–D sırasıyla uygulanır: önce `layout-engine` (şema + saf
motor + testler), sonra `renderers` (HTML + PDF), sonra arayüz sekmeleri.
