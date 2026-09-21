# Çok Dilli Arayüz — Dilim 1 (ortak altyapı + web) Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web arayüzü Türkçe ve İngilizce kullanılabilsin; çeviri kataloğu ve biçimlendirme `packages/shared`'de, mobil de aynı altyapıyı (Türkçe sabit) başlatsın.

**Architecture:** i18next'in tek örneği `@grind/shared/i18n`'de başlatılır; `tr.ts` tek doğruluk kaynağıdır, `en.ts` onun tipini taşır. Bileşenler `react-i18next`'in `useTranslation()`'ını, bileşen dışı paylaşılan yardımcılar ortak örneğin `i18n.t`'sini kullanır. Tarih/sayı biçimlendiricileri açık bir `dil` parametresi alır; saat dilimi `Europe/Istanbul`'da kalır.

**Tech Stack:** i18next + react-i18next, React 19, Vite, Vitest + Testing Library (web), Jest + jest-expo (mobil), TypeScript `tsc -b`.

**Spec:** [docs/superpowers/specs/2026-09-21-coklu-dil-web-design.md](../specs/2026-09-21-coklu-dil-web-design.md)

## Global Constraints

- Desteklenen diller yalnızca `'tr' | 'en'`; `fallbackLng: 'tr'`.
- Dil tercihi cihazda: `localStorage` anahtarı `grind.dil`; `User` tablosuna / API'ye dokunulmaz. Backend bu dilimde DEĞİŞMEZ.
- Saat dilimi her biçimlendiricide `Europe/Istanbul` kalır.
- Bileşen/dosya/fonksiyon adları yeniden adlandırılmaz (spec Karar 6).
- Sunucudan gelen `ProblemDetails.detail` çevrilmez, olduğu gibi gösterilir (spec Karar 5).
- AI yorumu içeriği ve export metni kapsam dışı (#199).
- Görsel tasarım spec'i bağlayıcı: yalnızca mevcut token'lar ve `web/src/ui` bileşenleri; satır içi `style=`, Tailwind hazır renkleri, `@apply` yok.
- Mevcut web testleri Türkçe metinle sorgulamaya devam eder ve YENİDEN YAZILMAZ; test kurulumu dili `tr`'ye sabitler.
- `web/`'de tip kontrolü `npm run typecheck` (`tsc -b`) — `tsc --noEmit` değil. Mobilde `npx tsc --noEmit`.
- Commit mesajı Write aracıyla scratchpad'e yazılır, `git commit -F <dosya>` ile atılır (uzun Türkçe heredoc bash'i bozar); son satır `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Commit sonrası `git log -1 --format=%B` ile trailer doğrulanır.
- Branch: `feature/177-coklu-dil` (açık). Push/PR bu planın işi değil.

## Katalog kuralları (Görev 3, 5–8 için bağlayıcı)

- Anahtarlar ASCII, camelCase, Türkçe kelimelerle (repo üslubu): `antrenman.bitir`, `ortak.yukleniyor`.
- Üst gruplar ekran/alan bazındadır: `ortak`, `hatalar`, `rekor`, `setGirdisi`, `dil`, `kabuk` (App üst kabuğu ve sekme çubuğu), `giris`, `kayit`, `profil`, `antrenman`, `setler`, `anaSayfa`, `takvim`, `sablonlar`, `gecmis`, `hareketGecmisi`, `rekorlar`, `olcumler`, `yorumlar`.
- İki ya da daha fazla dosyada geçen metin (`Yükleniyor...`, `Vazgeç`, `Kaydet`, `Sil`, `Geri al`) `ortak` altına girer; aynı metin iki anahtarda tekrarlanmaz.
- Sayıya bağlı metin çoğul anahtarla yazılır: `gunSayisi_one` + `gunSayisi_other`, çağrı `t('takvim.gunSayisi', { count: n })`. İKİ katalog da `_one` ve `_other` taşır (Türkçede metinler çoğunlukla aynıdır).
- Değişken yerleştirme `{{ad}}` ile; tr ve en aynı değişken kümesini taşımak zorunda (katalog testi zorlar).
- Modül seviyesindeki etiket dizileri (ör. `Takvim.tsx`'teki `GORUNUMLER`) metin yerine anahtar tutar ve `as const` ile tanımlanır; `t(...)` render anında çağrılır. Modül seviyesinde `t` ÇAĞRILMAZ (dil değişince güncellenmez).
- `aria-label`, `title`, `placeholder`, `alt`, onay diyaloğu metinleri, `usePageTitle(...)` başlıkları da çevrilir.
- İngilizce metinler kısa ve doğal olur: `Ağırlık rekoru` → `Weight PR`, `Tekrar rekoru` → `Reps PR`, `Antrenmanı bitir` → `Finish workout`, `Şablon` → `Template`, `Tekrar` → `Reps`, `Ağırlık` → `Weight`, `Set` → `Set`, `RIR` → `RIR`, `Tahmini 1RM` → `Est. 1RM`, `Hacim` → `Volume`, `Yorumlar` → `Insights`, `Ölçümler` → `Measurements`, `Rekorlar` → `Records`, `Geçmiş` → `History`, `Bugün` → `Today`.
- Türkçe karakter içermeyen Türkçe metinler (`Kaydet`, `Sil`, `Ekle`, `Hesap`, `Set ekle`) de çevrilir: tarama testi bunları yakalayamaz, dosya baştan sona okunarak bulunur.

## Dosya Haritası

**Yeni**
- `packages/shared/src/i18n/dil.ts` — `Dil` tipi, `DILLER`, saf `dilAlgila`.
- `packages/shared/src/i18n/tr.ts` — Türkçe katalog, `Katalog` tipi.
- `packages/shared/src/i18n/en.ts` — İngilizce katalog (`Katalog` tipinde).
- `packages/shared/src/i18n/i18n.ts` — i18next örneği, `i18nBaslat`, `useDil`, tip genişletmesi.
- `web/src/lib/dil.ts` — web dil tercihi (`localStorage`), `etkinDil`, `diliDegistir`.
- `web/src/components/DilSecici.tsx` — Profil'deki dil seçimi.
- Testler: `web/src/lib/dilAlgila.test.ts`, `web/src/lib/katalog.test.ts`, `web/src/lib/dil.test.ts`, `web/src/components/DilSecici.test.tsx`, `web/src/lib/cevrilmemisMetin.test.ts`.

**Değişen**
- `packages/shared/package.json` (exports + peerDependencies), `web/package.json`, `mobile/package.json`, kök `package-lock.json`.
- `packages/shared/src/lib/format.ts`, `packages/shared/src/lib/takvim.ts`, `packages/shared/src/lib/rekor.ts`, `packages/shared/src/lib/setGirdisi.ts`, `packages/shared/src/api/problem.ts`, `packages/shared/src/lib/apiErrors.ts`.
- `web/src/test/setup.ts`, `web/src/main.tsx`, `web/src/lib/format.test.ts`, `web/src/lib/takvim.test.ts`.
- `mobile/app/_layout.tsx`, `mobile/jest.setup.js` ve mobilde biçimlendirici çağıran bileşenler (Görev 2).
- `web/src` altındaki tüm kullanıcıya metin gösteren `.tsx` dosyaları (Görev 5–8).

---

### Task 1: i18n çekirdeği, bağımlılıklar ve başlatma

**Files:**
- Create: `packages/shared/src/i18n/dil.ts`, `packages/shared/src/i18n/tr.ts`, `packages/shared/src/i18n/en.ts`, `packages/shared/src/i18n/i18n.ts`
- Modify: `packages/shared/package.json`, `web/package.json`, `mobile/package.json`, `package-lock.json`, `web/src/test/setup.ts`, `mobile/app/_layout.tsx`, `mobile/jest.setup.js`
- Test: `web/src/lib/dilAlgila.test.ts`, `web/src/lib/katalog.test.ts`

**Interfaces:**
- Produces:
  - `@grind/shared/i18n` → `i18n` (i18next örneği), `i18nBaslat(dil: Dil): void`, `useDil(): Dil`, `dilAlgila(diller: readonly string[]): Dil`, `DILLER: readonly Dil[]`, `type Dil = 'tr' | 'en'`
  - `@grind/shared/i18n/tr` → `tr`, `type Katalog`
  - `@grind/shared/i18n/en` → `en: Katalog`

- [ ] **Step 1: Bağımlılıkları kur**

Kök dizinde:

```bash
npm install i18next react-i18next -w web -w mobile
```

Sonra `packages/shared/package.json`'a kurulan sürümlerle `peerDependencies` ekle (sürümleri `web/package.json`'dan kopyala) ve `exports`'a üç giriş ekle:

```json
"./i18n": "./src/i18n/i18n.ts",
"./i18n/tr": "./src/i18n/tr.ts",
"./i18n/en": "./src/i18n/en.ts",
```

```json
"peerDependencies": {
  "@tanstack/react-query": "^5.0.0",
  "i18next": "<web/package.json'daki sürüm aralığı>",
  "react": "^19.0.0",
  "react-i18next": "<web/package.json'daki sürüm aralığı>"
}
```

- [ ] **Step 2: Başarısız testleri yaz**

`web/src/lib/dilAlgila.test.ts`:

```ts
import { dilAlgila } from '@grind/shared/i18n';

