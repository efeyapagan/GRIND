# Çok dilli arayüz — dilim 1: ortak altyapı + web (#177)

Tarih: 2026-09-21 · Issue: #177 · Takip: #199 (AI yorumu / export dili)

## Amaç

Uygulama Türkçe ve İngilizce kullanılabilsin. Bugün web, mobil, `packages/shared` ve backend'deki
tüm kullanıcıya görünen metinler Türkçe ve gömülü; hiçbir yerde i18n kütüphanesi yok. Bu spec
yalnızca **dilim 1**'i tanımlar.

## Dilimler

| Dilim | Kapsam |
|---|---|
| **1 — bu spec** | `packages/shared`'de i18n altyapısı + **web** arayüzünün tamamı + tarih/saat/sayı biçimlerinin dile bağlanması. Mobil yalnızca altyapıyı başlatır, Türkçe sabit kalır. |
| 2 | Backend hata kodları: exception'lar ve DataAnnotations hataları `code` + `params` döner, istemci katalogdan çevirir. Eşleme `packages/shared`'de olduğu için web ve mobil birlikte kazanır. |
| 3 | Mobil arayüz metinleri + mobilde dil seçimi. |

Her dilim kendi başına `dev` → `master` akışından geçer.

## Verilen kararlar

- **Karar 1 — Backend dil bilmez (dilim 2 için bağlayıcı).** Sunucu makineye yönelik bir hata kodu ve
  parametre döner, metni istemci kendi kataloğundan üretir. Tek çeviri kaynağı istemci kataloğudur;
  ikinci bir C# `.resx` kataloğu açılmaz.
