# Prompt 03: Kimlik, çalışma alanı, plan altyapısı

## Amaç
Kullanıcı kaydolup giriş yapabilsin, çalışma alanlarını ve rollerini yönetsin, plan sınırları ve kullanım sayaçları uygulamanın her yerinde tutarlı çalışsın.

## Önce oku
CLAUDE.md, docs/02 bölüm 5.6 ve 7, docs/01 bölüm 6, docs/03 (arayüz kuralları). Prompt 01'in şeması ve Prompt 02'nin bileşenleri hazır varsayılır.

## Başlamadan
Plan modunda başla; Supabase Auth ve `@supabase/ssr` için güncel resmi belgeyi doğrula (çerez yönetimi, sunucu/istemci ayrımı, Next'in güncel yönlendirme/ara katman adlandırması). Planı onayıma sun.

## Kapsam
1. **Auth:** e-posta bağlantısı/OTP ve Google girişi. Sunucu ve istemci Supabase yardımcıları, oturum yenileme, korumalı rotalar, çıkış. Tek bir sade giriş ekranı (kayıt ve giriş aynı akış). Hata metinleri Türkçe, ne olduğunu ve ne yapılacağını söyler.
2. **Hızlı ilk kullanım:** En fazla 3 kısa soru (rol: öğretmen/kurum, ders, sınıf düzeyi). Atlanabilir. Karşılama metni yok; sonunda doğrudan "Yeni test" eylemi.
3. **Çalışma alanı:** kişisel alan otomatik. Ek ekip alanı oluşturma, üst çubukta çalışma alanı değiştirici, roller (owner/admin/editor/viewer), üye davet (Resend ile e-posta, jeton hash'li, süreli), üye kaldırma, rol değiştirme, davet kabulü.
4. **Ayarlar sayfaları:** Profil; Çalışma alanı (ad, kurum adı, logo yükleme: imzalı URL ile `branding` kovasına); Üyeler; Plan ve kullanım (mevcut plan, `UsageMeter` ile kullanım, yükseltme notu; ödeme Prompt 13'te).
5. **Yetki katmanı:** `packages/shared` içinde `Entitlements` Zod şeması ve `can/limit` yardımcıları. Sunucuda `requireEntitlement(ws, key)` ve `requireRole(ws, roles)`. İstemcide `useEntitlement(key)`. Sınıra yaklaşınca satır içi `UpgradeNote`; kapatılamayan modal yok. Sayaç artırma `increment_usage` RPC ile.
6. **KVKK temelleri:** hesap silme talebi akışı, veri dışa aktarma isteği (şimdilik iş kaydı oluşturur), çerez onayı bileşeni (yalnızca zorunlu olmayan analitik için), gizlilik ve kullanım şartları sayfa iskeletleri (metni sen yazacaksın; yer tutucu ve "hukuki metin bekleniyor" notu).
7. **Denetim günlüğü:** üye ekleme/çıkarma, rol değişimi, plan değişimi `audit_log`'a yazılır.

## Testler
- Birim: yetki yardımcıları, Zod şemaları.
- E2E (Playwright): kayıt → ilk kullanım → çalışma alanı oluşturma → davet → rol kısıtları (viewer'ın yazamadığı doğrulanır). E-posta için yerel test ortamı (Supabase Inbucket) kullan.
- Sızıntı testi: istemci paketinde gizli anahtar veya servis rolü yok (derleme çıktısında arama yapan bir betik).

## Kabul kriterleri
- Uçtan uca giriş çalışır; korumalı rotalar oturumsuz erişime kapalı.
- İki çalışma alanı arasında veri karışmıyor (arayüzde ve RLS'de).
- Plan sınırı aşımı sunucuda reddediliyor ve arayüzde satır içi anlatılıyor.
- `pnpm typecheck && lint && check:design && test && test:e2e && db:test` yeşil.

## Yapma
- Ödeme kodu yazma (Prompt 13).
- Roller için istemci tarafı kontrole güvenme; sunucu ve RLS esas.
- Şifre saklama ekranı ekleme (parolasız akış).

## Bitirince
Akış diyagramı (kısa), karar notları, senin yapman gereken Google OAuth ve Resend ayar adımları.