test('listede desteklenen ilk dil kazanir', () => {
  expect(dilAlgila(['tr-TR', 'en'])).toBe('tr');
  expect(dilAlgila(['en-US', 'tr'])).toBe('en');
  expect(dilAlgila(['de', 'tr'])).toBe('tr');
});

test('desteklenen dil yoksa Ingilizce, liste bossa Turkce', () => {
  expect(dilAlgila(['de'])).toBe('en');
  expect(dilAlgila([])).toBe('tr');
});
```

`web/src/lib/katalog.test.ts`:

```ts
import { tr } from '@grind/shared/i18n/tr';
import { en } from '@grind/shared/i18n/en';

type Dugum = { [anahtar: string]: string | Dugum };

function yapraklar(dugum: Dugum, onEk = ''): Map<string, string> {
  const sonuc = new Map<string, string>();
  for (const [anahtar, deger] of Object.entries(dugum)) {
    const yol = onEk ? `${onEk}.${anahtar}` : anahtar;
    if (typeof deger === 'string') {
      sonuc.set(yol, deger);
    } else {
      for (const [altYol, altDeger] of yapraklar(deger, yol)) {
        sonuc.set(altYol, altDeger);
      }
    }
  }
  return sonuc;
}

const degiskenler = (metin: string) =>
  [...metin.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((eslesme) => eslesme[1]).sort();

const trYapraklari = yapraklar(tr);
const enYapraklari = yapraklar(en);

// Anahtar esitligini tip kontrolu (en: Katalog) saglar; bu iki testin yakaladigini saglayamaz.
test('her anahtar iki dilde ayni {{degisken}} kumesini tasir', () => {
  const uyusmayanlar = [...trYapraklari]
    .filter(([yol, metin]) => degiskenler(metin).join() !== degiskenler(enYapraklari.get(yol) ?? '').join())
    .map(([yol]) => yol);
  expect(uyusmayanlar).toEqual([]);
});

test('hicbir Ingilizce metin bos degil', () => {
  const boslar = [...enYapraklari].filter(([, metin]) => metin.trim() === '').map(([yol]) => yol);
  expect(boslar).toEqual([]);
});
```

- [ ] **Step 3: Testlerin başarısız olduğunu gör**

Run (web/ içinde): `npx vitest run src/lib/dilAlgila.test.ts src/lib/katalog.test.ts`
Expected: FAIL — `@grind/shared/i18n` çözümlenemiyor.

- [ ] **Step 4: Çekirdeği yaz**

`packages/shared/src/i18n/dil.ts`:

```ts
/** Desteklenen arayuz dilleri (#177). Yeni bir dil eklemek bu tipi, DILLER'i ve kataloglari degistirir. */
export type Dil = 'tr' | 'en';

export const DILLER: readonly Dil[] = ['tr', 'en'];

/**
 * Tarayici/cihaz dil listesinden (`navigator.languages` sirasiyla) arayuz dilini secer: listede
 * desteklenen ILK dil kazanir -- `['en-US', 'tr']` Ingilizce ister. Hic desteklenen yoksa
 * uluslararasi kullanici icin Ingilizce; liste bossa (bilgi yok) uygulamanin ana dili Turkce.
 */
export function dilAlgila(diller: readonly string[]): Dil {
  if (diller.length === 0) {
    return 'tr';
  }
  for (const dil of diller) {
    const ana = dil.toLowerCase().split('-')[0];
    if (ana === 'tr' || ana === 'en') {
      return ana;
    }
  }
  return 'en';
}
```

`packages/shared/src/i18n/tr.ts` (bu görevde çekirdek anahtarlar; sonraki görevler kendi gruplarını ekler):

```ts
/**
 * Turkce katalog -- TEK dogruluk kaynagi (#177). `en.ts` bu nesnenin tipini tasir; eksik ya da
 * fazla anahtar `tsc -b`'de hata verir. Anahtar kurallari: docs/superpowers/plans/2026-09-21-coklu-dil-web.md.
 */
export const tr = {
  ortak: {
    yukleniyor: 'Yükleniyor...',
  },
  hatalar: {
    beklenmeyen: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
  },
};

export type Katalog = typeof tr;
```

`packages/shared/src/i18n/en.ts`:

```ts
import type { Katalog } from './tr';

export const en: Katalog = {
  ortak: {
    yukleniyor: 'Loading...',
  },
  hatalar: {
    beklenmeyen: 'Something went wrong. Please try again.',
  },
};
```

`packages/shared/src/i18n/i18n.ts`:

```ts
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import type { Dil } from './dil';
import { tr } from './tr';
import { en } from './en';

export { i18n };
export { dilAlgila, DILLER, type Dil } from './dil';

// `t('antrenman.bitir')` tipli olsun: yanlis anahtar derlenmez (spec, Mimari).
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof tr };
  }
}

/**
 * Ortak i18next ornegini baslatir (web: main.tsx, mobil: _layout.tsx, testler: kurulum dosyalari).
 * Kaynaklar paketin icinde oldugu icin baslatma senkrondur -- ag istegi ve yanip sonen dil yok.
 * Iki kez cagrilirsa yalnizca dili degistirir.
 */
