# Frontend Görsel Tasarım — Stitch ekranlarının uygulanması

**Tarih:** 2026-09-12
**Kapsam:** Dilim 1'in altı ekranına (Bugün, Bugün boş durum, Geçmiş, Rekorlar, Giriş, Kayıt) Google
Stitch'te hazırlanan görsel tasarımın uygulanması: tasarım tokenları, uygulama kabuğu, font, ikonlar,
PWA ikonları ve tasarımın getirdiği birkaç küçük davranış.
**Durum:** ✅ Uygulandı (2026-09-13, `feature/frontend-tasarim`). Kullanıcı kararları: Stitch'te
üretilip revize edilen altı ekran onaylandı; stil yöntemi **Tailwind**. Uygulama sırasında verilen
kararlar ilgili maddelere "Uygulamada" notlarıyla işlendi.
**Bağlayıcılık:** Bu doküman bağlayıcıdır. Stitch çıktısı (`docs/design/stitch/*.html`) görsel
REFERANSTIR; ikisi çelişirse bu spec kazanır. Mimari spec
(`2026-09-12-frontend-react-pwa-design.md`) geçerliliğini korur; bu doküman yalnızca görsel katmanı ve
aşağıda açıkça sayılan davranış eklerini tanımlar.

## Kaynaklar

- `docs/design/stitch/`: `bugun.html`, `bugun-bos.html`, `gecmis.html`, `rekorlar.html`, `giris.html`,
  `kayit.html` — Stitch'in ürettiği prototip HTML'leri (Tailwind play CDN + satır içi config).
  İçlerindeki veriler (Barbell Bench Press, tarihler) sahtedir. Ekran görüntüleri sohbette paylaşıldı;
  repoda PNG yok.
- Stitch'in "Grind System" tasarım dokümanı repoya ALINMADI: metnindeki renkler (#0E0F12, #1C1F26,
  #F3F4F6…) ve köşe yarıçapları (16/24 px) koddaki gerçek değerlerle çelişiyor. Ekranlarda görülen ve
  onaylanan şey koddaki değerlerdir; aşağıdaki tokenlar oradan alındı.

---

## Karar 1 — Tailwind v4, derleme zamanında

- `tailwindcss` + `@tailwindcss/vite` (4.3.x; eklentinin peer aralığı `vite ^8`'i kapsıyor —
  doğrulandı). CSS-first yapılandırma: tokenlar `web/src/index.css` içinde `@theme` bloğunda; ayrı bir
  `tailwind.config.*` dosyası yok.
- Stitch'in kullandığı play CDN (`cdn.tailwindcss.com`) KULLANILMAZ: çalışma anında derleme yapar, bir
  üçüncü parti script'tir (mimari spec Karar 5'in XSS karşı önlemi "üçüncü parti script yok") ve
  çevrimdışı kırılır.
- Dilim 1'in "className yok / CSS yok" kuralı bu dilimle KALKAR. Yerine:
  - Stil yalnızca Tailwind yardımcı sınıfları ve `@theme` tokenlarıyla yazılır.
  - Satır içi `style=` yok. UI kütüphanesi (MUI, shadcn vb.) yok.
  - Keyfi değer (`bg-[#…]`, `text-[13px]`) yalnızca token karşılığı olmayan tek seferlik bir ölçü
    için ve yanında gerekçe yorumuyla.
- Tekrarlanan sınıf kümeleri (kart, alan, birincil düğme, rozet, hap) küçük React bileşenlerine
  çıkarılır — `@apply` ile CSS sınıfı üretmek yerine. Tek doğruluk kaynağı bileşendir (DRY).

## Karar 2 — Tokenlar: Stitch'in render ettiği değerler, okunur adlarla

Stitch'in Material adları okunaksız ve yanıltıcı: `primary` somon (#ffb5a0), asıl turuncu
`primary-container`. Kod okunur adlar kullanır. Eşleme:

