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

## Kullanım

Her özellik dilimi (2.1–2.11) kendi `<kind>.v1.md` dosyasını bu klasöre
ekler ve `executeAiJob({ system: loadPromptTemplate('generate_questions.v1.md'), ... })`
ile çağırır. Bu dilimde henüz gerçek bir özellik promptu yok; `loader.ts` ve
`loader.test.ts` yalnızca okuma mekanizmasını ve testtir.