- **Karar 2 — Dil tercihi cihazda tutulur.** İlk açılışta cihaz/tarayıcı dili; Profil'den elle
  değiştirilebilir; `User` tablosuna alan eklenmez. Tema tercihiyle (#178) aynı gerekçe: açılışta
  API yanıtını bekleyen, yanıp sönen bir dil olmaz.
- **Karar 3 — i18next + react-i18next.** Web'de ve React Native'de aynı kütüphane; çoğul hâller,
  değişken yerleştirme hazır. Kendi katalog motorumuzu yazmıyoruz (test edilmiş kütüphane varken
  kendin yazma ilkesi); react-intl iki dil için ağır ve RN'de polyfill istiyor.
- **Karar 4 — AI yorumu ve AI-özet export Türkçe kalır.** Kapsam dışı, #199'da.
- **Karar 5 — Dilim 1'de sunucu hata detayı Türkçe görünebilir.** İngilizce arayüzde
  `ProblemDetails.detail` olduğu gibi gösterilmeye devam eder; dilim 2 kapatır. Bilerek kabul edildi.
- **Karar 6 — Kod tanımlayıcıları yeniden adlandırılmaz.** `YorumKarti`, `SablonFormu` gibi bileşen,
  dosya ve fonksiyon adları kullanıcıya görünmez; değiştirmek saf gürültü olur.

## Mimari

### `packages/shared/src/i18n/`

- **`tr.ts`** — tek doğruluk kaynağı. Ekran/alan bazında gruplanmış iç içe bir nesne (yaprakları `string`).
  Örnek gruplar: `ortak`, `giris`, `kayit`, `anaSayfa`, `antrenman`, `gecmis`, `rekorlar`,
  `sablonlar`, `olcumler`, `yorumlar`, `profil`, `takvim`, `grafik`, `hatalar`.
- **`en.ts`** — tipi `tr`'den türetilir: `Katalog` = `tr`'nin yapısıyla aynı, yaprakları `string`.
  Eksik ya da fazla anahtar `tsc -b`'de hata verir.
- **`i18n.ts`** — i18next örneği ve başlatıcı: `resources: { tr, en }`, `fallbackLng: 'tr'`,
  `supportedLngs: ['tr', 'en']`, `interpolation.escapeValue: false` (React zaten kaçırır).
  `CustomTypeOptions` modül genişletmesiyle `t('antrenman.bitir')` tiplidir; yanlış anahtar derlenmez.
  Çoğul hâller i18next'in `_one` / `_other` son ekleriyle; `Intl.PluralRules('tr')` da `one`/`other`
  ayırdığı için iki katalog aynı son ekleri taşır (Türkçede iki değer çoğu zaman aynı metindir).
- **`dil.ts`** — `export type Dil = 'tr' | 'en'` ve saf `dilAlgila(diller: readonly string[]): Dil`:
  listede desteklenen (`tr*` ya da `en*`) **ilk** dil kazanır; hiçbiri desteklenmiyorsa `en`
  (uluslararası kullanıcı için makul varsayılan); boş liste → `tr`.

### Paylaşılan yardımcılar metni ortak i18n örneğinden üretir

Bugün Türkçe metin üreten `packages/shared` yardımcıları (`VARSAYILAN_MESAJ`, `setGirdisi`
doğrulama mesajları, `rekorRozetiMetni`) gömülü metin yerine ortak i18n örneğinin `t`'sini çağırır
(`VARSAYILAN_MESAJ` sabiti `varsayilanMesaj()` fonksiyonu olur). Anahtar döndürmek yerine bunun
seçilme sebebi: `setGirdisi` hataları sunucudan gelen alan hatalarıyla aynı `Record<string, string>`'te
birleşiyor; anahtar döndürmek bu birleşmeyi iki ayrı tipe bölerdi. Mobil de aynı örneği başlattığı
için aynı metni alır.

### Biçimlendirme (`packages/shared/src/lib/format.ts`)

Saat dilimi `Europe/Istanbul`'da **kalır**: gün sınırları backend'de TR gününe göre çiziliyor, dil
değişince bir antrenman başka güne kaymamalı. Değişen yalnızca biçim:

| Bugün | Sonra | tr | en |
|---|---|---|---|
| `formatTrDate(iso)` | `formatTarih(iso, dil)` | `12.09.2026` | `12 Sep 2026` (ay adı yazılır; `09/12` gün/ay belirsizliği olmaz) |
| `formatTrTime(iso)` | `formatSaat(iso)` — dil almaz | `18:05` | `18:05` (24 saat, iki dilde aynı) |
| `formatKisaTarih(iso)` | `formatKisaTarih(iso, dil)` | `12 Eyl` | `12 Sep` |
| `formatAralik(a, b)` | `formatAralik(a, b, dil)` | `25 Ağu – 10 Eyl 2026` | `25 Aug – 10 Sep 2026` |
| `formatWeight(kg)` | `formatWeight(kg, dil)` | `61,25` | `61.25` |
| `formatFark(f)` | `formatFark(f, dil)` | `−32,5` | `−32.5` |

İngilizce tarihler gün-ay-yıl sırasıyla, `Intl`'in `formatToParts` parçalarından kurulur (ay kısaltması
`en-US`'ten: `Sep`; `en-GB` yeni ICU sürümlerinde `Sept` verdiği için kullanılmaz). Ayraç ve ondalık
için `en-US` sayı biçimi kullanılır. `trBugundenOnce` API parametresi ürettiği için dilden bağımsız
kalır. Takvimin ay ve gün başlığı (`ayBasligi`, `gunBasligi`: `September 2026`, `14 September`)
`Intl.DateTimeFormat`'tan gelir. Izgaradaki iki harfli hafta günü kısaltmaları (`Pt Sa Ça …` /
`Mo Tu We …`) katalogdadır: `Intl`'in Türkçe kısaltmaları (`Pzt Sal`) bugünkü arayüzü değiştirirdi.

### Web

- **`web/src/lib/dil.ts`** — `tema.ts` deseni: `DIL_ANAHTARI = 'grind.dil'`, `tercihiOku(): Dil | null`
  (geçersiz ya da yok → `null`), `etkinDil()` = saklanan tercih ?? `dilAlgila(navigator.languages)`,
  `diliDegistir(dil)` = kaydet + `i18n.changeLanguage` + `document.documentElement.lang` güncelle.
  `localStorage` erişimi try/catch içinde; hata → tercih yok sayılır.
- **Başlatma** — `main.tsx`'te i18n, ilk render'dan önce `etkinDil()` ile başlatılır (kaynaklar paket
  içinde, ağ isteği yok, yanıp sönme yok). `index.html`'deki `lang="tr"` başlangıç değeri olarak kalır,
  başlatma anında düzeltilir.
- **Dil seçimi** — Profil'de mevcut satır bileşenleriyle bir "Dil / Language" satırı: `Türkçe` /
  `English`. Seçenek adları her zaman kendi dilinde yazılır (kullanıcı yanlış dilde kalırsa geri
  dönebilsin). Yeni görsel dil yok; görsel tasarım spec'inin token'ları ve bileşenleri kullanılır.
