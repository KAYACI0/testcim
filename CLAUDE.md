# Testcim: Claude Code proje belleği

benimle konuşurken her zaman türkçe konuş.
ve her propmttan sonra isteneni yapınca githuba push et.

Ürün: Testcim, öğretmenler için hızlı ve profesyonel test/sınav hazırlama platformu. Çekirdek vaat: ekran alıntısını yapıştır (Ctrl+V), saniyeler içinde baskıya hazır PDF.

Tek doğruluk kaynakları (her oturumda ilgili olanı oku):
- docs/01-analiz-ve-strateji.md : ürün kapsamı, planlar, riskler
- docs/02-mimari.md : yığın, akışlar, veri modeli, güvenlik
- docs/03-tasarim-sistemi.md : tasarım dili, yasaklar, metin kuralları
- docs/prompts/ : dilim dilim uygulama promptları

Bu belgelerle çelişen bir karar gerekiyorsa DUR ve kullanıcıya sor. Sessizce sapma.
github repom: https://github.com/KAYACI0/testcim
## Dil
- Kod, yorumlar, commit mesajları, dosya ve değişken adları: İngilizce.
- Kullanıcıya görünen HER metin Türkçe olup `apps/web/messages/tr.json` üzerinden gelir (İngilizce `en.json` de tutulur). JSX içinde sabit metin yazma.
- Emoji hiçbir yerde yok: arayüz, kod, commit, test verisi, doküman.

## Komutlar
- `pnpm dev` : geliştirme sunucusu
- `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm test:e2e`
- `pnpm check:design` : tasarım kuralı denetimi (emoji, gradyan, token dışı hex, yasak ikon)
- `pnpm db:start` · `pnpm db:reset` · `pnpm db:types` · `pnpm db:test` (pgTAP)
Bir dilimi bitmiş saymadan önce tümü yeşil olmalı.

## Mimari kuralları (kısa)
- Tek yerleşim motoru: önizleme, PDF, DOCX, PPTX aynı `LayoutDocument`'tan üretilir. Yerleşim mantığını renderer içine kopyalama.
- `packages/*` içinde React/Next bağımlılığı yok.
- Her kiracı tablosunda `workspace_id` + RLS. Yeni tablo = RLS politikası + çapraz kiracı pgTAP testi, aynı PR'da.
- Şema değişikliği yalnızca `supabase/migrations` altında SQL ile. Panelden elle değişiklik yok.
- Dosyalar sunucudan geçmez: imzalı URL ile doğrudan Storage'a yükle (Vercel gövde sınırı).
- Ağır işler (PDF birleştirme, görüntü işleme, OMR) Web Worker'da.
- Plan sınırları koda gömülmez: `get_entitlements` / `useEntitlement` / `requireEntitlement` kullan.
- Gizli anahtarlar yalnızca sunucuda. `.env*` commit edilmez. Servis rolü istemci paketine girmez.
- Sunucu uçlarında girdi Zod ile doğrulanır. Paylaşılan şemalar `packages/shared`.
- Yapay zekâ çıktısı her zaman `draft` gelir, onay olmadan teste girmez.
- Anonim öğrenci akışı yalnızca sunucu uçlarından, servis rolüyle; tarayıcıdan doğrudan DB erişimi yok.
- Kütüphane kurmadan önce güncel resmi belgeyi oku (sürüm ve API değişmiş olabilir). Uydurma API kullanma.

## Tasarım kuralları (kısa)
- Ana renk beyaz. Renk yalnızca anlam taşır (eylem, seçim, doğru/yanlış). Hex değerleri yalnızca token dosyasında.
- Gradyan, buğulu cam, kart ızgarası, büyük harf etiket, `01/02/03` süsü, `→` okları, orta nokta ile meta metin yok.
- Simge: Phosphor Light. Yasak: kıvılcım, sihirli değnek, robot, beyin, ampul, roket, şimşek.
- Yalnızca kullanıcı eylemine yanıt veren hareket. İmza hareket: yapıştırılan sorunun şeride oturması.
- Metin: Türkçe, "siz", cümle düzeni, ünlemsiz, eylem odaklı.
- Arayüz değişen her dilimde: kısa tasarım planı yaz, bitince 1440/1024/390 ekran görüntüsü al, docs/03 kontrol listesine göre kendini eleştir.

## Test kuralları
- `layout-engine`, `omr`, `image-tools`: birim + özellik tabanlı (fast-check) testler zorunlu.
- Yakalama hattı ve PDF üretimi için Playwright E2E.
- RLS: pgTAP ile her tabloda çapraz kiracı reddi.
- Hata düzeltmede önce hatayı yeniden üreten test yaz.

## Çalışma biçimi
- Plan modunda başla, planı özetle, sonra uygula. Küçük ve anlamlı commit'ler: `feat(editor): ...`, `fix(layout): ...`.
- Bir dilim = bir dal = bir PR. Kapsam dışı iyileştirmeleri yapma, `docs/backlog.md` dosyasına yaz.
- Belirsizlik varsa varsayım yapıp ilerlemek yerine, kısa ve somut sorular sor (en fazla 3).
- Bitirince: yapılanlar, çalıştırılan doğrulamalar ve bilinen eksikler için kısa bir rapor ver.
