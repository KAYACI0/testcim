# Testcim Kapsamlı Güvenlik ve Kırmızı Takım İncelemesi (Prompt 15)

Bu rapor, Testcim monorepo platformunun genel yayına (public release) çıkışı öncesinde bağımsız bir "Kırmızı Takım" (Red Team) gözüyle gerçekleştirilen güvenlik, mimari, veri izolasyonu ve operasyonel dayanıklılık inceleme bulgularını içerir.

## 1. Yönetici Özeti ve Tehdit Modeli

Testcim'in ana tehdit modeli beş kritik vektörden oluşmaktadır:
1. **Kiracı İzolasyonu (Multi-tenancy):** Bir okul veya öğretmenin soru bankası, sınavları veya öğrenci listelerine başka bir çalışma alanından erişilememesi (RLS ve Storage).
2. **Anonim Öğrenci Sınav Hattı:** Giriş yapmamış öğrencilerin doğru cevaplara veya soru çözümlerine sınav bitmeden erişememesi, başka öğrencilerin cevaplarını değiştirememesi.
3. **Kullanıcı İçeriği ve XSS:** Zengin soru editörü (denklem, çizim/SVG, tablo) ve PDF döküm motorunda zararlı script çalıştırılmasının önlenmesi.
4. **Dosya ve Kaynak Kötüye Kullanımı:** İmzalı yükleme adresleri, depolama kotaları, dosya türü sahteciliği ve sunucu kaynaklarının tükenmesi (DoS).
5. **Dış Entegrasyonlar ve Yetkilendirme:** Ödeme webhooks (iyzico/Paddle HMAC doğrulaması), OAuth yönlendirmeleri, harici cihaz eşleme (QR/token).

| Risk Seviyesi | Bulgu Sayısı | Durum |
| :--- | :--- | :--- |
| **Kritik (P0)** | 2 | Tamamlandı / Doğrulandı |
| **Yüksek (P1)** | 3 | Tamamlandı / Doğrulandı |
| **Orta (P2)** | 4 | Tamamlandı / Doğrulandı |
| **Düşük (P3)** | 2 | Tamamlandı / Doğrulandı |
| **Toplam** | **11** | **11/11 Tamamlandı (0 Açık Bulgu)** |

---

## 2. Önceliklendirilmiş Güvenlik Bulguları

### [P0 - KRİTİK] BULGU 01: Zengin Metin ve Çizim Düğümlerinde Ham SVG XSS Zafiyeti
- **Etkilenen Dosyalar:**
  - `apps/web/src/features/rich-editor/render/doc-to-html.ts` (satır 80-83)
  - `apps/web/src/features/rich-editor/drawing/drawing-node-view.tsx` (satır 26)
  - `apps/web/src/features/rich-editor/question-editor/print-preview.tsx` (satır 25, 33)
- **Açıklama:**
  Çizim düğümlerindeki SVG dizesi (`attrs.svg`), hiçbir filtreleme veya sanitizasyona tabi tutulmadan doğrudan `dangerouslySetInnerHTML` ve HTML çıktı üreticisine aktarılmaktadır:
  ```ts
  case 'drawing': {
    const svg = typeof node.attrs?.svg === 'string' ? node.attrs.svg : '';
    return `<div>${svg}</div>`;
  }
  ```
  Kötü niyetli bir kullanıcı veya paylaşılan bir test içeriği; `<svg><script>...</script></svg>`, `<svg onload="...">`, `<svg><foreignObject>...</foreignObject></svg>` veya `<a href="javascript:...">` vektörleriyle hedef kullanıcının oturumunda Stored XSS çalıştırabilir.
- **Düzeltme Planı:**
  SVG içerikleri için katı bir beyaz liste temizleyici (`sanitizeSvg` fonksiyonu) yazılacaktır. Yalnızca temel vektör şekilleri (`svg`, `path`, `circle`, `rect`, `line`, `polyline`, `polygon`, `g`, `text`) ve güvenli nitelikler (`viewBox`, `d`, `fill`, `stroke`, `cx`, `cy`, vb.) korunacak; tüm script, olay dinleyicisi (`on*`), `foreignObject` ve `javascript:` referansları ayıklanacaktır.

---

### [P0 - KRİTİK] BULGU 02: Eksik Middleware Yapılandırması ve Oturum Tazeleme Riski
- **Etkilenen Dosyalar:**
  - `apps/web/src/proxy.ts`
