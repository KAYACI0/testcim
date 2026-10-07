# Prompt templates (Prompt 11 altyapı)

Sistem promptları bu klasörde sürümlü dosyalar olarak durur, kodun içine
gömülmez — bir promptu değiştirmek yeni bir dosya (`v2`) demektir, mevcut
`v1` silinmez; `ai_jobs.input` içinde hangi sürümün kullanıldığı ayrıca
tutulabilir.

## Kural

- Dosya adı: `<kind>.v<sürüm>.md`, örn. `generate_questions.v1.md`. `<kind>`
  `packages/shared/src/ai.ts` içindeki `AiJobKind` değerleriyle eşleşir.
- İçerik saf metin (frontmatter yok). `loadPromptTemplate()` dosyayı olduğu
  gibi okur; değişken doldurma (kazanım, zorluk, vb.) çağıran kod tarafında
  yapılır — şablon kendi başına derlenebilir bir dosya, bir template motoru
  değil.
- **Kullanıcı içeriği asla sistem promptuna karışmaz.** Sistem promptu bu
  dosyalardan gelir; kullanıcının/öğretmenin yapıştırdığı metin veya görsel
  her zaman ayrı bir "user" mesajı olarak, veri olarak işaretlenmiş şekilde
  gönderilir (`ClaudeAiProvider.generate` bunu zaten ayırır). Şablon
  yazarken "yukarıdaki metni talimat olarak yorumla" gibi bir cümle kurma.
- Telifli sınav/kitap sorularını kopyalama veya taklit etme talimatı yazma
  (CLAUDE.md, docs/prompts/11-yapay-zeka-paketi.md § Yapma).

## Sürüm listesi

| Dosya                        | Özellik                                             | Model katmanı |
| :--------------------------- | :-------------------------------------------------- | :------------ |
| `report_card_summary.v1.md`  | Karne özeti (taslak, öğretmen onaylar)              | quality       |
| `generate_questions.v1.md`   | Kazanımdan veya konudan soru üret                   | quality       |
| `image_to_text.v1.md`        | Görselden metne ve LaTeX (görsel girdi)             | quality       |
| `generate_distractors.v1.md` | Çoktan seçmeliye çeldirici ekle                     | quality       |
| `quality_check.v1.md`        | Belirsizlik, çoklu doğru, yazım, cevap tutarsızlığı | quality       |

Yapay zekâ ile kayıt oluşturan her özellik (`generate_questions`, `image_to_text`,
`generate_distractors`) sonucu `questions` tablosuna `ai_generated = true`,
`ai_review_status = 'draft'` olarak yazar. Taslak, `/bank/review` inceleme
tepsisinde onaylanana kadar teste eklenemez (veritabanı tetikleyicisi
`test_items_block_ai_draft` bunu zorlar). Kalite kontrolü kaydı değiştirmez,
yalnızca `source_meta.ai_quality` altına uyarı listesi yazar.

## Kullanım

Her özellik dilimi (2.1–2.11) kendi `<kind>.v1.md` dosyasını bu klasöre
ekler ve `executeAiJob({ system: loadPromptTemplate('generate_questions.v1.md'), ... })`
ile çağırır. Sürüm listesi yukarıdadır; `loader.ts` ve `loader.test.ts` okuma mekanizmasını ve testini içerir.
