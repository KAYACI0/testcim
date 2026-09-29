# Prompt 11: Yapay zekâ paketi (Plus ve üzeri)

## Amaç
Öğretmenin soru hazırlama süresini kısaltan, güvenilir ve denetlenebilir bir yapay zekâ paketi. Hiçbir çıktı onaysız teste girmez. Arayüzde klişe simge yok; eylemler fiille adlandırılır.

## Önce oku
CLAUDE.md, docs/02 bölüm 5.5 ve 5.6, docs/01 bölüm 5 (madde 7) ve 6 (kredi kuralı), docs/03 bölüm 2 (yapay zekâ etiketi: "Taslak" + "Onayla").

## Başlamadan
Plan modunda başla. Anthropic Claude API'nin güncel belgesini doğrula (görsel girdi, yapılandırılmış çıktı, önbellekleme, hız sınırları) ve güncel model kimliklerini belgeden al. Model seçimi ortam değişkeninde olacak. Sağlayıcı soyutlaması ve prompt sürümleme tasarımını ADR olarak yaz.

## Kapsam
1. **Altyapı:** `apps/web/src/features/ai`: `AiProvider` arayüzü + Claude uygulaması; `AI_MODEL_QUALITY`, `AI_MODEL_FAST`; her çağrı sunucuda: kimlik → yetki (`ai_credits_per_month`) → kredi düşümü (`spend_credits`, işlem başarısız olursa iade) → hız sınırı → çağrı → Zod ile çıktı doğrulama → `ai_jobs` kaydı (token, maliyet, süre). Prompt şablonları depoda sürümlü dosyalar (`prompts/`), kullanıcı içeriği veri olarak sınırlandırılmış (talimat enjeksiyonuna karşı). Harcama tavanı ve hata durumunda nazik yeniden deneme.
2. **Özellikler (her biri ayrı ve bağımsız bir dilim içinde, sırasıyla):**
   1. **Soru üret:** ders, sınıf düzeyi, kazanım (Prompt 08 müfredatından), konu, zorluk, soru sayısı, tür, üslup ("LGS tarzı" gibi genel biçim tarifi; belirli bir yayınevi veya sınavın telifli sorularını kopyalama talimatı yok). Çıktı: soru kökü, şıklar, doğru cevap, çözüm, kazanım önerisi. Hepsi `ai_generated = true`, `ai_review_status = draft`.
   2. **Görselden metne:** yapıştırılan görsel soruyu düzenlenebilir zengin metne ve LaTeX'e çevir (Prompt 07 editörüne aktarılır); `stem_text` doldurulur ve aramaya girer. Şık karıştırma bu sayede görsel sorulara da açılır.
   3. **Çeldirici üret ve şık iyileştir.**
   4. **Çözüm yaz:** adım adım çözüm; öğretmen onayına kadar taslak.
   5. **Benzer soru üret:** aynı kazanım ve zorlukta varyant (sayı/bağlam değişimi).
   6. **Metinden soru:** yapıştırılan paragraftan anlama soruları (grup paragrafı olarak).
   7. **Kalite kontrolü:** belirsizlik, birden fazla doğru şık, yazım hatası, cevap-çözüm tutarsızlığı, zorluk tahmini; sonuç uyarı listesi olarak gösterilir.
   8. **Cevap anahtarı okuma:** PDF'in cevap sayfasını görselden okuyup sorulara eşleme önerisi (Prompt 06'daki yuva bağlanır).
   9. **Otomatik etiketleme:** ders/konu/kazanım/zorluk önerisi (hızlı model; onay bekler).
   10. **Sayfa bölme desteği:** taranmış PDF için blok tespiti (Prompt 06'daki yuva bağlanır).
   11. **Doğal dil komutu (isteğe bağlı, son):** "bu testi 3 kitapçığa böl, zor soruları sona koy" gibi komutları, doğrulanmış editör işlemlerine (`apply_test_ops`) çeviren dar bir araç; serbest metin çalıştırma yok, yalnızca izinli işlemler.
3. **Taslak ve onay akışı:** Tüm çıktılar bir "inceleme tepsisi"nde (çizgili liste) gelir; tek tek veya toplu Onayla/Düzenle/Sil. Yalnızca onaylananlar teste ve bankaya girer. Taslak etiketi metindir ("Taslak"), simge yok.
4. **Kredi ve şeffaflık:** işlem öncesi tahmini kredi gösterilir; işlem sonrası bakiye; `UsageMeter`. Free için 10 kredilik bir kerelik deneme.
5. **Güvenlik ve etik:** çocuklara uygun içerik ilkesi, sistem promptu ile yasak konular; çıktıya kaynak iddiası uydurma yasağı; kişisel veri (öğrenci adı vb.) yapay zekâya gönderilmez.
6. **Vektör arama:** bankadaki sorular için embedding üretimi (arka plan işi) ve "anlamca benzer soru bul" (Prompt 08 şeması).

## Testler
- Sağlayıcıyı taklit eden sahte uygulama ile birim ve entegrasyon testleri; yapılandırılmış çıktı doğrulaması; bozuk çıktıda güvenli hata.
- Kredi: yetersiz bakiye, başarısız çağrıda iade, eşzamanlı harcama.
- Prompt regresyon seti: küçük, elle seçilmiş örnek girdilerle çıktı biçimi kontrolü (gerçek API'ye karşı ayrı, isteğe bağlı bir `pnpm test:ai-live`).
- E2E: soru üret → inceleme tepsisi → onayla → teste ekle.

## Kabul kriterleri
- Onaylanmamış hiçbir yapay zekâ içeriği teste eklenemiyor.
- Tüm çağrılar sunucuda; istemci paketinde API anahtarı yok.
- Kredi düşümü ve iade tutarlı; `ai_jobs` kaydı eksiksiz.
- Arayüzde yasak ikon veya emoji yok; eylemler fiille adlandırılmış.
- Tümü yeşil; ekran görüntüleri ve öz eleştiri raporda.

## Yapma
- Telifli sınav veya kitap sorularını kopyalama/taklit etme talimatları yazma.
- Yapay zekâ çıktısını otomatik yayına alma.
- Kıvılcım, sihirli değnek, robot, beyin simgeleri.

## Bitirince
Maliyet tahmini (kredi başına ortalama maliyet), prompt sürüm listesi, bilinen sınırlar.
