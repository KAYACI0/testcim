# Yol haritasi (2026-10-07)

Kaynak: `ilerleme.md`, `docs/backlog.md`, `docs/launch-checklist.md`, ADR 0009 ve kod incelemesi.
Yayin karari: HAYIR. Asagidaki fazlar sirayla izlenir; "paralel" isaretli isler beklemeden baslayabilir.

## Dis degerlendirme raporunun dogrulugu

Rapor buyuk olcude dogru. Duzeltmeler ve eksikler:

- Dogru: 7 yayin engeli, 45/45 tablo testi, bank ve online-exam E2E atlamasi, FakeBillingProvider, Resend, Claude, Upstash, Turkce font, AI butonlari, toplu karne, set_group, F sikki, canli mod, acik uclu puanlama, mufredat kapsami, pHash.
- Yanlis: `iyzico.server.ts` diye bir dosya yok. Adaptor `features/billing/registry.server.ts` icine baglanacak.
- Eksik 1: Yayin kosulu 4 (ozellik bayragi altyapisi) raporda yok.
- Eksik 2: `packages/layout-engine` yalnizca 34 satirlik tip iskeleti ve 5 test. Onizleme su an `features/editor/paper/paginate.ts` ile yapiliyor. "Tek yerlesim motoru" mimari kurali fiilen uygulanmiyor.
- Eksik 3: Hicbir migrasyon ve pgTAP gercek Postgres uzerinde calistirilmadi (27 migrasyon). `types.ts` elle yazildi. Bu, raporun "Docker kapali" notundan daha buyuk bir risk.
- Eksik 4: Gercek Supabase ile imzali URL gorselli PDF indirme (CORS), TUS yukleme, KVKK silme/disa aktarma isleyicisi ve MEB mufredat lisansi dogrulanmadi.
- Oncelik duzeltmesi: Turkce karakter hatasi (ı, İ, ğ, Ğ, ş, Ş) Turkce bir urun icin hata, ozellik degil. AI butonlarindan once gelir.

## Odeme saglayicisi (sirket kurmadan)

Oneri, onay bekliyor (ADR 0009 ile celisir: orada iyzico birincil ve sirket sart).

- iyzico bireysel uyelik: yalnizca "link ile odeme". Abonelik API'si yok. Yetersiz.
- Polar.sh (Merchant of Record): Turkiye bireysel saticiyi destekler, odeme Stripe Connect ile TRY olarak Turk bankasina, ucret %5 + 0,50 USD (+ yurtdisi kartta %1,5). Fatura ve KDV yukunu Polar ustlenir. Onerilen aday.
- Paddle: bireysel kabul eder ama USD/EUR SWIFT ile odeme (15 USD sabit ucret), urun onayi siki.
- Lemon Squeezy: Stripe icine tasiniyor, Turkiye saticisi icin belirsiz. Elenir.
- Riskler: Turk Troy ve banka kartlarinda red orani, USD fiyatlandirma, Polar'in yeni ve az belgelenmis olmasi. Karar oncesi Polar'in guncel belgesinden Turkiye ve abonelik destegi dogrulanacak.
- Vergi: bireysel olarak tahsilatin vergi durumu (ticari kazanc, hizmet ihracati istisnasi yalnizca yurtdisi musteri icin gecerli olabilir) mali musavirle teyit edilmeli. Bu bir hukuki gorus degildir.
- Teknik etki dusuk: `BillingProvider` arayuzu hazir, `polar.server.ts` adaptoru + webhook dogrulama eklenir, ADR 0009 guncellenir.

## Faz 0: Dogrulama zemini (paralel baslar)

1. Docker Desktop ac, `pnpm db:start`, `pnpm db:reset`, `pnpm db:test`. Kirilanlari duzelt.
2. `pnpm db:types` ile gercek tip uret, elle yazilan `lib/supabase/types.ts` kaldir.
3. CI'a `db:test` isi ekle (backlog Dilim 01).
4. Auth + tohum fixture'i yaz, `bank.spec.ts` ve `online-exam.spec.ts` `test.skip` kaldir.

## Faz 1: Cekirdek urun kalitesi

1. Turkce font: OFL lisansli bir TTF + `@pdf-lib/fontkit`; OMR formu, karne, kisisel kapak ve renderers icin tek ortak karar (ADR).
2. Genel PDF yerlesim motoru: `packages/layout-engine` icine gercek `LayoutDocument` (sutun, sayfa, kitapcik, karistirma), `paginate.ts` buraya tasinir, onizleme/PDF/DOCX/PPTX ayni kaynaktan. Fast-check testleri. Bu faz, PDF layout tasarimini kapsar ve web tasarimi degisikliginden once biter.
3. Gercek veriyle PDF indirme: imzali URL gorselleri, Storage CORS, ekran goruntusu dogrulamasi.
4. DOCX/PPTX: HTML-gorsel rasterizasyon hatti (ADR 0007 genisletmesi).

## Faz 2: Gercek servisler

1. Resend: davet, sifre sifirlama, iletisim bildirimi, mention e-postasi.
2. Odeme: onayli saglayici adaptoru, webhook, plan esleme, e-fatura ihtiyaci saglayiciya gore yeniden degerlendirilir.
3. Claude: `ANTHROPIC_API_KEY`, bir adet canli dogrulama betigi.
4. Upstash Redis hiz siniri.
5. Sentry (sourcemap) ve PostHog (cerez onayli).

## Faz 3: Ozellik tamamlama

1. AI butonlari: kazanimdan soru uretme, fotograftan OCR (metin + LaTeX), celdirici, kalite kontrolu; hepsi `draft` ve inceleme tepsisi uzerinden.
2. Acik uclu puanlama arayuzu, sonuc ekraninda.
3. Toplu karne (Worker + ZIP) ve kisiye ozel baski dugmesi.
4. Soru gruplama atama secicisi, 6. sik.
5. Canli sinav modu (Realtime Presence).
6. OMR: canli kamera, gercek QR. Embedding saglayicisi secimi (ornegin Voyage AI) ve pHash Hamming RPC.
7. Mufredat: Turkce, Sosyal Bilgiler, lise, ilkokul; once MEB kullanim kosulu teyidi.

## Faz 4: Yayin kapilari

1. axe erisilebilirlik taramasi (tum genel ve uygulama ekranlari).
2. k6 yuk testi: 300 sinav katilimcisi, 50 editor.
3. Ozellik bayragi altyapisi.
4. Geri yukleme tatbikati, `docs/runbook.md` bolum 5.1 tablosu.
5. DNS: SPF, DKIM, DMARC. Vercel ortam degiskenleri ve bolge.
6. Hukuki metinler (paralel, dis bagimlilik): KVKK, gizlilik, sartlar, iade, mesafeli satis. Odeme saglayicisi kararina gore guncellenir.

## Faz 5: Web tasarimi (sizinle)

PDF yerlesimi disindaki tum web arayuzu tasarimi, yukaridakiler bittikten sonra sizinle birlikte degistirilir. O zamana kadar arayuzde yalnizca islevsel duzeltme yapilir, gorsel yeniden tasarim yapilmaz.

## Onay bekleyen kararlar

1. Odeme saglayicisi: Polar ile ilerleyelim mi (ADR 0009 degisir)?
2. Faz sirasi: Faz 0 ve Faz 1 once, Faz 2'nin servis anahtarlari paralel temin edilsin mi?
3. Turkce font: tek bir OFL font (ornegin Noto Sans veya Inter) uygun mu, yoksa bir tercihiniz var mi?
