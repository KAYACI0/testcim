# Ilerleme kaydi

Bu dosya, projede yapilan her isin kaydidir. Her oturumun basinda okunur, sonunda guncellenir.
Format: en yeni kayit en ustte. Durumlar: tamam, devam ediyor, bekliyor, engelli.

## Su anki durum

- Dal: `feat/15-sertlestirme-ve-yayin`
- Odak: Dilim 15 (sertlestirme ve yayin), tum testleri tek tek calistirip duzeltme
- Yayin karari: HAYIR (kosullar `docs/launch-checklist.md` bolum 8)

## Test turu (2026-10-06)

| #   | Test                 | Komut                                  | Durum   | Not                                                                                                     |
| :-- | :------------------- | :------------------------------------- | :------ | :------------------------------------------------------------------------------------------------------ |
| 1   | Biçim                | `pnpm format:check`                    | gecti   | 4 onceden kalan dosya prettier ile duzeltildi (omr, karne dugmesi)                                      |
| 2   | Tip denetimi         | `pnpm typecheck`                       | gecti   | 9/9                                                                                                     |
| 3   | Lint                 | `pnpm lint`                            | gecti   |                                                                                                         |
| 4   | Tasarim kurallari    | `pnpm check:design`                    | gecti   | 364 dosya                                                                                               |
| 5   | Kiraci testi varligi | `pnpm check:tenancy`                   | gecti   | 45/45 tablo                                                                                             |
| 6   | Birim testleri       | `pnpm test --force`                    | gecti   | 9/9 paket, 357 test (onbelleksiz)                                                                       |
| 7   | Uretim derlemesi     | `pnpm build`                           | gecti   |                                                                                                         |
| 8   | Paket butcesi        | `pnpm check:budget`                    | gecti   | en buyuk parca 1414 KB                                                                                  |
| 9   | Bagimlilik denetimi  | `pnpm audit --prod --audit-level high` | gecti   |                                                                                                         |
| 10  | E2E (Playwright)     | `pnpm test:e2e`                        | gecti   | 6 gecti, 2 atlandi (auth fixture yok: bank, online-exam). Asagidaki duzeltmelerden sonra                |
| 11  | pgTAP                | `pnpm db:test`                         | engelli | Docker Desktop kapali (daemon yok). Supabase CLI 2.118.0 kurulu. Docker acilinca `pnpm db:start` + test |

### Bu turda bulunan ve duzeltilen hatalar

1. **Yatay tasma, `/design-system` (gercek hata):** `InspectorPanel` 288 px genisliginde, 4 sekme sigmiyor, son sekme 5 px disari tasiyordu. Duzeltme: sekme listesine `gap-3 overflow-x-auto`, panele `min-w-0` (`components/patterns/inspector-panel.tsx`).
2. **`smoke.spec.ts` eski beklenti:** ana sayfa H1 artik "Sorunuzu yapistirin, testiniz hazir olsun"; test "Testcim" bekliyordu. Test guncellendi.
3. **Gorsel referanslar platforma ozgu:** `-win32.png` dosyalari CI (Ubuntu) icin gecersiz. Piksel karsilastirmasi yalnizca yerelde (`!process.env.CI`) calisiyor, tasma kontrolu her yerde. Referans PNG'ler `.gitignore`'a eklendi. Linux referanslari uretilince yeniden acilmali.

### Bilinen notlar

- `layout-engine` yalnizca 5 test iceriyor. CLAUDE.md "birim + fast-check zorunlu" diyor; kapsam artirilmali.
- `image-tools` testleri `standardFontDataUrl` uyarisi veriyor (hata degil, gurultu).
- Next.js `middleware` dosya adini "proxy" olarak onerip uyari veriyor (Next 16). Calisiyor; gecis ayri is.
- Dev sunucusu `allowedDevOrigins` uyarisi veriyor (127.0.0.1).

## Gunluk

### 2026-10-10 (acilis sayfasi uygulandi)

- Tasarim `apps/web` icine uygulandi. Pazarlama cercevesi mavi (`bg-brand`), ic sayfalar `(marketing)/(content)` grubunda tek beyaz sayfa uzerinde (URL degismedi).
- Ana sayfa: kahraman, editor gorunumlu demo (`paste-demo.tsx`, gercek yapistirma korunuyor, "Ornek soru ekleyin"), akis, ozellik satirlari, fiyat tablosu (`pricing-data.server.ts` ile fiyat sayfasiyla ortak), SSS, kapanis. Metinler tr/en.
- Token'lar: `--color-brand`, `--color-on-brand-2/3`, `--color-brand-line/fill/ghost`, `--color-sketch`, `--shadow-sheet/page/key`, `--font-display` (Source Serif 4, kok duzende onyuklemesiz).
- docs/03 bolum 2 ve 7: pazarlama sitesi icin mavi zemin istisnasi yazildi (kullanici karari).
- Dogrulama: typecheck temiz, lint temiz, check:design temiz (372 dosya), format temiz, birim testleri 364/364. Turbo bu konteynerde "Exec format error" verdi; `pnpm -r` ile calistirildi. 1440/1024/390 ekran goruntusu: yatay tasma yok.
- Bilinen eksik: yerelde DB yoksa fiyat tablosu "yuklenemedi" yazar. Kullanici gorusu bolumu gercek alinti gelince eklenecek (backlog). E2E bu turda calistirilmadi.