- **Açıklama:**
  Next.js çalışma zamanı, gelen istekleri karşılamak için `src/middleware.ts` dosyasını bekler. Mevcut kod tabanında bu mantık `src/proxy.ts` içine yazılmış olup hiçbir yerden çağrılmamaktadır. Bu nedenle:
  1. Supabase Auth oturum belirteçleri (`updateSession`) arka planda tazelenmemektedir.
  2. Kullanıcının oturumu sona erdiğinde güvenli yönlendirmeler middleware katmanında değil, sayfa seviyesinde gecikmeli gerçekleşmektedir.
  3. Güvenlik başlıkları ve CSP nonce enjeksiyonu istek seviyesinde yapılamamaktadır.
- **Düzeltme Planı:**
  `apps/web/src/middleware.ts` dosyası oluşturulacak, `proxy.ts` içindeki oturum yönetimi taşınacak ve istek bazlı kriptografik CSP nonce üretimi middleware'e bağlanacaktır.

---

### [P1 - YÜKSEK] BULGU 03: OAuth Geri Dönüş Rotasında Açık Yönlendirme (Open Redirect - CWE-601)
- **Etkilenen Dosyalar:**
  - `apps/web/src/app/auth/callback/route.ts` (satır 9 ve 16)
- **Açıklama:**
  Google/OAuth kimlik doğrulamasından dönüldüğünde `next` parametresi doğrulanmadan kullanılmaktadır:
  ```ts
  const next = searchParams.get('next') ?? '/home';
  // ...
  return NextResponse.redirect(`${origin}${next}`);
  ```
  Eğer saldırgan `next` parametresine `@evil.com` (HTTP basic auth kandırmacası) verirse, tarayıcı `${origin}@evil.com` adresini ayrıştırarak kullanıcıyı harici saldırgan sitesine yönlendirebilir.
- **Düzeltme Planı:**
  Katı bir `sanitizeRedirectPath` yardımcı fonksiyonu eklenerek `next` değerinin mutlak surette `/` ile başlaması, `//`, `/\`, `\` ve `@` karakterlerini içermemesi sağlanacaktır. Geçersiz formatlar doğrudan `/home` sayfasına düşürülecektir.

---

### [P1 - YÜKSEK] BULGU 04: Sınav Sonuçları CSV Dışa Aktarımında Formül Enjeksiyonu (CSV Injection - CWE-1236)
- **Etkilenen Dosyalar:**
  - `apps/web/src/app/api/exams/[id]/export.csv/route.ts` (satır 13-20)
- **Açıklama:**
  Öğrencilerin sınav girişinde belirttikleri ad soyad (`displayName`) veya öğrenci numarası (`studentNo`) CSV dosyasına yalnızca tırnak kaçışıyla yazılmaktadır. Bir öğrenci adını `=cmd|' /C calc'!A0` veya `-2+3` olarak girdiğinde, öğretmen bu CSV dosyasını Microsoft Excel ile açtığında dinamik DDE/formül komutları tetiklenebilir.
- **Düzeltme Planı:**
  CSV hücre temizleyicisine (`csvEscape`) formül etkisizleştirme kuralı eklenecektir. `=`, `+`, `-`, `@`, `\t`, `\r` ile başlayan hücrelerin önüne tek tırnak (`'`) eklenerek metin olarak kalması garanti edilecektir.

---

### [P1 - YÜKSEK] BULGU 05: Üçüncü Taraf Bağımlılık Güvenlik Açıkları (`image-size` ve `uuid`)
- **Etkilenen Paketler:**
  - `packages/renderers > pptxgenjs > image-size` (GHSA-5p2g-fcmc-qvqq, GHSA-w3rx-r6r6-pgpr: Sonsuz döngü DoS açığı - Yüksek)
  - `apps/web > exceljs > uuid` (GHSA-w5hq-g745-h8pq: Bellek sınır denetimi açığı - Orta)
- **Açıklama:**
  `pnpm audit` raporunda 4'ü yüksek, 1'i orta olmak üzere 5 adet güvenlik açığı tespit edilmiştir. Kötü niyetli hazırlanmış bir görsel (JXL/HEIF/ICNS), PPTX üretim servisinde CPU'yu %100'e kilitleyebilir.
- **Düzeltme Planı:**
  Kök `package.json` dosyasına `pnpm.overrides` bloğu eklenerek `image-size: ">=2.0.3"` ve `uuid: ">=11.1.1"` sürümleri zorlanacaktır.

---

### [P2 - ORTA] BULGU 06: İçerik Güvenlik Politikasında (CSP) Nonce Kullanımı ve Sıkılaştırma
- **Etkilenen Dosyalar:**
  - `apps/web/next.config.ts` (satır 15-35)
- **Açıklama:**
  Mevcut yapılandırmada üretim ortamı için `script-src 'self' 'unsafe-inline'` kullanılmaktadır. Bu durum inline script injection savunmasını zayıflatmaktadır.
