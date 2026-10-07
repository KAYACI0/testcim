# Ilerleme kaydi

Bu dosya, projede yapilan her isin kaydidir. Her oturumun basinda okunur, sonunda guncellenir.
Format: en yeni kayit en ustte. Durumlar: tamam, devam ediyor, bekliyor, engelli.

## Su anki durum

- Dal: `feat/15-sertlestirme-ve-yayin`
- Odak: Dilim 15 (sertlestirme ve yayin). Faz 0 E2E fixture'i tamam, sirada Faz 1 (Turkce font, genel PDF yerlesim motoru)
- Yayin karari: HAYIR (kosullar `docs/launch-checklist.md` bolum 8)

## Test turu (2026-10-06)

| #   | Test                 | Komut                                  | Durum | Not                                                                                                  |
| :-- | :------------------- | :------------------------------------- | :---- | :--------------------------------------------------------------------------------------------------- |
| 1   | Biçim                | `pnpm format:check`                    | gecti | 4 onceden kalan dosya prettier ile duzeltildi (omr, karne dugmesi)                                   |
| 2   | Tip denetimi         | `pnpm typecheck`                       | gecti | 9/9                                                                                                  |
| 3   | Lint                 | `pnpm lint`                            | gecti |                                                                                                      |
| 4   | Tasarim kurallari    | `pnpm check:design`                    | gecti | 364 dosya                                                                                            |
| 5   | Kiraci testi varligi | `pnpm check:tenancy`                   | gecti | 45/45 tablo                                                                                          |
| 6   | Birim testleri       | `pnpm test --force`                    | gecti | 9/9 paket, 357 test (onbelleksiz)                                                                    |
| 7   | Uretim derlemesi     | `pnpm build`                           | gecti |                                                                                                      |
| 8   | Paket butcesi        | `pnpm check:budget`                    | gecti | en buyuk parca 1414 KB                                                                               |
| 9   | Bagimlilik denetimi  | `pnpm audit --prod --audit-level high` | gecti |                                                                                                      |
| 10  | E2E (Playwright)     | `pnpm test:e2e`                        | gecti | 2026-10-07: 8 gecti, 0 atlandi. bank ve online-exam artik yerel Supabase'te gercek girisle calisiyor |
| 11  | pgTAP                | `pnpm db:test`                         | gecti | 2026-10-07: 26 dosya, 205 test, gercek Postgres'te                                                   |

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

### 2026-10-07 (Faz 1, madde 1: ortak Turkce PDF yazi tipi)

