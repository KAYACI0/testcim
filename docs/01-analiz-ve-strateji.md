# Testcim: Analiz ve Strateji

## 1. Ürün tanımı

Testcim, öğretmenlerin ve kurumların soru hazırlama, test/sınav oluşturma, baskıya hazır PDF üretme, optik okuma ve çevrimiçi sınav süreçlerini tek yerde ve olağanüstü hızlı yönettiği profesyonel bir platformdur.

**Çekirdek vaat:** Ekran alıntısı al, Ctrl+V yap, soru testin içinde. Ardından tek tıkla baskıya hazır PDF.

**Kuzey yıldızı metrikleri**
- Kayıttan ilk PDF'e kadar geçen süre: 3 dakikanın altında.
- Yapıştırma anından soru küçük resminin görünmesine kadar: 150 ms altında (iyimser arayüz, yükleme arka planda).
- 50 soruluk testin PDF'e dönüşmesi: 8 sn altında (tarayıcıda).

**Hedef kitle:** okul öğretmenleri (birincil), dershane/kurs ve etüt merkezleri, yayınevleri ve içerik üreticileri, okul yönetimleri.

**Kapsam notu:** Bu analiz onlinetestmaker.net'in herkese açık sayfalarından (ana sayfa, yardım, fiyatlandırma) çıkarılmıştır. Giriş yapılmış uygulamada burada görünmeyen ek davranışlar olabilir. Uygulamayı bir kez baştan sona gezip eksik gördüğün özellikleri not etmen, kapsamı netleştirir.

## 2. Referans analiz: onlinetestmaker.net

| Alan | Gözlenen özellik |
|---|---|
| Soru yükleme | Sürükle-bırak, toplu ve klasör yükleme; JPG, PNG, GIF; testte en fazla 100 soru |
| Kırpma aracı | PDF ve görselden kırpma; kenar boşluğunu otomatik temizleme; kırpılan soruyu düzenleme (soru numarasını silme); kırpma sırasında doğru cevabı işaretleme; PDF çözünürlük ayarı; yarım kalan kırpmaya devam etme |
| Soru düzenleyici | Yazılı soru, denklem aracı (kesir, kök, üs, semboller), geometrik şekil çizim aracı |
| Düzenleme | Sürükleyerek sıralama, silme, yakından önizleme, soru başına doğru cevap işaretleme |
| Test türleri | Sınav, Test Kâğıdı, Deneme (mock test) |
| Çoklu sürüm | Sınav ve denemede A, B, C, D; A'daki sıraya göre diğerleri rastgele karıştırılır |
| Soru grubu | Ortak paragraf/bilgi altında bağlı sorular; sürümlerde birbirinden ayrılmaz, grup içinde yer değiştirebilir |
| Gelişmiş ayarlar | Akıllı soru yerleşimi, filigran, sayfa rengi, sayfa boyutu ve yönü, sütun sayısı, kenar boşlukları |
| Özel etiketler | Test adına eklenen etiketlerle sayfa numarası, açıklama alanı, büyük harf, ortalama, sürüm gizleme, filigran açısı kontrolü |
| Çıktı | Soru PDF'i, cevap anahtarı PDF'i (tüm sürümler ve soru eşleştirme tablosu), toplu indirme, e-postayla gönderme |
| Taslak | `.db` dosyası olarak indirip geri yükleme |
| Boşluk ayarı | Sorular arası varsayılan 10 mm, en az 5 mm |
| Optik okuyucu | Telefon kamerasıyla cevap kâğıdı tarama, istatistik, soru analizi, Excel/PDF dışa aktarım |
| Çevrimiçi sınav | Süreli sınav yayınlama, istatistik, soru analizi, Excel dışa aktarım, eşzamanlı sınav |
| Diğer | 18 dil, koyu tema, HTML iframe desteği, çoklu kullanıcı, Free/Pro/Enterprise planları |

**Plan sınırları (gözlenen):** soru limiti 15 / 100 / 200; aylık test üretimi 30 / sınırsız / sınırsız; optik form saklama 20 / 250 / 1000; çevrimiçi katılımcı 20 / 250 / 1000; eşzamanlı sınav 1 / 20 / 100; gelişmiş ayarlar, çoklu kullanıcı ve iframe ücretli planlarda.