export function i18nBaslat(dil: Dil): void {
  if (i18n.isInitialized) {
    void i18n.changeLanguage(dil);
    return;
  }
  void i18n.use(initReactI18next).init({
    resources: { tr: { translation: tr }, en: { translation: en } },
    lng: dil,
    fallbackLng: 'tr',
    supportedLngs: ['tr', 'en'],
    interpolation: { escapeValue: false },
    initAsync: false,
  });
}

/** Etkin arayuz dili; dil degisince bileseni yeniden render eder (biçimlendiricilere verilir). */
export function useDil(): Dil {
  const { i18n: ornek } = useTranslation();
  return ornek.language === 'en' ? 'en' : 'tr';
}
```

> Kurulan i18next sürümü `initAsync`'i tanımıyorsa (`tsc -b` hata verir), yerine `initImmediate: false` yaz — ikisi aynı işi yapar, eski sürümün adı budur.

- [ ] **Step 5: Test kurulumunda i18n'i başlat**

`web/src/test/setup.ts`'in sonuna:

```ts
import { i18n, i18nBaslat } from '@grind/shared/i18n';

// #177: mevcut testler Turkce metinle sorgular -- dil her testte Turkceye sabitlenir, bir testin
// sectigi dil digerine sizmaz.
i18nBaslat('tr');
afterEach(() => {
  void i18n.changeLanguage('tr');
});
```

(`import` satırını dosyanın üstündeki diğer import'ların yanına taşı.)

- [ ] **Step 6: Mobilde başlat**

`mobile/app/_layout.tsx` — import'lara `import { i18nBaslat } from '@grind/shared/i18n';` ekle ve `const sorguIstemcisi = new QueryClient();` satırının altına:

```ts
// #177 dilim 1: paylasilan yardimcilar metni ortak i18n orneginden uretir; mobil arayuz dilim 3'e
// kadar Turkce sabit.
i18nBaslat('tr');
```

`mobile/jest.setup.js` sonuna:

```js
require('@grind/shared/i18n').i18nBaslat('tr');
```

- [ ] **Step 7: Testleri ve tip kontrolünü koştur**

Run (web/): `npx vitest run src/lib/dilAlgila.test.ts src/lib/katalog.test.ts` → PASS
Run (web/): `npm test` → tümü PASS
Run (web/): `npm run typecheck` → hata yok
Run (mobile/): `npm test` ve `npx tsc --noEmit` → PASS / hata yok

- [ ] **Step 8: Commit**

```bash
git add packages/shared web/package.json mobile/package.json package-lock.json web/src/test/setup.ts web/src/lib/dilAlgila.test.ts web/src/lib/katalog.test.ts mobile/app/_layout.tsx mobile/jest.setup.js
git commit -F <scratchpad>/commit.txt   # "feat(i18n): ortak i18next cekirdegi ve katalog iskeleti (#177)"
```

---

### Task 2: Biçimlendiriciler dile bağlanır

**Files:**
- Modify: `packages/shared/src/lib/format.ts`, `packages/shared/src/lib/takvim.ts`
- Modify (çağrı yerleri, web): `web/src/components/GecmisKarti.tsx`, `web/src/pages/InsightsPage.tsx`, `web/src/pages/MeasurementsPage.tsx`, `web/src/pages/RecordsPage.tsx`, `web/src/components/DevamEdenAntrenman.tsx`, `web/src/pages/AntrenmanPage.tsx`, `web/src/components/HareketGecmisi.tsx`, `web/src/components/Takvim.tsx`, `web/src/components/AddSetForm.tsx`, `web/src/components/SetList.tsx`, `web/src/components/SetSatiri.tsx`, `web/src/ui/CizgiGrafik.tsx`
- Modify (çağrı yerleri, mobil): `mobile/src/components/GecmisKarti.tsx`, `mobile/app/(tabs)/insights.tsx`, `mobile/app/(tabs)/profile/measurements.tsx`, `mobile/app/(tabs)/profile/records.tsx`, `mobile/src/components/DevamEdenAntrenman.tsx`, `mobile/app/(tabs)/antrenman.tsx`, `mobile/src/components/HareketGecmisi.tsx`, `mobile/src/components/Takvim.tsx`, `mobile/src/components/AddSetForm.tsx`, `mobile/src/components/SetList.tsx`, `mobile/src/components/SetSatiri.tsx`, `mobile/src/ui/CizgiGrafik.tsx`
- Test: `web/src/lib/format.test.ts`, `web/src/lib/takvim.test.ts`

**Interfaces:**
- Consumes: `Dil`, `useDil()` (Task 1)
- Produces (eski adlar KALDIRILIR, yeniden dışa aktarılmaz):
  - `formatTarih(iso: string, dil: Dil): string` (eski `formatTrDate`)
  - `formatSaat(iso: string): string` (eski `formatTrTime`; dil almaz)
  - `formatKisaTarih(iso: string, dil: Dil): string`
  - `formatAralik(ilkIso: string, sonIso: string, dil: Dil): string`
  - `formatWeight(kg: number, dil: Dil): string`
  - `formatFark(fark: number, dil: Dil): string`
  - `ayBasligi(gun: string, dil: Dil): string`, `gunBasligi(gun: string, dil: Dil): string`
  - `trBugundenOnce` değişmez.

- [ ] **Step 1: Mevcut testleri yeni imzaya çevir ve İngilizce testleri ekle**

`web/src/lib/format.test.ts`'te import'u `formatTarih, formatSaat` olarak değiştir; mevcut her çağrıya `'tr'` ekle (`formatTrDate(x)` → `formatTarih(x, 'tr')`, `formatTrTime(x)` → `formatSaat(x)`, `formatWeight(82.5)` → `formatWeight(82.5, 'tr')`, `formatKisaTarih(x)` → `formatKisaTarih(x, 'tr')`, `formatAralik(a, b)` → `formatAralik(a, b, 'tr')`, `formatFark(f)` → `formatFark(f, 'tr')`); beklenen değerler AYNI kalır. Sona ekle:

```ts
test('Ingilizce tarih ay adiyla ve TR gunune gore yazilir', () => {
  // UTC 21:30 -> TR 00:30, ERTESI GUN -- dil degisince gun kaymaz.
  expect(formatTarih('2026-03-10T21:30:00Z', 'en')).toBe('11 Mar 2026');
  expect(formatKisaTarih('2026-09-12T08:00:00Z', 'en')).toBe('12 Sep');
  expect(formatAralik('2026-08-25T08:00:00Z', '2026-09-10T08:00:00Z', 'en')).toBe('25 Aug – 10 Sep 2026');
  expect(formatAralik('2026-12-20T08:00:00Z', '2027-01-05T08:00:00Z', 'en')).toBe('20 Dec 2026 – 5 Jan 2027');
});

