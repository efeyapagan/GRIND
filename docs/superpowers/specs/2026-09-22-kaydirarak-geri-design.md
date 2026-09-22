# Sol kenardan kaydırarak geri dönme — tasarım (#232)

Tarih: 2026-09-22 · Issue: #232 · Platformlar: web + mobil (backend değişmez)

## Sorun

Alt sayfalardan (Profil → Geçmiş, şablon düzenleme, Antrenman → Bitir…) bir önceki sayfaya dönmenin
yolu yok: mobil kabuk `Slot` kullandığı için iOS'un kenar kaydırması yok, kurulu PWA'da tarayıcı geri
düğmesi yok. Kullanıcı bir süre uygulamayı **telefonda web (PWA / mobil tarayıcı)** olarak kullanacak;
web tarafı dokunmatik öncelikli tasarlanır.

## Davranış (kullanıcı kararı: iOS'taki gibi kenar hareketi)

- Parmak **ekranın sol kenarındaki 32 px'lik şeritte** basılıp sağa itilince önceki sayfaya dönülür.
  Sayfanın ortasından başlayan kaydırma geri götürmez (issue metnindeki "her yerden" kullanıcı
  tarafından düzeltildi).
- Sürükleme sırasında sayfa içeriği parmakla birlikte sağa kayar (başlık ve alt menü sabit kalır).
  Bırakınca eşik geçildiyse sayfa kısa bir animasyonla dışarı kayar ve geri gidilir; geçilmediyse
  yerine oturur.
- Önceki sayfa yoksa (uygulama doğrudan alt sayfada açıldı) Ana Sayfa'ya (`/`) gidilir. Ana Sayfa'da
  hareket kapalıdır.
- Kenardan başlasa bile hareket ancak belirgin şekilde yatay VE sağa doğruysa devreye girer; dikey
  başlayan hareket o dokunuş boyunca geri hareketini tetiklemez (dikey kaydırma bozulmaz).
- Açık antrenmandan geri gitmek antrenmanı bitirmez (alt menü davranışıyla aynı).
- Açık bir modal varken hareket tetiklenmez. Sayfa içi açılır paneller (set paneli gibi) sayfanın
  parçasıdır, geri gitmeyi engellemez.
