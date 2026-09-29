# Testcim: Mimari

## 1. Temel ilkeler

1. **Hız hissi her şeyden önce gelir.** Yakalama hattı iyimser çalışır: önce ekranda görünür, sonra arka planda yüklenir.
2. **Tek yerleşim motoru.** Ekran önizlemesi, PDF, DOCX ve PPTX aynı yerleşim çıktısından üretilir. "Önizlemede böyleydi, PDF'te başka" sorunu yapısal olarak yoktur.
3. **Veri kiracıya aittir.** Her satır bir `workspace_id` taşır; erişim kuralı veri tabanında (RLS) uygulanır, uygulama koduna güvenilmez.
4. **Yetki verisi koddan ayrıdır.** Plan sınırları `plans.entitlements` içinde yaşar. Kod sadece "yapabilir mi?" diye sorar.
5. **Yapay zekâ taslak üretir, öğretmen onaylar.** Hiçbir yapay zekâ çıktısı onaysız teste girmez.
6. **Ağır iş tarayıcıda, güvenli iş sunucuda.** PDF birleştirme, OMR görüntü işleme ve görsel kırpma tarayıcıda (Web Worker); ödeme, sınav puanlama ve yapay zekâ çağrıları sunucuda.
7. **Değişmez sürümler.** Bir test bir kez dışa aktarıldığında sorular sabitlenmiş sürümlerine (`question_revisions`) bağlanır; sonradan bankadaki soru değişse bile eski çıktı yeniden üretilebilir.

## 2. Teknoloji yığını

Sürüm numaraları bilinçli olarak yazılmamıştır. Kurulumdan önce her kütüphanenin güncel resmi belgesini oku ve mevcut kararlı sürümü kullan.

| Katman | Seçim | Gerekçe |
|---|---|---|
| Uygulama | Next.js (App Router), React, TypeScript (strict) | Vercel ile en olgun eşleşme |
| Stil | Tailwind CSS + kendi token katmanı | Tasarım sistemi bölümüne bak |
| Bileşen tabanı | Radix Primitives (veya React Aria) üzerine kendi bileşenlerimiz | Erişilebilirlik hazır, görünüm tamamen bizim. Hazır shadcn görünümü kullanılmaz |
| İkonlar | Phosphor Icons, Light ağırlığı | İnce, tutarlı, zarif |
| Durum | Zustand (editör), TanStack Query (sunucu verisi) | Editör için işlem günlüğü (op log) tabanlı |
| Formlar/doğrulama | Zod (paylaşılan şemalar), react-hook-form | Tek şema hem istemci hem sunucu |
| Veri tabanı | Supabase Postgres | RLS, RPC, pg_cron, pgvector, pg_trgm |
| Kimlik | Supabase Auth (e-posta bağlantısı/OTP + Google) | `@supabase/ssr` ile çerez tabanlı oturum |
| Dosya | Supabase Storage (özel kovalar, imzalı URL) | Doğrudan yükleme; büyük PDF'te resumable (TUS) |
| Gerçek zamanlı | Supabase Realtime (Presence, Broadcast, Postgres Changes) | Canlı sınav, telefon yakalama, işbirliği |
| PDF okuma | pdfjs-dist | Kırpma stüdyosu |
| PDF üretme | pdf-lib (Web Worker içinde) | İstemcide hızlı, sunucu maliyeti yok |
| DOCX / PPTX | docx, pptxgenjs | Düzenlenebilir çıktı |
| Zengin metin | TipTap (ProseMirror) | Soru editörü |
| Denklem | MathLive (giriş) + KaTeX (gösterim) | LaTeX ile uyumlu |
| Çizim | Konva tabanlı özel geometri aracı | Lisans ve marka kontrolü bizde (tldraw/Excalidraw kullanılmaz) |
| OMR | OpenCV.js (WASM, Web Worker) | Cihazda işlem, gizlilik ve maliyet avantajı |
| Yapay zekâ | Anthropic Claude API (sunucu tarafı), sağlayıcı soyutlaması | Görsel anlama ve yapılandırılmış çıktı |
| E-posta | Resend | İşlemsel e-posta |
| Ödeme | iyzico (abonelik) birincil; `BillingProvider` arayüzü | TRY ve Türkiye faturalandırma. Uygunluğu resmi belgeden doğrula |
| Hız sınırı | Upstash Redis (`@upstash/ratelimit`) | Herkese açık sınav uçları |
| Hata izleme | Sentry | |
| Ürün analitiği | PostHog (AB bölgesi), çerez onayı arkasında | KVKK |
| Test | Vitest, fast-check, Playwright, pgTAP | |
| Depo | pnpm workspaces + Turborepo | Vercel monorepo desteği |
| CI/CD | GitHub Actions + Vercel | PR başına önizleme dağıtımı |

