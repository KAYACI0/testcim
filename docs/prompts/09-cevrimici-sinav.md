# Prompt 09: Çevrimiçi sınav

## Amaç
Öğretmen bir testi çevrimiçi sınav olarak yayınlar; öğrenci hesap açmadan katılır; sınav güvenilir biçimde puanlanır; öğretmen madde analizi ve sonuçları görür. Eşzamanlı (canlı) mod dahil.

## Önce oku
CLAUDE.md, docs/02 bölüm 5.3, 6 (online_exams, exam_attempts, attempt_answers), 7 (anonim uçlar), docs/03 bölüm 7 (öğrenci ekranı).

## Başlamadan
Plan modunda başla. Tehdit modelini (öğrenci belirteci, tekrar deneme, süre manipülasyonu, cevap sızdırma, yük) kısa bir belgeye yaz, onayımı bekle.

## Kapsam
1. **Yayınlama (öğretmen):** testten "Çevrimiçi yayınla": başlık, mod (`async`/`live`), erişim (bağlantı, kod, sınıf listesi), açılış-kapanış zamanı, süre, deneme hakkı, soru/şık karıştırma, sonuç gösterimi (asla / teslimden sonra / kapanışta), doğru cevapları gösterme, istenen alanlar (ad, numara, sınıf). Yayınlanan sınav testin sabitlenmiş kopyasını kullanır (`test_snapshot`). Katılımcı üst sınırı plandan (`online_participants_per_exam`, `live_exams_concurrent`).
2. **Öğrenci akışı (`/s/[slug]`):** giriş formu → sınav → teslim → sonuç. Hesap yok. Mobil öncelikli, 16 px, geniş dokunma hedefleri. Süre sayacı (yalnızca gösterim), otomatik kayıt, bağlantı kopunca sessiz yeniden deneme ve satır içi durum, teslim onayı.
3. **Sunucu uçları (`/api/exam/*`):** yalnızca servis rolüyle; tarayıcıdan doğrudan DB yok. Deneme belirteci HttpOnly çerez, DB'de yalnızca hash. Uçlar: katıl, soruları getir (cevaplar asla istemciye gitmez), cevap kaydet, teslim et. Puanlama sunucuda. Hız sınırı (Upstash), belirteç doğrulama, süre kontrolü sunucu saatiyle (`deadline_at`).
4. **Soru sunumu:** görsel sorular imzalı, kısa ömürlü URL ile; şıklar görselin içindeyse öğrenci arayüzü A–E seçim düğmelerini gösterir; metin sorularda şıklar render edilir ve karıştırılabilir. Tüm soru türleri (çoktan seçmeli, doğru-yanlış, boşluk doldurma, eşleştirme, sayısal, sıralama, açık uçlu: açık uçlu elle puanlanır).
5. **Canlı mod:** öğretmen "Başlat" der; öğrenciler Realtime Presence ile lobide bekler; öğretmen panelinde canlı katılım ve ilerleme (kaç soru cevaplandı), yalnızca özet. Öğretmen sınavı erken bitirebilir, süreyi uzatabilir.
6. **Caydırıcı önlemler:** sekme/odak kaybı sayacı, tam ekran isteği (zorunlu değil), tek cihaz belirteci. Bunlar raporlanır; arayüzde "güvence" iddiası yok. Metin: "Sekme değiştirme sayısı kaydedilir."
7. **Sonuçlar (öğretmen):** katılımcı tablosu (puan, doğru/yanlış/boş, süre, uyarılar), tek öğrenci ayrıntısı, elle puan düzeltme ve açık uçlu puanlama.
8. **Madde analizi:** her soru için zorluk (p), ayırt edicilik (üst/alt %27), çeldirici dağılımı; test düzeyinde ortalama, standart sapma, KR-20, puan histogramı. Sonuçlar soru bankasına `difficulty_observed` olarak yazılır.
9. **Dışa aktarma:** Excel (xlsx) ve CSV; e-Okul not girişine uygun sade bir Excel şablonu (sıra, numara, ad soyad, puan/not).
10. **Yaşam döngüsü:** `close_expired_exams()` pg_cron ile; kapanan sınavda devam eden denemeler otomatik teslim.
11. **iframe gömme (Pro):** `iframe_embed` yetkisi olan çalışma alanı için sınav sayfasına gömme yolu ve `frame-ancestors` yönetimi.

## Testler
- Birim: puanlama, KR-20 ve ayırt edicilik hesapları (bilinen örneklerle), süre hesabı.
- Güvenlik testleri: belirteçsiz/başka belirteçle erişim reddi, cevap anahtarının istemci yanıtlarında bulunmadığı, süre sonrası cevap reddi, hız sınırı.
- E2E: yayınla → iki öğrenci katıl → cevapla → teslim → sonuç ve analiz → Excel.
- Yük testi: 300 eşzamanlı öğrenci simülasyonu (k6 veya eşdeğeri), p95 gecikme raporu.

## Kabul kriterleri
- İstemci ağ trafiğinde doğru cevap hiçbir aşamada görünmüyor.
- Süre sunucuya göre işliyor; istemci saati oynansa da sınav süresi aşılamıyor.
- Canlı modda öğretmen paneli gerçek zamanlı güncelleniyor.
- Tümü yeşil; ekran görüntüleri ve öz eleştiri raporda.

## Yapma
- Öğrenci için Supabase Auth veya doğrudan tablo erişimi açma.
- "Kopya engelleme" iddiası yazma.
- Emoji, gradyan, süs.

## Bitirince
Tehdit modeli, yük testi sonuçları, bilinen sınırlar.