**Zayıf noktalar (fırsat):** Yapıştırma odaklı bir akış yok (görsel yükleme dosya tabanlı). Soru numarasını elle silmek gerekiyor. Soru bankası ve kazanım etiketleme yok. Yapay zekâ desteği yok. Sınıf/öğrenci yönetimi ve kalıcı raporlama görünmüyor. Tasarım işlevsel ama modern değil.

## 3. Türkiye pazarı: yakın rakipler

Aşağıdaki bilgiler rakiplerin kendi sayfalarındaki açıklamalardan alınmıştır. Yayına almadan önce güncel durumlarını kendin doğrula.

- **Test Studio (teststud.io):** PDF'ten soru kırpma, yapay zekâ ile cevap anahtarı tarama, optik okuma, PowerPoint ve Word çıktısı, çoklu soru tipi. En güçlü doğrudan rakip.
- **Testmake.App:** Ücretsiz ve sınırsız PDF test, A/B/C/D grupları, mobil optik okuyucu.
- **TestMaker / TestMatik:** Masaüstü program; soru bankası, optik okuma, 2020'den beri çevrimiçi sınav. Ekran görüntüsünden kırpma özelliği var.
- **Okul Bilişim Sistemi:** Okul odaklı; kişisel soru kütüphanesi, URL'den içe aktarma, deneme platformu, optik okuma, analiz.
- **Tester Pro:** Ücretsiz; kullanıcının kendi Gemini API anahtarıyla soru üretme ve OCR.
- **onlinetesthazirla.com:** Basit kırpma ve otomatik yerleşim aracı.

**Sonuç:** "PDF'ten kırp ve yerleştir" artık standart. Testcim'in ayrışması şuralarda olacak: (1) yapıştırma ve yakalama hızı, (2) profesyonel arayüz ve baskı kalitesi, (3) kazanım etiketli soru bankası, (4) yapay zekâyı güvenilir ve denetlenebilir kullanması, (5) sınıf ve kazanım bazlı analiz.

## 4. Özellik eşleme: eşitlik ve üstünlük

| onlinetestmaker.net | Testcim karşılığı | Fark |
|---|---|---|
| Dosya yükleme | Yapıştır (Ctrl+V), sürükle-bırak, klasör, telefondan QR, tarayıcı uzantısı, masaüstü yardımcı | Ana fark. Yakalama modu, odağa dönünce otomatik ekleme |
| Kırpma aracı | Kırpma stüdyosu | Sayfayı tek tıkla otomatik böl, soru numarasını otomatik sil, doğru cevabı sonradan sayfadan otomatik eşle |
| Denklem aracı | MathLive + KaTeX | LaTeX içe/dışa aktarım, görselden denkleme çevirme (Plus) |
| Çizim aracı | Geometri çizim aracı | Açı/uzunluk etiketleri, koordinat düzlemi, fonksiyon grafiği |
| 3 test türü | Sınav, Test kâğıdı, Deneme, Yazılı, Çalışma kâğıdı, Quiz | Bölümlü yapı ve LGS/TYT/AYT gibi kalıplar |
| A/B/C/D sürüm | Kitapçık türleri | Sabitlenen sorular, tohumlu (tekrarlanabilir) karıştırma, şık karıştırma (metin sorularda) |
| Soru grubu | Soru grubu | Aynı |
| Akıllı yerleşim | Yerleşim motoru | "N sayfaya sığdır", sütun dengeleme, canlı önizleme = PDF |
| Gelişmiş ayarlar | Sayfa şablonları | Kaydedilebilir kurum şablonu: logo, üst bilgi, öğrenci bilgi kutusu, yönerge |
| Özel etiketler | Arayüzde düzenli anahtarlar | Etiket ezberi yok |
| Cevap anahtarı PDF | Çıktı paketi | Sınav + cevap anahtarı + optik form + çözüm kitapçığı tek ZIP |
| Taslak `.db` | Otomatik bulut kaydı + `.testcim` proje dosyası | Sürüm geçmişi |
| Optik okuyucu | Testcim Optik | Kendi form tasarımımız, QR ile otomatik eşleme, inceleme kuyruğu |
| Çevrimiçi sınav | Testcim Sınav | Eşzamanlı canlı mod, sunucu kontrollü süre, madde analizi |
| Excel dışa aktarım | Excel, CSV, e-Okul not girişine uygun Excel şablonu | |
| Çoklu kullanıcı | Çalışma alanı ve roller | Yorum, onay akışı |
| Koyu tema | İkinci aşamada | Ana tema beyaz |
| 18 dil | Türkçe + İngilizce ile başla, i18n hazır | |

