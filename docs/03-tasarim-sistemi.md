# Testcim: Tasarım Sistemi

## 1. Yön

**Konu:** Testcim bir kâğıt ve baskı ürünüdür. Öğretmen sonunda basılı, düzenli, güvenilir bir sayfa elde etmek istiyor. Tasarım dili bu dünyadan gelir: hassas, sakin, tipografik, çizgi ve boşlukla kurulmuş bir düzen.

**Tek cümlelik ilke:** Sayfa kahramandır, arayüz sessizdir.

**Kullanıcı isteği (bağlayıcı):** Ana renk beyaz. Profesyonel, modern, minimalist, basit arayüz. Emoji yok. "Yapay zekâ" için klişe simgeler yok. Yapay zekâ üretimi tasarım klişelerinden kaçınılacak.

**Cesaretin harcandığı tek yer:** Yakalama deneyimi. Ekran alıntısı yapıştırıldığı an, soru tek bir net hareketle şeritteki yerine oturur ve sayfa önizlemesi canlı olarak akar. Geri kalan her şey sakin ve disiplinlidir.

## 2. Tasarım kimliği

**Palet (açık tema; tema token'ları koyu temaya izin verecek şekilde yazılır, koyu tema sonraya kalır)**

| Ad | Token | Değer | Kullanım |
|---|---|---|---|
| Zemin | `--surface` | `#FFFFFF` | Uygulama, paneller, kâğıt |
| Tuval | `--canvas` | `#F5F6F8` | Yalnızca editörde kâğıdın arkasındaki alan |
| Mürekkep | `--ink` | `#1C2230` | Ana metin |
| Kurşun | `--ink-2` | `#556070` | İkincil metin |
| Sönük | `--ink-3` | `#6B7686` | Yer tutucu, üçüncül metin (AA kontrastı testle doğrulanır) |
| Çizgi | `--line` | `#E5E8ED` | Ayırıcılar, kenarlıklar |
| Çizgi güçlü | `--line-strong` | `#CDD3DC` | Girdi kenarlığı, vurgulu ayrım |
| Lacivert mürekkep | `--accent` | `#23408F` | Birincil eylem, odak halkası, seçili durum |
| Vurgu koyu | `--accent-hover` | `#1A3170` | Üzerine gelme |
| Vurgu zemin | `--accent-tint` | `#EEF1FA` | Seçili satır, yapıştırma alanı vurgusu |
| Doğru | `--ok` | `#1D7A4B` | Doğru cevap, başarı |
| Hata | `--err` | `#B4322A` | Yanlış, hata |
| Uyarı | `--warn` | `#9A6100` | Sınıra yaklaşma, dikkat |

Kural: Arayüzün büyük çoğunluğu beyaz, mürekkep ve çizgiden oluşur. Renk yalnızca anlam taşıdığı yerde görünür: eylem, seçim, doğru/yanlış. Gradyan yok, renkli arka plan şeritleri yok, dekoratif renk yok. Hex değerleri yalnızca token dosyasında yazılır; bileşenlerde hex kullanılmaz.

**Tipografi**
- **Tek aile:** IBM Plex Sans (Türkçe karakterler `ğ ş ı İ ç ö ü` ile test edilecek; `next/font` ile kendi sunucundan). Ağırlıklar 400, 500, 600.
- Uygulama tabanı 14 px, okuma ve öğrenci sınav ekranı 16 px. Ölçek: 12, 13, 14, 16, 18, 22, 28, 36. Satır yüksekliği: metinde 1,5; başlıklarda 1,25. 24 px ve üzeri başlıklarda hafif negatif harf aralığı (-0,01em).
- Sayılar (istatistik, tablo) `font-variant-numeric: tabular-nums`.
- Satır uzunluğu en fazla 72 karakter.
- Pazarlama sitesi büyük başlıklarında Source Serif 4 kullanılabilir; uygulama içinde kullanılmaz.
- **Büyük harf yasak** (`uppercase`, geniş harf aralığı). Türkçe `i/İ` ve `ı/I` sorunlarından kaçınmanın da en temiz yolu bu. Etiketler cümle düzeninde yazılır.

**Boşluk ve şekil**
- 4 px tabanlı boşluk ölçeği.
- Köşe yarıçapı hiyerarşiktir: kontroller 6 px, paneller ve menüler 8 px, diyaloglar 12 px, kâğıt 2 px, küçük resimler 3 px. Her şey aynı yarıçapta olmayacak.
- Derinlik çizgiyle kurulur, gölgeyle değil. Tek gölge düzeyi: yüzen katmanlar (menü, diyalog) için `0 8px 24px rgb(20 28 45 / 0.08)` + 1 px çizgi. Kâğıt önizlemesi hafif bir sayfa gölgesi taşır.

**İkonlar**
- Phosphor Icons, Light ağırlığı, 16 ve 20 px. Yalnızca seçili durumda dolgulu varyant kullanılabilir.
- **Yasak simgeler:** kıvılcım/yıldız ışıltısı, sihirli değnek, robot, beyin, ampul, roket, şimşek, parıltı. Yapay zekâ girişi için simge kullanılmaz; eylem fiille yazılır ("Soru üret", "Çözüm yaz"). Marka sahibi ileride tek renkli özgün bir işaret verirse `ai-mark.svg` yuvasına konur.
- Yapay zekâ üretimi içerik, küçük bir metin etiketiyle işaretlenir: "Taslak" (çerçeveli, nötr) ve yanında "Onayla" eylemi.
- Emoji hiçbir yerde kullanılmaz: arayüz, hata metni, e-posta, sistem mesajı, dokümantasyon, commit mesajı, test verisi dahil.

**Hareket**
- Kullanıcı eylemine yanıt veren hareket serbest: 120–180 ms, ease-out.
- **İmza hareket (tek):** yapıştırılan soru şeride 160 ms'lik kısa bir oturma hareketiyle girer ve kenarlığı bir kez `--accent` renginde yanıp söner. Başka giriş animasyonu yok.
- Kaydırmayla beliren bölümler, her kartta hover geçişi, süs amaçlı hareketli arka plan yok. `prefers-reduced-motion` tam desteklenir.

## 3. Yerleşim kavramı

**Uygulama kabuğu**
```
+------+--------------------------------------------------------------+
| Sol  |  Üst çubuk: çalışma alanı · arama (Ctrl+K) · plan · hesap    |
| ray  +--------------------------------------------------------------+
| 56px |                                                              |
| ikon |   Sayfa alanı                                                |
| +ad  |                                                              |
+------+--------------------------------------------------------------+
```
Sol ray: Testler, Soru bankası, Sınıflar, Optik, Çevrimiçi sınavlar, Raporlar, Ayarlar. Daraltılmış hâlde ikon + ipucu, genişletilmiş hâlde ikon + ad. Hizalama sola.

**Editör (ürünün ana ekranı)**
```
+----------------------------------------------------------------------------+
| Test adı            Kaydedildi        [Yakalama modu]  [Önizle]  [Çıktı al] |
+----------+------------------------------------------------+----------------+
| Soru     |                                                | Denetçi        |
| şeridi   |            Kâğıt önizlemesi (2 mm köşe,        | sekmeler:      |
| (küçük   |            tuval üzerinde, gerçek yerleşim)    | Sayfa          |
| resimler,|                                                | Kitapçıklar    |
| sürükle, |                                                | Cevaplar       |
| A–E)     |                                                | Çıktı          |
+----------+------------------------------------------------+----------------+
| Yapıştırma çubuğu: "Ctrl+V ile yapıştırın" · 12 soru · Son eklenen: soru 12 |
+----------------------------------------------------------------------------+
```
- Yapıştırma çubuğu sürekli görünür, ince ve sakin. Yapıştırma sonrası durumu satır içinde yazar ("Soru 12 eklendi. Doğru cevap için A–E tuşuna basın.").
- Denetçi panelinde kart yok: başlıklar ve ince çizgilerle bölünmüş alanlar.
- Şerit ve kâğıt arasında sürükle-bırak; seçili soru kâğıtta ince vurgu çizgisiyle belirir.

**Listeler ve tablolar:** Testler, sorular, sınavlar, sonuçlar için kart ızgarası yerine çizgili satırlı tablo/liste. Kart yalnızca gerçek içeriğin kendisi olan yerde (soru küçük resmi) kullanılır.

**Boş durumlar:** Bir cümle ve tek net eylem. İllüstrasyon yok. Örnek: "Bu testte henüz soru yok. Bir ekran alıntısı kopyalayıp Ctrl+V ile yapıştırın."

## 4. Yapay zekâ klişelerinden kaçınma kuralları

Aşağıdakiler bu projede **yasak** varsayılanlardır. Tasarım incelemesinde bunlardan biri görülürse düzeltilir.

1. Mor-mavi gradyanlar, buğulu cam (glassmorphism), bulanık renk lekeleri, ışıltılı gölgeler.
2. Aynı yarıçap ve aynı yumuşak gölgeyle sıralanmış eş kartlar ızgarası.
3. Her başlığın üstünde geniş harf aralıklı büyük harf etiket (eyebrow).
4. Gerçek bir sıra olmayan yerde `01 / 02 / 03` numaralandırma.
5. Başlıkta tek kelimeyi renkli veya italik yapma.
6. Orta nokta ile ayrılmış meta metinleri ("A · B · C") ve bağlantılara eklenen `→` okları.
7. Kıvılcım, sihirli değnek, robot, beyin simgeleri; "AI ile güçlendirilmiş" tarzı süslü ifadeler.
8. Krem zemin + terrakota vurgu ya da siyah zemin + neon vurgu kalıpları.
9. Süs amaçlı illüstrasyon, 3B nesne, kalabalık stok fotoğraf, "mutlu öğretmen" görselleri.
10. Kaydırınca beliren bölümler ve her yerde hover büyütme efektleri.
11. Ünlem işaretli, coşkulu metin ("Harika!", "Hadi başlayalım!").
12. Emoji.

**Otomatik denetim:** `scripts/check-design-rules.ts` şunları yakalar ve CI'ı başarısız kılar: emoji aralıkları, `gradient` kullanımı (izin listesi hariç), token dışı hex renk, `uppercase`, `tracking-wide/wider/widest`, `rounded-2xl/3xl/full` (avatar ve anahtar istisnası izin listesinde), `shadow-lg/xl/2xl`, yasak ikon adları (`Sparkle`, `MagicWand`, `Robot`, `Brain`, `Lightbulb`, `Rocket`, `Lightning`).

**Tasarım eleştiri döngüsü (her arayüz dilimi için):** Kod yazmadan önce kısa bir tasarım planı yaz (renk, tip, yerleşim, ilkeler) ve varsayılan bir çözüme benzeyen yerleri değiştir. Bitince Playwright ile 1440, 1024 ve 390 genişliğinde ekran görüntüsü al, kendini bu belgeye göre eleştir ve bir "süs"ü çıkar.

## 5. Bileşen ve desen listesi

**Temel bileşenler:** Button (birincil: dolu lacivert; ikincil: çizgili; üçüncül: metin), IconButton, Input, Textarea, Select, Combobox, Checkbox, Radio, Switch, Segmented control, Tabs, Tooltip, Popover, Menu, Dialog, Sheet, Toast (seyrek), Table, Kbd (kısayol ipucu), Badge (metin tabanlı durum), Progress (ince çizgi), EmptyState, InlineNotice, FormField.

**Desenler:** AppShell, PageHeader, InspectorPanel, QuestionStrip, PaperCanvas, PastebarStatus, CommandPalette (Ctrl+K), UsageMeter (plan kullanımı: ince çizgi + satır içi metin), UpgradeNote (satır içi, kapatılamayan modal yok), DataTable (sıralama, filtre, seçim, sanal kaydırma).

**Durumlar:** Her bileşenin varsayılan, hover, odak (görünür 2 px halka, 2 px boşluk), etkin, devre dışı, yükleniyor, hata durumları `/design-system` (yalnızca geliştirme) sayfasında görünür.

**Erişilebilirlik tabanı:** WCAG AA kontrast, tam klavye kullanımı, odak yönetimi, ekran okuyucu etiketleri, `prefers-reduced-motion`, dokunmatik hedef en az 40 px (mobil 44 px).

## 6. Metin (mikro yazı) kuralları

- Dil Türkçe, "siz" hitabı, sade ve saygılı. Cümle düzeni. Ünlem yok.
- Eylem düğmesi ne olacağını söyler: "Değişiklikleri kaydet", "Testi yayınla". Aynı eylem akış boyunca aynı adı taşır (Düğme "Yayınla" ise bildirim "Yayınlandı").
- Hata metni ne olduğunu ve nasıl düzeltileceğini söyler, özür dilemez: "Dosya 20 MB sınırını aşıyor. Daha küçük bir dosya seçin."
- Sistem sözlüğü (tutarlı kullan): Test, Sınav, Deneme, Yazılı, Soru bankası, Kitapçık (A, B, C, D = "kitapçık türü"), Cevap anahtarı, Optik form, Kazanım, Şık, Çeldirici, Çıktı al, Yakalama modu, Taslak.
- Kullanıcının bileceği dille yaz: "Webhook" değil "Bildirim bağlantısı"; "Snapshot" değil "Kayıtlı sürüm".

## 7. Ekranlar ve tasarım notları

**Açılış sayfası (pazarlama):** Kahraman alanı bir illüstrasyon değil, çalışan bir demo: "Bir görsel yapıştırın" alanı. Ziyaretçi Ctrl+V yaptığında görsel gerçekten bir sınav kâğıdına soru olarak yerleşir (kayıt gerektirmeden, yalnızca tarayıcıda). Altında tek satır: "Kaydetmek için ücretsiz hesap açın." Başlık büyük, sade, sola hizalı. Fiyatlandırma çizgili tablo olarak.

**Panel (Testler):** Üstte tek birincil eylem "Yeni test". Altında son testler çizgili liste (ad, tür, soru sayısı, son düzenleme). Sağ üstte arama. Karşılama metni yok; doğrudan iş.

**Soru bankası:** Sol klasör ağacı, ortada liste/ızgara geçişi (ızgara yalnızca küçük resim odaklı), sağda seçili sorunun ayrıntısı. Filtre çubuğu tek satır.

**Öğrenci sınav ekranı:** Son derece sakin: tek soru veya kaydırılabilir liste, üstte süre, altta ilerleme çizgisi. Marka minimum. 16 px metin, geniş dokunma hedefleri, mobil öncelikli.

**Optik okuma:** Kamera görünümü tam ekran, köşe işaretleri belirginleşince ince bir çerçeve doğrulanır; sonuç listesi ve inceleme kuyruğu ayrı ekran.

**Logo:** Marka sahibi sağlar. `apps/web/public/brand/logo.svg` ve `mark.svg` dosyaları yer tutucu olarak beklenir; `<Logo />` bileşeni bunları okur. Logo tasarlama.

## 8. Tasarım inceleme kontrol listesi (her PR)

- Beyaz baskın mı, renk yalnızca anlam taşıyor mu?
- Kart ızgarası yerine liste/tablo tercih edildi mi?
- Yarıçaplar hiyerarşik mi, gölge yalnızca yüzen katmanda mı?
- Emoji, yasak ikon, büyük harf, gradyan var mı?
- Hareket yalnızca kullanıcı eylemine mi yanıt veriyor?
- Metinler eylem odaklı, ünlemsiz, cümle düzeninde mi?
- 390 px'te sorunsuz mu, klavyeyle tam kullanılıyor mu, odak görünür mü?
- Boş, yükleniyor ve hata durumları tasarlandı mı?