test('Ingilizce sayilar nokta ondalikla yazilir', () => {
  expect(formatWeight(61.25, 'en')).toBe('61.25');
  expect(formatWeight(80, 'en')).toBe('80');
  expect(formatFark(-32.5, 'en')).toBe('−32.5');
});
```

`web/src/lib/takvim.test.ts`'te `ayBasligi`/`gunBasligi` çağrılarına `'tr'` ekle ve sona:

```ts
test('Ingilizce ay ve gun basligi', () => {
  expect(ayBasligi('2026-09-14', 'en')).toBe('September 2026');
  expect(gunBasligi('2026-09-14', 'en')).toBe('14 September');
});
```

(`ayBasligi`/`gunBasligi` o dosyada henüz import edilmiyorsa import'a ekle.)

- [ ] **Step 2: Başarısız olduğunu gör**

Run (web/): `npx vitest run src/lib/format.test.ts src/lib/takvim.test.ts`
Expected: FAIL — `formatTarih` export edilmiyor.

- [ ] **Step 3: `format.ts`'i yaz**

Dosyanın üstüne `import type { Dil } from '../i18n/dil';` ekle. `tarihParcalariniAl` ve `TR_ZAMAN_DILIMI` kalır. `formatTrDate`, `formatTrTime`, `formatKisaTarih`, `formatWeight`, `formatAralik`, `formatFark`'ı şunlarla değiştir (açıklayıcı yorumlar korunur):

```ts
/** Sayi bicimi: Turkcede ondalik virgul, Ingilizcede nokta. */
const SAYI_YERELI: Record<Dil, string> = { tr: 'tr-TR', en: 'en-US' };

export function formatTarih(iso: string, dil: Dil): string {
  const { gun, ay, yil } = tarihParcalariniAl(iso);
  if (dil === 'tr') {
    return `${gun}.${ay}.${yil}`;
  }
  // "09/12" gun/ay belirsizligi yerine ay adi (spec, Bicimlendirme).
  return `${formatKisaTarih(iso, 'en')} ${yil}`;
}