- **Metinlerin taşınması** — kullanıcıya görünen her metin `useTranslation()`'ın `t`'sine taşınır:
  sayfa başlıkları (`pageTitle`), buton ve etiketler, `aria-label` / `title` öznitelikleri, boş
  durumlar, onay diyalogları, form doğrulama mesajları, toast/uyarılar.
- **Dil değişince sunucu verisi yeniden çekilmez** — değişen yalnızca istemci metni ve biçimi.
- **PWA manifesti** — uygulama adı `GRIND` iki dilde aynı; manifest değişmez.

### Mobil (dilim 1'deki tek dokunuş)

Paylaşılan yardımcılar artık anahtar döndürdüğü için mobil de i18n'i başlatır — dil `tr`'ye sabit
(`dilAlgila` çağrılmaz). Mobilde bu yardımcıları kullanan yerler `t(...)` ile sarılır; mobildeki
diğer gömülü metinler dilim 3'e kalır. Mobil testleri ve `tsc --noEmit` yeşil kalmalı.

## Hata durumları

- Katalogda bulunmayan bir anahtar tip düzeyinde imkânsızdır; çalışma anında i18next anahtarın kendisini
  gösterir (sessiz boş metin değil). `en`'de değer eksikse `tr`'ye düşer.
- `localStorage` erişilemezse (gizli pencere, engelli site verisi) tarayıcı dili kullanılır, seçim o
  oturumla sınırlı kalır; uygulama çökmez.
- Sunucu hata detayı dilim 1'de çevrilmez (Karar 5). İstemcinin kendi ürettiği varsayılan hata mesajı
  (`VARSAYILAN_MESAJ` karşılığı) çevrilir.

## Test

Test kurulumu (`web/src/test/setup.ts`) i18n'i `tr` ile başlatır ve her testten sonra `tr`'ye döndürür.
Böylece mevcut web testleri Türkçe metinle sorgulamaya devam eder ve yeniden yazılmaz.

Yeni testler, her biri tek bir davranışı sabitler:

1. **`dilAlgila`** — `['tr-TR','en']` → `tr`; `['en-US','tr']` → `en` (ilk desteklenen kazanır);
   `['de','tr']` → `tr`; `['de']` → `en`; `[]` → `tr`.
2. **Katalog tutarlılığı** — `tr` ve `en`'deki her anahtarın `{{değişken}}` kümesi aynı; hiçbir `en`
   değeri boş değil. (Anahtar eşitliğini tip kontrolü sağlar, bunları sağlayamaz.)
3. **Biçimlendirme** — `formatTarih` / `formatKisaTarih` / `formatAralik` / `formatWeight` iki dilde
   beklenen çıktıyı verir; UTC 21:30'daki bir an (TR'de ertesi gün 00:30) iki dilde de TR gününe düşer.
4. **Dil seçimi** — Profil'de `English` seçilince arayüz İngilizceye döner (örnek bir başlık) ve
   `localStorage`'a yazılır; yeniden başlatmada seçim korunur.
5. **Tarayıcı dili** — tercih yokken `navigator.languages = ['en-US']` ise uygulama İngilizce açılır.
6. **Unutulmuş metin taraması** — `web/src` altında test olmayan `.ts`/`.tsx` dosyalarında, yorum
   satırları dışında, JSX metni ya da string literal içinde Türkçe'ye özgü karakter
   (`çğıöşüÇĞİÖŞÜ`) kalırsa test kırılır ve dosya:satır listeler. Katalog `packages/shared`'de
   olduğu için taramaya girmez. Tip kontrolünün yakalayamadığı "çevirmeyi unuttum" hatasını yakalar.

Koşulacaklar: `npx vitest run` (web), `npm run typecheck` (web, `tsc -b`), mobilde `npm test` ve
`npx tsc --noEmit`.

## Kapsam dışı

- Backend hata kodları (dilim 2) ve mobil arayüz metinleri (dilim 3).
- AI yorumu ve AI-özet export dili (#199).
- İkiden fazla dil; sağdan sola yazım.
- Veritabanı, migration ve API değişikliği — bu dilimde yok.
- Egzersiz adları: global egzersizler zaten İngilizce seed edildi, kullanıcının kendi eklediği adlar
  çevrilmez.
