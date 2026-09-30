# ADR 0005: Optik okuma (OMR) — form geometrisi, okuyucu stratejisi, doğruluk hedefi

## Durum

Kabul edildi (Prompt 10, ilk dilim: form üretimi + toplu okuma + inceleme kuyruğu; canlı kamera kapsam dışı).

## Bağlam

Testcim kendi optik cevap kâğıdını üretip öğretmenin toplu taradığı/fotoğrafladığı kâğıtları
otomatik puanlaması gerekiyor (docs/prompts/10-optik-okuma.md). Üç karar öğretmenle
(kullanıcıyla) birlikte netleştirildi:

1. **Kapsam:** Bu dilimde yalnızca form üretimi + toplu görsel/PDF yükleme + okuma +
   inceleme kuyruğu + puanlama. Canlı kamera yakalama (köşe algılanınca çerçeve,
   otomatik yakalama) sonraki bir dilime bırakıldı.
2. **CV yaklaşımı — prompttan sapma:** Prompt OpenCV.js (WASM) öneriyordu. Repoda hiçbir
   WASM/CV bağımlılığı yoktu; OpenCV.js çekirdeği ~8–10 MB'lık bir yük ve Worker'da
   yükleme/başlatma karmaşıklığı getirir. Bunun yerine gri tonlama, köşe işareti bulma,
   homografi ve baloncuk doluluk skorlama **saf TypeScript** ile yazıldı. Gerekçe:
   `packages/*` içinde React/Next bağımlılığı yok kuralına ve saf/deterministik test
   edilebilirlik ilkesine daha uygun; `packages/image-tools/src/auto-trim.ts` zaten aynı
   tarzda piksel-düzeyi eşikleme içeriyor.
3. **Doğruluk hedefi:** Temiz (gürültüsüz, hafif gölgeli) sentetik taramalarda ≥%99,5
   baloncuk/grup doğruluğu; her belirsiz okuma (çift işaret, silinti/kısmi doldurma,
   düşük güven, öğrenci no okunamadı) sessizce yanlış puanlanmadan inceleme kuyruğuna
   düşer. `packages/omr/src/fixtures/accuracy.test.ts` bunu bir regresyon testiyle
   doğrular.

## Form geometrisi

`packages/omr/src/template.ts` (`buildOmrTemplate`):

- A4 (210×297 mm), tek sütun cevap ızgarası, gerektiğinde birden çok sayfaya taşar
  (soru sayısı sayfa kapasitesini aşınca otomatik yeni sayfa, numaralandırma devam eder).
- 4 köşe işareti, her sayfanın kenarından **sabit** bir bant içinde (`CORNER_INSET_MM`,
  `CORNER_SIZE_MM`); okuyucunun arama penceresi (`CORNER_SEARCH_MM`) bu bandın hemen
  dışına taşmayacak şekilde, `MARGIN_MM`'den kesinlikle daha dar tutulur — böylece köşe
  arama alanı hiçbir zaman üst bilgi/baloncuk içeriğiyle çakışmaz. Bu sabitler tek bir
  dosyada (template.ts) tanımlanıp okuyucu tarafından (`reader/corners.ts`) da
  içe aktarılır: form ve okuyucu asla farklı geometriye göre çalışamaz.
- Öğrenci no (0–9 × basamak sayısı) ve kitapçık türü (A–D) baloncuk ızgaraları, ad-soyad
  ve sınıf metin kutuları yalnızca 1. sayfada.
- Cevap ızgarası: her 5 soruda bir küçük boşluk (`GROUP_GAP_MM`), satır numaraları
  (PDF'de yazdırılır, geometriye dahil değil).
- QR alanı her sayfada ayrılmış, ama bu dilimde **gerçek bir QR barkodu üretilmiyor/
  okunmuyor** — yalnızca form kimliğinin yazılı olduğu bir yer tutucu kutu. Gerekçe:
  gerçek QR kodlama + kod çözme (ör. `qrcode` üretim, `jsqr` okuma) ayrı bağımlılıklar
  gerektiriyor ve öğrenci no baloncuk ızgarası zaten otomatik eşleme için yeterli;
  gerçek QR bu dilimde kapsam dışı bırakıldı (bkz. docs/backlog.md).

## Okuyucu stratejisi (saf TypeScript, Worker'da çalışacak)

`packages/omr/src/reader/*` DOM'suz, tamamen saf fonksiyonlardır (Node'da test edilir,
apps/web'deki bir Web Worker onları `RawImage`/`ImageBitmap` köprüsüyle sarmalar —
`apps/web/src/features/capture/worker/client.ts`'teki Worker-wrapper deseniyle aynı
şekilde, bu dilimde henüz uygulanmadı, bkz. backlog):

