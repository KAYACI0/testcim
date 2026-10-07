# ADR 0011: PDF çıktılarında tek ortak Türkçe yazı tipi

- Durum: Kabul edildi
- Tarih: 2026-10-07
- Kapsam: Faz 1, madde 1 (docs/04-yol-haritasi.md)

## Bağlam

Üretilen tüm PDF'ler (OMR formu, karne, kişiye özel kapak ve ileride `layout-engine` çıktısı) pdf-lib'in yerleşik Helvetica yazı tipini kullanıyordu. Bu yazı tipi WinAnsi kodlamalıdır ve ı, İ, ğ, Ğ, ş, Ş harflerini kodlayamaz (`widthOfTextAtSize('ı')` hata verir). Karnede gerçek öğrenci ve sınıf adları basıldığı için bu doğrudan ürün hatasıydı. Dört yerde ayrı ayrı çözülmemesi için tek ortak karar gerekiyordu.

## Karar

1. **Aile: IBM Plex Sans** (SIL OFL 1.1). Web arayüzünün tek ailesi olarak docs/03'te zaten seçilmiş. Basılı çıktı ile ekran aynı dili konuşur. Üç ağırlık: Regular (400), Medium (500), SemiBold (600). Üç ağırlığın hepsi `ığşİĞŞçÇöÖüÜâîû` harflerinin tamamını içerir (testle doğrulanır).
2. **Kaynak:** IBM'in resmi deposundaki TTF dosyaları, değiştirilmeden. OFL'deki ayrılmış ad ("Plex") nedeniyle dosyalar altkümelenip yeniden dağıtılmaz. Altkümeleme yalnızca PDF'e gömme sırasında yapılır (belgeye gömme OFL ile serbesttir). Lisans metni `apps/web/public/fonts/OFL.txt`.
3. **Tek konum:** `apps/web/public/fonts/`. Tarayıcı ve Worker oradan `fetch` eder, sunucu eylemleri diskten okur, testler depo kopyasını okur. Dosya çoğaltılmaz.
4. **Paket:** `packages/pdf-fonts` (`@testcim/pdf-fonts`). `embedPdfFonts(doc, bytes)` fontkit'i kaydeder ve üç ağırlığı `subset: true` ile gömer. Paket G/Ç yapmaz, bayt dizilerini çağıran verir (renderers'ın "saf, G/Ç'siz" sözleşmesi korunur). `./node` girişi Node okuyucusunu, ana giriş tarayıcı `fetch` okuyucusunu sunar.
5. **Renderer imzaları:** `renderOmrFormPdf`, `renderReportCardPdf` ve `addPersonalizedCoverPage` son parametre olarak `PdfFontBytes` alır. Karne ve kapakta "kalın" yuvası SemiBold'dur (docs/03 ağırlıkları).
6. **Sunucuda dağıtım:** `next.config.ts` içinde `outputFileTracingIncludes: { '/*': ['./public/fonts/*.ttf'] }` ile TTF dosyaları her sunucu izine eklenir (aksi halde Vercel fonksiyonunda dosya bulunmayabilir).

## Doğrulama

- `packages/pdf-fonts`: üç ağırlıkta Türkçe harf kapsamı, Helvetica'nın 'ı'da hata verdiği (gerileme kanıtı), gömme, altkümeleme (kısa sayfa 100 KB altında), `fetch` yükleyici.
- Karne PDF'i `pdfjs-dist` ile geri okundu, metin birebir çıktı: `Öğrenci Karnesi`, `Şule Işıkçağlar`, `İlkbahar Yazılısı`, `Çarpanlara ayırma`. Tek sayfa 12,7 KB.

## Kapsam dışı

- DOCX ve PPTX Unicode metin belgeleridir, kodlama sorunu yoktur. Yazı tipi olarak alıcı bilgisayarın varsayılanını kullanırlar; Plex'in dosyaya gömülmesi bu kararın parçası değildir.
- Sunucu eyleminin Vercel'de gerçek dağıtımda dosyayı bulduğu henüz denenmedi (yalnızca yerel `next dev`).
