# ADR 0008: Sürüm geçmişi geri yükleme yaklaşımı

## Durum

Kabul edildi (Prompt 12, PR6).

## Bağlam

`apply_test_ops` her çağrıda `test_snapshots`'a yalnızca o çağrıda uygulanan ops'ların
diff'ini yazıyordu (`snapshot: {ops: [...]}`), hiçbir zaman tam durumu değil. Planın 3.2
bölümü bunun için **periyodik tam-durum kontrol noktaları** (her K revizyonda bir) +
kontrol noktasından hedefe kadar ops-diff'leri yeniden uygulama (replay) öneriyordu ve
bunu "en riskli, ayrı bir spike gerektiren madde" olarak işaretlemişti.

## Karar

Periyodik kontrol noktası + replay yerine **her `apply_test_ops` çağrısında tam durumu
kaydetme** seçildi: `test_snapshots.full_state jsonb` sütunu eklendi,
`apply_test_ops` artık ops'ları uyguladıktan sonra o anki `test_items` satırlarını +
`tests.title`/`settings`'i `full_state`'e yazıyor. `restore_test_snapshot(p_test_id,
p_revision)` bu yüzden hiç "replay" yapmıyor — hedef revizyonun `full_state`'ini okuyup
`test_items`'ı onunla değiştiriyor, `tests`'i güncelliyor, bunu YENİ bir revizyon olarak
kaydediyor (geçmişi yıkıcı biçimde yeniden yazmıyor).

### Neden replay değil

Replay mantığı (kontrol noktası bulma, ara ops'ları doğru sırada tekrar uygulama, silinen
bir soru/bölüme referans veren eski bir op'u nasıl ele alacağını karara bağlama) tam
olarak canlı bir veritabanına karşı test edilmeden güvenilmemesi gereken türden kod. Bu
ortamda Docker/Supabase CLI yok (önceki her dilimde aynı bilinen kısıt) — replay'i
test edilmemiş halde yazıp "riskli madde çözüldü" demek yanıltıcı olurdu.
Her-zaman-tam-durum yaklaşımı geri yüklemeyi "bir satır oku, geri yaz"a indirgiyor;
bu, canlı veritabanı testi olmadan da güvenle gönderilebilir.

### Ödünleşim

Depolama: her revizyonda tam `test_items` durumu (ops-diff'e ek olarak) saklanıyor.
Bir testin soru sayısı onlarla ölçülüyor ve bir öğretmen tek bir testi düzenliyor
(çoklu-kullanıcı eşzamanlı yoğun düzenleme değil), bu yüzden depolama maliyeti düşük
kabul edildi. Varsayım yanlış çıkarsa (ör. çok büyük testler, çok sık `apply_test_ops`
çağrısı) periyodik kontrol noktasına geçilebilir — `full_state` sütunu nullable
bırakıldığı için bu geriye dönük uyumlu bir değişiklik olur (eski satırlarda
`full_state` NULL kalır, restore o revizyonlar için çalışmaz — kabul edilebilir, çünkü
bu sütun bu migrasyondan itibaren dolduruluyor).

### Kapsam sınırı

`apply_test_ops` yalnızca `test_items` + `tests.title`/`settings`'i değiştiriyor —
`test_sections`/`test_groups` için ops tipleri (`add_group`/`update_group`)
`packages/shared`'ın Zod şemasında tanımlı ama SQL fonksiyonunda hiç işlenmiyor
(bu PR'dan önce de böyleydi — mevcut bir tutarsızlık, bu PR'ın kapsamı dışında).
`full_state` da bu yüzden yalnızca `test_items` + başlık/ayarları kapsıyor; bölüm/grup
yapısı geri yüklemeye dahil değil.

### Yetki

Geri yükleme yalnızca owner/admin (`restore_test_snapshot` içinde zorlanır). Geri
yükleme sırasında başka birinin o an üzerinde çalıştığı değişiklikler sessizce
kaybolmuyor — eşzamanlı bir `apply_test_ops` çağrısı normal revizyon uyuşmazlığı
akışına düşer (`v_revision <> p_base_revision`), aynı herhangi bir eşzamanlı düzenleme
çakışması gibi.

## E-posta bildirimi ertelendi

Plan, mention/onay-isteği bildirimleri için Resend entegrasyonunu bu PR'a koymuştu.
Depoda hiç Resend kullanımı yok; `apps/web/src/lib/workspace/actions.ts`'teki
`inviteMember` zaten aynı nedenle (kimlik bilgisi yok, bu ortamda ağ erişimi yok)
e-posta göndermeden bırakılmıştı (docs/backlog.md). Bu PR aynı kısıtı miras alıyor:
bildirimler yalnızca uygulama içi `notifications` tablosu + zil ikonu üzerinden
çalışıyor, gerçek e-posta gönderimi yapılmıyor. Gerçek Resend kimlik bilgileri
edinildiğinde davet e-postası + mention/onay e-postaları tek bir dilimde birlikte
kurulmalı (bkz. docs/backlog.md).