- Çakışmalar: şablon sürükleme (#118/#229), zorluk kadranı (#182) ve geçmiş kartı kenar şeridinden
  başlamaz; ayrı bir muafiyet işareti gerekmez (YAGNI). Kenara kadar uzanan tek yatay hareketli öğe
  mobildeki geçmiş satırıdır (aşağıda).
- Görünür metin yok; çeviri anahtarı eklenmez. Erişilebilirlik: mevcut gezinme yolları aynen kalır.

## Paylaşılan karar — `packages/shared/src/lib/geriKaydirma.ts`

Saf fonksiyonlar (`zorlukKadrani.ts` deseni), `package.json` `exports`'a eklenir; web'de
`web/src/lib/geriKaydirma.ts` yeniden dışa aktarır, testi yanında durur.

- `KENAR_GENISLIGI = 32` (px). `kenardanMi(x): boolean` — `x <= 32`.
- `YON_KARAR_ESIGI = 10` (px). `yonKarari(dx, dy): 'bekle' | 'geri' | 'yok'` — `|dx|` ve `|dy|`
  ikisi de eşiğin altındaysa `bekle`; `dx > |dy|` ise `geri`; aksi halde `yok`.
- `GERI_MESAFE_ORANI = 0.3`, `GERI_HIZ_ESIGI = 500` (px/sn).
  `geriGidilsinMi(dx, vx, genislik): boolean` — `dx > 0` ve (`dx ≥ genislik × 0.3` ya da
  `vx ≥ 500`).
- `geriHedefi(konum, gecmisVar): 'yok' | 'geri' | 'anaSayfa'` — `konum === '/'` ise `yok`;
  `gecmisVar` ise `geri`; değilse `anaSayfa`. İki platform aynı yönlendirme kararını verir.

## Web — `web/src/lib/useGeriKaydirma.ts` + `App.tsx`

`Kabuk` içinde `<main>`'e bağlanan bir hook; ek kütüphane yok, Pointer Events. Hook
`{ ref, isaretciler }` döner (`kaydirma.ts` deseni); `isaretciler` `onPointerDown/Move/Up/Cancel`
ve `onClickCapture`'dır.

- **Yalnızca dokunmatik/kalem:** `pointerType === 'mouse'` yok sayılır (masaüstünde tarayıcı geri
  düğmesi var; fareyle metin seçimi bozulmasın).
- **Başlangıç:** `pointerdown` `clientX` kenar şeridinde değilse, hedef bir `dialog` içindeyse ya da
  konum `/` ise dokunuş yok sayılır.
- **`touch-action: pan-y pinch-zoom`** `<main>`'de: dikey kaydırma ve yakınlaştırma tarayıcıda
  kalır, yatay hareket için tarayıcı `pointercancel` göndermez (iOS Safari dahil).
- **Tarayıcı sekmesinde** (standalone olmayan): kenar kaydırmasını tarayıcı/sistem de yakalayabilir.
  `pointercancel` gelirse hareket iptal edilir ve sayfa yerine oturur; gezinmeden hemen önce konum
  değişmişse (tarayıcı zaten geri gitti) ikinci kez gezinilmez.
- **Geçmiş var mı:** React Router `location.key !== 'default'` (ilk giriş `default` anahtarını taşır;
  yenilemede anahtar `history.state`'ten geri gelir). `geriHedefi` → `navigate(-1)` ya da
  `navigate('/')`.
- **Geri bildirim:** yön `geri` kararlaşınca (varsa) `setPointerCapture` alınır ve her
  `pointermove`'da `main.style.transform = translateX(dx)` ref üzerinden yazılır (her harekette React
  render'ı yok). Bu, dnd-kit'teki gibi "satır içi stil yok" kuralının hareket fiziği istisnasıdır —
  sabit bir sınıfla ifade edilemeyen çalışma anı sayısı. Bırakınca `transition` ile ya `0`'a döner ya
  da genişliğe kayar; dışarı kayma bitince (150 ms) gezinilir ve transform temizlenir. Hız son iki
  `pointermove`'dan (px/sn) hesaplanır.
- **Tıklama yutma:** geri hareketi başladıysa parmak kalkınca oluşan `click` bir kez capture fazında
  durdurulur (kaydırmayı bir düğmenin üstünde bitirmek o düğmeye basmasın).
- **`fixed` öğeler:** `transform` taşıyan öğe, içindeki `position: fixed` öğelerin kapsayıcısı olur.
  `main` içinde bugün tek `fixed` öğe `GeriAlSeridi`; `createPortal` ile `document.body`'ye taşınır,
  sürüklerken yerinde durur.

## Mobil — `mobile/app/(tabs)/_layout.tsx`

`Slot` korunur (başlık + alt menü kabuğu değişmez). `Stack` + `fullScreenGestureEnabled` seçilmedi:
yalnızca iOS'ta çalışır ve kabuğu yeniden kurar.

- `Slot`'u saran `View` → `Animated.View` + `GestureDetector`. `Gesture.Pan()`:
  `hitSlop({ left: 0, width: KENAR_GENISLIGI })` (yalnızca sol şeritte başlar),
  `activeOffsetX(YON_KARAR_ESIGI)` (yalnızca sağa), `failOffsetY([-YON_KARAR_ESIGI, YON_KARAR_ESIGI])`,
  `enabled(konum !== '/')`. `onUpdate` → `translateX = max(0, translationX)`; `onEnd` →
  `geriGidilsinMi(translationX, velocityX, genislik)`; evetse dışarı kayar, sonra JS'te
  `geriHedefi(konum, router.canGoBack())` → `router.back()` / `router.replace('/')`, translate
  sıfırlanır; hayırsa `withSpring(0)`.
- **`KaydirilabilirSatir`** (geçmiş, satır kenara kadar uzanır): kapalıyken `activeOffsetX(-10)`
  (yalnızca sola aktifleşir, sağa kaydırma kabuğa kalır), açıkken bugünkü gibi `[-10, 10]`.
- Modallar RN `Modal` (ayrı pencere) — doğal olarak muaf.

## Testler

- **Shared** `geriKaydirma.test.ts`: `kenardanMi`, `yonKarari` (bekle / sağa yatay / dikey / sola),
  `geriGidilsinMi` (mesafe eşiği, hız eşiği, sola hız), `geriHedefi` (`/`, geçmiş var, yok).
- **Web** `useGeriKaydirma.test.tsx` (jsdom, `pointerType: 'touch'`): kenardan sağa kaydırma geri
  gider; geçmiş yoksa `/`; sayfanın ortasından başlayan kaydırma tetiklemez; dikey hareket
  tetiklemez; kısa hareket yerine oturur; fare yok sayılır; `pointercancel` iptal eder; hareketten
  sonraki `click` yutulur.
- **Mobil**: Pan'in kendisi jest'te anlamlı sürülemez; karar shared testlerinde, hareket iki
  platformda gözle denenir.

## Bitti sayılmadan önce

İki platformda gözle: alt sayfada sol kenardan sağa kaydırınca önceki sayfa açılır; dikey kaydırma,
şablon sürükleme, geçmiş kartı kaydırması ve zorluk kadranı etkilenmez. Telefonda web (PWA) ayrıca
denenir. İki platformun testleri ve tip kontrolü yeşil.
