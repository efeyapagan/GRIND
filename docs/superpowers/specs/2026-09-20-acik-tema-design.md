# Aydınlık (açık) tema — tasarım

Issue: [#178](https://github.com/efeyapagan/GRIND/issues/178). Bu belge, görsel tasarım spec'inin
([2026-09-12-frontend-gorsel-tasarim-design.md](2026-09-12-frontend-gorsel-tasarim-design.md))
**Karar 5'ini ("Tema: yalnızca koyu") geçersiz kılar**; diğer kararları olduğu gibi kalır. Karar 2'nin
token seti değişmez — yanına ikinci bir değer sütunu (açık varyant) eklenir.

CLAUDE.md "yeni bir görsel yön için kullanıcıya sor" diyor; bu belge o konuşmanın çıktısıdır.
Kullanıcı kararları: (1) bu dilim yalnızca `web/`, mobil sonraki bir issue'da; (2) varsayılan sistem
tercihi + elle seçim, tercih cihazda saklanır; (3) açık palet, Karar 2'nin dayandığı Material
şemasının aynı rollerinin açık varyantından türetilir — yeni bir Stitch çıktısı temel alınmaz.

## Karar 1 — Mekanizma: token'lar tema başına yeniden tanımlanır, bileşen kodu değişmez

Tailwind v4 yardımcıları renkleri `var(--color-*)` olarak yayar (`bg-surface-1` →
`background-color: var(--color-surface-1)`), opaklık ekleri dahil (`bg-accent/20` →
`color-mix(… var(--color-accent) …)`). Bu yüzden açık tema, **tek bir bileşene dokunmadan**
token'ları bir seçici altında yeniden tanımlamakla elde edilir.

- `web/src/index.css`'teki `@theme` bloğu **koyu** değerleri tutmaya devam eder (temel set).
- `@layer base` içinde `:root[data-theme='light']` bloğu, Karar 2'deki 14 rengin açık karşılığını ve
  `color-scheme: light` değerini verir. `:root[data-theme='dark']` yalnızca `color-scheme: dark` der
  (renkler zaten temel settir).
- `data-theme` **her zaman** yazılır — `light` ya da `dark`, hiçbir zaman boş kalmaz. "Sistem"
  seçiliyken değeri `matchMedia('(prefers-color-scheme: light)')` çözer ve bu sorgu dinlenir;
  kullanıcı işletim sistemi temasını uygulama açıkken değiştirirse ekran anında döner.
- Bu yüzden açık palet CSS'te **bir kez** yazılır. Alternatif (`@media (prefers-color-scheme: light)`
  + `:root[data-theme='light']`) aynı 14 satırı iki yere kopyalamayı gerektirirdi (DRY).

### İlk boyada sıçrama

Vite'ın modül script'i `defer` olduğu için React çalışana kadar sayfa temel setle (koyu) boyanır;
açık tema kullanıcısı her açılışta koyu bir kare görürdü. Bunu önlemek için `web/index.html`'in
`<head>`'ine küçük bir satır içi script konur: `localStorage`'daki tercihi okur, `data-theme`'i ve
`<meta name="theme-color">`'ı ilk boyadan **önce** yazar.

Asıl mantık `web/src/lib/tema.ts`'te yaşar; satır içi script onun minimal bir önceden-çalıştırmasıdır.
Bu bilinçli bir tekrardır (başka çaresi yok) ve her iki tarafta da yorumla işaretlenir: anahtar adı
(`grind.tema`) ve değerler tek yerde tanımlı olamaz, çünkü satır içi script bir modül içe aktaramaz.
Bir test, `index.html`'in anahtarı ve iki `theme-color` değerini `tema.ts`'teki sabitlerle aynı
tuttuğunu doğrular (bkz. Karar 6).

## Karar 2 — Açık palet

Karar 2'deki her token, dayandığı Material rolünün açık varyantını alır. Rol anlamı korunur: `inset`
koyu temada zeminden daha *koyu* bir çukurken, açık temada en *beyaz* yüzeydir
(`surface-container-lowest`).

