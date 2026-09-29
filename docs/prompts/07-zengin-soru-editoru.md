# Prompt 07: Zengin soru editörü, denklem ve çizim aracı

## Amaç
Görsel yapıştırmanın yanında, öğretmen soruyu doğrudan Testcim'de yazabilsin: metin, denklem, tablo, geometrik şekil. Bu sorular yerleşim hattına yüksek DPI görsele dökülerek girer.

## Önce oku
CLAUDE.md, docs/02 bölüm 2 (Zengin metin, Denklem, Çizim), 5.2 (zengin soruların render görseli) ve 6 (questions.stem_rich, options), docs/03.

## Başlamadan
Plan modunda başla. Kararları doğrula: TipTap uzantı seti, MathLive/KaTeX entegrasyonu, çizim aracı (Konva tabanlı özel araç). Lisansları kontrol et (tldraw ve Excalidraw kullanılmayacak). Açık soru (3) için JSXGraph gibi bir grafik motorunun yalnızca fonksiyon grafiği için hibrit kullanımını lisansı doğrulayarak değerlendir ve önerini yaz.

## Kapsam
1. **Soru editörü paneli:** soru kökü (zengin metin), şıklar (A–E, 2–6 şık, her şık zengin metin/denklem/görsel), doğru cevap, puan, açıklama/çözüm alanı. Soru türleri: çoktan seçmeli, doğru-yanlış, boşluk doldurma, eşleştirme, açık uçlu, sayısal cevap, sıralama.
2. **TipTap tabanlı editör:** kalın/italik/altı çizili, üst/alt simge, listeler, tablo, görsel ekleme (yapıştırma hattıyla aynı: panoda görsel varsa editöre gömer), ayırıcı çizgi. Türkçe klavye ve yazım denetimi dostu.
3. **Denklem aracı:** MathLive ile satır içi ve blok denklem; kesir, kök, üs, indis, semboller, Yunan harfleri, matris. LaTeX olarak saklanır, KaTeX ile gösterilir. Ayrı bir sembol paleti (arayüz stili tasarım sistemine uygun, MathLive'ın varsayılan görünümü özelleştirilir). LaTeX yapıştırma desteği.
4. **Çizim aracı (geometri):** SVG/Konva tabanlı kanvas. Araçlar: doğru/doğru parçası, çokgen, daire, yay, açı işareti, dik açı işareti, eş uzunluk işaretleri, noktalar ve etiketler (indisli), ölçü çizgisi, koordinat düzlemi (ızgara, eksenler), fonksiyon grafiği (y = f(x) girişi ile), ok, metin. Yakalama (snap), ızgara, hizalama kılavuzları, katman sırası, kopyala-yapıştır, geri al. Çıktı: soruya gömülen SVG (düzenlenebilir kaynak `stem_rich` içinde saklanır) ve render için raster.
5. **Render görseli:** kaydederken soru DOM'u yüksek DPI'lı PNG'ye dökülür (`kind = render` asset). Yerleşim motoru bunu görsel soru gibi ölçer ve yerleştirir. Düzenlenince yeniden render; eski asset yetim işaretlenir.
6. **Kısayollar:** yeni soru `Ctrl+Enter`, denklem `Ctrl+M`, çizim `Ctrl+D`. Tüm kısayollar komut paletinde ve ipucu (Kbd) olarak görünür.
7. **Grup paragrafı:** soru grubu için ortak paragraf metni aynı editörle yazılır (Prompt 05'teki grup).
8. **Erişilebilirlik:** denklem ve çizimler için alternatif metin alanı.

## Testler
- Birim: LaTeX kaydet/yükle gidiş-dönüş, render boyut ölçümü, çizim nesnesi serileştirme.
- E2E: soru yaz → denklem ekle → şekil çiz → teste ekle → PDF'te doğru göründüğünü doğrula (piksel karşılaştırma).
- Türkçe karakterler ve İ/ı içeren metinlerin render doğrulaması.

## Kabul kriterleri
- Bir lise matematik sorusu (kesir, kök, üs, üçgen şekli, açı etiketleri) 3 dakika içinde yazılıp teste eklenebiliyor.
- Zengin sorular PDF'te keskin (300 DPI'da bulanıklık yok).
- Yeniden açıldığında tüm öğeler düzenlenebilir.
- Tümü yeşil; ekran görüntüleri ve öz eleştiri raporda.

## Yapma
- MathLive'ın ya da TipTap'in hazır görünümünü olduğu gibi bırakma; tasarım sistemine uydur.
- Gradyan/emoji/yapay zekâ klişesi simgeleri.

## Bitirince
Lisans notları, çizim aracı kararı, bilinen sınırlar.
