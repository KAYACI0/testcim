# Prompt 04: Editör çekirdeği ve yakalama hattı

## Amaç
Ürünün kalbi: öğretmen bir ekran alıntısını yapıştırır, soru saniyenin kesirinde testte görünür; sıralar, doğru cevabı işaretler, kaybetmeden kaydeder. Bu dilimde PDF yok; yerleşim önizlemesi yalnızca şerit ve basit sayfa görünümüdür (gerçek yerleşim Prompt 05'te).

## Önce oku
CLAUDE.md, docs/02 bölüm 5.1 (yakalama hattı) ve 6 (tests, test_items, assets), docs/03 bölüm 2 ve 3 (imza hareket, editör yerleşimi). Bu dilimin arayüzü docs/03'e birebir uymalı.

## Başlamadan
Plan modunda başla. Önce kısa tasarım planı (editör ekranı ASCII iskeleti, imza hareketin tanımı), sonra teknik plan: op log şeması, yükleme kuyruğu durum makinesi, Worker sınırı. Onayımı bekle.

## Kapsam

### A. image-tools paketi (`packages/image-tools`, DOM'suz çekirdek + Worker sarmalayıcı)
- `autoTrim(bitmap, {tolerance, padding})`: kenar arka planını algıla (köşe örnekleri), toleransla içerik sınırlayıcı kutusunu bul, 6 px iç boşluk bırak. Yarı saydam ve gradyanlı ekran görüntülerinde bozulmamalı.
- `sha256`, `pHash` (algısal hash), `hammingDistance`.
- `encode`: kayıpsız orijinal (PNG veya WebP lossless, hangisi küçükse) + 480 px WebP küçük resim.
- Girdi sınırları: en fazla piksel, en fazla bayt; büyükse kaliteyi bozmadan ölçekle.
- Özellik tabanlı testler (fast-check) ve örnek görsellerle altın testler.

### B. Yakalama hattı (`apps/web/src/features/capture`)
- Editör rotasında belge düzeyinde `paste` dinleyicisi. Odak metin alanındaysa ve panoda görsel yoksa dokunma. Çoklu görsel desteği. Panoda HTML `<img>` varsa ve dosya yoksa, yalnızca dosya alınabiliyorsa işle; yoksa satır içi anlaşılır uyarı.
- Sürükle-bırak (dosya ve klasör), "Dosya seç" (JPG, PNG, GIF, WebP; en fazla 100 soru sınırı planla belirlenir).
- **İyimser ekleme:** istemci UUID (v7) + `fractional-indexing` konumu. Küçük resim hemen `URL.createObjectURL` ile görünür. Sonra Worker'da kırp/hash/kodla, sonra imzalı URL ile doğrudan Storage'a yükle (en fazla 3–4 eşzamanlı, üstel geri çekilme).
- **Yükleme kuyruğu:** IndexedDB'de kalıcı; sekme kapanıp açılsa devam eder. Durumlar: bekliyor, işleniyor, yükleniyor, tamam, hata (yeniden dene). Satır içi ince ilerleme çizgisi, toast yok.
- **Yakalama modu:** anahtar. Açıkken her yapıştırma sona eklenir ve sayaç görünür. Yapıştırmadan sonra 5 saniye içinde A–E (veya 1–5) tuşu son eklenen sorunun doğru cevabını işaretler ve ardından pencere kapanır.
- **Odağa dönünce otomatik ekleme (isteğe bağlı ayar):** `window.focus` olayında `navigator.clipboard.read()` ile yeni görsel varsa ekle. Özellik algılama yap, izin reddedilirse sessizce devre dışı kal ve ayarda nedenini açıkla. Aynı görseli iki kez ekleme (son işlenen hash'i hatırla).
- **Yinelenen uyarısı:** aynı hash veya pHash yakınlığı: satır içi "Bu soru testte zaten var", engelleme yok.
- **Kota kontrolü:** `questions_per_test` ve depolama; aşımda sunucu reddeder, arayüz satır içi anlatır.
- İmza hareket: eklenen sorunun şeride 160 ms oturması + kenarlığın bir kez accent renginde yanıp sönmesi. `prefers-reduced-motion`'da hareket yok, yalnızca çizgi vurgusu.

### C. Editör durumu ve senkron
- Zustand store: `items`, `settings`, `selection`, işlem günlüğü (undo/redo yığını). Her kullanıcı eylemi bir işlem (`add_item`, `move_item`, `remove_item`, `set_correct`, `set_points`, `update_title`…). Yapıştırma çoklu görsel tek işlem grubudur.
- Debounce'lu gönderim: `apply_test_ops` RPC'si, `base_revision` ile. Çakışmada sunucu revizyonunu alıp yerel bekleyen işlemleri yeniden uygula; çözülemezse sakin bir satır içi bildirim.
- Kayıt durumu üst çubukta metin: "Kaydediliyor", "Kaydedildi", "Bağlantı yok, değişiklikler bekletiliyor".
- Ctrl+Z / Ctrl+Shift+Z.

### D. Editör arayüzü (`/tests/[id]`)
- Yerleşim docs/03 bölüm 3'teki gibi: üstte test adı ve durum, solda **soru şeridi**, ortada **sayfa önizlemesi** (basit: sırayla ardışık soru görselleri beyaz bir kâğıt üzerinde, tuval arka planı), sağda **denetçi** (Sayfa, Kitapçıklar, Cevaplar, Çıktı sekmeleri; bu dilimde yalnızca Cevaplar dolu, diğerleri "Sonraki adımda" yerine yalnızca gizlenmiş/devre dışı olmadan ilgili dilimde eklenecek şekilde bırakılır), altta **yapıştırma çubuğu**.
- Şerit: sanallaştırılmış (TanStack Virtual), sürükleyerek sıralama (klavye ile de: seçili soruda Alt+Yukarı/Aşağı), çoklu seçim, silme, çift tıkla yakından önizleme (Esc ile kapanır). Her sorunun altında A–E doğru cevap seçici (klavye: soru seçiliyken A–E, 1–5).
- **Hızlı cevap girişi:** "Cevapları toplu gir" alanına `ABCDDCBA…` veya `1-A 2-C…` yapıştır; soru sayısıyla eşleşmezse satır içi fark gösterilir, uygula ile hepsi işlenir.
- Test oluşturma (`/tests/new`): ad + tür (Sınav, Test kâğıdı, Deneme, Yazılı, Çalışma kâğıdı, Quiz); sonrasında doğrudan editör.
- Testler listesi (`/tests`): çizgili tablo (ad, tür, soru sayısı, son düzenleme), arama, klasörsüz basit sürüm, silme (yumuşak).

## Testler
- Birim: autoTrim (çeşitli arka planlar), hash, kuyruk durum makinesi, op log undo/redo, kesirli indeks sıralama.
- E2E (Playwright): `ClipboardEvent` + `DataTransfer` ile yapıştırma simülasyonu; 5 görselin ardışık yapıştırılması, sırayı değiştirme, cevap işaretleme, sayfayı yenileyince verinin geri gelmesi, çevrimdışı iken yapıştırma sonra çevrimiçi olunca yükleme.
- Performans testi: 200 küçük resimle şeridin akıcılığı; yapıştırmadan küçük resim görünmesine kadar süre ölçümü (hedef 150 ms altı).
- Kota ve RLS: başka çalışma alanına ait teste işlem gönderilemez.

## Kabul kriterleri
- Win+Shift+S ile alınan bir alıntı Ctrl+V ile eklenir; görünür an ölçümü hedefin altında.
- Yakalama modunda "yapıştır, C tuşu" döngüsüyle 20 soru hatasız girilir.
- Sayfa yenilemede, sekme kapanıp açılmada hiçbir soru kaybolmuyor.
- `pnpm typecheck && lint && check:design && test && test:e2e` yeşil. Arayüz docs/03'e uygun; 1440/1024/390 ekran görüntüleri ve kendi eleştirin rapora ekli.

## Yapma
- Dosyayı sunucu rotasından geçirme.
- Yerleşim mantığını burada yazma; Prompt 05'in konusu.
- Emoji, gradyan, kart ızgarası, süs hareketi.

## Bitirince
Ölçüm sonuçları (yapıştırma gecikmesi), ekran görüntüleri, bilinen sınırlar.