| Token | Koyu (değişmez) | Açık | Rol |
|---|---|---|---|
| `bg` | #121316 | **#fdf8f6** | surface |
| `inset` | #0d0e11 | **#ffffff** | surface-container-lowest |
| `surface-1` | #1b1b1f | **#f8f2ef** | surface-container-low |
| `surface-2` | #1f1f23 | **#f2ece9** | surface-container |
| `surface-3` | #292a2d | **#ece6e3** | surface-container-high |
| `surface-4` | #343538 | **#e7e0dd** | surface-container-highest |
| `fg` | #e3e2e6 | **#1d1b1a** | on-surface |
| `muted` | #c5c6c8 | **#5b5654** | ikincil metin |
| `accent` | #ff5722 | **#ff5722** | marka turuncusu — iki temada AYNI |
| `on-accent` | #541200 | **#541200** | accent dolgu üstündeki metin — AYNI |
| `accent-soft` | #ffb5a0 | **#a03500** | vurgu metni/ikonu; koyuda açılır, açıkta koyulaşır |
| `danger` | #ffb4ab | **#ba1a1a** | hata metni |
| `danger-bg` | #93000a | **#ffdad6** | hata kutusu zemini |
| `on-danger-bg` | #ffdad6 | **#410002** | hata kutusu metni |

`accent` ve `on-accent` bilerek iki temada aynıdır: marka turuncusu dolgu olarak kullanılıyor ve
üstündeki metinle 4.54:1 veriyor — açık temada değiştirmek birincil düğmeyi ve rekor rozetini
markadan koparırdı. Karar 2'nin "accent yalnızca şurada kullanılır" listesi ve "accent dolgu
üstündeki metin her zaman `on-accent`" kuralı açık temada da aynen geçerlidir.