## 5. Testcim'e eklenecek farklılaştırıcı özellikler

**Öncelik A (MVP ve hemen sonrası)**
1. **Yakalama hattı:** Yapıştırma, çoklu yapıştırma, yakalama modu, yapıştırdıktan hemen sonra A–E tuşuyla doğru cevap, "Hızlı cevap girişi" (`ABCDDCBA...` yapıştır, hepsi işlensin).
2. **Otomatik kırpma iyileştirmeleri:** kenar boşluğu temizleme, soru numarasını silme, sayfayı otomatik soru bloklarına bölme.
3. **Canlı önizleme = PDF:** Tek yerleşim motoru hem ekranı hem PDF'i üretir.
4. **Baskı kalitesi kontrolü:** Taslak/Standart/Yüksek DPI seçimi, dosya boyutu tahmini.
5. **Soru bankası:** Klasör, etiket, arama, benzer soru tespiti (mükerrer engelleme), kullanım geçmişi.
6. **Kurum şablonları:** Logo, okul adı, üst bilgi, öğrenci bilgi kutusu, yönerge metni.

**Öncelik B (Plus değeri)**
7. **Yapay zekâ paketi:** Konudan/kazanımdan soru üretme, görselden düzenlenebilir metne/LaTeX'e çevirme, çeldirici üretme, çözüm yazma, benzer soru üretme, metinden soru, kalite kontrolü, cevap anahtarını sayfadan otomatik okuma.
8. **Kazanım etiketleme ve kazanım bazlı analiz.**
9. **Kişiye özel baskı:** Öğrenci adı ve QR'lı kişisel kâğıt; sızıntı takibi için öğrenciye özel silik filigran.
10. **DOCX ve PPTX çıktısı:** Düzenlenebilir Word, sınıfta gösterim için PowerPoint.
11. **Sınıf, öğrenci ve karne:** Excel'den liste alma, öğrenci gelişim raporu, veli için PDF karne.

**Öncelik C (büyüme)**
12. **Yakalama ekosistemi:** Tarayıcı uzantısı, Windows masaüstü yardımcısı (panoya görsel düşünce otomatik ekleme), telefondan çekim.
13. **Madde analizi:** Zorluk (p), ayırt edicilik, çeldirici analizi, KR-20 güvenirlik.
14. **İşbirliği:** Yorum, onay durumu, sürüm geçmişi, paylaşım bağlantısı.
15. **Dışa aktarım:** QTI, Moodle XML, Google Forms, iframe gömme (Pro).
16. **Herkese açık paylaşım/pazar yeri:** Telif riski nedeniyle en sona bırakılır (bkz. Riskler).
17. **Herkese açık API ve webhook (Kurum).**

## 6. Plan yapısı (öneri; tümü `plans` tablosundan yönetilir)

Fiyatlar TRY olarak yapılandırılır; rakamlar bu dokümanda bilinçli olarak yoktur. Sınırlar da kodda değil, veri tablosunda durur.

| Yetki anahtarı | Ücretsiz | Plus | Pro | Kurum |
|---|---|---|---|---|
| `questions_per_test` | 20 | 100 | 200 | 300 |
| `pdf_exports_per_month` | 10 | sınırsız | sınırsız | sınırsız |
| `versions_per_test` (kitapçık) | 2 | 4 | 4 | 4 |
| `bank_questions` | 100 | 5.000 | 25.000 | 100.000 |
| `storage_mb` | 250 | 5.000 | 20.000 | 100.000 |
| `ai_credits_per_month` | 10 (bir kerelik deneme) | 300 | 1.500 | havuzlu |
| `omr_scans_per_month` | 30 | 500 | 3.000 | adil kullanım |
| `online_participants_per_exam` | 20 | 250 | 1.000 | 5.000 |
| `live_exams_concurrent` | 1 | 10 | 50 | 200 |
| `advanced_layout` | temel | tam | tam | tam |
| `remove_branding` | hayır | evet | evet | evet |
| `docx_pptx_export` | hayır | evet | evet | evet |
| `iframe_embed` | hayır | hayır | evet | evet |
| `seats` | 1 | 1 | 3 | 10+ |
| `api_webhooks` | hayır | hayır | hayır | evet |