**Supabase notları:** API anahtar adlandırması (publishable/secret veya anon/service_role) güncel belgeye göre kullanılır. Gizli anahtar yalnızca sunucuda bulunur, istemci paketine asla girmez. Bölge olarak AB (Frankfurt) seç.

**Vercel notları:** Serverless fonksiyon istek gövdesi sınırı (yaklaşık 4,5 MB) nedeniyle dosyalar sunucudan geçmez; istemci imzalı URL ile doğrudan Storage'a yükler. Uzun işler için `jobs` tablosu ve `JobQueue` arayüzü kullanılır; başlangıçta Vercel Cron + rota işleyicileri, gerekirse Trigger.dev/Inngest ile değiştirilebilir.

## 3. Depo yapısı

```
testcim/
  CLAUDE.md
  docs/                      (bu dokümanlar + docs/prompts)
  apps/
    web/                     (Next.js)
      src/app/               (rotalar)
      src/features/          (dikey özellik klasörleri: editor, capture, tests, bank, exams, omr, ai, billing...)
      src/components/ui/     (tasarım sistemi bileşenleri)
      src/lib/               (supabase istemcileri, yetki, i18n)
      messages/tr.json en.json
  packages/
    shared/                  (zod şemaları, tipler, yetki mantığı, sabitler)
    layout-engine/           (saf TS: yerleşim JSON'u üretir, DOM bağımsız)
    renderers/               (layout JSON -> HTML önizleme, PDF, DOCX, PPTX)
    omr/                     (form geometrisi, okuyucu, testler)
    image-tools/             (kırpma, otomatik boşluk temizleme, hash, sıkıştırma)
  supabase/
    migrations/  seed.sql  tests/ (pgTAP)  functions/ (gerekirse Edge Functions)
  scripts/                   (check-design-rules, curriculum import, vb.)
  .github/workflows/
```

Kural: `packages/*` içinde React veya Next bağımlılığı yoktur. Bu, yerleşim motorunu ve OMR'ı Worker'da, Node testlerinde ve ileride masaüstü uygulamasında yeniden kullanılabilir kılar.

## 4. Sistem şeması

```
Tarayıcı (Next.js istemcisi)
 ├─ Yakalama hattı: paste / drop / QR-telefon / uzantı
 │    └─ image-tools (Worker): çöz -> otomatik kırp -> hash -> sıkıştır -> küçük resim
 │         └─ Storage'a imzalı URL ile doğrudan yükleme (arka plan, kuyruklu, yeniden deneme)
 ├─ Editör durumu (Zustand): op log -> RPC apply_test_ops (iyimser eşzamanlılık)
 ├─ layout-engine (Worker): sorular + ayarlar -> yerleşim JSON
 │    ├─ HTML önizleme (canlı)
 │    └─ renderers: pdf-lib (Worker) -> PDF / DOCX / PPTX
 └─ OMR okuyucu (Worker, OpenCV.js): kamera/PDF -> cevaplar + güven skoru

Vercel (rota işleyicileri, Server Actions)
 ├─ Auth oturumu (çerez), yetki denetimi, kota sayaçları
 ├─ /api/ai/*   -> Claude API (kredi düşümü, yapılandırılmış çıktı, hız sınırı)
 ├─ /api/exam/* -> anonim öğrenci akışı (servis rolü, HttpOnly deneme belirteci)
 ├─ /api/billing/* -> iyzico webhook ve abonelik yönetimi
 └─ Cron -> temizlik, kredi sıfırlama, süresi biten sınavları kapatma

Supabase
 ├─ Postgres (RLS, RPC, pg_cron, pgvector, pg_trgm)
 ├─ Auth · Storage (özel kovalar) · Realtime
 └─ Yedekleme (PITR için ücretli plan)
```

## 5. Kritik akışlar

### 5.1 Yakalama hattı (ürünün kalbi)