1. **Gri tonlama** (`grayscale.ts`): RGBA → luminance.
2. **Köşe işareti bulma** (`corners.ts`): her köşe için, o köşeye özgü sabit bir arama
   kutusu içinde piksellerin **kendi bölgesinin ortalamasına göre** ağırlıklı
   (yerel-adaptif) karanlık ağırlık merkezi hesaplanır. Tam pencereli bir Sauvola/Bernsen
   eşiklemesi yerine bu basitleştirme tercih edildi: köşe işareti bölgesi zaten izole
   (yalnızca işaret + boş kâğıt) olduğundan yerel ortalamaya göre ağırlıklandırma aynı
   gölge toleransını çok daha az kodla sağlıyor.
3. **Homografi** (`homography.ts`): 4 köşe eşleşmesinden klasik 8 bilinkişili doğrusal
   sistem (Gauss eleme, kısmi pivotlama) ile tam perspektif dönüşüm çözülür — eğim,
   döndürme ve hafif perspektif bozulmasını matematiksel olarak tolere eder.
4. **Baloncuk örnekleme** (`sample.ts`): her baloncuk için hem merkez (mürekkep) hem de
   baloncuğun **hemen dışındaki** boş kâğıt halkası homografiyle örneklenir. Doluluk
   oranı, sabit bir "mürekkep karanlığı" sabitine karşı **yerel** arka plana göre
   hesaplanır. Gölge toleransı buradan gelir: aynı sayfanın gölgeli tarafındaki bir
   baloncuk, sayfanın geneliyle değil kendi hemen yanındaki kâğıtla kıyaslanır.
5. **Puanlama/belirsizlik** (`score.ts`): bir grup (bir sorunun seçenekleri, bir öğrenci
   no basamağının 0–9 seçenekleri, veya kitapçık kodu) için: hiç dolu yok → boş; tam bir
   dolu → cevap; iki veya daha fazla dolu → çift işaret (inceleme); ara bantta (ne açıkça
   boş ne açıkça dolu) herhangi bir seçenek varsa → belirsiz/silinti şüphesi (inceleme).
   Boş, ambiguous/double'dan ayrı tutulur: boş bırakmak normal bir öğrenci davranışıdır,
   incelemeye düşürülmez.

## Bilinen sınırlar (bkz. docs/backlog.md "Dilim 10'dan kalanlar")

- Canlı kamera yakalama yok.
- Gerçek QR üretimi/okuma yok (yer tutucu kutu var).
- Gerçek taranmış/fotoğraflanmış kâğıtla doğrulanmadı — yalnızca sentetik piksel
  fikstürleriyle test edildi; eğim (rotasyon) toleransı homografi matematiği düzeyinde
  doğru ama sentetik fikstürlerle ayrıca doğrulanmadı (yalnızca gölge ve gürültü
  fikstürleri var).
- PDF'de Türkçe karakterler (ı/İ/ğ/Ğ/ş/Ş) `packages/renderers` ile paylaşılan bilinen bir
  sorun: pdf-lib'in yerleşik WinAnsi fontu bu karakterleri kodlayamıyor. `renderOmrFormPdf`
  bu yüzden hiçbir Türkçe metni kendi içinde sabit yazmıyor (etiketler çağırandan
  parametre olarak gelir), ama gerçek Unicode font (fontkit ile) entegrasyonu ayrı bir
  iş kalemi.
- Çok sütunlu (yan yana) cevap ızgarası yok; 200 soruya kadar tek sütun + çok sayfa ile
  destekleniyor, alan verimliliği optimum değil.
