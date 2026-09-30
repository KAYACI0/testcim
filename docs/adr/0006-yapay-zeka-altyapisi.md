# ADR 0006: Yapay zekâ altyapısı — sağlayıcı soyutlaması, prompt sürümleme, kredi/hız akışı

## Durum

Kabul edildi (Prompt 11, ilk dilim: yalnızca altyapı — `AiProvider`, kredi/hız
sınırı/kayıt hattı, model seçimi, prompt şablonu sürümleme mekanizması.
Özellik dilimleri 2.1–2.11 (soru üret, görselden metne, çeldirici, çözüm,
benzer soru, metinden soru, kalite kontrolü, cevap anahtarı okuma, otomatik
etiketleme, sayfa bölme, doğal dil komutu) kapsam dışı, ayrı dallarda
gelecek).

## Bağlam

docs/prompts/11-yapay-zeka-paketi.md § Altyapı şunu istiyor: "kimlik → yetki
(`ai_credits_per_month`) → kredi düşümü (`spend_credits`, işlem başarısız
olursa iade) → hız sınırı → çağrı → Zod ile çıktı doğrulama → `ai_jobs`
kaydı". Bu dilim bu hattı, herhangi bir gerçek özellik promptu yazmadan,
kurdu.

## Kararlar

### 1. Sağlayıcı soyutlaması ve model seçimi

`apps/web/src/features/ai/types.ts`'teki `AiProvider` arayüzü tek bir
`generate<TOutput>({ model, system, prompt, images?, outputSchema, maxTokens? })`
metodu tanımlıyor. `providers/claude.ts` (`ClaudeAiProvider`) bunu Anthropic
API'siyle uyguluyor; `providers/fake.ts` (`FakeAiProvider`) test amaçlı
kuyruklanabilir bir sahte uygulama — asla üretimde kullanılmaz.

