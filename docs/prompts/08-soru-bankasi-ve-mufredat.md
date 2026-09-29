# Prompt 08: Soru bankası ve müfredat

## Amaç
Testlerdeki her soru kalıcı bir bankaya ait olsun; öğretmen arasın, etiketlesin, tekrar kullansın. Kazanım etiketleme Testcim'in Türkiye'deki en güçlü ayrımlarından biridir.

## Önce oku
CLAUDE.md, docs/01 bölüm 5 (madde 5, 8), docs/02 bölüm 6 (questions, question_revisions, folders, tags, curriculum_*), docs/03 (soru bankası ekranı).

## Başlamadan
Plan modunda başla. **Müfredat verisi için uydurma veri yazma.** MEB'in resmi kazanım/öğretim programı belgelerinden alınacak veri için: kaynağı, biçimi ve lisans/kullanım durumunu araştır, `scripts/curriculum/` altında içe aktarma betiği tasarla ve bana ilk aşamada hangi düzeyler/dersler için hazırlayacağını sor (önerin: ortaokul matematik ve fen ile başla). Veriyi resmi kaynaktan çekemiyorsan, bunu açıkça söyle ve boş şemayla ilerle.

## Kapsam
1. **Soru yaşam döngüsü:** teste eklenen her soru (yapıştırma, kırpma, zengin editör) `questions` kaydı olur ve bankaya düşer; teste `question_revision_id` ile sabitlenerek bağlanır. "Bankaya kaydet" ayrı bir adım gerektirmez (varsayılan klasör: Gelen kutusu).
2. **Banka ekranı (`/bank`):** sol klasör ağacı (oluştur, yeniden adlandır, taşı), ortada çizgili liste veya küçük resim ızgarası geçişi, sağda ayrıntı paneli. Filtre çubuğu tek satır: ders, konu, kazanım, zorluk, tür, etiket, ekleyen, yapay zekâ taslağı/onaylı, tarih.
3. **Arama:** `tr_normalize` üzerinden `pg_trgm` + tam metin (`stem_text`); Türkçe karakter ve büyük/küçük harf duyarsız. Görsel sorularda `stem_text` boştur: Prompt 11'de OCR ile dolacak; şimdilik etiket ve metadata araması.
4. **Etiketleme:** ders, konu, kazanım (çoklu), zorluk (1–5), serbest etiketler, kaynak bilgisi (kitap, sayfa, yıl; `source_meta`). Toplu etiketleme (çoklu seçim). Hızlı etiketleme klavye akışı.
5. **Testten bankaya, bankadan teste:** bankadan çoklu seçip teste ekle; teste eklerken mevcut testte zaten olan sorular işaretlenir. Kullanım geçmişi: bu soru hangi testlerde/sınavlarda kullanıldı, gözlenen zorluk (Prompt 09 sonrası).
6. **Yinelenen tespiti:** aynı sha256 veya yakın pHash; bankaya eklerken uyarı, birleştirme aracı.
7. **Sürüm geçmişi:** soru düzenlenince yeni revizyon; testte "güncel sürüme yükselt" eylemi; eski çıktılar sabit kalır.
8. **Toplu içe aktarma:** klasörden çoklu görsel → toplu etiketleme akışı.
9. **Kotalar:** `bank_questions` ve depolama; aşımda satır içi not.
10. **Vektör altyapısı (hazırlık):** `embedding` sütunu ve dizin var, doldurma Prompt 11'de. Şimdilik yalnızca şema hazır olduğunu doğrula.

## Testler
- Birim: arama normalizasyonu ("İZMİR", "izmir", "Iğdır"), revizyon üretimi, yinelenen tespiti.
- pgTAP: banka tablolarında çapraz kiracı reddi (Prompt 01 kapsamının genişletilmesi).
- E2E: 30 soru bankaya düşür → klasörle → etiketle → ara → bankadan yeni teste ekle.

## Kabul kriterleri
- 5.000 soruluk banka (sentetik) üzerinde arama ve filtre 300 ms altı.
- Kazanım etiketi yalnızca resmi kaynaktan gelen veriyle yapılıyor; uydurma kod yok.
- Tümü yeşil; ekran görüntüleri ve öz eleştiri raporda.

## Yapma
- Herkese açık paylaşım veya pazar yeri ekleme.
- Uydurma MEB kazanımı yazma.

## Bitirince
Müfredat veri kaynağı raporu (nereden, hangi düzeyler, eksikler), performans ölçümleri.