- Editör rotasında belge düzeyinde `paste` dinleyicisi. Odak bir metin alanındaysa ve panoda görsel yoksa dokunulmaz.
- `clipboardData.items` içinden `image/*` dosyaları alınır; çoklu görsel desteklenir.
- Her görsel: `createImageBitmap` ile çözülür, **otomatik boşluk kırpma** (kenar algılama, tolerans, 6 px iç boşluk korunur), SHA-256 ve algısal hash (pHash) hesaplanır, kayıpsız (PNG/WebP lossless) orijinal + küçük resim (WebP, 480 px) üretilir.
- **İyimser ekleme:** İstemci UUID'si (v7) ve kesirli indeks (`fractional-indexing`) ile soru hemen listeye girer; küçük resim `URL.createObjectURL` ile görünür. Yükleme arka planda, en fazla 3–4 eşzamanlı, üstel geri çekilmeyle yeniden denemeli.
- **Yakalama modu:** Açıkken her yapıştırma sona eklenir; yapıştırmadan sonra 5 saniye içinde A–E (veya 1–5) tuşu son eklenen sorunun doğru cevabını işaretler.
- **Odağa dönünce otomatik ekleme (isteğe bağlı):** `window.focus` olayında `navigator.clipboard.read()` ile yeni görsel varsa ekler (izin bir kez sorulur; destek yoksa sessizce devre dışı).
- **Yinelenen tespiti:** Aynı SHA-256 veya çok yakın pHash varsa "Bu soru zaten var" satır içi uyarısı; engellenmez.
- **Geri al/yinele:** Op log tabanlı; yapıştırma tek işlem grubudur.
- **Çevrimdışı dayanıklılık:** Yükleme kuyruğu IndexedDB'de tutulur; sekme kapanıp açılsa da kaldığı yerden devam eder.

### 5.2 Yerleşim motoru ve PDF

- `layout-engine`: girdi `{ items[], groups[], sections[], settings, versionCode, seed }`, çıktı `LayoutDocument { pages[ { columns[ { blocks[ { itemId, x, y, w, h } ] } ] } ] }`. Birim milimetre.
- Ayarlar: sayfa boyutu/yönü, sütun (1–3), kenar boşlukları, sütun aralığı, soru aralığı (en az 3 mm), üst/alt bilgi, numaralandırma biçimi, filigran, sayfa rengi.
- Yerleşim modları: `strict` (sıra korunur), `flexible` (bakma penceresi k ile boşluk doldurma, numaralar yeniden verilir), `fit-pages` (N sayfaya sığdır, ölçek alt sınırı 0,85). Gruplar bölünmez.
- Kitapçık türleri: tohumlu PRNG (mulberry32) ile karıştırma; sabitlenen sorular, bölüm sınırları ve grup içi karıştırma kısıtları. Görüntü sorularında şıklar görselin içinde olduğundan yalnızca soru sırası karışır; metin sorularda şıklar da karışır ve `test_versions.option_permutations` kaydedilir.
- Cevap anahtarı, sürüm eşleme tablosu ve çözüm kitapçığı aynı motorla üretilir.
- Renderers: HTML önizleme ile PDF aynı `LayoutDocument`'tan çıkar. PDF, Web Worker'da `pdf-lib` ile birleştirilir; görseller hedef DPI'ya (Taslak 120, Standart 200, Yüksek 300) göre yeniden örneklenir.
- Zengin (metin/denklem) sorular kaydedilirken yüksek DPI'lı bir "render" görseline dökülür; PDF hattı böylece tek tip kalır (yalnızca yerleştirilmiş görsellerden oluşur). Vektör kalite ileride Chromium tabanlı ayrı bir servisle eklenebilir.

### 5.3 Çevrimiçi sınav

- Öğretmen bir testi sabitlenmiş sürümüyle yayınlar (`online_exams`). Öğrenci hesap açmaz; ad/numara girer veya kod ile katılır.
- Öğrenci akışı yalnızca sunucu uçlarından geçer (servis rolü). Tarayıcıdan Supabase'e doğrudan yazma yoktur. Deneme belirteci HttpOnly çerezdedir, veri tabanında yalnızca hash'i durur.
- Süre sunucu saatiyle yönetilir (`deadline_at`); istemci sayacı yalnızca gösterimdir. Cevaplar otomatik kaydedilir, teslimde sunucu puanlar.
- Mod: `async` (açılış-kapanış penceresi) ve `live` (öğretmen başlatır, Realtime Presence ile lobi ve canlı ilerleme).
- Caydırıcı önlemler: sekme/odak kaybı sayacı, soru ve şık karıştırma, tek cihaz belirteci. İddia edilmez, raporlanır.
- Sonuçlar: puan, doğru/yanlış/boş, madde analizi (zorluk p, ayırt edicilik %27 üst-alt grup, çeldirici dağılımı), KR-20, histogram, Excel/CSV.

