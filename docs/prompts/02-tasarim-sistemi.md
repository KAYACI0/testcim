# Prompt 02: Tasarım sistemi ve uygulama kabuğu

## Amaç
Testcim'in görsel dilini kodla: token'lar, temel bileşenler, desenler ve boş bir uygulama kabuğu. Sonuç sade, beyaz, profesyonel ve "yapay zekâ üretimi" görünmeyen bir arayüz olsun.

## Önce oku
CLAUDE.md ve docs/03-tasarim-sistemi.md'yi eksiksiz oku. Bu dilimin başarısı o belgeye sadakatle ölçülür. Mevcutsa `frontend-design` ve mnimalist uii yeteneğini/skill'ini kullan birlikte.

## Önce tasarım planı (kod yazmadan)
Kısa bir plan yaz: palet (docs/03'teki token'lar), tipografi, yerleşim kavramı (ASCII iskeletle), ilkeler. Sonra kendi planını docs/03'teki yasak listesine karşı incele; bir "genel şablon" izlenimi veren her yeri değiştir ve neyi neden değiştirdiğini söyle. Onayımdan sonra kodla.

## Kapsam
1. **Token katmanı:** CSS değişkenleri (`--surface`, `--canvas`, `--ink`, `--ink-2`, `--ink-3`, `--line`, `--line-strong`, `--accent`, `--accent-hover`, `--accent-tint`, `--ok`, `--err`, `--warn` ve tint'leri), boşluk, yarıçap (kontrol 6, panel 8, diyalog 12, kâğıt 2, küçük resim 3), yüzen katman gölgesi, hareket süreleri. Tailwind tema eşlemesi. Koyu tema için değişken yapısını hazırla ama koyu paleti yazma.
2. **Tipografi:** IBM Plex Sans `next/font` ile; Türkçe karakter test sayfası; ölçek ve satır yükseklikleri; sayılar için tabular-nums yardımcısı. Uygulama içinde büyük harf yok.
3. **Bileşenler** (Radix veya React Aria üzerine, tamamen özel stil): Button (birincil/ikincil/üçüncül), IconButton, Input, Textarea, Select, Combobox, Checkbox, Radio, Switch, Segmented, Tabs, Tooltip, Popover, Menu, Dialog, Sheet, Toast (seyrek), Table, Kbd, Badge (metin tabanlı), Progress (ince çizgi), EmptyState, InlineNotice, FormField. Her birinin varsayılan, hover, odak, etkin, devre dışı, yükleniyor, hata durumları.
4. **İkonlar:** Phosphor Light için ince bir `Icon` sarmalayıcı. Yasak isimleri tip düzeyinde ve `check:design` ile engelle.
5. **Desenler:** AppShell (sol ray 56 px daraltılabilir + üst çubuk), PageHeader, InspectorPanel, CommandPalette (Ctrl+K, yalnızca gezinme komutlarıyla), UsageMeter, UpgradeNote (satır içi), DataTable (sıralama, seçim, boş durum).
6. **Logo yuvası:** `<Logo />` ve `<LogoMark />` bileşenleri `public/brand/logo.svg` ve `mark.svg` dosyalarını okur; dosya yoksa düz metin "Testcim" gösterir. Logo tasarlama.
7. **`/design-system` sayfası** (yalnızca geliştirme ortamında): tüm bileşen ve durumlar, Türkçe örnek içerikle.
8. **Erişilebilirlik:** AA kontrast (token çiftlerini otomatik test et), görünür odak halkası (2 px, 2 px boşluk), tam klavye, `prefers-reduced-motion`, dokunma hedefleri.
9. **Ekran görüntüsü testleri:** Playwright ile `/design-system` için 1440, 1024, 390 genişliğinde referans görüntüler.

## Kabul kriterleri
- `pnpm check:design` temiz. Bileşenlerde ham hex yok.
- Kontrast testi geçiyor. Klavye ile tüm bileşenler kullanılabiliyor.
- Kendi eleştirin: docs/03 bölüm 8 kontrol listesini maddeleyerek raporla; bir "süs" çıkardığını göster.
- Sayfa beyaz baskın; renk yalnızca eylem, seçim ve durumda görünüyor.

## Yapma
- Hazır shadcn/ui görünümünü olduğu gibi bırakma. Gradyan, cam, kart ızgarası, büyük harf etiket, eyebrow, süs numaraları, `→` okları kullanma.
- Kıvılcım, sihirli değnek, robot, beyin, ampul simgeleri kullanma.
- Emoji kullanma.
- Süs animasyonu ekleme.

## Bitirince
Ekran görüntülerini (3 genişlik) ve eleştiri raporunu ver.