| Token | Değer | Stitch adı | Kullanım |
|---|---|---|---|
| `bg` | #121316 | surface / background | sayfa zemini, başlık ve sekme çubuğu zemini |
| `inset` | #0d0e11 | surface-container-lowest | set ekle panelindeki alanların içi |
| `surface-1` | #1b1b1f | surface-container-low | egzersiz grubu kartı, auth kartı, Geçmiş/Rekorlar iç satırı |
| `surface-2` | #1f1f23 | surface-container | Geçmiş/Rekorlar kartı, Bugün set satırı, auth alanı |
| `surface-3` | #292a2d | surface-container-high | set ekle paneli, RIR hapı, numara karosu, açık kart başlığı, hesap düğmesi, logo karosu |
| `surface-4` | #343538 | surface-container-highest | vurgulu ikon karosu |
| `fg` | #e3e2e6 | on-surface | birincil metin |
| `muted` | #c5c6c8 | secondary | ikincil metin, birimler, pasif sekme |
| `accent` | #ff5722 | primary-container | bkz. renk kuralları |
| `on-accent` | #541200 | on-primary-container | `accent` dolgu üstündeki metin |
| `accent-soft` | #ffb5a0 | primary | koyu zemin üstünde vurgu METNİ/İKONU: bağlantılar, "× 3", açık rozet metni |
| `danger` | #ffb4ab | error | hata metni, hata ikonu, "Çıkış yap" |
| `danger-bg` | #93000a | error-container | hata kutusu zemini |
| `on-danger-bg` | #ffdad6 | on-error-container | hata kutusu metni |

Renk kuralları:
- `accent` yalnızca şurada kullanılır: birincil düğme dolgusu ("Set ekle", "Giriş yap", "Kayıt ol"),
  rekor rozeti dolgusu ("Ağırlık rekoru", "Tekrar rekoru", "En ağır set"), rekor kartı noktası, aktif
  sekme, marka işareti (logo karosundaki ve PWA ikonundaki dambıl); **dilim 3 genişlemesi (kullanıcı
  kararı):** hareket çizgi grafiğinin çizgisi, noktaları, alan degradesi ve değer etiketleri (accent
  dolgu + `on-accent` metin, opaklık yok) ile grafik sekmelerinde aktif sekmenin alt çizgisi — grafiğin
  ızgarası, eksen metni, özet etiketleri ve aralık seçici nötr kalır (bkz.
  `2026-09-14-acilir-panel-ve-cizgi-grafik-design.md` Karar 3); **#81 genişlemesi (kullanıcının turuncu
  ısı haritası referansı):** Takvim hücrelerinin set kademesi tonları — `bg-accent/20`, `/40`, `/60` üstünde
  gün numarası `fg` (ölçülen 11.2 / 7.7 / 5.2:1), tam `accent` üstünde `on-accent` (4.54:1) — ve Takvim
  görünüm sekmelerinin aktif alt çizgisi; boş hücre (`surface-2`), bugün ve seçili gün halkaları nötr.
  Başka hiçbir yer — hesap düğmesi
  dahil — accent almaz. Stitch'teki somon dolgulu hesap ikonu bir hataydı.
- `accent-soft` yalnızca metin ve ikon rengidir, asla dolgu değildir. Açık rozet zemini `bg-accent/20`.
- `accent` dolgu üstündeki metin her zaman `on-accent`. (Stitch'in Giriş düğmesindeki açık metin ~3:1
  kontrasta düşüyordu.)
- Kullanılmayan Stitch renkleri (tertiary, fixed, inverse, outline…) alınmaz; ileride bir ekran
  gerektirirse bu tabloya eklenir.

