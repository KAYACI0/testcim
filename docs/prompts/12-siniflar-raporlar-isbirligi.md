# Prompt 12: Sınıflar, raporlar, işbirliği, ek çıktılar

## Amaç
Testcim'i tek seferlik bir araçtan kalıcı bir ölçme-değerlendirme çalışma alanına dönüştür: sınıflar, öğrenci gelişimi, karne, ekip işbirliği, DOCX/PPTX çıktısı.

## Önce oku
CLAUDE.md, docs/01 bölüm 5 (madde 6, 9, 10, 11, 14), docs/02 bölüm 6 (classes, students, share_links), docs/03.

## Başlamadan
Plan modunda başla. KVKK açısından öğrenci verisi tasarımını kısaca yaz (en az veri, saklama süresi, silme). Onayımı bekle.

## Kapsam
1. **Sınıflar ve öğrenciler:** sınıf oluştur; Excel/CSV'den öğrenci listesi içe aktar (kolon eşleme adımı, hata satırlarını satır içi göster); öğrenci ekle/düzenle/arşivle. Öğrenci verisi minimum: numara, ad soyad. Toplu silme ve saklama süresi ayarı.
2. **Sonuçları öğrenciye bağlama:** çevrimiçi sınav (Prompt 09) ve optik (Prompt 10) sonuçları öğrenci kaydına bağlanır; bağlanmamışlar için eşleme ekranı.
3. **Raporlar (`/reports`):** sınıf raporu (ortalama, dağılım, en başarılı/zorlanan sorular), kazanım bazlı başarı (Prompt 08 etiketleriyle), öğrenci gelişim grafiği (zaman içinde), zayıf konu listesi. Grafikler sade: ince çizgiler, tek vurgu rengi, gereksiz dekorasyon yok. Karşılaştırma için tablo.
4. **Karne:** öğrenci başına PDF (veli için): sınav sonuçları, kazanım durumu, kısa dilsel özet (yapay zekâ özeti isteğe bağlı, Prompt 11 kredisiyle, taslak/onay ile). Toplu üretim ve ZIP.
5. **Kişiye özel baskı:** sınıf listesinden her öğrenci için adı ve QR'ı basılı kişisel PDF; sızıntı takibi için öğrenciye özel silik filigran seçeneği (Prompt 05 filigran altyapısı). Toplu üretim Worker'da, ilerleme satır içinde.
6. **DOCX çıktısı:** `docx` kütüphanesiyle düzenlenebilir Word; görsel sorular satır içi görsel, zengin sorular metin/denklem (OMML veya render görseli, tercihini ADR'de yaz). `docx_pptx_export` yetkisi.
7. **PPTX çıktısı:** sınıfta gösterim için slayt başına bir soru, isteğe bağlı cevap slaytı; `pptxgenjs`.
8. **Ek dışa aktarımlar:** CSV/Excel soru listesi, QTI veya Moodle XML (araştır, uygun olanı seç, ADR), Google Forms için içe aktarma dostu biçim (uygunsa).
9. **İşbirliği:** sorularda ve testlerde yorumlar (`@` anma), onay durumu (Taslak / İncelemede / Onaylı; yalnızca admin/owner onaylar), test sürüm geçmişi (`test_snapshots`) ve geri yükleme, paylaşım bağlantısı (salt okunur önizleme, süreli).
10. **Denetim ve bildirimler:** basit uygulama içi bildirim listesi; e-posta bildirimi yalnızca anma ve onay isteğinde.

## Testler
- Birim: içe aktarma eşleme, rapor hesapları, kazanım toplulaştırma.
- E2E: liste yükle → sınav sonucu bağla → sınıf raporu → karne PDF → DOCX ve PPTX indir.
- pgTAP: yeni tabloların çapraz kiracı reddi.

## Kabul kriterleri
- 300 öğrencili Excel listesi hatasız içe aktarılıyor.
- Karne ve kişisel baskı toplu üretimi tarayıcıyı dondurmuyor.
- DOCX/PPTX standart Word/PowerPoint'te açılıp düzenlenebiliyor.
- Tümü yeşil; ekran görüntüleri ve öz eleştiri raporda.

## Yapma
- Öğrenci verisini gereksiz alanlarla genişletme (TC kimlik numarası vb. toplama).
- Grafiklerde gradyan/gölge/3B.

## Bitirince
Veri modeli notları, KVKK açısından açık noktalar (hukuki danışman için liste).