export function formatSaat(iso: string): string {
  const bicimlendirici = new Intl.DateTimeFormat('en-GB', {
    timeZone: TR_ZAMAN_DILIMI,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return bicimlendirici.format(new Date(iso));
}

/**
 * Grafik ekseni icin kisa tarih ("12 Eyl" / "12 Sep"), TR gunune gore. Ingilizcede ay kisaltmasi
 * `en-US`'ten alinir ve gun-ay sirasiyla elle dizilir: `en-GB` yeni ICU surumlerinde "Sept" verir.
 */
export function formatKisaTarih(iso: string, dil: Dil): string {
  if (dil === 'tr') {
    return new Intl.DateTimeFormat('tr-TR', {
      timeZone: TR_ZAMAN_DILIMI,
      day: 'numeric',
      month: 'short',
    }).format(new Date(iso));
  }
  const parcalar = new Intl.DateTimeFormat('en-US', {
    timeZone: TR_ZAMAN_DILIMI,
    day: 'numeric',
    month: 'short',
  }).formatToParts(new Date(iso));
  const bul = (tur: string) => parcalar.find((parca) => parca.type === tur)?.value ?? '';
  return `${bul('day')} ${bul('month')}`;
}

export function formatWeight(kg: number, dil: Dil): string {
  // (mevcut yorum aynen kalir)
  return kg.toLocaleString(SAYI_YERELI[dil], {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatAralik(ilkIso: string, sonIso: string, dil: Dil): string {
  const ilkYil = tarihParcalariniAl(ilkIso).yil;
  const sonYil = tarihParcalariniAl(sonIso).yil;
  const ilkMetin =
    ilkYil === sonYil ? formatKisaTarih(ilkIso, dil) : `${formatKisaTarih(ilkIso, dil)} ${ilkYil}`;
  return `${ilkMetin} – ${formatKisaTarih(sonIso, dil)} ${sonYil}`;
}

export function formatFark(fark: number, dil: Dil): string {
  if (fark === 0) {
    return '0';
  }
  return `${fark > 0 ? '+' : '−'}${formatWeight(Math.abs(fark), dil)}`;
}
```

- [ ] **Step 4: `takvim.ts`'i yaz**

`import type { Dil } from '../i18n/dil';` ekle; `AY_BICIMI`, `GUN_BICIMI`, `ayBasligi`, `gunBasligi`'yı şununla değiştir:

```ts
const AY_BICIMI: Record<Dil, Intl.DateTimeFormat> = {
  tr: new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', month: 'long', year: 'numeric' }),
  en: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' }),
};
const GUN_BICIMI: Record<Dil, Intl.DateTimeFormat> = {
  tr: new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', day: 'numeric', month: 'long' }),
  en: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long' }),
};

/** "Eylül 2026" / "September 2026" */
export function ayBasligi(gun: string, dil: Dil): string {
  return AY_BICIMI[dil].format(tarihe(gun));
}

/** "14 Eylül" / "14 September" */
export function gunBasligi(gun: string, dil: Dil): string {
  return GUN_BICIMI[dil].format(tarihe(gun));
}
```

- [ ] **Step 5: Testlerin geçtiğini gör**

Run (web/): `npx vitest run src/lib/format.test.ts src/lib/takvim.test.ts` → PASS

- [ ] **Step 6: Çağrı yerlerini güncelle (web ve mobil)**

Yukarıdaki "Modify (çağrı yerleri)" dosyalarının her birinde, biçimlendiriciyi çağıran bileşenin gövdesinin başına `const dil = useDil();` ekle (`import { useDil } from '@grind/shared/i18n';`) ve çağrıya `dil` geçir; `formatTrDate` → `formatTarih(..., dil)`, `formatTrTime` → `formatSaat(...)`. Çağrı bir bileşen dışındaki yardımcı fonksiyondaysa `dil`'i o fonksiyona parametre olarak geçir (bileşen dışında `useDil` çağrılmaz). Mobilde de `useDil()` kullan: bugün hep `'tr'` döner, dilim 3'te ek iş gerekmez. Listeyi doğrula:

```bash
grep -rnwE 'formatTrDate|formatTrTime' web/src mobile/src mobile/app packages/shared/src
```

Expected: çıktı yok.

- [ ] **Step 7: Tüm doğrulama**

Run (web/): `npm test` → PASS; `npm run typecheck` → hata yok
Run (mobile/): `npm test` → PASS; `npx tsc --noEmit` → hata yok

- [ ] **Step 8: Commit** — `"feat(i18n): tarih ve sayi bicimleri dile baglandi (#177)"`

---

### Task 3: Paylaşılan yardımcıların metni katalogdan gelir

**Files:**
- Modify: `packages/shared/src/api/problem.ts`, `packages/shared/src/lib/apiErrors.ts`, `packages/shared/src/lib/setGirdisi.ts`, `packages/shared/src/lib/rekor.ts`, `packages/shared/src/i18n/tr.ts`, `packages/shared/src/i18n/en.ts`
- Test: `web/src/lib/katalog.test.ts` (yeni test yok — mevcut Türkçe testler davranışı zaten sabitliyor; bu görev saf taşımadır)

**Interfaces:**
- Consumes: `i18n` (Task 1)
- Produces: `varsayilanMesaj(): string` (`@grind/shared/api/problem`; `VARSAYILAN_MESAJ` sabiti KALDIRILIR). `rekorRozetiMetni`, `setGirdisiniDogrula` imzaları değişmez.

- [ ] **Step 1: Katalog anahtarlarını ekle**

`tr.ts`'e:

```ts
  rekor: {
    agirlik: 'Ağırlık rekoru',
    tekrar: 'Tekrar rekoru',
  },
  setGirdisi: {
    agirlikGerekli: 'Ağırlık girilmeli.',
    agirlikSayiOlmali: 'Ağırlık geçerli bir sayı olmalı.',
    tekrarGerekli: 'Tekrar sayısı girilmeli.',
    tekrarTamSayiOlmali: 'Tekrar sayısı tam sayı olmalı.',
    rirTamSayiOlmali: 'RIR tam sayı olmalı.',
  },
```

`en.ts`'e:

```ts
  rekor: {
    agirlik: 'Weight PR',
    tekrar: 'Reps PR',
  },
  setGirdisi: {
    agirlikGerekli: 'Enter a weight.',
    agirlikSayiOlmali: 'Weight must be a valid number.',
    tekrarGerekli: 'Enter the reps.',
    tekrarTamSayiOlmali: 'Reps must be a whole number.',
    rirTamSayiOlmali: 'RIR must be a whole number.',
  },
```

- [ ] **Step 2: Yardımcıları çevir**

`problem.ts`: `VARSAYILAN_MESAJ` sabitini kaldır, yerine:

```ts
import { i18n } from '../i18n/i18n';

/** Istemcinin kendi urettigi genel hata metni; cagrildigi andaki arayuz dilinde. */
export function varsayilanMesaj(): string {
  return i18n.t('hatalar.beklenmeyen');
}
```

ve dosyadaki üç `VARSAYILAN_MESAJ` kullanımını `varsayilanMesaj()` yap. `apiErrors.ts`'te import'u ve kullanımı aynı şekilde değiştir.

`setGirdisi.ts`: `import { i18n } from '../i18n/i18n';` ekle; beş metni `i18n.t('setGirdisi.agirlikGerekli')` … `i18n.t('setGirdisi.rirTamSayiOlmali')` ile değiştir.

`rekor.ts`: `import { i18n } from '../i18n/i18n';` ekle; `'Ağırlık rekoru'` → `i18n.t('rekor.agirlik')`, `'Tekrar rekoru'` → `i18n.t('rekor.tekrar')`.

Kontrol:

```bash
grep -rn "VARSAYILAN_MESAJ" web/src mobile packages/shared/src --include=*.ts --include=*.tsx
```

Expected: çıktı yok.

- [ ] **Step 3: Doğrulama**

Run (web/): `npm test` → PASS (Türkçe beklentiler aynı kalır); `npm run typecheck` → hata yok
Run (mobile/): `npm test` → PASS; `npx tsc --noEmit` → hata yok

- [ ] **Step 4: Commit** — `"refactor(i18n): paylasilan yardimcilarin metni katalogdan (#177)"`

---

### Task 4: Web dil tercihi ve Profil'deki dil seçici

**Files:**
- Create: `web/src/lib/dil.ts`, `web/src/components/DilSecici.tsx`
- Modify: `web/src/main.tsx`, `web/src/pages/ProfilePage.tsx`, `web/src/test/setup.ts`, `packages/shared/src/i18n/tr.ts`, `packages/shared/src/i18n/en.ts`
- Test: `web/src/lib/dil.test.ts`, `web/src/components/DilSecici.test.tsx`

**Interfaces:**
- Consumes: `i18n`, `dilAlgila`, `useDil`, `Dil` (Task 1)
- Produces: `web/src/lib/dil.ts` → `DIL_ANAHTARI = 'grind.dil'`, `dilTercihiniOku(): Dil | null`, `etkinDil(): Dil`, `diliUygula(dil: Dil): void`, `diliDegistir(dil: Dil): void`; `DilSecici` varsayılan export.

- [ ] **Step 1: Başarısız testleri yaz**

`web/src/lib/dil.test.ts`:

```ts
import { DIL_ANAHTARI, diliDegistir, etkinDil } from './dil';

afterEach(() => {
  localStorage.removeItem(DIL_ANAHTARI);
  vi.restoreAllMocks();
});

test('tercih yokken tarayici dili Ingilizce ise Ingilizce acilir', () => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US']);
  expect(etkinDil()).toBe('en');
});

test('secilen dil saklanir ve yeniden acilista tarayici dilini ezer', () => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['tr-TR']);
  diliDegistir('en');
  expect(localStorage.getItem(DIL_ANAHTARI)).toBe('en');
  expect(document.documentElement.lang).toBe('en');
  expect(etkinDil()).toBe('en');
});
```

`web/src/components/DilSecici.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DilSecici from './DilSecici';
import { DIL_ANAHTARI } from '../lib/dil';

afterEach(() => localStorage.removeItem(DIL_ANAHTARI));

test('English secilince arayuz Ingilizceye doner', async () => {
  render(<DilSecici />);

  await userEvent.selectOptions(screen.getByLabelText('Dil'), 'en');

  expect(screen.getByLabelText('Language')).toHaveValue('en');
});
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run (web/): `npx vitest run src/lib/dil.test.ts src/components/DilSecici.test.tsx`
Expected: FAIL — `./dil` bulunamıyor.

- [ ] **Step 3: Katalog anahtarları**

`tr.ts`'e `dil: { etiket: 'Dil', turkce: 'Türkçe', ingilizce: 'English' },` ; `en.ts`'e `dil: { etiket: 'Language', turkce: 'Türkçe', ingilizce: 'English' },`. (Seçenek adları iki dilde de kendi dilinde yazılır: yanlış dilde kalan kullanıcı geri dönüşü okuyabilsin.)

- [ ] **Step 4: `web/src/lib/dil.ts`**

```ts
import { dilAlgila, i18n, type Dil } from '@grind/shared/i18n';

/**
 * Arayuz dili tercihi (#177; spec Karar 2). Tercih CIHAZDA saklanir (`localStorage`), sunucuya
 * gitmez -- tema tercihiyle (tema.ts) ayni gerekce. Tercih yoksa tarayici dili kullanilir.
 * `localStorage` erisilemezse (gizli pencere, engelli site verisi) tercih yok sayilir, uygulama
 * cokmez; secim o oturumla sinirli kalir.
 */
export const DIL_ANAHTARI = 'grind.dil';

export function dilTercihiniOku(): Dil | null {
  try {
    const saklanan = localStorage.getItem(DIL_ANAHTARI);
    return saklanan === 'tr' || saklanan === 'en' ? saklanan : null;
  } catch {
    return null;
  }
}

export function etkinDil(): Dil {
  return dilTercihiniOku() ?? dilAlgila(navigator.languages ?? [navigator.language]);
}

/** Dili ekrana uygular: i18next + `<html lang>` (ekran okuyucular ve tarayici ceviri onerisi icin). */
export function diliUygula(dil: Dil): void {
  void i18n.changeLanguage(dil);
  document.documentElement.lang = dil;
}

export function diliDegistir(dil: Dil): void {
  try {
    localStorage.setItem(DIL_ANAHTARI, dil);
  } catch {
    // Saklanamadiysa secim bu oturumla sinirli kalir.
  }
  diliUygula(dil);
}
```

- [ ] **Step 5: `web/src/components/DilSecici.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import { useDil, type Dil } from '@grind/shared/i18n';
import SecimKutusu from '../ui/SecimKutusu';
import { diliDegistir } from '../lib/dil';

/** Profil'deki dil secimi (#177). Secim hemen uygulanir ve cihazda saklanir. */
export default function DilSecici() {
  const { t } = useTranslation();
  const dil = useDil();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="dil-secimi" className="text-label text-muted">
        {t('dil.etiket')}
      </label>
      <SecimKutusu id="dil-secimi" value={dil} onChange={(olay) => diliDegistir(olay.target.value as Dil)}>
        <option value="tr">{t('dil.turkce')}</option>
        <option value="en">{t('dil.ingilizce')}</option>
      </SecimKutusu>
    </div>
  );
}
```

- [ ] **Step 6: Başlatma ve Profil**

`web/src/main.tsx`: import'lara `import { i18nBaslat } from '@grind/shared/i18n';` ve `import { etkinDil } from './lib/dil';` ekle; `temayiTazele();` satırından önce:

```ts
// #177: dil ilk render'dan once cozulur -- kaynaklar paketin icinde, yanip sonen dil yok.
const dil = etkinDil();
i18nBaslat(dil);
document.documentElement.lang = dil;
```

`web/src/pages/ProfilePage.tsx`: `HaftalikHedefSecici` bölümünün hemen altına (çıkış düğmesinden önce):

```tsx
<section className="flex flex-col gap-3 rounded-xl bg-surface-1 p-4">
  <DilSecici />
</section>
```

ve `import DilSecici from '../components/DilSecici';`.

`web/src/test/setup.ts`'teki `afterEach`'e `document.documentElement.lang = 'tr';` ekle.

- [ ] **Step 7: Doğrulama**

Run (web/): `npx vitest run src/lib/dil.test.ts src/components/DilSecici.test.tsx` → PASS
Run (web/): `npm test` → PASS; `npm run typecheck` → hata yok

- [ ] **Step 8: Commit** — `"feat(web): dil tercihi ve Profil'de dil secici (#177)"`

---

### Task 5: Çevrilmemiş metin taraması + kabuk, giriş ve profil ekranları

**Files:**
- Create: `web/src/lib/cevrilmemisMetin.test.ts`
- Modify: `web/src/App.tsx`, `web/src/auth/AuthContext.tsx`, `web/src/ui/AuthLayout.tsx`, `web/src/ui/SifreAlani.tsx`, `web/src/pages/LoginPage.tsx`, `web/src/pages/RegisterPage.tsx`, `web/src/pages/ProfilePage.tsx`, `web/src/pages/ProfileLayout.tsx`, `web/src/components/HaftalikHedefSecici.tsx`, `web/src/components/TemaDugmesi.tsx`, `web/src/ui/HataKutusu.tsx`, `web/src/ui/Modal.tsx`, `web/src/ui/BosDurum.tsx`, `packages/shared/src/i18n/tr.ts`, `packages/shared/src/i18n/en.ts`

**Interfaces:**
- Consumes: `useTranslation` (`react-i18next`), katalog (Task 1–4)
- Produces: `cevrilmemisMetin.test.ts` içindeki `BEKLEYEN` listesi — Görev 6–8 kendi dosyalarını bu listeden çıkarır; Görev 8 listeyi tamamen siler.

- [ ] **Step 1: Tarama testini yaz**

`web/src/lib/cevrilmemisMetin.test.ts`:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * #177: kullaniciya gorunen her metin katalogdan gelmeli. Tip kontrolu "cevirmeyi unuttum"u
 * yakalayamaz; bu test `web/src` altinda (testler haric) yorum disinda Turkceye ozgu harf kalan
 * satirlari listeler. Turkce karakter icermeyen Turkce metni ("Kaydet") YAKALAYAMAZ -- o
 * yuzden tek guvence degil. Kasitli bir istisna satir sonuna `// i18n-muaf` ile isaretlenir.
 */
const KOK = fileURLToPath(new URL('..', import.meta.url)); // web/src
const TURKCE_HARF = /[çğıöşüÇĞİÖŞÜ]/;

// Henuz cevrilmemis dosyalar (Gorev 6-8 kendi dosyalarini cikarir, Gorev 8 listeyi siler).
const BEKLEYEN = new Set<string>([
  // Gorev 6
  'pages/AntrenmanPage.tsx', 'components/AddSetForm.tsx', 'components/SetList.tsx',
  'components/SetSatiri.tsx', 'components/SetDuzenleyici.tsx', 'components/HareketKartlari.tsx',
  'components/HareketEklePaneli.tsx', 'components/DinlenmeSayaci.tsx',
  'components/DevamEdenAntrenman.tsx', 'components/ZorlukSecici.tsx', 'ui/HareketSecici.tsx',
  'ui/DinlenmeHapi.tsx', 'ui/GeriAlSeridi.tsx',
  // Gorev 7
  'pages/AnaSayfaPage.tsx', 'components/Takvim.tsx', 'components/SablonlaBasla.tsx',
  'components/SablonOlusturCagrisi.tsx', 'pages/SablonlarPage.tsx', 'pages/SablonDuzenlePage.tsx',
  'ui/SablonKarti.tsx',
  // Gorev 8
  'pages/HistoryPage.tsx', 'components/GecmisKarti.tsx', 'components/HareketGecmisi.tsx',
  'ui/CizgiGrafik.tsx', 'pages/RecordsPage.tsx', 'pages/MeasurementsPage.tsx',
  'pages/InsightsPage.tsx',
]);

function kaynakDosyalari(dizin: string): string[] {
  return readdirSync(dizin, { withFileTypes: true }).flatMap((girdi) => {
    const yol = join(dizin, girdi.name);
    if (girdi.isDirectory()) {
      return girdi.name === 'test' ? [] : kaynakDosyalari(yol);
    }
    return /\.tsx?$/.test(girdi.name) && !/\.test\.tsx?$/.test(girdi.name) ? [yol] : [];
  });
}

/** Satirdan yorumlari atar: `{/* */}`, `/* */`, satir sonu `//` ve `*` ile baslayan blok yorum satiri. */
function yorumsuz(satir: string): string {
  if (/^\s*(\*|\/\*|\/\/)/.test(satir)) {
    return '';
  }
  return satir
    .replace(/\{\/\*.*?\*\/\}/g, '')
    .replace(/\/\*.*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/, '$1');
}

test('web/src altinda cevrilmemis Turkce metin kalmadi', () => {
  const bulgular: string[] = [];
  for (const dosya of kaynakDosyalari(KOK)) {
    const goreli = relative(KOK, dosya).replaceAll('\\', '/');
    if (BEKLEYEN.has(goreli)) {
      continue;
    }
    readFileSync(dosya, 'utf-8')
      .split('\n')
      .forEach((satir, i) => {
        if (!satir.includes('i18n-muaf') && TURKCE_HARF.test(yorumsuz(satir))) {
          bulgular.push(`${goreli}:${i + 1}: ${satir.trim()}`);
        }
      });
  }
  expect(bulgular).toEqual([]);
});
```

- [ ] **Step 2: Başarısız olduğunu gör**

Run (web/): `npx vitest run src/lib/cevrilmemisMetin.test.ts`
Expected: FAIL — bu görevin dosyalarındaki satırlar listelenir (ör. `pages/LoginPage.tsx:…`). Liste bu görevin dosyalarıyla sınırlı değilse (başka bir dosya da çıktıysa) o dosyayı bu göreve kat ve raporda belirt.

- [ ] **Step 3: Dosyaları çevir**

"Files → Modify" listesindeki her dosyayı BAŞTAN SONA oku; kullanıcıya görünen her metni (Türkçe karakter içermeyenler dahil — bkz. Katalog kuralları) `tr.ts`'e ve `en.ts`'e aynı anahtarla ekle, dosyada `const { t } = useTranslation();` ile kullan. Örnek dönüşüm (`ProfilePage.tsx`):

```tsx
// Once
usePageTitle('Hesap');
<span className="text-label text-muted">Kullanıcı adı</span>

// Sonra
const { t } = useTranslation();
usePageTitle(t('profil.baslik'));
<span className="text-label text-muted">{t('profil.kullaniciAdi')}</span>
```

Bileşen dışındaki doğrulama fonksiyonlarında (ör. `ProfilePage.tsx`'teki `sifreUzunlugunuDogrula`) `useTranslation` çağrılamaz: fonksiyon metin yerine katalog anahtarı döndürsün (`'profil.sifreGerekli' as const`), çağıran bileşen `t(...)` ile çevirsin. `HaftalikHedefSecici`'deki `Haftada ${gun} gün` çoğul anahtar olur: `t('profil.haftadaGun', { count: gun })`, `haftadaGun_one` / `haftadaGun_other`.

Bu görevde yalnızca web dosyaları değişir; `ProfileLayout.tsx`'teki sekme adları ve `App.tsx`'teki sekme çubuğu / `aria-label`'lar `kabuk` grubuna girer.

- [ ] **Step 4: Doğrulama**

Run (web/): `npx vitest run src/lib/cevrilmemisMetin.test.ts src/lib/katalog.test.ts` → PASS
Run (web/): `npm test` → PASS (mevcut Türkçe testler değişmeden geçer); `npm run typecheck` → hata yok
Bir mevcut test kırılırsa sebebi büyük ihtimalle metnin biçimi değişmiştir (boşluk, noktalama): Türkçe katalog metnini eski metinle BİREBİR aynı yap, testi değiştirme.

- [ ] **Step 5: Commit** — `"feat(web): kabuk, giris ve profil ekranlari cevrildi (#177)"`

---

### Task 6: Antrenman ekranı ve set bileşenleri

**Files:**
- Modify: `web/src/pages/AntrenmanPage.tsx`, `web/src/components/AddSetForm.tsx`, `web/src/components/SetList.tsx`, `web/src/components/SetSatiri.tsx`, `web/src/components/SetDuzenleyici.tsx`, `web/src/components/HareketKartlari.tsx`, `web/src/components/HareketEklePaneli.tsx`, `web/src/components/DinlenmeSayaci.tsx`, `web/src/components/DevamEdenAntrenman.tsx`, `web/src/components/ZorlukSecici.tsx`, `web/src/ui/HareketSecici.tsx`, `web/src/ui/DinlenmeHapi.tsx`, `web/src/ui/GeriAlSeridi.tsx`, `web/src/ui/SayiAlani.tsx`, `web/src/ui/Rozet.tsx`, `web/src/ui/TurEtiketi.tsx`, `web/src/ui/Hap.tsx`, `web/src/lib/cevrilmemisMetin.test.ts`, `packages/shared/src/i18n/tr.ts`, `packages/shared/src/i18n/en.ts`

**Interfaces:**
- Consumes: `BEKLEYEN` listesi (Task 5), `ortak` grubu, katalog kuralları
- Produces: `antrenman`, `setler` katalog grupları

- [ ] **Step 1: Listeden çıkar ve testi kır**

`cevrilmemisMetin.test.ts`'teki `BEKLEYEN`'den `// Gorev 6` bloğunu sil.
Run (web/): `npx vitest run src/lib/cevrilmemisMetin.test.ts` → FAIL, bu görevin satırlarını listeler.

- [ ] **Step 2: Dosyaları çevir**

Görev 5 Step 3'teki kurallarla. Bu gruptaki özel durumlar:
- Kategori etiketleri (`Push/Pull/Legs/Other`) çeviriliyorsa `antrenman.kategori.<Push|Pull|Legs|Other>` anahtarlarıyla; API'den gelen enum değeri anahtarın son parçasıdır (`t(\`antrenman.kategori.${kategori}\`)`).
- Zorluk seçenekleri (`VeryEasy`/`Easy`/`Medium`/`Hard`/`Maximal`) aynı desenle `antrenman.zorluk.<ad>`.
- Dinlenme süresi metni (`1:30`) sayıdır, çevrilmez; "Dinlenme" gibi etiketler çevrilir.
- Onay diyalogları (hareket kaldırma, antrenman iptali) ve geri al şeridi metni çevrilir.

- [ ] **Step 3: Doğrulama**

Run (web/): `npx vitest run src/lib/cevrilmemisMetin.test.ts src/lib/katalog.test.ts` → PASS
Run (web/): `npm test` → PASS; `npm run typecheck` → hata yok

- [ ] **Step 4: Commit** — `"feat(web): antrenman ekrani ve set bilesenleri cevrildi (#177)"`

---

### Task 7: Ana sayfa, takvim ve şablon ekranları

**Files:**
- Modify: `web/src/pages/AnaSayfaPage.tsx`, `web/src/components/Takvim.tsx`, `web/src/components/SablonlaBasla.tsx`, `web/src/components/SablonOlusturCagrisi.tsx`, `web/src/pages/SablonlarPage.tsx`, `web/src/pages/SablonDuzenlePage.tsx`, `web/src/ui/SablonKarti.tsx`, `web/src/lib/cevrilmemisMetin.test.ts`, `packages/shared/src/i18n/tr.ts`, `packages/shared/src/i18n/en.ts`

**Interfaces:**
- Consumes: `BEKLEYEN` (Task 5), `ayBasligi`/`gunBasligi` (Task 2)
- Produces: `anaSayfa`, `takvim`, `sablonlar` katalog grupları

- [ ] **Step 1: Listeden çıkar ve testi kır** — `// Gorev 7` bloğunu sil; tarama testi FAIL.

- [ ] **Step 2: Dosyaları çevir**

Görev 5 Step 3'teki kurallarla. `Takvim.tsx`'e özgü:
- `GUN_KISALTMALARI` katalogdan: `tr` → `takvim.gunKisaltmalari: { pt: 'Pt', sa: 'Sa', ca: 'Ça', pe: 'Pe', cu: 'Cu', ct: 'Ct', pz: 'Pz' }`, `en` → `{ pt: 'Mo', sa: 'Tu', ca: 'We', pe: 'Th', cu: 'Fr', ct: 'Sa', pz: 'Su' }`. Bileşende sıra sabit bir anahtar dizisiyle korunur:

```ts
const GUN_ANAHTARLARI = ['pt', 'sa', 'ca', 'pe', 'cu', 'ct', 'pz'] as const;
// render icinde:
GUN_ANAHTARLARI.map((anahtar) => t(`takvim.gunKisaltmalari.${anahtar}`))
```

- `GORUNUMLER` dizisindeki `etiket`/`bosMetin` anahtar olur (`'takvim.aylik'`, `'takvim.buAyYok'` …), `as const`; render'da `t(gorunum.etiket)`.
- `${ozet.trainedDayCount} gün` → `t('takvim.gunSayisi', { count: ozet.trainedDayCount })`; `${a} / ${b} gün` → `t('takvim.haftaHedefi', { yapilan: a, hedef: b })`.
- `'Şablonsuz'` → `t('takvim.sablonsuz')`.

- [ ] **Step 3: Doğrulama**

Run (web/): `npx vitest run src/lib/cevrilmemisMetin.test.ts src/lib/katalog.test.ts` → PASS
Run (web/): `npm test` → PASS; `npm run typecheck` → hata yok

- [ ] **Step 4: Commit** — `"feat(web): ana sayfa, takvim ve sablon ekranlari cevrildi (#177)"`

---

### Task 8: Geçmiş, rekorlar, ölçümler, yorumlar — ve son süpürme

**Files:**
- Modify: `web/src/pages/HistoryPage.tsx`, `web/src/components/GecmisKarti.tsx`, `web/src/components/HareketGecmisi.tsx`, `web/src/ui/CizgiGrafik.tsx`, `web/src/pages/RecordsPage.tsx`, `web/src/pages/MeasurementsPage.tsx`, `web/src/pages/InsightsPage.tsx`, `web/src/lib/cevrilmemisMetin.test.ts`, `packages/shared/src/i18n/tr.ts`, `packages/shared/src/i18n/en.ts`
- Check (Türkçe karaktersiz Türkçe metin için): `web/src/ui/Alan.tsx`, `BirincilDugme.tsx`, `IkincilDugme.tsx`, `IkonDugmesi.tsx`, `SecimKutusu.tsx`, `SekmeDugmesi.tsx`, `PageTitleContext.tsx`, `web/src/lib/uyari.ts`, `web/src/routes.tsx`, `web/src/auth/ProtectedRoute.tsx`

**Interfaces:**
- Consumes: `BEKLEYEN` (Task 5)
- Produces: `gecmis`, `hareketGecmisi`, `rekorlar`, `olcumler`, `yorumlar` katalog grupları; `BEKLEYEN` listesi SİLİNİR.

- [ ] **Step 1: Listeyi sil ve testi kır**

`BEKLEYEN` sabitini ve `if (BEKLEYEN.has(goreli)) { continue; }` bloğunu kaldır.
Run (web/): `npx vitest run src/lib/cevrilmemisMetin.test.ts` → FAIL, bu görevin satırlarını listeler.

- [ ] **Step 2: Dosyaları çevir**

Görev 5 Step 3'teki kurallarla. Özel durumlar:
- `HareketGecmisi.tsx`'teki sekme tanımları (`etiket`, `ozetAdi`) anahtar olur, `as const`.
- `InsightsPage.tsx`: sunucudan gelen `detail` (ör. 429 haftalık sınır) OLDUĞU GİBİ gösterilmeye devam eder (spec Karar 5); yalnızca istemcinin kendi metinleri çevrilir. AI yorumunun `content`'i çevrilmez.
- `CizgiGrafik.tsx`'teki `aria-label` ve eksen açıklamaları çevrilir.

- [ ] **Step 3: Türkçe karaktersiz metin süpürmesi**

"Check" listesindeki dosyaları baştan sona oku; kullanıcıya görünen Türkçe metin varsa çevir. Sonra şu taramayla gözden kaçanları ara ve her eşleşmeye bak (JSX metni ya da görünür bir özellikse çevir):

```bash
grep -rnE ">[[:space:]]*[A-Z][a-z]+( [a-z]+)*[[:space:]]*<|(aria-label|title|placeholder|alt)=\"[^\"{]+\"" web/src --include=*.tsx | grep -v "\.test\.tsx"
```

- [ ] **Step 4: Tam doğrulama**

Run (web/): `npm test` → PASS; `npm run typecheck` → hata yok; `npm run lint` → hata yok
Run (mobile/): `npm test` → PASS; `npx tsc --noEmit` → hata yok
Test sayılarını komutla say ve rapora yaz (tahmin etme): `npm test 2>&1 | grep -E "Tests|Test Files"` (web), `npm test 2>&1 | grep -E "^Tests:"` (mobil).

- [ ] **Step 5: Elle İngilizce kontrol**

`npm run dev` (web/) ile uygulamayı aç, Profil → Dil → English seç; Bugün, Antrenman, Geçmiş, Rekorlar, Ölçümler, Yorumlar, Şablonlar ekranlarında Türkçe metin kalmadığını ve tarih/ağırlıkların İngilizce biçimde (`12 Sep 2026`, `61.25`) göründüğünü doğrula. Sunucu hata detayları Türkçe kalabilir (spec Karar 5).

- [ ] **Step 6: Commit** — `"feat(web): gecmis, rekor, olcum ve yorum ekranlari cevrildi (#177)"`

---

### Task 9: Belgeler

**Files:**
- Modify: `CLAUDE.md` (Kapsam ve Sıra), `PLAN.md`

- [ ] **Step 1: CLAUDE.md**

"Kapsam ve Sıra — ÖNEMLİ" listesine, açık tema maddesinden sonra:

```markdown
- **Çok dilli arayüz dilim 1 (#177, 2026-09-21)** — `web/` Türkçe + İngilizce; katalog
  `packages/shared/src/i18n/` (`tr.ts` tek kaynak, `en.ts` onun tipini taşır). Kullanıcıya görünen
  yeni her metin katalogdan gelir (`t(...)`), `cevrilmemisMetin.test.ts` web'de Türkçe harfli metni
  yakalar. Dil tercihi cihazda (`grind.dil`). Backend hata kodları dilim 2, mobil arayüz dilim 3;
  AI/export dili #199. Ayrıntı:
  [docs/superpowers/specs/2026-09-21-coklu-dil-web-design.md](docs/superpowers/specs/2026-09-21-coklu-dil-web-design.md).
```

"Teknoloji Yığını" tablosundaki Frontend satırının sonuna `, çeviri i18next + react-i18next` ekle.

- [ ] **Step 2: PLAN.md**

PLAN.md'deki son tamamlanan dilim girişinin deseniyle (başlık, tarih, issue, kapsam, devreden notlar) bir giriş ekle. Devreden notlar: (1) dilim 2 — backend `code` + `params`, (2) dilim 3 — mobil metinler + mobil dil seçimi, (3) #199, (4) tarama testi Türkçe karaktersiz metni yakalamaz.

- [ ] **Step 3: Commit** — `"docs: cok dilli arayuz dilim 1 notlari (#177)"`
