# ADR 0004: Çevrimiçi sınav tehdit modeli ve karşı önlemler

- Durum: Uygulanıyor (dilim 08 sonrası, kullanıcının "otomatik ilerle" talimatıyla
  onay adımı atlanarak doğrudan uygulamaya geçildi — bkz. konuşma geçmişi 2026-09-30)
- Kapsam: Dilim 09 (Çevrimiçi sınav)

## Bağlam

`online_exams`/`exam_attempts`/`attempt_answers` şeması dilim 01'de zaten kuruldu
(`20250101000010_online_exam.sql`): RLS öğretmene salt okunur, anonim öğrenci akışı için
hiçbir insert/update politikası yok — yazma yalnızca servis rolüyle sunucu uçlarından
mümkün. Bu ADR, o şemanın üstüne inşa edilecek sunucu uçları ve öğrenci arayüzü için
tehdit modelini ve karşılıklarını sabitliyor.

## Tehditler ve karşı önlemler

1. **Belirteç tahmini/çalınması (öğrenci kimliği taklidi).** Deneme belirteci
   kriptografik olarak rastgele (32 bayt, `crypto.randomBytes`), HttpOnly+Secure+SameSite=Lax
   çerezde durur; veritabanında yalnızca SHA-256 hash'i (`exam_attempts.token_hash`)
   tutulur — çalıntı bir DB dökümü belirteçleri geri çeviremez. Çerez `path=/s/{slug}`
   ile sınıra alınır.
2. **Tekrar deneme (max_attempts aşımı).** `join` ucu her istek için
   `online_exams.max_attempts` ile aynı `student_no`/cihaz parmak izi (yoksa serbest)
   için mevcut deneme sayısını kontrol eder; aşımda yeni belirteç verilmez, mevcut
   (tamamlanmamış) deneme devam ettirilir.
3. **Süre manipülasyonu (istemci saati oynatma).** `deadline_at` katılım anında
   sunucu saatiyle hesaplanıp DB'ye yazılır. Her `answer`/`submit` isteğinde sunucu
   `now() > deadline_at` kontrolü yapar; istemci sayacı yalnızca gösterim, hiçbir uçta
   girdi olarak kullanılmaz. `close_expired_exams()` pg_cron'u ayrıca süresi geçmiş
   `in_progress` denemeleri `expired` yapıp otomatik puanlar (bu ADR'nin genişlettiği
   davranış — bkz. migration).
4. **Cevap anahtarı sızdırma.** `questions` sorgusu istemciye asla `correct` alanını
   göndermez; sunucu yalnızca soru gövdesi + şıkları döndürür, puanlama her zaman
   `submit`/`answer` sırasında sunucuda, `attempt_answers.is_correct`/`points`'e yazılır.
   Görsel sorular imzalı URL ile (kısa ömürlü, 1 saat) sunulur, doğrudan Storage yolu
   değil.
5. **Yük/DoS (aşırı istek).** `join`/`answer`/`submit` uçlarında IP+belirteç bazlı hız
   sınırı. Upstash Redis bu ortamda kurulu/kimlik bilgili değil (env değişkeni yok);
   Redis'e bağımlı olmadan çalışsın diye Postgres tabanlı sabit pencereli sayaç
   (`exam_rate_limits` tablosu + `check_exam_rate_limit()` RPC) kullanıldı — dağıtık
   Redis'e göre daha az hassas ama sıfır ek altyapı gerektiriyor. Not: gerçek Upstash
   kimlik bilgileri eklenirse bu RPC'nin yerine geçirilebilir (arayüz aynı: true/false).
6. **Katılımcı üst sınırı aşımı / eşzamanlı canlı sınav sınırı.** `join` ucu
   `get_entitlements` üzerinden `online_participants_per_exam`'ı okuyup mevcut deneme
   sayısıyla karşılaştırır; aşımda 403 döner (satır içi "kapasite doldu" metni).
   `live_exams_concurrent` yayınlama anında kontrol edilir.
7. **IP/UA ile kimliklendirme riski (KVKK).** `exam_attempts.ip_hash`/`ua_hash` yalnızca
   SHA-256 hash olarak tutulur, ham IP/UA hiçbir tabloya yazılmaz.
8. **Sekme/odak kaybı ve tek-cihaz sinyalleri.** İstemci bu olayları sayar ve
   `answer`/`heartbeat` isteğiyle sunucuya bildirir; sunucu `exam_attempts.flags`'e
   biriktirir. Arayüzde veya API yanıtında "kopya engellendi" gibi bir güvence iddiası
   yok — yalnızca "Sekme değiştirme sayısı kaydedilir." metni.
9. **Realtime kanalı üzerinden bilgi sızıntısı (canlı mod).** Öğretmen paneli Presence
   kanalına yalnızca öğretmen (authenticated, RLS ile workspace üyeliği doğrulanmış)
   katılır; öğrenci istemcisi hiçbir Supabase Realtime kanalına doğrudan bağlanmaz
   (anonim erişim anahtarı öğrenciye verilmez) — ilerleme öğrenciden sunucuya, sunucudan
   öğretmenin kanalına tek yönlü akar (bkz. Kapsam dışı: canlı mod arayüzü henüz yok,
   yalnızca bu akış tasarlandı).

## Kapsam dışı / bilinen sınırlar (bu dilimde)

- **300 eşzamanlı öğrenci yük testi (k6) çalıştırılmadı.** Bu ortamda k6/Docker/gerçek
  Supabase projesi yok; betik yazılabilir ama gerçek bir Vercel+Supabase dağıtımına
  karşı çalıştırılması gerekir.
- **Canlı (live) mod arayüzü tam değil.** Presence tabanlı lobi/ilerleme paneli bu
  dilimde uygulanmadı — yalnızca `mode='live'` şeması ve yukarıdaki tehdit #9 için
  tasarım kararı var. `async` mod tam çalışır.
- **iframe gömme ertelendi.** CSP `frame-ancestors` şu an `next.config.ts`'de sabit
  `'none'`; çalışma alanına özel dinamik `frame-ancestors` bir middleware gerektirir,
  kapsam dışı bırakıldı.
