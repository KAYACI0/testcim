# ADR 0007: Prompt 12 dar kapsamlı render motoru ve DOCX zengin soru kararı

## Durum

Kabul edildi (Prompt 12, PR3: `@testcim/renderers` karne/kişisel baskı/DOCX/PPTX).

## Bağlam

Prompt 12, karne, kişiye özel baskı ve DOCX/PPTX çıktısının Prompt 05'in genel amaçlı
PDF/render motoru üzerine kurulacağını varsayıyordu. Kod tabanı incelendiğinde
`packages/renderers` ve `packages/layout-engine`'in yalnızca tip iskeleti olduğu,
hiçbir gerçek yerleştirme/render mantığının yazılmadığı ortaya çıktı. Kullanıcıyla
konuşulup **"önce dar kapsamlı bir render motoru kur, Prompt 05'in genel motorunu
şimdi inşa etme"** kararı onaylandı.

## Kararlar

### 1. `LayoutDocument` okunmuyor — dar amaçlı girdi tipleri

`packages/renderers/src/pdf-report-card.ts`, `pdf-personalized-print.ts`,
`docx-export.ts`, `pptx-export.ts` hiçbiri `@testcim/layout-engine`'in
`LayoutDocument`'ını almıyor; her biri kendi amacına özgü, küçük bir girdi arayüzü
tanımlıyor (`ReportCardData`, `PersonalizedPrintOptions`, `ExportTestData`,
`PptxExportData`). Gerekçe: `LayoutDocument` şu an gerçek soru içeriği (metin,
görsel, seçenek) taşımıyor — yalnızca konum/boyut. Rapor/fatura tarzı bu dört
renderer, `packages/omr/src/pdf.ts`'teki (depodaki tek çalışan pdf-lib örneği)
"doğrudan pdf-lib, manuel Y-imleç" desenini izliyor. Çoklu sütun/kitapçık/soru
karıştırma gerektiren genel yerleşim motoru (Prompt 05) ayrı bir iş olarak kalıyor
— bkz. docs/backlog.md.

### 2. "Kişiye özel baskı" — kapak sayfası, tam yeniden dizim değil

`docs/prompts/12` § 5, öğrenci başına kişiselleştirilmiş baskıdan bahsediyor; bu,
tam soru kağıdını öğrenci başına yeniden dizmek olarak da okunabilirdi, ama bu genel
yerleşim motorunu gerektirir. Bunun yerine `addPersonalizedCoverPage` var olan sınav
PDF'inin (Prompt 05/09 çıktısı) başına öğrenci adı/numarası + QR yer tutuculu bir
kapak sayfası ekliyor (`pdf-lib`'in `PDFDocument.load` + `copyPages`/`addPage`'i) ve
filigranı tüm sayfalara (kapak dahil) döşüyor. Kullanıcıyla onaylanan yorum budur.

### 3. Filigran — döşenmiş metin, pdf-lib ile

`packages/renderers/src/watermark.ts` — `drawTiledWatermark(page, options, font)`,
`page.drawText`'in `rotate`/`opacity` desteğini kullanarak sayfayı bir ızgarada
tekrarlayan metinle dolduruyor. Öğrenciye özel filigran metni (`"{ad} - {numara}"`)
DB'de saklanmıyor; render anında çağıran tarafından interpole edilip parametre
olarak geçiriliyor.

### 4. DOCX zengin soru render kararı: render edilmiş görsel, OMML değil

Zengin/formül/görsel sorular DOCX'e Office Math Markup (OMML) yerine **render
edilmiş PNG** olarak gömülüyor (`ImageRun`). Alternatif — MathML'i OMML'ye çevirmek
— bu depoda hiçbir dönüştürme kütüphanesi/kodu yok; kurmak ayrı, doğrulanmamış bir iş
olurdu. Render-görsel yaklaşımı, soru önizlemesinde zaten kullanılan render yolunu
(`features/rich-editor/render/doc-to-html.ts`) tekrar kullanma potansiyeli taşıyor —
ama bu ADR'nin kapsamı yalnızca renderer paketini kurmak; gerçek `test_items` →
`ExportQuestion` (PNG rasterizasyonu dahil) eşlemesi henüz yazılmadı (bkz.
docs/backlog.md, "DOCX/PPTX export'un gerçek soru verisiyle bağlanması").

**Ödünleşim:** Exported zengin sorular Word'de düzenlenemez, yalnızca görüntülenir.
Kabul edilebilir: DOCX/PPTX export'un amacı öğretmenin sonradan küçük metin
düzeltmeleri yapabilmesi (plan soruları, cevap anahtarı), zengin/formül soruları
yeniden düzenlemek değil.

### 5. PPTX — soru başına slayt

`pptxgenjs` ile bir başlık slaytı + soru başına bir slayt (metin veya görsel stem +
seçenekler + isteğe bağlı cevap satırı). DOCX ile aynı render-görsel kararını
paylaşıyor.

### 6. Bilinen kısıt: Türkçe karakter kodlaması

Dört renderer da pdf-lib'in yerleşik WinAnsi Helvetica'sını (PDF çıktıları) veya
docx/pptxgenjs'in varsayılan fontlarını kullanıyor. ı/İ/ğ/Ğ/ş/Ş, pdf-lib tarafında
`packages/omr/src/pdf.ts`'ten miras alınan bilinen bir kısıt (bkz. docs/backlog.md,
"Dilim 00'den kalanlar"); karne gibi gerçek öğrenci adı içeren çıktılarda etkisi daha
büyük. Gerçek bir Unicode font bundle edip `@pdf-lib/fontkit` ile embed etmek bu
dilimde yapılmadı — bu ortamda internet erişimi yok, gerçek bir font dosyası
indirilemedi; ayrı bir dilimde ele alınmalı.

### 7. Yetki kapısı — `docx_pptx_export`

`apps/web/src/features/exports/actions.server.ts`, `requireFlag(workspaceId,
'docx_pptx_export')`'ı DOCX/PPTX export'tan önce çağırıyor — bu, `requireFlag`'in
kod tabanındaki ilk gerçek çağrı noktası. Anahtar `packages/shared`'ın
`entitlementsSchema`'sında ve `supabase/migrations/20250101000003_plans.sql`'deki
plan tohum verisinde zaten vardı; yeni migrasyon gerekmedi.
