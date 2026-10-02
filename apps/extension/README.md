# Testcim Soru Yakalama Tarayıcı Uzantısı (Chrome ve Edge)

Testcim Soru Yakalama uzantısı, öğretmenlerin herhangi bir web sayfasından, çevrimiçi soru bankasından veya tarayıcı içi PDF görüntüleyicisinden soruları kırparak saniyeler içinde Testcim sınav şeridine eklemesini sağlar.

## Mimari ve İzinler (Manifest V3)

Uzantı, Chrome ve Microsoft Edge Manifest V3 standartlarına tam uyumludur. **En az izin (least privilege)** ilkesine sıkı sıkıya bağlıdır:

| İzin | Amaç ve Gerekçe |
| :--- | :--- |
| `activeTab` | Yalnızca kullanıcı kırpma eylemini başlattığında (buton veya kısayol) o anki sekmede ekran alıntısı almak için kullanılır. Arka planda sekme veya gezinme geçmişi izlenmez. |
| `sidePanel` | Kullanıcının web sayfasından ayrılmadan yan panel üzerinden aktif testi ve kırpılan soruları inceleyip cevap anahtarı işaretlemesini sağlar. |
| `storage` | 15 dakikalık kısa ömürlü eşleme jetonunu ve sunucu adresini yerel tarayıcı belleğinde güvenle saklar. |
| `scripting` | Kırpma başlatıldığında ekranda seçim çerçevesi (overlay) kaplamasını oluşturmak için kullanılır. |
| `host_permissions` | Yalnızca `https://*.testcim.com/*` (ve yerel geliştirme için `http://localhost:*/*`) adresleriyle iletişim kurar. Üçüncü taraf sitelerle hiçbir veri alışverişi yapılmaz. |

## Kurulum ve Geliştirme (Paketlenmemiş Yükleme)

1. Monorepo kök dizininde veya uzantı dizininde derleme komutunu çalıştırın:
   ```bash
   pnpm --filter @testcim/extension build
   ```
2. Çıktı `apps/extension/dist/` dizininde üretilir.
3. Chrome veya Edge tarayıcısında uzantı yöneticisini açın:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
4. Sağ üstteki **Geliştirici modu** seçeneğini etkinleştirin.
5. **Paketlenmemiş öğe yükle** (Load unpacked) butonuna tıklayın ve `apps/extension/dist` klasörünü seçin.

## Kullanım Akışı

1. Testcim masaüstü editöründe testinizi açın.
2. Editör araç çubuğundaki **Telefondan ekle / Uzantı** butonuna tıklayın ve 15 dakikalık jetonu kopyalayın.
3. Tarayıcınızın yan panelinde Testcim uzantısını açın ve jetonu yapıştırarak **Oturuma bağlan** butonuna basın.
4. Herhangi bir web sayfasında veya PDF'te **Soruyu kırp ve yakala** butonuna tıklayın (veya `Alt+Shift+C` tuşlarına basın).
5. Fare ile sorunun etrafını seçin.
6. Yan panelde beliren önizlemede gerekirse A–E doğru şıkkını işaretleyin ve **Teste ekle** butonuna basın.
7. Soru, Supabase Realtime aracılığıyla masaüstü editör şeridinize 2 saniye içinde otomatik olarak eklenir.

## Mağaza Yayını Kontrol Listesi (Chrome Web Store & Edge Add-ons)

### 1. Mağaza Metinleri
- **Uzantı Adı:** Testcim - Soru Yakalama
- **Kısa Açıklama (132 karakter):** Herhangi bir web sayfasından veya PDF'ten soruları kırpın, saniyeler içinde Testcim sınavınıza ekleyin.
- **Kategori:** Verimlilik / Eğitim
- **Ayrıntılı Açıklama:**
  - Öğretmenler için soru hazırlama sürecindeki ekran alıntısı sürtünmesini ortadan kaldırır.
  - Web sayfaları ve taranmış PDF'lerle tam uyumluluk.
  - A–E doğru cevap şıkkını tek tıkla kaydetme.
  - Sıfır reklam, sıfır takipçi, tam gizlilik.

### 2. Görsel Varlıklar
- [x] `icons/icon-16.png` (Uzantı araç çubuğu simgesi)
- [x] `icons/icon-48.png` (Uzantı yönetim sayfası simgesi)
- [x] `icons/icon-128.png` (Mağaza ve yükleme simgesi)
- [ ] 1280x800 veya 640x400 piksel ekran görüntüleri:
  - Ekran 1: Web üzerindeki bir PDF'te kırpma alanı seçimi (crosshair kaplama).
  - Ekran 2: Yan panelde soru önizlemesi ve şık seçimi.
  - Ekran 3: Testcim web editöründe sorunun şeride yerleştiği an.
- [ ] 440x280 piksel küçük tanıtım görseli (Promotional tile)
- [ ] 1400x560 piksel büyük tanıtım başlığı (Marquee banner)

### 3. Gizlilik Beyanı
- Uzantı hiçbir kişisel veri, parola, çerez veya tarayıcı geçmişi toplamaz.
- Yalnızca kullanıcının açıkça seçtiği ekran bölgesi Supabase Storage'daki güvenli alana yüklenir.
