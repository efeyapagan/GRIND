import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderHook } from '@testing-library/react-native';
import { useColorScheme } from 'nativewind';
import { renklerAcik, renklerKoyu } from '@grind/shared/designTokens';
import { useIkonRenk, useRenkPaleti } from './renkler';

jest.mock('nativewind', () => ({ useColorScheme: jest.fn() }));

const useColorSchemeMock = useColorScheme as unknown as jest.Mock;

function temaVer(colorScheme: 'light' | 'dark') {
  useColorSchemeMock.mockReturnValue({ colorScheme, setColorScheme: jest.fn() });
}

/**
 * #271: renk iki yerde yasiyor -- Tailwind sinifları global.css'teki degiskenlerden, lucide
 * ikonlari ve SVG grafikler TS'teki paletten okur. Ilk denemede tam olarak bu ikisi ayrismisti
 * (CSS acik boyuyor, JS koyu saniyordu) ve acik temada ikonlar gorunmez olmustu. Bu test o
 * sinifi kapatir.
 */
function cssDegiskenleri(secici: string): Record<string, string> {
  const css = readFileSync(join(__dirname, '../../global.css'), 'utf8');
  const bas = css.indexOf(`${secici} {`);
  if (bas < 0) {
    throw new Error(`global.css'te "${secici}" blogu yok`);
  }
  const son = css.indexOf('}', bas);
  const degiskenler: Record<string, string> = {};
  for (const eslesme of css.slice(bas, son).matchAll(/--color-([\w-]+):\s*([^;]+);/g)) {
    degiskenler[eslesme[1]] = eslesme[2].trim();
  }
  return degiskenler;
}

test('global.css :root blogu acik paletin birebir aynisi', () => {
  expect(cssDegiskenleri(':root')).toEqual({ ...renklerAcik });
});

test('global.css koyu blogu koyu paletin birebir aynisi', () => {
  expect(cssDegiskenleri('.dark:root')).toEqual({ ...renklerKoyu });
});

test('koyu blok .dark degil .dark:root seciciyle yazilir', () => {
  // NativeWind `dark` sinifini KOK elemana takar; `.dark { ... }` eslesmez ve koyu tema hic
  // uygulanmaz. Bu, #271'in ilk denemesindeki hatanin ta kendisiydi.
  const css = readFileSync(join(__dirname, '../../global.css'), 'utf8');
  expect(css).toContain('.dark:root {');
  expect(css).not.toMatch(/^\s*\.dark\s*\{/m);
});

test('useRenkPaleti etkin temaya gore paleti dondurur', async () => {
  temaVer('light');
  expect((await renderHook(() => useRenkPaleti())).result.current).toBe(renklerAcik);

  temaVer('dark');
  expect((await renderHook(() => useRenkPaleti())).result.current).toBe(renklerKoyu);
});

test('useIkonRenk acik temada okunur muted, koyuda acik muted verir', async () => {
  temaVer('light');
  expect((await renderHook(() => useIkonRenk())).result.current.muted).toBe('#5b5654');

  temaVer('dark');
  expect((await renderHook(() => useIkonRenk())).result.current.muted).toBe('#c5c6c8');
});

test('tema belirsizken koyu paletle cizilir', async () => {
  // NativeWind ilk karede colorScheme'i null verebiliyor; uygulama bugune kadar koyuydu,
  // belirsizlikte koyuya dusmek "beyaz ekran parlamasi"ndan iyidir.
  useColorSchemeMock.mockReturnValue({ colorScheme: undefined, setColorScheme: jest.fn() });
  expect((await renderHook(() => useRenkPaleti())).result.current).toBe(renklerKoyu);
});
