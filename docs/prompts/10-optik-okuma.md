# Prompt 10: Optik okuma (OMR)

## Amaç
Testcim kendi optik formunu üretsin; öğretmen telefon kamerasıyla veya toplu taranmış sayfalarla cevap kâğıtlarını okutsun; sonuç otomatik puanlansın; belirsiz okumalar öğretmen tarafından hızla düzeltilsin.

## Önce oku
CLAUDE.md, docs/02 bölüm 5.4 ve 6 (omr_*), docs/01 bölüm 4, docs/03 bölüm 7 (optik ekranı).

## Başlamadan
Plan modunda başla. OpenCV.js (WASM) yükleme ve Worker stratejisini, form geometrisini ve okuma algoritmasını ADR olarak yaz. Doğruluk hedefini birlikte belirleyelim (öneri: temiz taramalarda %99,5 baloncuk doğruluğu, belirsizlerin tamamı inceleme kuyruğuna).

## Kapsam

### A. `packages/omr`
- **Form şeması:** A4, tek veya çift sayfa; 4 köşe işareti (sabit geometri); öğrenci numarası baloncukları (0–9 sütunları, basamak sayısı ayarlı); kitapçık türü baloncukları (A–D); cevap ızgarası (A–E, 200 soruya kadar, 5'erli gruplama ve satır numaraları); ad-soyad ve sınıf yazı alanları; QR (sınav ve kitapçık kimliği). Geometri `template jsonb` olarak saklanır ve okuyucuya aynı şablon girer.
- **Form PDF üretimi:** tarayıcıda (pdf-lib), yüksek doğrulukla mm cinsinden yerleşim; baskıda ölçek kaymasını azaltmak için "gerçek boyut yazdır" uyarısı ve işaret ölçüsü.
- **Okuyucu (Worker + OpenCV.js):** gri tonlama → uyarlanır eşik → köşe işaretlerini bul → homografi → baloncuk örnekleme → boş hücre tabanına göre kalibrasyon → doluluk oranı eşikleri → çift işaret, silinti ve boş tespiti → güven skoru. Gölge ve eğim toleransı.
- **Sentetik test seti:** `packages/omr/fixtures` altında kendi ürettiğimiz formlar (gürültü, eğim, gölge, çift işaret ile) ve beklenen sonuçlar. Doğruluk regresyon testi.

### B. Arayüz
- **Form oluştur:** testten "Optik form": soru sayısı ve seçenek sayısı test ile otomatik, öğrenci numarası basamak sayısı, kitapçık alanı; önizleme ve PDF indirme.
- **Okuma oturumu:** sınıf ve test seçimi; kaynak: (1) telefon/dizüstü kamerası canlı: köşe işaretleri bulununca ince bir çerçeve belirir ve otomatik yakalama (sabit tutunca), (2) toplu PDF/görsel yükleme. Sayı ve hız göstergesi. Kamera izni reddedilirse satır içi açıklama.
- **Sonuç ve inceleme kuyruğu:** okunan her kâğıt için puan; belirsiz okumalar (çift işaret, silinti, boş, numara okunamadı) görsel üzerinde vurgulu, tek tıkla düzeltme (klavye: soru ilerleme ve A–E). Onaylanan kâğıt kilitlenir.
- **Eşleme:** öğrenci numarası okunduysa `students` ile eşleştir; yoksa elle seç. Kitapçık türüne göre doğru cevap anahtarı otomatik uygulanır (Prompt 05 eşleştirme tablosu).
- **Puanlama ve sonuçlar:** doğru/yanlış/boş, puan, isteğe bağlı yanlış cezası; sınıf tablosu; madde analizi (Prompt 09 ile ortak bileşenler); Excel/PDF dışa aktarım.
- **Depolama ve kota:** kâğıt görselleri `assets` içinde; `omr_scans_per_month` sayacı; saklama süresi ayarı (KVKK, varsayılan kısa).

## Testler
- Birim: geometri hesapları, homografi, eşik ve kalibrasyon, güven skoru.
- Doğruluk regresyonu: sentetik set üzerinde hedef doğruluk; sonuçlar CI çıktısında rapor.
- E2E: sentetik form görselleri yükle → okut → inceleme kuyruğunda bir düzeltme → sonuç ve Excel.
- Gerçek cihaz denemesi için elle test kontrol listesi (`docs/omr-manual-test.md`).

## Kabul kriterleri
- Sentetik sette hedef doğruluk sağlanıyor; belirsiz okumalar sessizce yanlış puanlanmıyor (hepsi kuyruğa düşüyor).
- Kamera akışı orta seviye bir telefonda akıcı.
- Kişisel veriler (öğrenci kâğıdı görseli) yalnızca yetkili çalışma alanı üyelerince erişilebilir.
- Tümü yeşil; ekran görüntüleri ve öz eleştiri raporda.

## Yapma
- Okuma sonucunu güven skorunu göstermeden "kesin" sunma.
- Başka üretici formlarını okuma iddiası (yalnızca Testcim formları).
- Emoji/gradyan/süs.

## Bitirince
Doğruluk raporu, gerçek cihaz test önerileri, bilinen sınırlar.