Yakalama ekosistemi (uzantı, telefon, masaüstü) ücretsiz kalır; kullanıcı ediniminin ana kaldıracıdır.

**Yapay zekâ kredi kuralı (öneri):** 1 üretilen soru = 1 kredi; görselden metne = 2 kredi; çözüm yazma = 1 kredi; kalite kontrolü = 1 kredi. Kredi hareketleri `credit_ledger` tablosunda tutulur.

## 7. Riskler ve önlemler

1. **Telif:** Kullanıcılar yayınevi kitaplarından soru yükleyecek. Önlem: içerik varsayılan olarak çalışma alanına özeldir; herkese açık paylaşım/pazar yeri başlangıçta yoktur; kullanım şartları, hak sahibi bildirim ve kaldırma akışı, `source_meta` alanında kaynak bilgisi. Hukuki metinleri bir avukata yazdır.
2. **KVKK:** Öğrenci verisi (çoğu reşit değil). Önlem: minimum veri toplama, aydınlatma metni, açık rıza gereken yerlerde onay, veri saklama süreleri, silme ve dışa aktarma, sağlayıcılarla veri işleme sözleşmeleri, AB bölgesinde barındırma. Bunu da hukuki danışmanla netleştir.
3. **OMR doğruluğu:** İtibar riski. Önlem: kendi form geometrimiz, köşe işaretleri, kalibrasyon, çift işaret ve silinti tespiti, güven skoru, zorunlu inceleme kuyruğu.
4. **Yapay zekâ hataları:** Yanlış cevaplı soru öğretmen için felakettir. Önlem: üretilen her şey "taslak" durumunda gelir, öğretmen onaylamadan teste girmez; ayrı kalite kontrol geçişi; kaynak ve kazanım gösterimi.
5. **Kopya önleme iddiaları:** Web tabanlı sınavda tam güvence yoktur. Önlem: dürüst dil ("caydırıcı önlemler"), sekme değiştirme sayacı, soru/şık karıştırma, sunucu kontrollü süre.
6. **Maliyet:** Yapay zekâ ve depolama. Önlem: kredi sayacı, depolama kotası, yetim dosya temizliği, görsel sıkıştırma, plan başına harcama tavanı.
7. **Kapsam şişmesi:** Önlem: dikey dilimler. Her prompt tek başına çalışan, test edilmiş ve yayınlanabilir bir dilim üretir.
8. **Rakip kopyalama şüphesi:** Özellik seti benzer olabilir; ama kod, metin, görsel ve marka tamamen özgün olmalıdır. Onlinetestmaker'ın görsellerini, metinlerini veya kaynak kodunu kullanma.

## 8. Yol haritası

| Aşama | Dilimler | Sonuç |
|---|---|---|
| 0. Temel | Prompt 00–03 | Depo, veri tabanı, tasarım sistemi, giriş, çalışma alanı, plan altyapısı |
| 1. MVP | Prompt 04–06, 08 (hafif) | Yapıştır, sırala, cevap işaretle, PDF ve cevap anahtarı, PDF'ten kırpma |
| 2. Tam çekirdek | Prompt 07, 08 | Zengin soru editörü, denklem, çizim, soru bankası |
| 3. Rekabet eşitliği | Prompt 09, 10 | Çevrimiçi sınav, optik okuma |
| 4. Plus değeri | Prompt 11, 12, 13 | Yapay zekâ, sınıf ve raporlar, faturalandırma, pazarlama sitesi |
| 5. Büyüme | Prompt 14, 15 | Yakalama ekosistemi, sertleştirme ve yayın |

MVP yayını (kapalı beta) Aşama 1 sonunda yapılabilir. Beta kullanıcılarından "ilk PDF süresi" ve "yapıştırma sırasında karşılaşılan sürtünme" verisini topla.