- Karar: IBM Plex Sans (docs/03'teki tek aile, OFL), ADR 0011. IBM'in resmi TTF dosyalari `apps/web/public/fonts/` altinda, degistirilmeden; lisans yanlarinda.
- Yeni paket `@testcim/pdf-fonts`: fontkit kaydi, 3 agirlik, `subset: true`; G/C yok, bayt diziyi cagiran verir (tarayici `fetch`, sunucu `lib/pdf-fonts.server.ts`, test `./node`).
- OMR formu, karne ve kisisel kapak Helvetica yerine bunu kullaniyor; imzalara `PdfFontBytes` eklendi. Testler Turkce karakterli veriye cevrildi.
- Dogrulama: Helvetica 'ı'da hata veriyor (gerileme testi); 3 agirlikta tum Turkce harfler var; karne PDF'i `pdfjs-dist` ile geri okundu, metin birebir dogru (12,7 KB). typecheck, lint, check:design, check:tenancy, tum birim testleri (pdf-fonts 6, web 152) yesil.
- `next.config.ts`: `outputFileTracingIncludes` (fontlar sunucu izine) ve `transpilePackages`.
- Acik: Vercel'de gercek dagitimda sunucu eyleminin font dosyasini buldugu denenmedi; DOCX/PPTX'e Plex gomulmedi (kapsam disi, ADR 0011).

### 2026-10-07 (Faz 0: Polar odeme adaptoru)

- Polar dosyalari baska bir araca verilmisti, kullanici geri aldirdi ve tamamlamami istedi; calisma agaci temizdi, adaptor sifirdan yazildi.
- Polar'in guncel resmi belgesi okundu (checkout, abonelik PATCH, webhook imzasi, olay listesi). Belgede dogrulanmayan yerler: `seats` ve `recurring_interval` webhook alani ayrintisi ve checkout `success_url`/`metadata` kopyalama davranisi; kod bunlara savunmaci davranir (eksikse plan ve koltuk alani bos birakilir, kayitli deger korunur).
- `polar-provider.ts` (`createCheckout`, `cancel`, `resume`, `changePlan`, `parseWebhook`), `registry.server.ts` polar dali, `env.ts` icinde `POLAR_*` degiskenleri, `.env.example` ve ADR 0009 guncellendi.
- Testler: `polar-provider.test.ts` 19 test (iki imza semasi, kurcalama, eski zaman damgasi, olay cevirisi, API cagrilari), `env.test.ts` 2 test. fast-check gerekmiyor (cevirici saf degil, ag ve imza).
- Dogrulama: typecheck 9/9, lint, check:design, `pnpm test` (web 152) yesil. Gercek Polar sandbox hesabiyla uctan uca denenmedi.
- Acik: Polar sandbox hesabi, urunler ve gercek webhook ile dogrulama; kupon kodu Polar'da indirim kodu olarak ayri tanimlanmali (adaptor `couponCode`'u yalnizca metadata'ya yazar).

### 2026-10-07 (Faz 0: E2E kimlik ve tohum fixture'i)

- `bank.spec.ts` ve `online-exam.spec.ts` icindeki `test.skip` kaldirildi, iki test gercek akislarla yeniden yazildi.
- Fixture: `apps/web/e2e/support/local-supabase.ts` (servis rolu ile kullanici, calisma alani, 30 soru, acik sinav tohumu) ve `fixtures.ts` (gercek giris formundan oturum acan `teacherPage`). Her test kendi kullanicisini olusturur ve siler.
- Guvenlik: `apps/web/.env.local` UZAK Supabase projesini gosteriyor. Fixture yalnizca `127.0.0.1` / `localhost` kabul eder, aksi halde hata verir. Playwright artik 3100 portunda ayri bir dev sunucusu baslatir ve yerel Supabase anahtarlarini ortama verir; normal `pnpm dev` sunucusu asla yeniden kullanilmaz.
- **Gercek uretim hatalari (E2E ile bulundu):**
  1. `/s/[slug]` (anonim ogrenci akisi) `PUBLIC_PATHS` icinde degildi: girisi olmayan ogrenci `/login`'e yonlendiriliyordu, cevrimici sinav hic calismiyordu. `lib/supabase/proxy.ts` duzeltildi.
  2. `attempt_answers.item_id` `test_items`'e bagliydi, calisma zamani ise `online_exam_items.id` yaziyordu: her cevap kaydi yabanci anahtar hatasiyla reddediliyor, her ogrenci 0 puan aliyordu. Rapor RPC'leri (`get_class_report`, `get_outcome_report`, `get_weak_topics`) de `test_items`'e baglaniyordu. Duzeltme: `20250101000030_attempt_answers_online_exam_items.sql`; pgTAP 140 tohumu `online_exam_items` kullaniyor ve yabanci anahtari dogrulayan bir test eklendi.
  3. `next.config.ts` `allowedDevOrigins` yoktu: `127.0.0.1` ile acilan dev sayfasinda istemci bilesenleri hidrasyon almiyordu (ilerleme notundaki "allowedDevOrigins uyarisi" aslinda isleve zarar veriyordu).
- CI `e2e` isine Supabase CLI kurulumu, `supabase start` ve `supabase db reset` eklendi (henuz GitHub Actions'ta calistirilmadi).
- Dogrulama: E2E 8/8, pgTAP 205/205, check:design temiz, check:tenancy 45/45, kendi dosyalarimda typecheck ve lint temiz.

### 2026-10-07 (Faz 0: gercek veritabani dogrulamasi)

- Docker acildi, `pnpm db:start` ve `pnpm db:reset`: 27 migrasyon ilk kez gercek Postgres'te hatasiz uygulandi. `pnpm db:test` ilk calismada 26 dosyanin 24'u kirikti; hepsi cozuldu, sonuc 26 dosya, 204 test yesil.
- **Gercek uretim hatalari (testlerin ilk kez calismasiyla bulundu):**
  1. `apply_test_ops` dort migrasyonda (013, 015, 016, 025) eski govdeden kopyalanip yeniden yazilmis; son tanim `questions_per_test` kotasini, `add_group`/`update_group` ve `upgrade_revision` islemlerini kaybetmisti. Editorde soru grubu ekleme ve guncel surume yukseltme calismazdi, kota denetlenmezdi. Duzeltme: `20250101000028_apply_test_ops_union.sql` (hepsinin birlesimi).
  2. `comment_mentions` tablosu RLS'siz idi; giris yapmis herhangi bir kullanici tum kiracilarin mention satirlarini okuyabilirdi. Duzeltme: `20250101000029_comment_mentions_rls.sql` + capraz kiraci testi (`150_collaboration.sql`).
  3. `submit_capture_question` icinde `workspace_id` sutun adi dönüs tablosuyla cakisiyordu ("ambiguous"); telefondan yakalama RPC'si calismazdi. Duzeltme: `#variable_conflict use_column` (migrasyon 027, hicbir gercek veritabanina uygulanmadigi icin yerinde duzenlendi).
- Test altyapisi hatalari: `fx` gecici tablosuna ve `tests` semasina rol yetkisi yoktu; `throws_ok` 44 yerde yanlis imzayla (aciklama, hata mesaji konumunda) cagrilmisti, 4 argumanli biclime cevrildi (hata kodu belirtilmeyenlerde `null`, yani herhangi bir istisna kabul edilir; kod denetimi gerekirse sonradan sikilastirilabilir); icerik tablolarina servis rolu olmadan veri yazan testler duzeltildi; 190 ve 200 dosyalari hic calismamisti, sema uyusmazliklari giderildi.
- `pnpm db:types` calisti, `packages/shared/src/database.types.ts` uretildi (yeni dosya, commit'lendi). Elle yazilan `lib/supabase/types.ts` ile degistirmek 60 tip hatasi uretti (Json ve string alanlari, enum yerine string); bu ayri bir refaktor, `docs/backlog.md`'ye yazildi. Mevcut dosya korundu.
- CI'a `database` isi eklendi (supabase start, db reset, test db). GitHub Actions'ta henuz calistirilmadi, ilk PR'da dogrulanmali.
- Dogrulama: typecheck 9/9, check:tenancy 45/45, db:test PASS.

### 2026-10-07 (yol haritasi)

- Dis degerlendirme raporu dogrulandi (buyuk olcude dogru; `iyzico.server.ts` yok, layout-engine iskeleti ve gercek DB dogrulamasi eksikti). Sonuc ve fazli plan `docs/04-yol-haritasi.md`.
- Sirketsiz odeme secenegi arastirildi: Polar.sh oneriliyor, kullanici onayi bekleniyor (ADR 0009 ile celisiyor, onaysiz degistirilmedi).
- Kod degisikligi yok, yalnizca belge.

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

1. Faz 0 kalan: `database.types.ts`'e gecis refaktoru, Polar'in sandbox'ta uctan uca dogrulanmasi
2. Erisilebilirlik (axe) testi
3. Eksik E2E akislari: kayit, yapistir ve PDF, optik, odeme test modu
4. Yuk testi (300 sinav katilimcisi, 50 editor)
5. Ozellik bayragi altyapisi
6. Geri yukleme tatbikati ve pgTAP calistirma (Docker/Supabase CLI olan ortamda)
7. Hukuki metinler (avukat), iyzico adaptoru, e-Arsiv, Resend (docs/backlog.md)