### 5.4 Optik okuma (OMR)

- Formu biz üretiriz: köşe işaretleri, öğrenci numarası baloncukları, kitapçık türü baloncukları, cevap ızgarası (A–E, en fazla 200 soru), QR (sınav + sürüm kimliği).
- Okuyucu: gri tonlama, uyarlanır eşik, köşe işaretlerini bul, homografi ile düzelt, baloncuk doluluk oranı, boş hücre tabanına göre kalibrasyon, çift işaret ve silinti tespiti, güven skoru.
- Belirsiz olanlar "inceleme kuyruğu"na düşer; öğretmen görselin üstünde tek tıkla düzeltir.
- Kaynaklar: telefon kamerası (canlı), toplu PDF/görsel (tarayıcıdan gelen sayfalar).
- Puanlama: sürüm eşleme tablosu ile otomatik.

### 5.5 Yapay zekâ

- Tüm çağrılar sunucuda: kimlik + yetki + kredi kontrolü + hız sınırı → sağlayıcı → Zod ile doğrulanan yapılandırılmış çıktı → `ai_jobs` kaydı ve `credit_ledger` düşümü.
- Modeller ortam değişkeniyle seçilir (`AI_MODEL_QUALITY`, `AI_MODEL_FAST`). Üretim ve kalite kontrolü için güçlü model, OCR ve etiketleme gibi ucuz işler için hızlı model.
- Prompt şablonları depoda sürümlü dosyalardır (`apps/web/src/features/ai/prompts/`), test edilir.
- Çıktı `ai_review_status = draft` gelir; onaylanınca `approved`.
- Sistem promptu güvenliği: kullanıcı içeriği veri olarak işaretlenir, talimat olarak yorumlanmaz.

### 5.6 Yetki ve faturalandırma

- `get_entitlements(workspace_id)` bir JSON döndürür (plan + geçersiz kılmalar). Sayaçlar `usage_counters` ile atomik artırılır (`increment_usage` RPC).
- Sunucuda `requireEntitlement(ws, key)`, istemcide `useEntitlement(key)`. Sınıra yaklaşıldığında satır içi metin gösterilir; kapatılamayan modal yok.
- Ödeme sağlayıcısı webhook'u `subscriptions` tablosunu günceller; abonelik durumu tek kaynaktır.

## 6. Veri modeli (özet)

Tüm tablolarda: `id uuid pk`, `created_at`, `updated_at` (tetikleyici), gerektiğinde `deleted_at` (yumuşak silme). Kiracı tablolarında `workspace_id` zorunludur ve indekslidir. Enum yerine `text + check` kısıtı tercih edilir (migrasyon kolaylığı).

**Kimlik ve kiracı**
- `profiles(id → auth.users, full_name, avatar_path, locale, onboarding jsonb)`
- `workspaces(id, name, slug, kind personal|team, owner_id, plan_id, branding jsonb{logo_path, school_name, header_defaults}, settings jsonb)`
- `workspace_members(workspace_id, user_id, role owner|admin|editor|viewer)` pk(workspace_id, user_id)
- `workspace_invites(id, workspace_id, email, role, token_hash, expires_at, accepted_at)`
- `plans(id text pk, name, entitlements jsonb, is_active)`
- `subscriptions(id, workspace_id, plan_id, provider, provider_ref, status, seats, current_period_end, cancel_at_period_end)`
- `usage_counters(workspace_id, period_start, metric, value)` pk(workspace_id, period_start, metric)
- `credit_ledger(id, workspace_id, user_id, delta, reason, ref_type, ref_id)`
- `audit_log(id, workspace_id, actor_id, action, target_type, target_id, meta jsonb)`

**Dosyalar**
- `assets(id, workspace_id, owner_id, bucket, path, kind image|thumb|pdf|render|logo|export, mime, bytes, width, height, sha256, phash, source paste|drop|pdf_crop|mobile|extension|ai|upload, deleted_at)`; benzersiz `(workspace_id, sha256, kind)`.
- `source_documents(id, workspace_id, asset_id, name, page_count)`
- `crop_sessions(id, workspace_id, source_document_id, state jsonb)`

