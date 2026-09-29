# Prompt 01: Veri tabanı, RLS, Storage, RPC

## Amaç
docs/02 bölüm 6'daki veri modelini Supabase Postgres'e migrasyonlarla kur. Güvenlik veri tabanında uygulanır: her tabloda RLS, her tablo için çapraz kiracı testi.

## Önce oku
CLAUDE.md, docs/02-mimari.md (bölüm 1, 5, 6, 7), docs/01 bölüm 6 (plan yetkileri).

## Başlamadan
Plan modunda başla. Tabloları bağımlılık sırasına göre 8–12 küçük migrasyona böl (kimlik/kiracı, plan/kullanım, dosyalar, müfredat, sorular, testler, sınıflar, çevrimiçi sınav, optik, yapay zekâ/genel). Planı yaz, onayımı bekle.

## Kapsam
1. **Uzantılar:** `pgcrypto`/uuid, `pg_trgm`, `vector` (pgvector), `pg_cron`. Kullanılabilirliği doğrula.
2. **Tablolar:** docs/02 bölüm 6'daki tüm tablolar. `text + check` kısıtları, dış anahtarlar, `on delete` davranışları (kiracı silinince temizlik, yumuşak silme yerleri), indeksler (`workspace_id`, sık sorgu desenleri, `tsvector` GIN, `pg_trgm`, `vector` HNSW veya IVFFlat seçimi gerekçesiyle).
3. **Tetikleyiciler:** `updated_at`; `auth.users` kaydında `profiles` + kişisel `workspaces` (kind personal) + `workspace_members` (owner) + `free` plan; `questions` güncellenince `question_revisions` ve `current_revision`; `tests.revision` artışı.
4. **Yardımcı fonksiyonlar:** `is_member(ws)`, `has_role(ws, roles[])` (security definer, sabit `search_path`, `(select auth.uid())` deseni). `tr_normalize(text)`: Türkçe küçük harf (İ→i, I→ı) ve aksan katlama, arama için; testleri olsun.
5. **RLS:** Her tabloda etkin, varsayılan reddet. Rol matrisi: viewer okur; editor içerik yazar; admin üye ve ayar yönetir; owner faturalandırma ve silme. Sistem verisi (müfredat, planlar) herkese salt okunur. Anonim rol hiçbir kiracı tablosuna erişemez. Her politika için kısa yorum.
6. **Storage:** kovalar `assets` (özel), `exports` (özel), `branding` (özel). Yol kuralı `{workspace_id}/{yıl}/{uuid}.{uzantı}`. Politikalar ilk klasör segmentini üyelikle doğrular. Boyut ve MIME sınırları kova düzeyinde.
7. **Yetki RPC'leri:** `get_entitlements(ws)`, `increment_usage(ws, metric, amount)` (atomik, limit aşımında hata), `spend_credits(ws, amount, reason, ref)` (atomik, defter kaydı).
8. **`apply_test_ops(test_id, base_revision, ops jsonb)`:** işlem türleri: `add_item`, `remove_item`, `move_item`, `set_correct`, `set_points`, `set_group`, `update_settings`, `update_title`. İyimser eşzamanlılık: `base_revision` uyuşmazsa güncel revizyon ve eksik işlemleri döndür. Yetki kontrolü içeride. Tek transaction.
9. **Seed:** `plans` (free, plus, pro, team; docs/01 bölüm 6 tablosundaki yetki anahtarlarıyla), örnek müfredat için küçük bir yer tutucu seed (gerçek MEB verisi Prompt 08'de resmi kaynaktan alınacak; uydurma kazanım yazma), geliştirme için demo verisi ayrı dosyada.
10. **Türler:** `pnpm db:types` ile TypeScript tipleri üret; `packages/shared` içinde Zod şemaları için temel (jsonb alanlarının şemaları: `TestSettings`, `Branding`, `Entitlements`, `QuestionOptions`, `AnswerKey`).

## Testler (zorunlu, pgTAP)
- Her kiracı tablosu için: iki kullanıcı, iki çalışma alanı; A'nın verisi B tarafından okunamaz, yazılamaz, silinemez (select/insert/update/delete).
- Rol matrisi: viewer yazamaz, editor üye ekleyemez, vb.
- Storage politikaları: başka kiracı yoluna yükleme/okuma reddedilir.
- `increment_usage` limit aşımı, `spend_credits` yetersiz bakiye, `apply_test_ops` çakışma davranışı.
- `tr_normalize` örnekleri ("İstanbul", "ISPARTA", "ığdır", "şeker").

## Kabul kriterleri
- `pnpm db:reset` sıfırdan temiz kurulur; `pnpm db:test` yeşil; `pnpm db:types` çalışır.
- RLS'siz tablo yok (bunu denetleyen bir pgTAP testi olsun).
- Panelden elle değişiklik gerektiren hiçbir şey yok.

## Yapma
- Servis rolü anahtarını istemci koduna koyma.
- Uydurma müfredat verisi ekleme.
- Yetki limitlerini fonksiyon içine sabit yazma; `plans.entitlements` okunur.

## Bitirince
Tablo listesi, politika matrisi özeti, çalıştırılan testlerin çıktısı, açık sorular.