Tipografi (Inter; değerler Stitch config'iyle birebir):

| Token | Boyut / satır (px) | Ağırlık | Harf aralığı | Stitch adı — kullanım |
|---|---|---|---|---|
| `title` | 26 / 32 | 700 | -0.025em | headline-lg-mobile — sayfa başlıkları, auth markası |
| `heading` | 20 / 26 | 600 | -0.02em | headline-md — kart başlıkları, alan değerleri, üst başlıktaki kelime markası |
| `metric` | 28 / 32 | 700 | -0.02em | metric-val — ağırlık, tekrar, hacim |
| `body-lg` | 16 / 24 | 500 | — | body-lg |
| `body` | 14 / 20 | 400 | — | body-sm |
| `label` | 12 / 16 | 600 | 0.04em | label-md |
| `label-xs` | 10 / 12 | 700 | 0.06em | label-xs — yalnızca BÜYÜK HARFLİ kısa etiketler |

- Stitch'in `display-hero` (48 px) ve `headline-lg` (32 px) stilleri alınmaz: ilki yalnızca Stitch'in
  Giriş ekranındaydı ve ortak auth düzeni onu kullanmıyor, ikincisi hiçbir ekranda yok (YAGNI).
- Sayısal değerler (ağırlık, tekrar, hacim, set sayısı, tarih) `tabular-nums`.
- `label-xs` (10 px) cümle metninde kullanılmaz; hata ve ipucu cümleleri en az `label` (12 px).

Köşe: Stitch'in değerleri (4 / 8 / 12 px ve tam yuvarlak) Tailwind v4'ün varsayılan `rounded`,
`rounded-lg`, `rounded-xl`, `rounded-full` değerleriyle aynıdır; uygulamada doğrulanır, farklıysa
`@theme`'de sabitlenir.

Boşluk: Stitch'in adlı boşlukları (4 / 8 / 12 / 16 / 20 / 28 px) Tailwind v4'ün 4 px'lik varsayılan
ölçeğiyle zaten ifade ediliyor (`1`, `2`, `3`, `4`, `5`, `7`); ayrı boşluk tokenı tanımlanmaz (YAGNI).
Sayfa kenar boşluğu 16 px.

## Karar 3 — Font: Inter, uygulamanın içinde

- `@fontsource-variable/inter` (5.3.x). Google Fonts'tan çalışma anında YÜKLENMEZ: çevrimdışı salonda
  font gelmez ve kullanıcının IP'si üçüncü tarafa gider.
- Yalnızca `latin` ve `latin-ext` alt kümeleri paketlenir — Türkçe'nin ğ, ş, ı, İ harfleri
  `latin-ext`'tedir. Kiril, Yunan ve Vietnam alt kümeleri bundle'a ve precache'e girmez. Uygulamada:
  5.3.0 alt küme başına CSS sunmadığı için `index.css`'te iki `@font-face` kendimiz tanımladık; `src`
  paketin `files/inter-latin(-ext)-wght-normal.woff2` dosyalarına işaret eder, `unicode-range`
  değerleri paketin `wght.css`'inden birebir alındı.
- Font dosyaları service worker precache'ine eklenir (Workbox `globPatterns`'a `woff2`), böylece kabuk
  çevrimdışı açıldığında font da gelir. Bu, mimari spec'in R14 kararıyla çelişmez: precache'e giren
  kabuk varlığıdır, kullanıcı verisi değil.
- Yedek yığın: `"Inter Variable", ui-sans-serif, system-ui, sans-serif`.

## Karar 4 — İkonlar: lucide-react

- Stitch, Material Symbols'ı Google'ın font CDN'inden yüklüyor; font gelmezse (çevrimdışı) ikonun
  yerinde "calendar_today" gibi DÜZ YAZI görünür. Material Symbols'ın SVG paketi ise ya bir SVG
  yükleyici eklentisi ya da `dangerouslySetInnerHTML` gerektirir — ikincisi mimari spec Karar 5'in
  yasağıdır.
- `lucide-react` (1.45.x, React 19 uyumlu): ağaç-sallanabilir React bileşenleri, eklenti yok,
  çevrimdışı güvenli; çizgi stili Material Symbols Outlined'a yakın.