Ölçülen kontrastlar (WCAG 2.1, sRGB; hepsi metin için AA eşiği 4.5:1'in üstünde):

| Çift | Aralık (tüm yüzeyler) |
|---|---|
| `fg` | 13.16 – 17.16:1 |
| `muted` | 5.55 – 7.23:1 |
| `accent-soft` | 5.36 – 6.99:1 |
| `danger` (bg / surface-1) | 6.13 / 5.83:1 |
| `on-danger-bg` üstünde `danger-bg` | 13.26:1 |
| `on-accent` üstünde `accent` | 4.54:1 |
| Takvim ısı haritası `accent/20 · /40 · /60` üstünde `fg` | 11.83 / 9.50 / 7.75:1 |
| Açık rozet zemini (`accent/20`) üstünde `accent-soft` | 4.82 – 5.28:1 |

## Karar 3 — Odak halkası kendi token'ını alır: `focus`

Karar 7'nin görünür klavye odağı halkası bugün `accent` (2 px). Ölçüm, bu rengin **açık temada
yetersiz** olduğunu gösterdi: açık yüzeylerde 2.43 – 3.00:1, metin dışı öğeler için gereken 3:1'in
altında (en kötü hâl `surface-4` üstünde 2.43:1).

Bu yüzden halka `--color-focus` token'ını kullanır:

| Token | Koyu | Açık |
|---|---|---|
| `focus` | #ff5722 (3.88 – 6.10:1) | #a03500 (5.36 – 6.99:1) |

Koyu temada görünen hiçbir şey değişmez (değer `accent` ile aynı). Karar 2'nin accent kullanım
listesi genişlemez — halka oradan çıkıp kendi token'ına taşınır.

## Karar 4 — Tema seçimi: sistem varsayılan, elle ezilebilir, cihazda saklanır

- Tercihin üç değeri var: `sistem` (varsayılan) · `acik` · `koyu`. `localStorage` anahtarı
  `grind.tema` (mevcut `grind.oturum` deseniyle aynı); tanınmayan/eksik değer `sistem` sayılır.
- Seçici Profil › **Hesap** sekmesinde, "Antrenman hedefi" bölümünün yanında bir **Görünüm**
  bölümüdür: mevcut `SecimKutusu` bileşeniyle üç seçenekli tek bir `<select>`
  (`HaftalikHedefSecici` deseni — seçim anında uygulanır, ayrı "Kaydet" düğmesi yok).
- Backend **değişmez**: migration yok, endpoint yok. Tema bir cihaz tercihidir; `User` tablosuna
  yazmak hem migration hem de açılışta API yanıtını bekleyen (yani yanıp sönen) bir tema demekti.
  Cihazlar arası taşınması istenirse ayrı bir issue'da ele alınır.

## Karar 5 — PWA ve `theme-color`

- `<meta name="theme-color">` etkin temayla birlikte güncellenir (koyuda `#121316`, açıkta `#fdf8f6`) —
  hem satır içi script hem `tema.ts` bunu yapar.
- Manifest'teki `theme_color` / `background_color` **koyu kalır**. Bunlar kurulum ve açılış
  (splash) renkleridir, markanın kimliğidir ve çalışma anında değiştirilemezler; cihaz temasına göre
  iki manifest üretmek bu ölçekte gereksiz karmaşıklıktır (KISS).
- Uygulama ikonu (Karar 6) değişmez: koyu zeminli dambıl iki temada da aynı kalır.

## Karar 6 — Test

1. `web/src/lib/tema.test.ts` — saf mantık: tercih okuma (eksik/bozuk değer → `sistem`), yazma,
   `sistem` → etkin temaya çözümleme, sistem tercihi değişince etkin temanın değişmesi.
2. Tema seçicinin bileşen testi — seçim `document.documentElement`'in `data-theme` değerini ve
   saklanan tercihi değiştirir.
3. **Palet kontrast testi** — `index.css` okunur, iki token bloğu ayrıştırılır ve Karar 2/3'teki
   çiftler için kontrast oranları hesaplanarak eşiklerin (metin 4.5:1, halka 3:1) üstünde olduğu
   doğrulanır. Amaç: ileride bir renk elle değiştirilirse kontrast sessizce bozulmasın.
4. jsdom'da `window.matchMedia` yok — `web/src/test/setup.ts`'e, dinleyici ekleme/çıkarmayı da
   destekleyen bir stub eklenir.

## Karar 7 — Kapsam dışı: mobil bu dilimde koyu kalır

`mobile/` açık temayı bu işte almaz. Sebep maliyet: NativeWind SVG ikonlarına `className`'den renk
veremediği için `mobile/src/ui/renkler.ts`'teki `ikonRenk` **37 dosyada** modül seviyesinde sabit
olarak okunuyor; temaya duyarlı olması hepsinin bir hook'a geçmesini gerektirir. Bu, ayrı bir
issue'nun işidir ve yukarıdaki paleti hazır bulur.

`packages/shared/src/designTokens.ts` bu dilimde **değişmez** (koyu değerleri taşımaya devam eder);
mobil işi başladığında iki varyantı oraya taşımak o issue'nun kararıdır.

## Etkilenen dosyalar

| Dosya | Değişiklik |
|---|---|
| `web/src/index.css` | `--color-focus` eklenir; `:root[data-theme='light']` palet bloğu ve `color-scheme` kuralları; odak halkası `focus` token'ına geçer |
| `web/index.html` | `<head>`'e sıçramayı önleyen satır içi script |
| `web/src/lib/tema.ts` | yeni — tercih okuma/yazma, çözümleme, DOM'a uygulama, sistem dinleyicisi |
| `web/src/components/GorunumSecici.tsx` | yeni — Profil › Hesap'taki Görünüm seçicisi |
| `web/src/pages/ProfilePage.tsx` | "Görünüm" bölümü eklenir |
| `web/src/main.tsx` | açılışta temayı uygular ve sistem dinleyicisini kurar |
| `web/src/test/setup.ts` | `matchMedia` stub'ı |
| `docs/.../2026-09-12-frontend-gorsel-tasarim-design.md` | Karar 5'e "bu belgeyle geçersiz kılındı" notu |