**Müfredat (sistem verisi, `workspace_id` boş)**
- `curriculum_subjects(id, code, name, grade_from, grade_to)`
- `curriculum_topics(id, subject_id, parent_id, name)`
- `curriculum_outcomes(id, subject_id, topic_id, grade, code, description)`

**Sorular**
- `folders(id, workspace_id, parent_id, kind questions|tests, name)`
- `questions(id, workspace_id, folder_id, created_by, kind image|rich, question_type mcq|tf|fill|match|open|numeric|order, stem_asset_id, stem_rich jsonb, stem_text, options jsonb, option_count, correct jsonb, points, difficulty 1..5, difficulty_observed, subject_id, topic_id, explanation_rich jsonb, explanation_asset_id, source_meta jsonb, lang, ai_generated bool, ai_review_status draft|approved, status active|archived, search tsvector, embedding vector, current_revision int, deleted_at)`
- `question_revisions(id, question_id, revision, snapshot jsonb, created_by)` değişmez
- `question_outcomes(question_id, outcome_id)`, `tags(id, workspace_id, name)`, `question_tags(question_id, tag_id)`

**Testler**
- `tests(id, workspace_id, folder_id, created_by, title, type exam|test_paper|mock|written|worksheet|quiz, status draft|ready|archived, settings jsonb, settings_version, version_count, seed, question_count, revision int, last_exported_at, deleted_at)`
- `test_sections(id, test_id, position, title, quota, time_limit_sec)`
- `test_groups(id, test_id, passage_rich jsonb, passage_asset_id)`
- `test_items(id, test_id, section_id, group_id, question_id, question_revision_id, position text /*kesirli indeks*/, points_override, correct_override jsonb, pinned bool)`
- `test_versions(id, test_id, code, item_order jsonb, option_permutations jsonb, seed)`
- `test_snapshots(id, test_id, revision, snapshot jsonb, reason)` sürüm geçmişi
- `export_templates(id, workspace_id, name, settings jsonb, header jsonb)`
- `exports(id, workspace_id, test_id, kind pdf|answer_key|solutions|docx|pptx|omr_form|zip, status, asset_id, params jsonb, page_count, created_by, expires_at)`
- `share_links(id, workspace_id, resource_type, resource_id, token_hash, permissions, expires_at)`

**Sınıflar**
- `classes(id, workspace_id, name, grade, school_year, archived)`
- `students(id, workspace_id, student_no, full_name, external_ref)`
- `class_students(class_id, student_id)`

**Çevrimiçi sınav**
- `online_exams(id, workspace_id, test_id, test_snapshot_id, title, mode async|live, access link|code|roster, join_code, slug, opens_at, closes_at, duration_sec, max_attempts, shuffle_questions, shuffle_options, show_results never|after_submit|after_close, show_answers, required_fields jsonb, status draft|scheduled|open|closed, participant_cap)`
- `exam_attempts(id, online_exam_id, student_id, display_name, student_no, class_label, token_hash, started_at, deadline_at, submitted_at, status, ip_hash, ua_hash, flags jsonb, score, max_score)`
- `attempt_answers(attempt_id, item_id, answer jsonb, is_correct, points, answered_at, time_spent_ms)` pk(attempt_id, item_id)

**Optik**
- `omr_forms(id, workspace_id, test_id, template jsonb, template_version)`
- `omr_sessions(id, workspace_id, test_id, class_id, status)`
- `omr_scans(id, session_id, asset_id, student_id, student_no_read, version_code, answers jsonb, confidence jsonb, needs_review bool, reviewed_by, score)`

**Yapay zekâ ve genel**
- `ai_jobs(id, workspace_id, user_id, kind, input jsonb, output jsonb, status, model, tokens_in, tokens_out, cost_micro, credits_charged, error)`
- `jobs(id, kind, payload jsonb, status, run_at, attempts, last_error)`
- `question_reports(id, reporter_email, question_id, reason, status)` hak sahibi bildirimi
- `feedback(id, workspace_id, user_id, body, context jsonb)`

