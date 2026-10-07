# Ilerleme kaydi

Bu dosya, projede yapilan her isin kaydidir. Her oturumun basinda okunur, sonunda guncellenir.
Format: en yeni kayit en ustte. Durumlar: tamam, devam ediyor, bekliyor, engelli.

## Su anki durum

- Dal: `feat/15-sertlestirme-ve-yayin`
- Odak: Faz 3. 3.1 (yapay zeka soru dugmeleri) ve 3.2 (acik uclu puanlama) tamam; siradaki: Faz 3 madde 3 (toplu karne / kisiye ozel baski)
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

### 2026-10-07 (Faz 3, madde 2: acik uclu puanlama arayuzu)

- Arka uc zaten hazirdi (`regradeOpenAnswer`, `ensureAttemptScored`); eksik olan `/exams/[id]` sonuc ekraninda bunu tetikleyen arayuzdu.
- `getOpenGradingQuestions` (actions.server.ts): sinavdaki `open` tipli maddeleri, ogrenci bazinda serbest metin cevabini ve varsa rubrigi dondurur (yalnizca `in_progress` disindaki denemeler).
- `OpenGradingPanel` (open-grading-panel.tsx): sonuc sayfasina "Acik uclu puanlama" bolumu, soru basina ogrenci cevaplari + puan girisi + kaydet; puanlandi/puanlanmadi rozeti. `regradeOpenAnswer` cagrilir, `ensureAttemptScored` toplam puani hemen gunceller (sayfa yenilenince gorulur).
- Ceviri: `exams.results.openGrading.*` (tr/en).
- E2E yardimcisi: `seedOpenEndedQuestion` (local-supabase.ts). Yeni test: `online-exam.spec.ts` "acik uclu soruyu ogretmen sonuc ekraninda elle puanlar" (ogrenci mcq+acik uclu cevaplar, ogretmen puan girip kaydeder, toplam puan guncellenir).
- Dogrulama: typecheck, lint, check:design, check:budget, tum birim testleri (web 177), build, E2E 41/41 (yeni test dahil) yesil.
- Acik: rubrik metni yalnizca gosteriliyor, AI destekli rubrik-bazli otomatik on-puanlama yok (kapsam disi, Faz 3 madde 1 AI butonlariyla ayni degil).

### 2026-10-07 (genel hiz: sayfalar arasi gecis)

- **Olcum yontemi:** `e2e/support/latency-proxy.ts` yerel Supabase onune 80 ms gecikme koyar (uzak proje benzetimi), `e2e/support/perf-nav.ts` uretim derlemesinde (`next start`) yan serit baglantilarina tiklayip sureyi olcer. Olcum elle yapilir, test paketinde degildir.
- **Once (80 ms gecikmeyle):** tiklamadan adres degisimine 315-366 ms (sayfa verisi gelene kadar hicbir sey olmuyordu), tam yuklemede ilk bayt 320-440 ms.
- **Yapilan:** (1) `app/(app)/loading.tsx`: tiklama aninda iskelet gorunur ve Next dinamik rotalar icin bunu onceden ceker. (2) `listMemberships` iki sirali sorgu yerine tek sorgu (gomulu `workspaces`); her sayfa isteginde bir gidis-donus az. (3) Editorde zengin soru paneli ve grup paneli (TipTap, KaTeX) `next/dynamic` ile istek uzerine yukleniyor. (4) `optimizePackageImports` ile Phosphor.
- **Sonra:** tiklamadan adres degisimine 27-49 ms (yaklasik 10 kat), icerigin gelmesi 340-360 ms (degismedi, veri sorgulari ayni), tam yuklemede ilk bayt 230-350 ms (yaklasik 80-100 ms kazanc).
- **Bilerek yapilmadi:** `staleTimes.dynamic` (istemci onbellegi). Sunucu eylemleri `revalidatePath` cagirmadigi icin sekmeler arasi gecista bayat liste gorulebilirdi; mutasyonlar tek tek gozden gecirilmeden acilmamali.
- Acik: sayfa verisi hala "calisma alani coz, sonra sorgula" sirasiyla geliyor (2 gidis-donus); calisma alanini imzali cerezden cozup sorguyu paralel baslatmak sonraki adim.
- Dogrulama: lint, typecheck, check:design, birim testleri, E2E (yeni `editor-panels.spec.ts`: lazy paneller).

### 2026-10-07 (Faz 3, madde 1: yapay zeka soru dugmeleri)