### 2026-10-10 (acilis sayfasi tasarimi)

- Acilis sayfasi tasarimi Design tuvalinde hazirlandi (heyretro.io referansli; site bu ortamdan erisilemedi, genel yapisi uyarlandi). Kaynak: `docs/tasarim/landing/Main.dc.html`.
- Kurgu: mavi zemin (masa), beyaz yuzeyler (kagit). Bolumler: gezinme, kahraman, calisan editor ornegi (ornek soru yapistirma, imza oturma hareketi), Ctrl+V / A-E / Cikti al akisi, ozellik satirlari (kirpma, kitapcik, optik), cizgili ozellik listesi, kullanici gorusu yer tutucusu, cizgili fiyat tablosu (aylik/yillik), SSS, kapanis, alt bilgi.
- Celiski (kullanici karari bekliyor): docs/03 "beyaz baskin, renkli arka plan yok" diyor; kullanici acikca mavi zemin istedi. Uygulamaya gecmeden once docs/03 bolum 2 ve 7 guncellenmeli.
- Yer tutucular: fiyatlar, ogretmen gorusu, ogrenci adlari.
- Dogrulama: yalnizca tasarim; kod degismedi, test calistirilmadi.

### 2026-10-06 (editor duzeltmeleri)

- Sayfalama: soru sayisi tahmini yerine olculen yukseklikle A4 (794x1122 px) paketleme. Sol sutun yukaridan asagi dolar, sonra sag sutun, sonra yeni sayfa. Ilk sayfa tam baslik, sonrakiler kompakt baslik. Mantik `features/editor/paper/paginate.ts` (7 birim test).
- Cevap anahtari: kâğıt `option_id` yerine var olmayan `choice` alanini okuyordu, cevaplar hic gorunmuyordu. Duzeltildi. Cevap formu ve cevap anahtari artik ayri sayfa, isaretleme aninda canli guncellenir; kutu isaretlenince anahtar sayfasina kayar.
- Telefondan yakalama: `editor.pasteBar.phoneCapture` ve `editor.phoneCaptureDialog.*` cevirileri eksikti (ham anahtar gorunuyordu). tr/en eklendi.
- Cikti: yazdirma artik yalnizca kâğıt sayfalarini basar (`#print-root`, `@page A4`). "Yazdir" ve "PDF indir" ayri; PDF tarayicida uretilip dosya olarak iner (html2canvas-pro + jspdf, yalnizca tikta yuklenir).
- Dogrulama: typecheck, lint, check:design, test (9/9), build, check:budget, audit temiz. Gecici demo sayfasiyla tarayicida 4 sayfa A4 PDF (indirme ve yazdirma) dogrulandi, demo sonra silindi.
- Bilinen eksik: gercek Supabase verisiyle (imzali URL gorselleri) PDF indirme denenmedi, Docker kapali. Depolama CORS basligi yoksa PDF'te gorseller bos cikabilir.

### 2026-10-06

- Dilim 15 incelendi; kodla belgeler karsilastirildi.
- Magic bytes kontrolu, `source-map-js` override'i ve CI kapilari eklendi (commit `e67df62`).
- Dogrulanmamis belge iddialari (geri yukleme tatbikati, Go karari) duzeltildi.
- `ilerleme.md` olusturuldu, test turu 1-10 calistirildi, 3 hata duzeltildi (yukarida).

## Acik isler (oncelik sirasiyla)

1. pgTAP (`pnpm db:test`): Docker Desktop acilip calistirilacak
2. Erisilebilirlik (axe) testi
3. Eksik E2E akislari: kayit, yapistir ve PDF, optik, odeme test modu
4. Yuk testi (300 sinav katilimcisi, 50 editor)
5. Ozellik bayragi altyapisi
6. Geri yukleme tatbikati ve pgTAP calistirma (Docker/Supabase CLI olan ortamda)
7. Hukuki metinler (avukat), iyzico adaptoru, e-Arsiv, Resend (docs/backlog.md)
