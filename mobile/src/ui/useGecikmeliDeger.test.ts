import { renderHook, waitFor } from '@testing-library/react-native';
import { useGecikmeliDeger } from './useGecikmeliDeger';

/**
 * #372: kullanici adi uygunlugu her tusa basista degil, yazmayi BIRAKINCA sorulur. Bekleme
 * suresi arayuz karari (3 sn), bu yuzden hesap burada -- sorgunun kendisinde degil.
 *
 * Sahte zamanlayici KULLANILMIYOR: RNTL'nin async render'i sahte zamanlayicilarla ilk cizimde
 * takiliyor (`result.current` null kaliyor). Testte gecikme 50 ms.
 */
const GECIKME = 50;

test('ilk deger beklemeden gecerlidir', async () => {
  const { result } = await renderHook(() => useGecikmeliDeger('baslangic', GECIKME));

  expect(result.current).toBe('baslangic');
});

test('deger hemen degismez, sure dolunca degisir', async () => {
  const { result, rerender } = await renderHook(({ deger }: { deger: string }) => useGecikmeliDeger(deger, GECIKME), {
    initialProps: { deger: 'a' },
  });

  rerender({ deger: 'ab' });
  expect(result.current).toBe('a');

  await waitFor(() => expect(result.current).toBe('ab'));
});

test('sure dolmadan yazmaya devam edilirse sayac bastan baslar', async () => {
  const { result, rerender } = await renderHook(({ deger }: { deger: string }) => useGecikmeliDeger(deger, GECIKME), {
    initialProps: { deger: 'a' },
  });

  // Gecikmenin YARISINDA yeni bir harf: ara deger ("ab") hicbir zaman yansimamali.
  rerender({ deger: 'ab' });
  await new Promise((coz) => setTimeout(coz, GECIKME / 2));
  rerender({ deger: 'abc' });

  expect(result.current).toBe('a');
  await waitFor(() => expect(result.current).toBe('abc'));
});