- Model kimlikleri ortam değişkeninden gelir: `AI_MODEL_QUALITY`
  (varsayılan `claude-opus-5`), `AI_MODEL_FAST` (varsayılan
  `claude-haiku-4-5`). Her `AiJobKind` için hangi kademenin kullanılacağı
  `packages/shared/src/ai.ts`'teki `AI_JOB_DEFAULT_QUALITY` içinde sabit:
  soru/çeldirici/çözüm/benzer-soru/metinden-soru/kalite-kontrolü/doğal-dil-komutu
  güçlü modeli, cevap-anahtarı-okuma/otomatik-etiketleme/sayfa-bölme hızlı
  modeli kullanır (docs/02-mimari.md § 5.5: "OCR ve etiketleme gibi ucuz
  işler için hızlı model"). Bir çağıran bunu `executeAiJob({ quality: ... })`
  ile ezebilir.
- `ANTHROPIC_API_KEY` sunucu env şemasında **opsiyonel**: uygulama onsuz
  açılır (birçok dilim henüz AI çağırmıyor), yalnızca gerçek bir çağrı
  yapıldığında `requireClaudeApiKey()` açık bir hata fırlatır.

### 2. Yapılandırılmış çıktı — kurulu SDK sürümüne göre sapma

Anthropic TS SDK belgesi (claude-api becerisi) `client.messages.parse()` +
`output_config: { format: zodOutputFormat(schema) }` öneriyordu, ama
`apps/web`'e kurulan sürümde (`@anthropic-ai/sdk@0.70.1`) bu yol yalnızca
**beta** ad alanında var: `client.beta.messages.parse()` +
`output_format: betaZodOutputFormat(schema)` (paket içi `.d.ts` dosyaları
doğrulandı, `helpers/zod` alt yolu bu sürümde yok, yalnızca
`helpers/beta/zod`). SDK, gerekli `anthropic-beta: structured-outputs-2025-11-13`
başlığını `client.beta.messages.parse` çağrısına otomatik ekliyor
(`resources/beta/messages/messages.js` içinde doğrulandı) — elle beta
başlığı eklemeye gerek yok. `ClaudeAiProvider` bu yüzden `client.beta.messages`
kullanıyor; SDK yeni bir sürüme yükseltildiğinde `client.messages.parse`'a
geçiş ayrı bir küçük değişiklik olur.

Çıktı `response.parsed_output === null` olduğunda (şema doğrulaması
başarısız) `AiOutputValidationError` fırlatılır; `response.stop_reason ===
'refusal'` olduğunda `AiProviderCallError('ai_refusal')`.

### 3. Kullanıcı içeriği her zaman veri, asla talimat

Sistem promptu (`AiGenerateParams.system`) ve kullanıcı/yapıştırılan içerik
(`prompt`, `images`) her zaman ayrı mesaj bloklarında gönderilir;
`ClaudeAiProvider` bunları asla birleştirmez. Prompt şablonu yazarken
"yukarıdaki metni talimat olarak yorumla" gibi bir cümle kurulmaması
`prompts/README.md`'de açıkça yasaklandı — talimat enjeksiyonuna karşı tek
savunma satırı bu.

### 4. Kredi ve iş kaydı — yeni RPC'ler, mevcut desene sadık

`spend_credits` zaten vardı (Prompt 01/06); bu dilim üç yeni security-definer
RPC ekledi (`20250101000018_ai_pipeline.sql`), hepsi `has_role(ws, [owner,
admin, editor])` kontrolü yapıyor, `apply_test_ops`/`spend_credits`'teki
"RLS select-only, mutasyon RPC'den" deseniyle aynı:

- `refund_credits(p_ws, p_amount, p_reason, p_ref_type?, p_ref_id?)`:
  `spend_credits`'in simetriği, `credit_ledger`'a pozitif bir satır ekler.
  Bir iş harcadıktan sonra başarısız olursa (hız sınırı, sağlayıcı hatası,
  doğrulama hatası) kullanılır.
- `create_ai_job(p_ws, p_kind, p_input)`: `ai_jobs` satırını `running`
  durumunda açar, `id` döner.
- `complete_ai_job(...)` / `fail_ai_job(p_job_id, p_error)`: bir işi
  bitirir. İkisi de `require_ai_job_access(p_job_id)` üzerinden, işin
  **kendi** `workspace_id`'sine göre yetki kontrolü yapar — bir çalışma
  alanı başka birinin işini tamamlayamaz/başarısız işaretleyemez
  (`supabase/tests/115_ai_pipeline.sql` çapraz kiracı testleri).

### 5. Orkestrasyon: saf çekirdek + ince sunucu sarmalayıcı

`pipeline.ts`'teki `runAiJob(credits, ports)` hiçbir Supabase/Anthropic
bağımlılığı olmayan saf bir fonksiyon; her adım (`createJob`, `spendCredits`,
`refundCredits`, `checkRateLimit`, `callProvider`, `completeJob`, `failJob`)
enjekte edilen bir `AiJobPorts<TOutput>` nesnesinden gelir. Bu, kredi
iade/hata sıralamasının sahte (mock) port'larla, veri tabanı veya ağ
olmadan test edilmesini sağlıyor (`pipeline.test.ts`, 5 senaryo) —
depodaki diğer dilimlerin "saf mantık ayrı, Supabase'e bağlı kod ayrı"
kuralıyla aynı (bkz. `features/online-exam/anon-pure.test.ts`).

`run-ai-job.server.ts`'teki `executeAiJob()` gerçek sarmalayıcı: kimlik
(`requireRole`) ve yetki (`ai_credits_per_month` sıfır değilse geçer) burada
kontrol edilir, sonra `runAiJob`'a gerçek Supabase RPC'lerine bağlı port'lar
verilir. Her özellik dilimi (2.1–2.11) tek giriş noktası olarak bunu çağırır.

### 6. Hız sınırı — Upstash, dev/test'te bellek içi düşüş

docs/02-mimari.md § 2 hız sınırı için Upstash Redis'i (`@upstash/ratelimit`)
adlandırıyor (metinde "herkese açık sınav uçları" için anılıyor, ama teknoloji
tablosu genel bir seçim olarak listeliyor — Prompt 09'un aksine burada başka
bir onaylı sapma yok, aynı aracı kullandık). Çalışma alanı başına dakikada 20
çağrı (`LIMIT_PER_WINDOW`), tüm `AiJobKind`'lar toplamda.

`UPSTASH_REDIS_REST_URL`/`TOKEN` ayarlı değilse (yerel geliştirme, testler,
bu depoda olduğu gibi Docker/canlı ortam yokken) `InMemoryAiRateLimiter`'a
düşülür — yalnızca tek süreç içinde çalışır, birden fazla sunucusuz
çağrı arasında koordine olmaz. Üretimde Upstash kimlik bilgileri olmadan
dağıtılmamalı; bu bilinçli bir geliştirici deneyimi ödünleşmesi, gizli bir
sınırlama değil (`docs/backlog.md`'ye not düşüldü).

### 7. Maliyet tahmini

`ai_jobs.cost_micro`, Anthropic'in ilan fiyatlarına (USD/1M token, statik
bir tablo — `models.ts`) göre tahmin edilir; gerçek faturaya kuruş
hassasiyetinde eşit değildir. Bilinmeyen bir model id'si (yerel override)
`claude-opus-5` fiyatlandırmasına düşer, hata fırlatmaz.

## Kapsam dışı (bilinçli, sonraki dilimlere)

- Gerçek bir özellik promptu (2.1–2.11) yok; `prompts/` klasöründe yalnızca
  sürümleme kuralı ve bir test fikstürü var.
- Vektör arama / embedding sağlayıcısı (§6 kapsam): Anthropic'in bir
  embedding uç noktası yok; ayrı bir sağlayıcı (örn. Voyage AI, Anthropic'in
  önerdiği) seçilmeli — bu dilimde seçilmedi.
- Aylık kredi yükleme cron'u (plana göre `ai_credits_per_month` kadar
  `credit_ledger`'a otomatik ekleme) faturalandırma dilimine (Prompt 13) ait.
- Docker/canlı Supabase olmadığı için `supabase/tests/115_ai_pipeline.sql`
  bu oturumda çalıştırılamadı (önceki tüm dilimlerdeki aynı bilinen kısıt,
  bkz. docs/backlog.md).
