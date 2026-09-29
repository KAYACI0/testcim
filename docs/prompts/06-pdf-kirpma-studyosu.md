# Prompt 06: PDF kırpma stüdyosu

## Amaç
Öğretmen bir PDF veya görsel yükler; Testcim sayfayı otomatik soru bloklarına böler, soru numarasını siler, öğretmen yalnızca doğrular. Elle kırpma her zaman mümkündür.

## Önce oku
CLAUDE.md, docs/01 bölüm 2 (kırpma aracı) ve 5 (A-2), docs/02 bölüm 5.1 ve 6 (source_documents, crop_sessions), docs/03.

## Başlamadan
Plan modunda başla. `pdfjs-dist` güncel belgesini (Worker kurulumu, metin katmanı) doğrula. Otomatik bölme algoritmasını kısa bir ADR olarak yaz.

## Kapsam
1. **PDF yükleme:** sürükle-bırak ve dosya seç. 20 MB üstü için resumable (TUS) yükleme; PDF `source_documents` olarak saklanır. Sayfa sınırı ve boyut sınırı sunucuda doğrulanır.
2. **Kırpma stüdyosu (`/tests/[id]/crop` veya panel):** sol sayfa küçük resimleri, ortada seçili sayfa (pdf.js, OffscreenCanvas/Worker ile çizim), sağda seçilen soruların listesi. Tam ekran ve klavye kısayolları. Çözünürlük ayarı (yalnızca yeni kırpmaları etkiler). Yarım kalan oturum `crop_sessions` ile devam eder.
3. **Elle kırpma:** fare/dokunma ile dikdörtgen çiz; kenarları yakala ve boyutlandır; çizim biter bitmez **otomatik boşluk kırpma** (Prompt 04'teki `autoTrim`). Enter ile soruyu teste ekle (yakalama hattını yeniden kullan: aynı iyimser ekleme).
4. **Sayfayı otomatik böl:** tek tıkla sayfadaki soru bloklarını öner.
   - Metin katmanı varsa: soru numarası desenleri (`^\d+[.)]`), sütun tespiti (x-histogramı), blok sınırları; sütun okuma sırası.
   - Metin katmanı yoksa (tarama): görüntü işleme ile yatay/dikey izdüşüm boşluklarından blok önerisi; belirsizse yapay zekâ ile blok tespiti seçeneği (Prompt 11'den sonra bağlanır, şimdilik arayüz yuvası ve özellik bayrağı).
   - Öneriler kırpma kutuları olarak gösterilir; öğretmen sürükleyerek düzeltir, çift tıkla siler, "Tümünü ekle" ile toplu gönderir.
5. **Soru numarasını otomatik sil:** metin katmanından numara sınırlayıcı kutusunu bulup beyazla maskele (yerleşim motoru numarayı kendisi ekleyecek). Metin katmanı yoksa elle silgi aracı (fırça boyutu fare tekeriyle) ve geri al. Önce/sonra karşılaştırma tek tıkla.
6. **Kırpma sırasında doğru cevap:** sayfa üzerinde seçili sorunun altında A–E tuşlarıyla işaretleme.
7. **Cevap anahtarı eşleme:** PDF'in sonunda cevap tablosu varsa metin katmanından ayıkla ("1-A 2-C ..." veya tablo) ve öneri olarak sun; onaylayınca sorulara işle. Metin katmanı yoksa arayüz yuvası (Prompt 11'de yapay zekâ ile).
8. **Görsel dosyalar:** JPG/PNG/GIF/WebP yükle, aynı kırpma araçlarını kullan.

## Testler
- Birim: blok tespiti (örnek PDF'lerle: tek sütun, çift sütun, numarasız, yatay), numara maskeleme, cevap tablosu ayrıştırma.
- Örnek PDF seti `packages/image-tools/fixtures` (telifsiz/kendi üretimimiz sentetik PDF'ler; gerçek yayınevi içeriği koyma).
- E2E: 3 sayfalık sentetik PDF → sayfayı otomatik böl → düzelt → teste ekle → sırayı ve numaranın silindiğini doğrula.
- Performans: 30 sayfalık PDF'te sayfa çizimi akıcı; büyük PDF'te tarayıcı donmaz (Worker).

## Kabul kriterleri
- Metin katmanlı sentetik bir PDF sayfasındaki soruların en az %90'ı tek tıkla doğru kutuyla önerilir (ölçüm raporla).
- Numara silme metin katmanlı PDF'lerde tek tıkla çalışır.
- Kırpılan sorular Prompt 04'teki editörde anında görünür.
- Tümü yeşil, ekran görüntüleri ve öz eleştiri raporda.

## Yapma
- Gerçek yayınevi kitap sayfalarını depoya veya test verisine koyma.
- Ağır işi ana iş parçacığında yapma.
- Gradyan/emoji/kart ızgarası.

## Bitirince
Ölçülen tespit başarı oranı, sınırlar ve iyileştirme önerileri.
