# ADR 0001: Monorepo yapısı ve paket sürümleri

- Durum: Kabul edildi
- Tarih: 2026-09-29
- Kapsam: Dilim 00 (Temel ve iskelet)

## Bağlam

docs/02-mimari.md bölüm 3, `apps/web` ve beş `packages/*` paketinden oluşan bir depo
yapısı tanımlıyor ve `packages/*` içinde React/Next bağımlılığı olmamasını şart koşuyor
(yerleşim motoru ve OMR'ın Worker'da, Node testlerinde ve ileride masaüstünde yeniden
kullanılabilmesi için). Depo yönetimi için pnpm workspaces + Turborepo seçilmişti;
gerçekleştirme sırasında üç somut karar gerekti.

## Kararlar

### 1. pnpm + Turborepo

Vercel'in monorepo desteği ve pnpm'in workspace bağımlılık çözümü iyi eşleşiyor.
`pnpm-workspace.yaml`, `apps/*`, `packages/*` ve `scripts`'i kapsar. `turbo.json`
`build`, `typecheck`, `test`, `check:design` görevlerini tanımlar; `lint` görevi yok,
çünkü tek kök ESLint çalıştırması (aşağıya bak) Turborepo'nun iş alanı başına
çalıştırmasından daha hızlı ve tutarlı.

### 2. Paketler kaynaktan tüketilir (JIT internal packages)

Her `packages/*` paketi `exports: { ".": "./src/index.ts" }` ile TypeScript kaynağını
doğrudan sunar; ayrı bir `dist` derleme adımı yoktur. `apps/web`, bunları
`next.config.ts` içindeki `transpilePackages` ile derler. Gerekçe: beş paket henüz küçük,
sık değişecek ve tek bir uygulama tarafından tüketiliyor; ayrı derleme/izleme adımı bu
aşamada katma değer getirmez. Paketler büyüyüp bağımsız yayınlanmaları gerektiğinde
(örn. masaüstü yardımcısı, dilim 14) `tsup` ile gerçek derleme eklenir.

**Sonuç:** relative importlar `.js` uzantısı taşımaz (`moduleResolution: bundler`); bu,
NodeNext'in gerektirdiği `.js` uzantılı importlardan farklıdır ve Next'in Turbopack
derleyicisiyle doğrulanmıştır.

### 3. Tek kök ESLint yapılandırması

Flat config (ESLint 9) miras almadığı ve `@typescript-eslint` eklentisinin bir süreçte
yalnızca bir kez kaydedilebildiği için (eslint-config-next zaten kaydediyor), iş alanı
başına ayrı `eslint.config.mjs` yerine depo kökünde tek bir `eslint.config.mjs` kullanılır.
`projectService: true` her dosya için en yakın `tsconfig.json`'ı bulur, böylece tip
denetimli kurallar (`typescript-eslint` `recommendedTypeChecked`) her iş alanında geçerli
olur.

### 4. Sürüm kısıtları

TypeScript 6.0.3 ve ESLint 9.39.5 kullanılır; TypeScript 7.0.2 ve ESLint 10.x npm'de mevcut
ama lint zincirindeki peer bağımlılıklar henüz onları desteklemiyor
(`typescript-eslint@8` → `typescript <6.1.0`; `eslint-plugin-import@2`, bir
`eslint-config-next` bağımlılığı → `eslint ^9`). Ayrıntılar ve yükseltme koşulu
docs/backlog.md'de.

## Sonuçlar

- Yeni bir paket eklemek üç dosyayı kopyalamaktan ibarettir: `package.json`,
  `tsconfig.json`, `vitest.config.ts`.
- `packages/*` içine yanlışlıkla React/Next eklenmesi şu an yalnızca kod incelemesiyle
  yakalanır; otomatik bir denetim docs/backlog.md'de.
- Ekosistem TypeScript 7 ve ESLint 10'u desteklediğinde bu ADR'nin sürüm bölümü güncellenip
  yükseltme yapılmalı.