- **Dort ozellik:** Soru uret (kazanim veya konu, tur, zorluk, adet; en fazla 10), Gorselden metne (LaTeX dahil), Celdirici ekle, Kalite kontrolu. Promptlar `features/ai/prompts/*.v1.md`, surum listesi README'de.
- **Taslak ve onay:** Uretilen her kayit `ai_generated = true`, `ai_review_status = 'draft'`. Yeni sayfa `/bank/review` (inceleme tepsisi): tek tek ve toplu Onayla, Duzenle, Sil, kalite kontrolu. Onayda tarayici soruyu 300 DPI PNG'ye cizer, dogrudan Storage'a yukler, sunucu varligi kaydedip taslagi onaylar.
- **Teste giris engeli veritabaninda:** `20250101000031_block_ai_draft_in_tests.sql` (tetikleyici `test_items_block_ai_draft`), `apply_test_ops` dahil her yolu kapatir. Bankadan toplu eklemede taslaklar atlanir ve sayisi bildirilir.
- **Kredi:** istenen adet kadar dusulur, gecersiz cikan soru icin iade (`ai_invalid_items`). Hata, hiz siniri ve yetersiz kredi yolunda tam iade.
- **Giris noktalari:** banka basliginda "Soru uret" ve "Inceleme tepsisi (N)", denetci panelinde "Yapay zeka" sekmesi.
- **Cevrimdisi saglayici:** `AI_PROVIDER=scripted` (yalniz gelistirme ve E2E; uretimde yok sayilir). Playwright anahtarsiz calisir.
- **Test:** shared 120 (yeni 13, fast-check dahil), web 177, pgTAP 27 dosya 210 test (yeni `116_ai_draft_block.sql`), E2E 39/39 (yeni `ai-review.spec.ts` 4 test; `/bank/review` axe kapsaminda). lint, typecheck, check:design, check:tenancy, build, check:budget yesil.
- **Ekran goruntuleri:** inceleme tepsisi ve uretme penceresi 1440/1024/390 alindi ve incelendi. Bulunan sorunlar duzeltildi: 390 px'te satir sikismasi (eylemler icerigin altina), "Dogru" rozeti konumu, denetci sekme etiketi kirilmasi (`inspector-panel.tsx` `whitespace-nowrap`), cevapsiz taslakta Onayla kapali.
- Acik: gercek Claude ile denenmedi (docs/backlog.md "Faz 3.1'den kalanlar"); banka listesinde `$...$` ham gorunuyor; `/bank` 390 px duzeni Faz 5.

### 2026-10-07 (Faz 4: axe, ozellik bayragi, yuk testi, geri yukleme)

- **axe:** `@axe-core/playwright` ile `e2e/a11y-public.spec.ts` (14 genel sayfa) ve `e2e/a11y-app.spec.ts` (9 oturum acik sayfa); ciddi ve kritik WCAG A/AA ihlali varsa duser. Bilerek bozuk sayfayla denendi, axe yakaliyor. Bulunan ve duzeltilen gercek hatalar: daraltilmis yan seritte yalniz simgeli baglantilar adsizdi (`app-shell.tsx`, `sr-only` etiket), banka filtresindeki iki secici dugmenin adi yoktu (`filter-bar.tsx`). 23/23 gecti.
- **Ozellik bayragi:** `FEATURE_FLAGS` ortam degiskeni (JSON), `packages/shared/src/feature-flags.ts` (calisma alani izin listesi, kararli yuzde dagitimi, bozuk girdi = kapali), `lib/feature-flags.server.ts` (`isFlagEnabled`). 8 test (fast-check dahil: uc degerler, yuzde arttikca monotonluk, dagilim). Veritabani tablosu yok, migrasyon gerekmedi. Henuz hicbir ozellik bayraga baglanmadi.
- **Yuk testi:** `loadtest/exam.js` (300 katilimci: katil, sorular, cevap, bitir) ve `loadtest/editor.js` (50 editor, oturum acik sayfalar). k6 bu makinede kurulu degil, betikler calistirilmadi. Not: sinav uclari IP basina hiz sinirli (katil 20/dk, cevap 120/dk); hazirlik ortami `X-Forwarded-For`'a guvenmezse testler 429 olcer.
- **Geri yukleme:** `pnpm db:restore-drill` (`scripts/restore-drill.sh`): yerel veritabani dokulup bos veritabanina yuklenir, 56 public tablonun satir sayilari karsilastirilir. Gecti, 3 sn. Betik ilk denemede `vector` ve `pg_trgm` eklentilerinin eksikligini yakaladi (betik hatasi, urun hatasi degil), duzeltildi. Yerel tatbikattir, uretim PITR tatbikati degildir.
- **pgTAP:** Docker acilinca yeniden calistirildi, 26 dosya, 205 test yesil.
- Dogrulama: lint, typecheck 10/10, check:design, check:tenancy 45/45, tum birim testleri, E2E axe 23/23.
- Acik: k6 ile gercek calistirma, uretimde geri yukleme ve PITR tatbikati, eksik E2E akislari (kayit, optik, odeme test modu).