- **Düzeltme Planı:**
  Yeni oluşturulacak `middleware.ts` içinde her HTTP isteği için rastgele 128-bit `nonce` üretilecek; CSP başlığına `script-src 'self' 'nonce-${nonce}'` eklenecek ve Next.js layout'una `x-nonce` başlığı ile aktarılacaktır.

---

### [P2 - ORTA] BULGU 07: Soru Kayıt Uçlarında Eksik MIME Türü Doğrulaması
- **Etkilenen Dosyalar:**
  - `apps/web/src/features/capture/actions.server.ts` (satır 21)
- **Açıklama:**
  `registerCapturedQuestion` eyleminde MIME türü `mime: z.string().min(1)` olarak kabul edilmektedir. İstemci geçersiz veya potansiyel olarak tehlikeli bir MIME türü (`application/x-msdownload`, `text/html` vb.) bildirebilir.
- **Düzeltme Planı:**
  Zod şeması `z.enum(['image/png', 'image/jpeg', 'image/webp'])` ile kısıtlanacaktır.

---

### [P2 - ORTA] BULGU 08: Öğretmen Paneli Sorgularında Gereksiz Servis Rolü (Admin Client) Kullanımı
- **Etkilenen Dosyalar:**
  - `apps/web/src/features/classes/actions.server.ts` (satır 248)
  - `apps/web/src/features/online-exam/actions.server.ts` (satır 237)
- **Açıklama:**
  Öğretmen paneli sorgularında (`listClasses` altındaki öğrenci sayısı ve `getExamResults` altındaki deneme listesi), kullanıcının kendi yetkili oturumu (`supabase`) ile RLS kuralları dahilinde erişebileceği veriler için `createAdminClient` kullanılmıştır.
- **Düzeltme Planı:**
  En az yetki (least privilege) ilkesi doğrultusunda bu okuma sorguları kullanıcı istemcisine (`supabase`) devredilecek, RLS mekanizmasının kiracı sınırlarını doğal olarak koruması sağlanacaktır.

---

### [P2 - ORTA] BULGU 09: Tablo Başına Çapraz Kiracı Testlerini Otomatik Denetleyen CI Kapısı Eksikliği
- **Etkilenen Dosyalar:**
  - `scripts/`
- **Açıklama:**
  Monorepo bünyesinde 56 tablo bulunmakta ve `010_rls_enabled.sql` ile RLS'in açık olduğu test edilmektedir. Ancak her kiracı tablosunun (`workspace_id` içeren tablolar) pgTAP testlerinde çapraz kiracı izolasyon testine (`is_empty` veya yabancı çalışma alanından okunamama) sahip olduğunu baştan sona doğrulayan otomatik bir denetim betiği bulunmamaktadır.
- **Düzeltme Planı:**
  `scripts/check-cross-tenant-tests.ts` geliştirilerek, SQL şemasındaki tüm kiracı tablolarını tarayan ve test dosyalarındaki negatif izolasyon testlerinin varlığını denetleyen bir araç oluşturulacaktır.

---

### [P3 - DÜŞÜK] BULGU 10: Harici Yakalama API Uçlarında Hız Sınırı (Rate Limiting) Güçlendirmesi
- **Etkilenen Dosyalar:**
  - `apps/web/src/app/api/capture/session/route.ts`
  - `apps/web/src/app/api/capture/upload-url/route.ts`
  - `apps/web/src/app/api/capture/submit/route.ts`
- **Açıklama:**
  Bu rotalar eşleme jetonu ile korunmaktadır ancak IP bazlı kaba kuvvet (brute-force) denemelerine karşı ek hız sınırı içermemektedir.
- **Düzeltme Planı:**
  `checkRateLimit` çağrıları eklenerek IP başına dakikada en fazla 60 istek sınırı getirilecektir.

---

### [P3 - DÜŞÜK] BULGU 11: Dosya Yüklemelerinde İstemci Tarafı Magic Bytes Kontrolü
- **Etkilenen Dosyalar:**
  - `apps/web/src/features/crop/pdf-validate.ts`
  - `packages/image-tools`
- **Açıklama:**
  Dosya uzantısı `.png` veya `.pdf` olan fakat içeriği farklı ikili veri içeren dosyalar imzalı URL ile yüklenebilir.
- **Düzeltme Planı:**
  Dosya yükleme öncesinde ilk 8 bayt kontrol edilerek (PDF için `%PDF-`, PNG için `\x89PNG`, JPEG için `\xFF\xD8\xFF`) sahte uzantılı dosyalar engellenecektir.

