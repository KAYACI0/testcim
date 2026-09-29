# Prompt 05: Yerleşim motoru, canlı önizleme ve PDF çıktısı

## Amaç
Tek yerleşim motorundan hem ekran önizlemesini hem baskıya hazır PDF'i üret. Kitapçık türleri, soru grupları, cevap anahtarı ve çıktı merkezi bu dilimde tamamlanır.

## Önce oku
CLAUDE.md, docs/02 bölüm 5.2 ve 6 (tests, test_items, test_versions, exports), docs/01 bölüm 2 (referans özellikler), docs/03.

## Başlamadan
Plan modunda başla. `LayoutDocument` şemasını ve algoritma seçimlerini (yerleştirme, kitapçık karıştırma) kısa bir tasarım belgesi olarak `docs/adr/` altına yaz, onayımı bekle.

## Kapsam

### A. `packages/layout-engine` (saf TypeScript, DOM yok)
- Girdi: `{ items[], groups[], sections[], settings, versionCode, seed, measure(itemId) }` → çıktı `LayoutDocument { pages[ { size, columns[ { blocks[ { itemId, number, x, y, w, h, scale } ] } ] } ], header, footer, warnings[] }`. Birim milimetre.
- Ayarlar: sayfa boyutu (A4, A3, Letter, özel) ve yönü; sütun 1–3; kenar boşlukları; sütun aralığı; soru aralığı (varsayılan 8 mm, en az 3 mm); numaralandırma biçimi (`1.`, `1)`, `Soru 1`); üst bilgi (kurum, ders, sınıf, tarih, öğrenci bilgi kutusu, yönerge); alt bilgi (sayfa numarası, isteğe bağlı marka satırı); filigran (metin/görsel, açı, opaklık); sayfa rengi.
- Yerleşim modları: `strict` (sıra korunur), `flexible` (bakma penceresi k ile boşluk doldurma, numaralar yeniden atanır), `fit-pages` (N sayfaya sığdır, ölçek alt sınırı 0,85, aşılırsa `warnings`). Sütun dengeleme seçeneği. Gruplar (ortak paragraf/bilgi) hiçbir modda bölünmez. Bölümler yeni sayfada başlayabilir.
- **Kitapçık türleri (A–D):** tohumlu PRNG (mulberry32) ile karıştırma. A sıradadır. Kısıtlar: sabitlenen sorular yerinde kalır, bölüm sınırları korunur, grup içinde karıştırma serbest ama grup bir arada kalır. Aynı tohumla aynı sonuç (test). Metin/zengin sorularda şık karıştırma ve `option_permutations` kaydı (görsel sorularda yalnızca soru sırası).
- **Cevap anahtarı modeli:** her kitapçık için cevap listesi + tüm kitapçıklar arasında soru eşleştirme tablosu.
- Özellik tabanlı testler (fast-check): hiçbir blok sayfa sınırını aşmaz; bloklar çakışmaz; her soru tam bir kez yerleşir; gruplar bölünmez; aynı girdi aynı çıktı; kitapçık permütasyonları geçerli.
- 100 soru için 100 ms altı (benchmark testi).

### B. `packages/renderers`
- **HTML önizleme** (`LayoutDocument` → DOM): kâğıt 2 mm köşe, hafif sayfa gölgesi, tuval üzerinde; yakınlaştırma; sayfa gezinme. Editörde canlı: ayar değiştikçe 100 ms altında yenilenir (Worker'da yerleşim).
- **PDF** (`pdf-lib`, Web Worker içinde): görselleri hedef DPI'ya yeniden örnekle (Taslak 120, Standart 200, Yüksek 300), yinelenen görselleri bir kez göm, dosya boyutu tahmini göster. Filigran, üst/alt bilgi, sayfa numarası, sayfa rengi. Türkçe karakterli gömülü font (IBM Plex Sans alt kümesi; `ğ ş ı İ` test edilir).
- Renderers yerleşim mantığı içermez; yalnızca `LayoutDocument`'ı çizer.

### C. Arayüz (denetçi sekmeleri ve çıktı)
- **Sayfa sekmesi:** boyut, yön, sütun, kenar boşlukları, soru aralığı, numaralandırma, sayfa rengi, filigran, yerleşim modu ("Sırayı koru", "Boşlukları doldur", "N sayfaya sığdır"), üst bilgi editörü (kurum logosu çalışma alanı marka ayarından gelir). Gelişmiş düzen ayarları planla kısıtlıdır (`advanced_layout`): kilitli ayar yanında satır içi kısa not.
- **Kitapçıklar sekmesi:** kitapçık sayısı (plan sınırı), sabitle, soru grubu oluştur/bozan (ortak paragraf metni veya görseli ile), önizlemede kitapçık seçici.
- **Cevaplar sekmesi (Prompt 04'te var):** eşleştirme tablosu görünümü eklenir.
- **Çıktı sekmesi:** tür seçimi (Soru PDF'i, Cevap anahtarı, Çıktı paketi ZIP), kalite (Taslak/Standart/Yüksek), "Çıktı al". Süre, sayfa sayısı, dosya boyutu satır içinde. `pdf_exports_per_month` sayacı `increment_usage` ile; aşımda satır içi not. Serbest planda `remove_branding` kapalıysa alt bilgide sade bir marka satırı.
- **Çıktı geçmişi:** `exports` tablosunda kayıt; imzalı URL ile yeniden indirme; e-postayla gönderme (Resend).
- **Sabitleme:** dışa aktarırken `question_revisions`'a sabitle ve `test_snapshots` kaydı oluştur (yeniden üretilebilirlik).
- **Proje dosyası:** `.testcim` (JSON + varlık listesi, ZIP) dışa/içe aktarma.

### D. Test türlerine özel davranış
Sınav, Test kâğıdı, Deneme (bölümlü, bölüm başına soru kotası), Yazılı (açık uçlu alanlar için cevap boşluğu), Çalışma kâğıdı: her tür için varsayılan ayar önerileri (`export_templates` olarak sistem şablonu). Kaydedilebilir kurum şablonu: mevcut ayarlardan "Şablon olarak kaydet".

## Testler
- Motor: yukarıdaki özellik tabanlı testler + altın `LayoutDocument` anlık görüntüleri.
- PDF: üretilen PDF sayfa sayısı ve boyutlarını doğrula; sayfaları rasterleştirip önizleme ile piksel karşılaştırması (küçük tolerans).
- E2E: 12 soru yapıştır → 2 sütun → 4 kitapçık → PDF indir → cevap anahtarı indir → ZIP.
- Performans: 100 sorulu testte PDF üretimi tarayıcıda 8 sn altı (Standart kalite).

## Kabul kriterleri
- Önizleme ile PDF aynı yerleşimi gösteriyor (görsel karşılaştırma testi yeşil).
- Aynı testin aynı tohumuyla kitapçıklar tekrar üretilebilir; eşleştirme tablosu doğru.
- Onlinetestmaker'daki ayar kümesinin (sütun, kenar boşluğu, filigran, sayfa rengi, sayfa boyutu/yönü, akıllı yerleşim, kitapçık, grup, cevap anahtarı, toplu indirme, e-posta) tamamı mevcut.
- Tümü yeşil; ekran görüntüleri ve öz eleştiri raporda.

## Yapma
- Yerleşim mantığını renderer'a veya bileşene kopyalama.
- PDF'i sunucuda üretme (Vercel sınırları); tarayıcıda Worker'da.
- Gradyan/emoji/kart ızgarası.

## Bitirince
Benchmark sayıları, örnek PDF'ler (tek/çok sütun, kitapçıklı), bilinen sınırlar.