### 2026-10-07 (Faz 2, madde 4-5: Upstash, Sentry, PostHog incelemesi)

- Upstash yalniz yapay zeka hiz siniri icin kullaniliyor (anahtar yoksa bellek ici yedek); halka acik uclar (sinav, form, yakalama) Postgres RPC `check_exam_rate_limit` ile sinirli, ek is gerekmedi. Sentry DSN yoksa kapali, PostHog cerez onayi olmadan yuklenmiyor.
- Hata: PostHog anahtari verilip host bos birakilirsa kutuphane varsayilan adrese gidiyor, CSP `connect-src` onu engelliyordu. `lib/analytics-host.ts` ile varsayilan host (US) hem CSP'ye hem baslatmaya veriliyor; 3 test.
- Dogrulama: lint, typecheck, check:design, web testleri 170 yesil.
- Acik: uc servis de gercek anahtarlarla denenmedi.

### 2026-10-07 (Faz 2, madde 3: Claude canli dogrulama betigi)

- `pnpm test:ai-live`: `ClaudeAiProvider` uzerinden gercek iki cagri (yapilandirilmis cikti sema dogrulamasi, kullanim ve maliyet; kullanici icerigindeki talimatin veri sayilmasi). Ayri vitest yapilandirmasi (`vitest.live.config.ts`), `*.live.ts` dosyalari, normal `pnpm test`e girmez.
- `ANTHROPIC_API_KEY` yoksa testler atlanir (su an 2 atlandi). Anahtar gelince: `ANTHROPIC_API_KEY=... pnpm test:ai-live`.
- Dogrulama: lint, web typecheck temiz.
- Acik: gercek anahtarla calistirilmadi.

### 2026-10-07 (Faz 2, madde 1: Resend e-posta)

- `lib/email/resend.ts`: Resend'in resmi `POST /emails` uc noktasina duz `fetch` (SDK yok), anahtar veya gonderen yoksa `not_configured` doner, hata atmaz. HTML govdesinde kullanici metni kacislanir.
- Baglanan akislar: davet (e-posta gider, baglanti yedek olarak ekranda kalir), iletisim ve telif formu bildirimi (`CONTACT_NOTIFY_TO`), yorumda mention e-postasi (yalnizca test yorumlari). Hepsi en iyi caba: basarisiz gonderim akisi bozmaz, uygulama ici bildirim zaten kayitli.
- Metinler `messages/tr.json` ve `en.json` altinda `email.*`. Yeni degiskenler: `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_NOTIFY_TO` (`.env.example`, `turbo.json`, `env.ts`).
- Test: `resend.test.ts` 6 test (yapilandirilmamis, gonderi govdesi ve basliklar, API hatasi, ag hatasi, kacislama). web 167 test yesil. lint, typecheck 10/10, check:design, build yesil.
- Acik: gercek Resend hesabi ve dogrulanmis alan adiyla denenmedi (SPF/DKIM Faz 4). Sifre sifirlama e-postasini Supabase Auth gonderiyor; Resend'i SMTP olarak Supabase panelinde tanimlamak gerekiyor (elle ayar, anahtar gelince).

### 2026-10-07 (Faz 1, madde 4: DOCX/PPTX gercek soru verisiyle)

