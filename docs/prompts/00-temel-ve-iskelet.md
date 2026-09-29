# Prompt 00: Temel ve iskelet

## Amaç
Testcim için üretime yakın bir monorepo iskeleti kur: araçlar, kalite kapıları, CI, ortam yapılandırması. Ürün arayüzü yazma; yalnızca boş ama çalışan bir kabuk olsun.

## Önce oku
CLAUDE.md, docs/02-mimari.md (bölüm 2, 3, 9), docs/03-tasarim-sistemi.md (bölüm 4).

## Başlamadan
Plan modunda başla. Kullanacağın her kütüphanenin güncel resmi belgesini ve kararlı sürümünü doğrula (Next.js, React, Tailwind, Supabase SSR, Vitest, Playwright, Turborepo). Sürümleri ve seçtiğin yolu kısa bir planda yaz, onayımı bekle.

## Kapsam
1. **Monorepo:** pnpm workspaces + Turborepo. Yapı docs/02 bölüm 3'teki gibi: `apps/web`, `packages/shared`, `packages/layout-engine`, `packages/renderers`, `packages/omr`, `packages/image-tools`, `supabase/`, `scripts/`, `.github/workflows/`. Paketler şimdilik yalnızca çalışan boş iskelet + tip dışa aktarımı + bir örnek birim testi içersin.
2. **apps/web:** Next.js App Router, TypeScript strict (`noUncheckedIndexedAccess` açık), Tailwind. Kök yerleşim `lang="tr"`. `next-intl` (veya eşdeğeri) ile i18n: `messages/tr.json` ve `messages/en.json`, varsayılan Türkçe. Sağlık ucu `/api/health`. Boş bir ana sayfa ("Testcim") yeterli.
3. **Kalite kapıları:** ESLint (typescript-eslint, react-hooks, import düzeni), Prettier, `simple-git-hooks` + `lint-staged`, commitlint (conventional commits), Vitest (paket ve web), Playwright (tek bir duman testi), `pnpm typecheck`.
4. **Tasarım kuralı denetimi:** `scripts/check-design-rules.ts` yaz ve `pnpm check:design` olarak bağla. docs/03 bölüm 4'teki kuralları uygular: emoji aralıkları, `gradient`, token dışı hex, `uppercase`, `tracking-wide|wider|widest`, `rounded-2xl|3xl`, `shadow-lg|xl|2xl`, yasak ikon adları. İzin listesi dosyası olsun (`scripts/design-allowlist.json`). Kendi birim testleri olsun (kural ihlali içeren örnek girdilerle).
5. **Ortam:** `.env.example` (ad ve açıklama, değer yok), `apps/web/src/lib/env.ts` içinde Zod ile ortam doğrulaması (sunucu ve istemci değişkenleri ayrı), gizli değişkenlerin istemciye sızmasını engelleyen yapı.
6. **Supabase:** `supabase init`, yerel yapılandırma, `pnpm db:start`, `db:reset`, `db:types`, `db:test` betikleri (henüz şema yok, betikler çalışsın).
7. **CI:** GitHub Actions: kurulum + önbellek, typecheck, lint, check:design, test, build. PR'larda çalışır. Ayrı bir iş olarak Playwright duman testi.
8. **Vercel:** `apps/web` kök dizin ayarı için `vercel.json` veya belgeyi (README) yaz; ignore build adımı. Güvenlik başlıkları (CSP taslağı, HSTS, Referrer-Policy, X-Content-Type-Options) `next.config` içinde.
9. **Sentry:** yalnızca kurulum ve DSN yoksa devre dışı kalan güvenli başlatma.
10. **Belgeler:** `README.md` (yerel kurulum adımları), `docs/backlog.md`, `docs/adr/0001-monorepo.md`. CLAUDE.md ve docs klasörünü olduğu gibi bırak.

## Kabul kriterleri
- Temiz klonda `pnpm install && pnpm dev` çalışır; `/` ve `/api/health` yanıt verir.
- `pnpm typecheck && pnpm lint && pnpm check:design && pnpm test && pnpm build` yeşil.
- CI ilk PR'da yeşil.
- `check:design` bilerek eklenen bir emoji veya gradyanı yakalıyor (test var).
- Depoda gizli anahtar yok; `.env.local` `.gitignore` içinde.

## Yapma
- Ürün ekranı, tasarım bileşeni veya iş mantığı yazma. Onlar sonraki dilimlerde.
- Belgelenmemiş sürüm/API varsayımı yapma.
- Emoji kullanma.

## Bitirince
Kısa rapor: kurulan sürümler, alınan kararlar, senin (kullanıcının) yapman gereken hesap/anahtar adımları.