**Anahtar RPC ve fonksiyonlar**
- `is_member(ws)`, `has_role(ws, roles[])` (security definer, `(select auth.uid())` deseniyle)
- `get_entitlements(ws)`, `increment_usage(ws, metric, amount)`, `spend_credits(ws, amount, reason, ref)`
- `apply_test_ops(test_id, base_revision, ops jsonb)`: iyimser eşzamanlılık; çakışmada güncel revizyonu döndürür
- `tr_normalize(text)`: Türkçe küçük harfe çevirme ve aksan katlama (İ→i, I→ı doğru işlenir); arama bunun üzerinden
- `close_expired_exams()`: pg_cron

## 7. Güvenlik

- **RLS varsayılan reddet.** Her tabloda etkin. Politikalar `is_member`/`has_role` ile. Sistem verisi (müfredat, planlar) herkese salt okunur.
- **Çapraz kiracı testleri zorunlu** (pgTAP): iki çalışma alanı kur, birinin verisine diğerinden erişilemediğini her tablo için doğrula.
- **Storage:** kova özel. Yol `{workspace_id}/{yıl}/{uuid}.{uzantı}`. Politika ilk klasör segmentini üyelikle karşılaştırır. Okuma yalnızca kısa ömürlü imzalı URL.
- **Girdi doğrulama:** Sunucu ve istemci aynı Zod şemasını kullanır. Dosyada magic-byte kontrolü, boyut ve piksel üst sınırı, PDF sayfa sınırı.
- **Anonim öğrenci uçları:** yalnızca sunucu; hız sınırı, belirteç hash'i, katılımcı üst sınırı, IP ve UA yalnızca hash olarak.
- **Sırlar:** yalnızca Vercel ortam değişkenleri; repoda `.env.example` bulunur, gerçek anahtar bulunmaz. GitHub secret scanning ve push protection açık.
- **Başlıklar:** sıkı CSP, `frame-ancestors` (iframe gömme yalnızca yetkili yol), HSTS, Referrer-Policy.
- **KVKK:** silme ve dışa aktarma uçları, saklama süreleri (`pg_cron` ile temizlik), denetim günlüğü, en az veri ilkesi, çerez onayı.
- **Yönetici paneli** ayrı rol ve MFA ile.

## 8. Performans bütçeleri

- Yapıştırma → küçük resim görünür: 150 ms altında.
- 200 sorulu editörde kaydırma 60 fps: sanallaştırma (TanStack Virtual), tembel yüklenen küçük resimler.
- Ağır kütüphaneler (pdfjs, opencv, mathlive, konva) yalnızca ilgili rotada, dinamik içe aktarma ile.
- Uygulama kabuğu ilk yükleme JS bütçesi: sıkı bir tavan belirle ve CI'da denetle.
- Yerleşim motoru 100 soru için 100 ms altında.

## 9. Ortamlar ve CI/CD

- **Ortamlar:** yerel (Supabase CLI + Docker), `testcim-dev` (Supabase projesi + Vercel Preview), `testcim-prod` (Vercel Production).
- **Dallar:** `main` = üretim. Özellik dalları → PR → Vercel önizleme. Sadece CI yeşilse birleştir.
- **CI:** kurulum, `typecheck`, `lint`, `check:design`, birim testleri, pgTAP, Playwright (kritik akışlar), migrasyon lint, paket boyutu kontrolü.
- **Migrasyon disiplini:** Yalnızca `supabase/migrations` altındaki SQL dosyaları. Panelden elle şema değişikliği yapılmaz. Geri alınabilir ve küçük adımlar.
- **Sürüm etiketleme:** anlamlı sürüm notları, özellik bayrakları (`feature_flags` veya ortam tabanlı) ile kademeli açılış.

## 10. Karar defteri ve açık sorular

Alınan kararlar: tek yerleşim motoru; PDF tarayıcıda; zengin sorular render görseline dökülür; OMR cihazda; anonim öğrenci akışı yalnızca sunucudan; plan sınırları veri.

Açık sorular (ilgili dilimden önce netleştir): (1) iyzico abonelik ve e-arşiv fatura akışının ayrıntıları, (2) MEB kazanım verisinin resmi kaynaktan alınma biçimi ve lisans durumu, (3) çizim aracı için Konva mı yoksa JSXGraph gibi hazır bir motorun hibrit kullanımı mı (lisans doğrulanarak), (4) vektör PDF için ayrı Chromium servisi gerekir mi, (5) masaüstü yardımcı için Tauri mi Electron mu.