- Eşleme (adlar lucide-react 1.x'e göre doğrulanır; yeniden adlandırılmışsa en yakın karşılık):

| Stitch (Material) | lucide-react |
|---|---|
| calendar_today | `Calendar` |
| history | `History` |
| trophy | `Trophy` |
| person | `User` |
| logout | `LogOut` |
| check_circle | `CircleCheck` |
| add | `Plus` |
| unfold_more | `ChevronsUpDown` |
| expand_more / expand_less | `ChevronDown` / `ChevronUp` |
| chevron_left / chevron_right | `ChevronLeft` / `ChevronRight` |
| event | `CalendarDays` |
| bolt | `Zap` |
| local_fire_department | `Flame` |
| fitness_center | `Dumbbell` |
| alternate_email | `AtSign` |
| lock / lock_reset | `Lock` / `LockKeyhole` |
| visibility / visibility_off | `Eye` / `EyeOff` |
| error | `CircleAlert` |
| how_to_reg | `UserPlus` |

- Süs ikonları `aria-hidden`. Yalnızca ikondan oluşan düğmeler `aria-label` taşır.

## Karar 5 — Tema: yalnızca koyu

Tasarım ve referansların hepsi koyu; açık tema YOK (YAGNI). `color-scheme: dark` (yerel kontroller —
`<select>` açılır listesi, kaydırma çubuğu — koyu çizilsin), `<meta name="theme-color"
content="#121316">`, manifest'te `theme_color` ve `background_color` `#121316`.

## Karar 6 — Uygulama ikonu ve kurulabilirlik

- Tek SVG kaynak `web/public/icon.svg`: tam dolgu `bg` (#121316) zemin, ortada `accent` (#ff5722)
  dambıl — auth ekranlarındaki logo karosuyla aynı motif.
- `@vite-pwa/assets-generator` (1.0.x — `vite-plugin-pwa` 1.3'ün desteklediği peer aralığı `^1.0.0`)
  ile bir kerelik üretim: 64, 192, 512 PNG, 512 maskable, 180 apple-touch-icon ve 48 px favicon.
  Üretilen dosyalar commit edilir. Üretici derleme hattına girmez; bir npm betiği olarak durur
  (`npm run pwa:icons`).
- Uygulamada: üretici `maskable` ve `apple` için varsayılan olarak %30 BEYAZ dolgu ekler;
  `pwa-assets.config.ts` bu ikisini `padding: 0` ve `#121316` arka planla ezer (yoksa kurulan ikonun
  çevresinde beyaz bir halka görünür). Üç `pwa-*.png` üreticinin saydam %5 kenar payını korur; bunlar
  `purpose: any` ikonlarıdır, maskable değildir.
- Manifest'e `icons` eklenir → Chrome/Android "uygulama olarak yükle"yi sunar. Dilim 1'in "manifest'te
  ikon yok" devreden notu kapanır.

## Karar 7 — Stitch'ten BİLEREK alınmayanlar

| Stitch'te | Bizde | Neden |
|---|---|---|
| `maximum-scale=1.0, user-scalable=no` | viewport aynen kalır: `width=device-width, initial-scale=1, viewport-fit=cover` | yakınlaştırmayı kapatmak erişilebilirlik ihlali |
| her yerde `focus:outline-none` | görünür `focus-visible` halkası (2 px `accent`, 2 px ofset) | klavye kullanıcısı nerede olduğunu görmeli |
| hover ile görünen durumlar | hover yalnızca süs; hiçbir bilgi ya da işlev hover'a bağlı değil | dokunmatikte hover yok |
| tekrar ve RIR için `type="number"` | `type="text"` + `inputMode="numeric"` (mevcut) | `number` alanı "8.5" ya da "e" gibi girdileri tarayıcıya göre sessizce yutar; doğrulamamız metni okur |
| `animate-pulse`, `active:scale`, hata kutusu sallanması | yalnızca "Devam ediyor" noktası, o da `motion-safe:` altında | hareket hassasiyeti; geri kalanı süs |
| etkileşimsiz kartlarda `active:scale` | yok | dokunulabilir sanılır |
| düğmede JS ile "Eklendi" metni | görünür + canlı bölgeli durum satırı (Davranış 5) | düğmenin adını değiştirmek hem ekran okuyucuyu hem testleri karıştırır |
| Material Symbols ve Google Fonts CDN | Karar 3 ve 4 | çevrimdışı, gizlilik |
| `<a href="#">` ile "Çıkış yap" | `<button>` | eylem, gezinme değil |

## Karar 8 — Uygulama kabuğu (korumalı ekranlar)

- **Üst başlık** (sabit; `bg` %90 opak + blur; üst güvenli alan): solda "GRIND" kelime markası
  (`heading`, büyük harf); sağda tek hesap düğmesi (`surface-3` daire, `User` ikonu, `aria-label="Hesap
  menüsü"`). Düğme bir menü açar; menüde tek öğe "Çıkış yap" (`LogOut`, `danger` renk, `<button>`).
  Menü Escape ile ve dışarı dokununca kapanır. Mekanizma Popover API (`popover` + `popovertarget`) —
  2024'ten beri tüm büyük tarayıcılarda; ek JS gerektirmez.
- **Alt sekme çubuğu** (sabit; alt güvenli alan): Bugün (`Calendar`), Geçmiş (`History`), Rekorlar
  (`Trophy`); ikon + büyük harf `label-xs`. Aktif sekme `accent`, pasifler `muted`; `NavLink`'in
  `aria-current="page"`si korunur. Her hedef ≥ 44×44.
- İçerik başlığın ve sekme çubuğunun altında kalmayacak kadar üst ve alt boşluk alır.
- **Giriş ve Kayıt ekranlarında kabuk YOK** — ne başlık ne sekme çubuğu; oturum yokken gidilecek yer
  yok.

---

## Ekranlar

Her ekran için Stitch dosyası görsel referanstır; burada yazan düzeltmeler ve davranışlar bağlayıcıdır.

### Bugün (`bugun.html`)

- **Başlık satırı:** "Bugün" (`title`). Sağda "Antrenmanı bitir": küçük ikincil metin düğmesi
  (`CircleCheck` + `label`, `muted`, ≥ 44 px). "Set ekle"den UZAKTA durur — yanlışlıkla basılırsa
  sonraki set aynı gün yeni bir antrenman açar (backend böyle çalışır).
- **Durum satırı:** "Devam ediyor" hapı (`surface-3`; `muted` nokta, `motion-safe:animate-pulse`) ve
  "Başlangıç HH:mm" (mevcut `formatTrTime`).
- **Egzersiz grubu kartı** (`surface-1`, `rounded-xl`): başlıkta sıra numarası karosu (32 px,
  `surface-3`), egzersiz adı (`heading`), sağda "N SET" (`label-xs`, `muted`). Numara ve set sayısı
  ekrandaki listenin sunumudur (satır sayısı), sunucu hesabının tekrarı değildir.
- **Set satırı** (`surface-2`, `rounded-lg`):
  - solda "1. Set" (`label`, `muted`);
  - değer `metric`: "80" + küçük "kg" (`body`, `muted`) + ince "×" (`muted`, `font-light`) + "8";
  - rekor varsa değerin yanında rozet (`label-xs`, büyük harf, `accent` dolgu, `on-accent` metin):
    "AĞIRLIK REKORU" / "TEKRAR REKORU" — satır dar olduğunda rozet değerin altına sarar (Stitch de
    aynı `flex-wrap` yapısını kullanır);
  - sağda "RIR 2" hapı (`surface-3`, `label`, `muted`) — RIR yoksa hap yok.
- **Set ekle paneli:** sekme çubuğunun HEMEN üstünde sabit (`surface-3`, `rounded-xl`, gölge). İçinde:
  - egzersiz seçimi: tam genişlik, 48 px, `inset`, sağda `ChevronsUpDown`;
  - üç sütun alan — Ağırlık / Tekrar / RIR: üstte büyük harf `label-xs` etiketi, değer `heading`,
    sağda birim ("kg", "tekrar", "kalan"), zemin `inset`;
  - Davranış 5'in durum satırı;
  - "Set ekle" birincil düğmesi: 56 px, `Plus`.
- **Liste alt boşluğu:** liste, panelin ve sekme çubuğunun toplam yüksekliği kadar alt boşluk alır; son
  set her zaman kaydırılıp görülebilir. (Stitch'te son set panelin altında kalıyordu.)
- Alan davranışları DEĞİŞMEZ: ağırlık `inputMode="decimal"`, `,` ve `.` kabul; tekrar ve RIR
  `inputMode="numeric"`; başarılı gönderimden sonra değerler korunur, odak ağırlığa döner.

### Bugün — boş durum (`bugun-bos.html`)

- ~~Ortada: `surface-2` daire içinde `Dumbbell` (`muted`), "Bugün henüz antrenman yok" (`heading`), "İlk
  seti ekleyerek antrenmanı başlatın." (`body`, `muted`).~~ **#87 (kullanıcı kararı, 2026-09-15):** bu
  boş durum kaldırıldı; Bugün bir ana sayfa gibi en üstte Takvim (#81), altında "Şablonla başla" ile açılır.
  Durum hapı ve "Antrenmanı bitir" YOK.
- Set ekle paneli aynen. Alanlar BOŞ gelir; "0", "0", "—" yalnızca soluk yer tutucudur, değer değil —
  dolu bir "0" ile yanlışlıkla 0 kg'lık set kaydedilirdi (0 kg geçerli bir değer).

### Geçmiş (`gecmis.html`)

- Başlık "Geçmiş" (`title`). Stitch'in ilk sürümündeki "GÜNLÜK VE ARŞİV" etiketi ve alt başlık yok.
- **Antrenman kartı** (`surface-2`, `rounded-xl`). Özet satırı: `CalendarDays` (`muted` — turuncu
  DEĞİL) + tarih (`label`); altında "14 set" ve "6.240 kg" (`metric` + `label-xs` birim); sağda aç/kapa
  göstergesi (44 px karo, `ChevronDown` / `ChevronUp`). Açık kartın özet zemini `surface-3`.
- Aç/kapa mekanizması dilim 1'deki yerel `<details>` / `<summary>` olarak KALIR (R12); yalnızca görünümü
  değişir.
- **Açık içerik:** egzersiz başlığı (`body-lg`, 600) + "N SET" rozeti; set satırları (`surface-1`, ≥ 48
  px): sıra no, "80 kg × 8" (`body-lg`, `tabular-nums`), RIR hapı; rekorlu satırın altında rozet
  (`Zap` + "AĞIRLIK REKORU" / `Flame` + "TEKRAR REKORU", `rounded-full`, `accent`).
- **0 setlik antrenman:** kart %80 opak, değerler `muted`; açılınca "Bu antrenmanda set yok."
- **Sayfalama:** "Önceki" | ortada "Sayfa 1 / 4" + "24 antrenman" (`totalCount`, sunucudan) |
  "Sonraki". Düğmeler 52 px, `surface-2`. İlk ya da son sayfada ilgili düğme pasiftir ve pasif
  GÖRÜNÜR (`muted`, soluk).

### Rekorlar (`rekorlar.html`)

- Başlık "Rekorlar" + alt başlık "Kişisel en iyiler" (`body`, `muted`).
- **Egzersiz kartı** (`surface-2`, `rounded-xl`, etkileşimsiz): başlıkta `accent` nokta + ad (`heading`).
- **İki ayrı satır** (`surface-1`, `rounded-lg`):
  - "EN AĞIR SET" rozeti (`accent` dolgu, `on-accent` metin) + "· 02.09.2026" (`label-xs`, `muted`);
    değer "100 kg" (`metric`) + "× 3" (`body-lg`, 700, `accent-soft`).
  - "EN ÇOK TEKRAR" rozeti (`bg-accent/20`, `accent-soft` metin) + tarih; değer "15 tekrar" (`metric`)
    + "@ 60 kg" (`body`, `muted`).
- **Boş durum:** "Henüz rekor yok" — Bugün'ün boş durum diliyle (ortalı daire içinde `Trophy`, `muted`).

### Giriş ve Kayıt (`giris.html`, `kayit.html`)

Stitch'te iki ekran farklı düzende: Giriş'te dev sola yaslı "GRIND", Kayıt'ta ortalı logo karosu; alan
yükseklikleri 56 / 48 px; alan ikonu Giriş'te sağda, Kayıt'ta solda. TEK ortak düzen kullanılır (bir
`AuthLayout` bileşeni), temel alınan Kayıt'ın düzeni:

- **Üstte ortalı marka:** logo karosu (48 px, `surface-3`, `rounded-xl`, `accent` renkli `Dumbbell` —
  PWA ikonuyla aynı motif), "GRIND" (`title`, büyük harf), "Güç antrenmanı günlüğü" (`body`, `muted`).
- **Kart** (`surface-1`, `rounded-xl`, 16 px iç boşluk): başlık ("Giriş yap" / "Kayıt ol", `heading`);
  Kayıt'ta altında "Ağırlıklarını ve gelişimini anlık takip etmeye başla." (`body`, `muted`).
- **Alanlar:** etiket üstte (`label`, `fg`); 48 px alan (`surface-2`, `rounded-xl`, odakta `surface-3`);
  SOLDA süs ikonu (`AtSign` kullanıcı adı, `Lock` şifre, `LockKeyhole` şifre tekrarı); ipuçları altta
  (`label`, `muted`): "3–50 karakter (harf, rakam, _ ve -)", "En az 8 karakter".
- **Şifre alanlarında SAĞDA göster/gizle** düğmesi (44 px, `Eye` / `EyeOff`). Adı SABİTTİR ("Şifreyi
  göster"; Kayıt'taki şifre tekrarı alanında "Şifre tekrarını göster"), durum `aria-pressed` ile
  bildirilir — adı değiştirmek ve `aria-pressed` birlikte durumu iki kez duyururdu (ARIA toggle button
  kalıbı).
- **Birincil düğme** 52 px, `accent` / `on-accent` ("Kayıt ol"da `UserPlus` ikonu).
- **Genel hata:** `danger-bg` kutu, `CircleAlert` (`danger`), kalın başlık ("Giriş başarısız" / "Kayıt
  başarısız") + mesaj (`on-danger-bg`), `role="alert"`. Giriş 401'inin mesajı NÖTR kalır ("Kullanıcı adı
  veya şifre hatalı."). **Alan hatası:** alanın altında `label`, `danger`.
- **Altta geçiş bağlantısı:** "Hesabın yok mu? Kayıt ol" / "Zaten hesabın var mı? Giriş yap"
  (`accent-soft`, ≥ 44 px dokunma hedefi).
- Stitch revizelerinde zaten çıkarılanlar geri gelmez: "Şifremi unuttum" (uygulamada şifre sıfırlama
  yok), "Verileriniz yerel ve güvenli saklanır" (veri sunucuda), "Kullanıcı erişimi" hapı, oturum yokken
  başlık ikonları ve sekme çubuğu.

---

## Davranış değişiklikleri (görselin ötesinde — her biri testli)

1. **Şifre tekrarı (Kayıt).** Yeni alan; şifreyle eşleşmezse istek GİTMEZ, alanın altında "Şifreler
   eşleşmiyor." Neden: uygulamada şifre sıfırlama yok, kayıttaki bir yazım hatası hesabı kalıcı olarak
   kilitler. Sunucuya yine yalnızca `username` ve `password` gider; API sözleşmesi değişmez.
2. **Şifreyi göster/gizle** — Giriş'in ve Kayıt'ın şifre alanlarında.
3. **"Çıkış yap" hesap menüsüne taşınır** — sekme çubuğundan kalkar. Aynı `logout` kullanılır (sorgu
   önbelleği temizliği dahil).
4. **"Antrenmanı bitir" hatası gösterilir** (dilim 1'in devreden notu): istek başarısız olursa
   `role="alert"` ile mesaj; düğme yerinde kalır.
5. **Set eklenince görünür duyuru.** Panelde "Set ekle" düğmesinin üstünde bir durum satırı ("Eklendi:
   85 kg × 5", `label`, `muted`), `aria-live="polite"`. Neden: sabit panel listenin bir kısmını örttüğü
   için yeni satır ekranda görünmeyebilir; hem gören hem ekran okuyucu kullanan kullanıcı geri bildirim
   alır. Düğmenin adı DEĞİŞMEZ. Satır bir sonraki gönderime ya da hataya kadar durur.
6. **Metin:** "Bu oturumda set yok." → "Bu antrenmanda set yok." (uygulama her yerde "antrenman" der).

## Değişmeyenler

API katmanı, sorgular ve önbellek anahtarları, doğrulama kuralları (şifre tekrarı hariç), hata
ayrıştırma, TR saat biçimleme, sunucu hesabını istemcide tekrarlamama yasağı ve mimari spec'in bütün
kararları (R14 dahil: API yanıtları önbelleklenmez).

## Test ve doğrulama

- Mevcut 65 test yeşil kalır. Metni ya da yeri değişen yerlerde (çıkışın menüye taşınması, boş set
  metni) testler davranışı koruyarak güncellenir. Testler sınıf adı ya da renk sınamaz (Vitest
  `css: false`). Uygulama sonunda: 13 dosyada 71 test.
- Davranış değişikliklerinin (1-6) her biri için bir davranış testi.
- **Görsel doğruluk birim testle ölçülmez.** Her ekranın 390×844 ekran görüntüsü alınır ve aynı boyutta
  açılan Stitch dosyasının görüntüsüyle yan yana karşılaştırılır. Araç Playwright'tır, `npx` ile geçici
  çalıştırılır: projeye bağımlılık EKLENMEZ, CI'da yoktur. Mimari spec Karar 12'deki "uçtan uca test
  yok" kararı geçerlidir — bu bir test paketi değil, doğrulama aracıdır.
- **Kontrast** (WCAG AA — normal metin 4.5:1, büyük metin 3:1): `muted` her yüzeyde ≥ 7.17:1;
  `accent-soft`/`surface-2` ≈ 10:1; `on-accent`/`accent` ölçüldü **4.54:1** — sınırda, bu yüzden
  yalnızca kalın düğme ve rozet metninde kullanılır ve rozetlere opaklık ya da renk tonu UYGULANMAZ.
  Yer tutucular (2.71–3.46:1) bilerek soluktur; her alanın görünür bir etiketi vardır.

## Kapsam dışı

- Açık tema, yeni ekranlar (istatistik vb.), grafikler, "Devam ediyor" noktası dışında animasyon, yeni
  API ucu, backend değişikliği.
- Stitch dokümanındaki ama bu ekranlarda olmayan bileşenler (dönem seçici, stepper, "haptic" vb.).

## Riskler

- **jsdom Popover API'yi uygulamaz ve kapalı popover'ı kendi varsayılan stiliyle GİZLER**
  (`[popover]:not(:popover-open) { display: none }`, jsdom 30) → menüdeki "Çıkış yap" testte
  `{ hidden: true }` ile sorgulanır; testler yapıyı (`popovertarget`, düğmenin menüde olması) ve
  oturumun kapanmasını sınar, menünün açılmasını değil.
- **Görsel regresyon testlerle yakalanmaz** (`css: false`) → ekran görevleri bittikten sonra, final
  incelemeden ÖNCE, her ekranın ekran görüntüsü Stitch'le karşılaştırılır (kontrolcü görevi); sapmalar
  final düzeltme dalgasına girer. Her ekran görevinin kendi incelemesi ise kodu bu spec'e (tokenlar,
  sınıflar, yapı) göre denetler.
- **`@fontsource-variable/inter` alt küme yolu** sürüme göre değişebilir; hedef yalnızca latin +
  latin-ext'tir ve derleme çıktısında doğrulanır.
- **Stitch dosyalarındaki örnek veri sahtedir**; uygulama gerçek API verisini gösterir.