- Rasterizasyon hatti beklenenden kucuk cikti: zengin sorular kayitta zaten 300 DPI PNG olarak `stem_asset_id`'de, yani her soru bir gorsel. Ayri HTML'den gorsele hat gerekmedi (ADR 0007 guncellendi).
- Mevcut dis aktarici hatalari duzeltildi: gorseller sabit kutuya sikisiyordu (oran bozuk), PPTX nesneleri slayt disina tasiyordu, `Buffer` tarayicida calismazdi, JPEG yoktu. Artik gorsel oranini korur, sayfa/slayt sinirlarinda kalir, 1800 px ustu kucultulur.
- Dosya tarayicida Web Worker'da uretilir (Vercel govde siniri); sunucu yalnizca `docx_pptx_export` yetkisini denetler (`authorizeExport`). Siralama, numara ve cevap harfleri editor kagidindan gelir.
- Arayuz: envanterde "Word indir" ve "PowerPoint indir" (yalnizca islevsel; ucretsiz planda kilitli + not).
- Test: renderers 40 -> 47 (zip icinden okunan metin, gorsel orani, slayt siniri, JPEG/PNG medya), web 159 -> 162, E2E 9 -> 11 (`office-export.spec.ts`: ucretsiz planda kilit; Plus'ta gercek dosyalar iner, docx/pptx icinden dogrulanir).
- Dogrulama: lint, typecheck 10/10, check:design, build, check:budget, tum birim testleri, E2E 11/11 yesil.
- Acik: dosyalar gercek Word/PowerPoint'te acilarak denenmedi (docs/backlog.md).

### 2026-10-07 (Faz 1, madde 2b ve 3: LayoutDocument'tan HTML/PDF, gercek veriyle PDF)

- `packages/renderers`: `paintTest` (LayoutDocument -> sayfa basina cizim komutlari), `renderPaintPdf`, `renderPaintHtml`, `frameMetrics`, 3 ustbilgi sablonu, kompakt ustbilgi, altbilgi, sutun ayraci, filigran, cevap formu ve cevap anahtari sayfalari. `@testcim/renderers/paint` girisi docx/pptx'i istemci paketine sokmaz.
- `packages/pdf-fonts`: `createTextMeasure` (gomulu fontun glif genislikleri, PDF'in cizdigiyle ayni).
- Editor kagidi motordan: `paper-layout.ts` (saf), `paper-view.tsx`, PDF Web Worker'da. Eski DOM akisli kagit, `paginate.ts`, `html2canvas-pro` ve `jspdf` silindi. Kagit panele sigacak sekilde olceklenir (1024'te kirpilma yok).
- Guvenlik/ortam: CSP'ye yapilandirilmis Supabase kaynagi eklendi ve gelistirmede `upgrade-insecure-requests` kapatildi; yoksa yerel Supabase gorselleri hic yuklenmiyordu (E2E ile bulundu).
- Test: renderers 8 -> 40, pdf-fonts 6 -> 8, web 153 -> 159, E2E 8 -> 9 (`paper-pdf.spec.ts`: yerel Storage'da gercek PNG, capraz kaynak yukleme, secim, yazdirma kopyasi, PDF indirme ve pdfjs ile geri okuma). Cikti gozle de dogrulandi (PDF sayfalari PNG'ye cizilip incelendi) ve editor 1440/1024/390 ekran goruntuleri alindi.
- Dogrulama: lint, typecheck 10/10, check:design, build, check:budget, tum birim testleri, E2E 9/9 yesil.
- Acik: TestSettings sema genisletmesi, editorun 1024 alti yerlesimi (Faz 5), `pageColor`, PDF Worker'in Vercel'de denenmesi, barindirilan Storage CORS (docs/backlog.md).

### 2026-10-07 (Faz 1, madde 2a: layout-engine cekirdegi)

- `packages/layout-engine`: `layoutTest` (strict, flexible, fit-pages, sutun dengeleme, bolum yeni sayfa, grup bolunmez), `orderBooklet` (mulberry32, A-D kitapcik, sabitleme, bolum siniri, grup tek birim, sik permutasyonu), `buildAnswerKeys` (kitapcik basina anahtar + surum esleme), `pageDimensions` (A3, A4, A5, Letter, ozel). Saf, senkron, bagimliliksiz; yukseklik `measure` geri cagrisiyla.
- ADR 0002'nin 3 acik noktasi onerileriyle kapatildi (eklemeli numaralandirma, siralayi koruyan dengeleme, tam Plex). ADR durumu guncellendi.
- `features/editor/paper/paginate.ts` artik motorun strict modunun adaptoru (yerlesim mantigi tek yerde). Eski algoritma testte oracle olarak tutuldu: 1500 rastgele girdide birebir ayni sonuc.
- Testler: layout-engine 5 -> 48 (birim + fast-check). Mutasyon kontrolu: bozuk bosluk, bolunen grup, numarasiz blok, yok sayilan yeni sayfa; dortu de yakalandi. Performans: 100 soru 3 sutun esnek+dengeleme 300 ms tavaninin cok altinda.
- Dogrulama: lint, typecheck 10/10, check:design, tum birim testleri (web 153), build, check:budget yesil.
- Acik: renderers `LayoutDocument` okumuyor (renderHtml, renderPdf), TestSettings sema genisletmesi, editor kagidinin motor koordinatlarini kullanmasi (docs/backlog.md). Editorun tarayicida elle denemesi yapilmadi (E2E editoru kapsamiyor); adaptor oracle testiyle dogrulandi.

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