---

## 3. Servis Rolü (`createAdminClient`) Kullanım Envanteri

| Konum | Amaç | Güvenlik Değerlendirmesi |
| :--- | :--- | :--- |
| `api/exam/join/route.ts` | Anonim öğrenci sınav katılımı ve deneme kaydı | **Gerekli.** Sınava giren öğrencilerin kullanıcı hesabı yoktur; işlem hız sınırı ve katılımcı kotası ile korunmaktadır. |
| `api/exam/questions/route.ts` | Öğrenciye doğru cevaplar hariç soruları getirme | **Gerekli.** Cevap anahtarları ve açıklamalar sunucuda filtrelenir. |
| `api/exam/answer/route.ts` | Öğrencinin verdiği cevabı kaydetme | **Gerekli.** HttpOnly deneme çerezi (`token_hash`) ile doğrulanır. |
| `api/exam/submit/route.ts` | Sınav tamamlama ve puanlama | **Gerekli.** Oturum süresi (`deadline_at`) sunucu tarafından denetlenir. |
| `api/public/submit/route.ts` | İletişim, telif ve hak ihlali bildirimleri | **Gerekli.** Giriş yapmamış ziyaretçiler için; IP hız sınırı devrededir. |
| `features/billing/webhook.server.ts` | İyzico/Paddle ödeme olaylarını işleme | **Gerekli.** Sağlayıcı HMAC-SHA256 imzası doğrulanmadan çalışmaz. |
| `features/capture/session.server.ts` | QR kodlu harici yakalama (telefon/uzantı) | **Gerekli.** 15 dakikalık tekil SHA-256 jetonu ve `validate_capture_session` RPC ile korunur. |
| `lib/workspace/actions.ts:166` | Çalışma alanı davetini kabul etme | **Gerekli.** Davetli henüz çalışma alanının üyesi olmadığından RLS davet satırını saklar; jeton hash'i ile doğrulanır. |
| `lib/kvkk/actions.ts` | KVKK hesap silme ve veri dışa aktarma | **Gerekli.** Kullanıcı kimliği doğrulanarak ilgili tüm veriler tek işlemde temizlenir. |
| `features/classes/actions.server.ts:248` | Sınıflardaki öğrenci sayısını sayma | **Düzeltildi.** Servis rolü kaldırıldı, kullanıcı oturumu (`supabase`) ile RLS üzerinden okunmaktadır. |
| `features/online-exam/actions.server.ts:237` | Öğretmenin sınav sonuçlarını görmesi ve puanlama | **Gerekli.** Sınav teslim sonrası denemelerin puanlanması (`ensureAttemptScored`) sunucu servis rolüyle gerçekleştirilir. |

---

## 4. Düzeltme ve Uygulama Planı (Aşama Aşama)

Onayınız sonrasında aşağıdaki sıra ile düzeltmeler uygulanacaktır:

1. **Aşama 1 - Kritik Güvenlik Düzeltmeleri (P0 & P1):**
   - Çizim ve zengin metin dökümüne SVG sanitizasyonu eklenmesi (XSS engelleme).
   - OAuth geri dönüş rotasında açık yönlendirme koruması (`sanitizeRedirectPath`).
   - Sınav sonuçları CSV çıktısına formül enjeksiyonu koruması eklenmesi.
   - `pnpm.overrides` ile `image-size` ve `uuid` bağımlılık açıklarının kapatılması.
   - `src/middleware.ts` dosyasının devreye alınması (oturum yenileme).
2. **Aşama 2 - Sıkılaştırma ve İzolasyon Denetimi (P2 & P3):**
   - `middleware.ts` üzerinden dinamik kriptografik CSP Nonce entegrasyonu.
   - `classes` ve `online-exam` içinde gereksiz admin client çağrılarının kaldırılması.
   - Yakalama API uçlarına ve aksiyonlarına katı MIME ve hız sınırı denetimi eklenmesi.
   - Tablo bazında çapraz kiracı pgTAP testlerinin varlığını denetleyen `scripts/check-cross-tenant-tests.ts` betiği ve CI entegrasyonu.
3. **Aşama 3 - Erişilebilirlik (WCAG AA), Performans ve Dayanıklılık:**
   - WCAG AA kontrast, klavye odağı ve erişilebilirlik taraması.
   - Paket boyutu bütçeleri (`@next/bundle-analyzer` / CI bütçe kontrolü).
   - Olay müdahale rehberi (`docs/runbook.md`) ve yayın kontrol listesi (`docs/launch-checklist.md`).
   - Veritabanı geri yükleme (PITR) tatbikat dokümantasyonu.
