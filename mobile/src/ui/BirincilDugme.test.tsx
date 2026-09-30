import { fireEvent, render, screen } from '@testing-library/react-native';
import { renklerKoyu } from '@grind/shared/designTokens';
import BirincilDugme, { PARILTI_OPAKLIGI } from './BirincilDugme';

test('metin dugmesi basilabilir', async () => {
  const basildi = jest.fn();
  await render(
    <BirincilDugme yukseklik="normal" onPress={basildi}>
      Kaydet
    </BirincilDugme>,
  );

  await fireEvent.press(screen.getByText('Kaydet'));

  expect(basildi).toHaveBeenCalledTimes(1);
});

test('disabled iken basilamaz', async () => {
  const basildi = jest.fn();
  await render(
    <BirincilDugme yukseklik="normal" disabled onPress={basildi}>
      Kaydet
    </BirincilDugme>,
  );

  await fireEvent.press(screen.getByText('Kaydet'));

  expect(basildi).not.toHaveBeenCalled();
});

/** #491 Gorev 3: ustten hafif parilti -- dokunusu yutmamali, dugme hala basilabilir. */
test('parilti katmani cizilir ve dokunusu yutmaz', async () => {
  const basildi = jest.fn();
  await render(
    <BirincilDugme yukseklik="normal" onPress={basildi}>
      Kaydet
    </BirincilDugme>,
  );

  expect(screen.getByTestId('birincil-dugme-parilti').props.pointerEvents).toBe('none');
  await fireEvent.press(screen.getByText('Kaydet'));
  expect(basildi).toHaveBeenCalledTimes(1);
});

test('parilti dugmenin yuvarlak koselerinden tasmaz', async () => {
  await render(
    <BirincilDugme yukseklik="normal" onPress={jest.fn()}>
      Kaydet
    </BirincilDugme>,
  );

  const sinif: string = screen.getByRole('button').props.className;
  expect(sinif).toContain('overflow-hidden');
  expect(sinif).toContain('rounded-xl');
});

/**
 * Parilti `accent`'i ACAR; `on-accent` metin koyu oldugu icin kontrast dusmez, artar. Bu test yonu
 * sabitler: parilti ileride koyulasirsa (ya da on-accent degisirse) eski kontrastin altina inmesin.
 */
test('parilti en acik noktasinda on-accent metin kontrasti bozulmaz', () => {
  const parlaklik = (hex: string) => {
    const [r, g, b] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((k) => (k <= 0.03928 ? k / 12.92 : ((k + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const kontrast = (a: string, b: string) => {
    const [y, d] = [parlaklik(a), parlaklik(b)].sort((x, z) => z - x);
    return (y + 0.05) / (d + 0.05);
  };
  const karistir = (ust: string, alt: string, oran: number) =>
    '#' +
    [1, 3, 5]
      .map((i) => {
        const u = parseInt(ust.slice(i, i + 2), 16);
        const a = parseInt(alt.slice(i, i + 2), 16);
        return Math.round(u * oran + a * (1 - oran)).toString(16).padStart(2, '0');
      })
      .join('');

  const acilmis = karistir(renklerKoyu['alev-acik'], renklerKoyu.accent, PARILTI_OPAKLIGI);

  expect(kontrast(renklerKoyu['on-accent'], acilmis)).toBeGreaterThanOrEqual(
    kontrast(renklerKoyu['on-accent'], renklerKoyu.accent),
  );
  expect(kontrast(renklerKoyu['on-accent'], acilmis)).toBeGreaterThanOrEqual(4.5);
});
