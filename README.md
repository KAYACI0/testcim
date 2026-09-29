# Testcim: Claude Code Yapı Paketi

Bu paket, Testcim'i Claude Code (Opus) ile sıfırdan kurmak için gereken strateji, mimari, tasarım sistemi ve sıralı uygulama promptlarını içerir.

## Paket içeriği

| Dosya                                   | Amaç                                                              |
| --------------------------------------- | ----------------------------------------------------------------- |
| `CLAUDE.md`                             | Claude Code'un her oturumda okuyacağı kısa proje belleği          |
| `docs/01-analiz-ve-strateji.md`         | Rakip analizi, özellik eşleme, plan yapısı, riskler, yol haritası |
| `docs/02-mimari.md`                     | Teknoloji yığını, akışlar, veri modeli, güvenlik, CI/CD           |
| `docs/03-tasarim-sistemi.md`            | Tasarım kimliği, token'lar, yasaklar, metin kuralları             |
| `docs/prompts/00` ... `docs/prompts/15` | Sırayla verilecek uygulama promptları                             |

## Kurulum (sen yapacaksın)

1. GitHub'da private bir `testcim` deposu aç ve yerel makineye klonla.
2. Bu paket depo kökünde yerleşiktir: `CLAUDE.md` kökte, dokümanlar `docs/` altında, uygulama promptları `docs/prompts/` altındadır.
3. Supabase'de iki proje aç: `testcim-dev` ve `testcim-prod` (bölge: AB, Frankfurt). Vercel hesabını GitHub'a bağla.
4. Anahtarları yalnızca Vercel ortam değişkenlerine ve yerel `.env.local` dosyana koy. Sohbete veya depoya yazma.
5. Logo dosyalarını hazırlayınca `apps/web/public/brand/logo.svg` ve `mark.svg` olarak koy.
6. Depo kökünde Claude Code'u başlat.

## Oturum başlatma promptu (ilk mesaj olarak yapıştır)

```
Bu depo Testcim adlı bir ürün için. Önce CLAUDE.md dosyasını ve docs/01, docs/02, docs/03 dosyalarını baştan sona oku. Ardından şunu yap:
1. Ürünü, mimariyi ve tasarım ilkelerini kendi cümlelerinle en fazla 15 satırda özetle.
2. Belgelerde gördüğün çelişki, eksik veya riskli noktaları listele.
3. Kurulumdan önce doğrulaman gereken kütüphane sürümlerini ve API'leri listele.
Henüz kod yazma. Özetimi onaylayınca docs/prompts/ altındaki dilimleri sırayla vereceğim.
```

## Çalışma düzeni

- Her prompt bir dilimdir: tek dal, tek PR. Sonraki prompta ancak kabul kriterleri doğrulanınca geç.
- Her dilime plan moduyla başlat; planı okumadan uygulamaya izin verme.
- Arayüz dilimlerinden (02, 04, 05, 06, 09) sonra ekran görüntülerini bana getir; tasarımı birlikte eleştirelim.
- Claude Code bir noktada belgelerle çelişen bir karar önerirse önce belgeyi güncelletip sonra ilerlet.

## Sıra

| No  | Dilim                              | Sonuç                                            |
| --- | ---------------------------------- | ------------------------------------------------ |
| 00  | Temel ve iskelet                   | Depo, araçlar, CI, ortamlar                      |
| 01  | Veri tabanı                        | Şema, RLS, Storage, RPC, pgTAP                   |
| 02  | Tasarım sistemi                    | Token'lar, bileşenler, uygulama kabuğu           |
| 03  | Kimlik ve çalışma alanı            | Giriş, çalışma alanları, roller, plan altyapısı  |
| 04  | Editör ve yakalama hattı           | Yapıştır, sırala, cevap işaretle, kaydet         |
| 05  | Yerleşim motoru ve PDF             | Canlı önizleme, PDF, kitapçıklar, cevap anahtarı |
| 06  | PDF kırpma stüdyosu                | Otomatik bölme, numara silme                     |
| 07  | Zengin soru editörü                | Metin, denklem, geometri çizimi                  |
| 08  | Soru bankası ve müfredat           | Klasör, etiket, arama, kazanım                   |
| 09  | Çevrimiçi sınav                    | Yayın, öğrenci akışı, canlı mod, analiz          |
| 10  | Optik okuma                        | Form üretimi, okuyucu, inceleme kuyruğu          |
| 11  | Yapay zekâ paketi                  | Üretim, OCR, çözüm, kalite kontrolü              |
| 12  | Sınıflar ve raporlar               | Öğrenci, karne, işbirliği                        |
| 13  | Faturalandırma ve pazarlama sitesi | Ödeme, planlar, açılış sayfası                   |
| 14  | Yakalama ekosistemi                | Uzantı, telefon, masaüstü yardımcı               |
| 15  | Sertleştirme ve yayın              | Güvenlik, erişilebilirlik, performans            |

MVP için 00 ile 06 arası yeterlidir (08'in hafif sürümüyle).

## Yerel kurulum

Gereksinimler: Node.js 20.9+ (bkz. `.nvmrc`), pnpm 10+, Docker Desktop (yalnızca
`pnpm db:start` için).

1. `pnpm install`
2. `.env.example` dosyasını `.env.local` olarak kopyala ve değerleri doldur.
3. `pnpm dev` → `http://localhost:3000` ve `http://localhost:3000/api/health`.

## Komutlar

Kökten çalıştırılır, Turborepo iş alanlarına dağıtır:

| Komut                                                             | Ne yapar                                                       |
| ----------------------------------------------------------------- | -------------------------------------------------------------- |
| `pnpm dev`                                                        | `apps/web` geliştirme sunucusu                                 |
| `pnpm build`                                                      | Üretim derlemesi                                               |
| `pnpm typecheck`                                                  | Her iş alanında `tsc --noEmit`                                 |
| `pnpm lint`                                                       | Tek kök ESLint yapılandırması, tüm depo                        |
| `pnpm check:design`                                               | Tasarım kuralı denetimi (`docs/03-tasarim-sistemi.md` bölüm 4) |
| `pnpm test`                                                       | Vitest birim ve özellik testleri                               |
| `pnpm test:e2e`                                                   | Playwright duman testi (`apps/web`)                            |
| `pnpm format` / `pnpm format:check`                               | Prettier                                                       |
| `pnpm db:start` / `db:stop` / `db:reset` / `db:types` / `db:test` | Supabase yerel yaşam döngüsü                                   |

Bir dilimi bitmiş saymadan önce `pnpm typecheck && pnpm lint && pnpm check:design && pnpm test
&& pnpm build` yeşil olmalı.

## Vercel yapılandırması

- Root Directory: `apps/web`. Framework: Next.js. `apps/web/vercel.json` içindeki
  `ignoreCommand`, `turbo-ignore` ile bu iş alanını etkilemeyen dağıtımları atlar.
- Ortam değişkenleri: `.env.example` listesi, Preview ve Production için ayrı ayrı girilir.
  `SUPABASE_SERVICE_ROLE_KEY` gibi sır değerler yalnızca Vercel panelinde durur.

## Docker gereksinimi

`pnpm db:start`, `db:reset` ve `db:test` Supabase CLI üzerinden yerel bir Postgres
kapsayıcısı başlatır ve Docker Desktop gerektirir. Bu depo şu an şema içermediği için
(dilim 01'de gelecek) bu komutlar Docker'sız bir makinede doğrulanamaz.
