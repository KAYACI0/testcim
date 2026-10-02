# ADR 0010: Yakalama Ekosistemi ve Masaüstü Yardımcı Mimarisi (Tauri vs Electron)

## Durum

Kabul edildi (Prompt 14, Dilim 14).

## Bağlam

Testcim'in temel ürün vaadi, "ekran alıntısını yapıştır, saniyeler içinde baskıya hazır PDF" kolaylığıdır. Ancak öğretmenlerin soruları tek bir dijital ortamda toplanmamıştır:
1. **Fiziksel kitaplar, föyler ve soru bankaları:** Akıllı telefon kamerasıyla çekilip perspektif bozulmaları düzeltilerek anında masaüstü sınavına aktarılmalıdır.
2. **Web ve taranmış PDF kaynakları:** Tarayıcıda (Chrome/Edge) soru çözerken veya PDF görüntülerken sayfayı terk etmeden soru seçilip teste gönderilebilmelidir.
3. **Masaüstü işletim sistemi:** Öğretmen `Win+Shift+S` (Windows Ekran Alıntısı Aracı) veya klavye kısayolu ile bir soru kestiğinde, panodaki görsel otomatik olarak aktif teste eklenmelidir.

Bu ekosistem ücretsizdir ve kullanıcı edinimi ile retention'ı artıran çekirdek bir kaldıraçtır.

## Masaüstü Çerçevesi Değerlendirmesi: Tauri v2 vs Electron

Masaüstü yardımcısının (`Testcim Desktop Companion`) temel amacı, işletim sistemi arka planında (sistem tepsisi / tray) sürekli ve sessizce çalışmak, panodaki yeni ekran alıntılarını yakalamak ve aktif teste aktarmaktır.

| Kriter | Tauri v2 | Electron | Değerlendirme |
| :--- | :--- | :--- | :--- |
| **Bellek (RAM) Ayak İzi** | **~25 - 40 MB** (Windows WebView2) | ~150 - 300 MB (Tam Chromium) | **Tauri v2:** Arka planda 7/24 çalışacak bir tepsi aracı için 35 MB kabul edilebilirken, 250 MB öğretmenin bilgisayarında hissedilir yavaşlık yaratır. |
| **Yükleyici Boyutu** | **~4 - 8 MB** (NSIS / MSI) | ~80 - 120 MB (Chromium + Node bundle) | **Tauri v2:** İndirme süresi ve disk alanı açısından ezici üstünlük. |
| **Soğuk Başlatma** | **< 0.5 saniye** | 2 - 4 saniye | **Tauri v2:** Hızlı açılış ve anında tepsi etkileşimi. |
| **Güvenlik Mimarisi** | Rust tabanlı bellek güvenliği, granüler yetenekler (Tauri v2 capabilities) | Node.js context isolation ve preload scriptleri | **Tauri v2:** Minimal saldırı yüzeyi; IPC üzerinde katı izin kısıtlaması. |
| **Pano & Tepsi API** | Rust Win32 native hook (`AddClipboardFormatListener`) | Node clipboard modülleri | **Tauri v2:** Rust tarafında sıfır CPU maliyetli işletim sistemi olay dinleyicisi. |
| **Otomatik Güncelleme** | Dahili `tauri-plugin-updater` (mini imza doğrulamalı) | `electron-updater` | Her iki platformda da sağlam, ancak Tauri'nin paketleri çok daha küçük delta güncellemeleri sunar. |

### Karar: Tauri v2

Masaüstü yardımcı için **Tauri v2** seçilmiştir. Düşük bellek kullanımı, hızlı kurulum ve güvenli Rust arka ucu, sürekli sistem tepsisinde açık kalan bir yardımcı araç için belirleyici olmuştur.

## Ekosistem Mimarisi ve Kararlar

### 1. Telefondan Yakalama Akışı
- **Oturum ve Eşleme:** Masaüstü editör `createCaptureSessionAction` ile kısa ömürlü (15 dakika) bir eşleme jetonu üretir ve QR kod olarak sunar.
- **Yetkilendirme:** Telefonda açılan sayfa (`/capture/mobile/[token]`) oturum gerektirmez; tekil `token` ile doğrulanır (`validate_capture_session` RPC).
- **İşleme:** Telefondaki kamera veya galeriden gelen görsel üzerinde 4 köşeli serbest perspektif düzeltme (homografi) ve 90° döndürme istemci tarafında (`packages/image-tools`) çalıştırılır.
- **Anında İletim:** İmzalı URL ile Supabase Storage'a yüklenen görsel, `submit_capture_question` RPC'si ile teste eklenir ve `capture:{testId}` Supabase Realtime kanalına yayınlanır. Masaüstü editör soruyu anında şeride alır.

### 2. Tarayıcı Uzantısı (Chrome & Edge Manifest V3)
- **Mimari:** `apps/extension` altında Manifest V3 uyumlu uzantı.
- **İzinler (Least Privilege):** Yalnızca `activeTab`, `sidePanel`, `storage`. İhtiyaç duyulmayan geniş izinler (`<all_urls>`, `webRequest` vb.) kullanılmaz.
- **Kırpma:** Ekran görüntüsü `chrome.tabs.captureVisibleTab` ile alınır, content script'in sunduğu seçim kutusu (crosshair overlay) koordinatlarına göre HTML5 canvas üzerinde kırpılır.
- **Yan Panel (Side Panel):** Aktif testi ve yakalanan soru sayısını gösterir; yakalanan soruya tek tıkla A–E doğru cevap şıkkı atanmasını sağlar.

### 3. Masaüstü Yardımcı (Tauri v2) ve Gizlilik İlkeleri
- **Yalnızca Görsel:** Sistem panosu dinlenirken yalnızca görsel biçimleri (`CF_DIB`, `image/png`) incelenir. Panodaki metin, bağlantı veya şifre verileri asla okunmaz, kaydedilmez veya ağa gönderilmez.
- **Açık Durum ve Kontrol:** Tepsi simgesi durumunu net biçimde gösterir (Yakalama Aktif / Duraklatıldı / Bağlantı Yok). Kullanıcı tek tıkla veya kısayolla yakalamayı duraklatabilir.
- **Cihaz Kodu (Device Code) Eşleme:** Masaüstü istemci, kullanıcıdan parola istemez. Web oturumunda üretilen 6 haneli kod ile eşlenir ve sınırlı yetkili yakalama oturumu başlatılır.
- **Yükleme:** Görseller doğrudan imzalı Storage URL'siyle yüklenir; sunucuya doğrudan anahtar veya admin yetkisi verilmez.

## Sonuçlar

- Öğretmenler fiziksel kitaplardan, web sitelerinden ve masaüstünden sıfır sürtünmeyle soru toplayabilir.
- Sistem kaynakları korunur, kullanıcı gizliliği tam olarak garanti altına alınır.
