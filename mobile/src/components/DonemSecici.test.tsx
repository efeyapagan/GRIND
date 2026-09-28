import { Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { TakvimGorunumu } from '@grind/shared/lib/takvim';
import { TakvimDonemiProvider, useArkadaslarDonemi, useTakvimDonemi } from '../ui/TakvimDonemiContext';
import DonemSecici from './DonemSecici';

const BUGUN = '2026-09-30';

/** Iki donemi de ekrana yazar: secicinin HANGISINE yazdigini ayirt etmek icin. */
function DonemSondasi() {
  const arkadaslar = useArkadaslarDonemi();
  const anaSayfa = useTakvimDonemi();
  return (
    <>
      <Text testID="donem-sondasi">{`${arkadaslar.gorunum}:${arkadaslar.gosterilen}`}</Text>
      <Text testID="ana-sayfa-sondasi">{`${anaSayfa.gorunum}:${anaSayfa.gosterilen}`}</Text>
    </>
  );
}

async function ciz(baslangic: { gorunum: TakvimGorunumu; gosterilen: string } = { gorunum: 'hafta', gosterilen: BUGUN }) {
  await render(
    <TakvimDonemiProvider bugun={BUGUN} baslangic={baslangic}>
      <DonemSecici />
      <DonemSondasi />
    </TakvimDonemiProvider>,
  );
}

async function ac() {
  await act(async () => fireEvent.press(screen.getByLabelText('Dönem seç')));
}

/**
 * #420 (kullanici karari): tum arkadaslar ekraninin sag ustundeki takvim tusu kucuk bir pencere
 * acar -- once Haftalik/Aylik, sonra hangi hafta ya da ay. Secim EKRANIN kendi donemine yazilir.
 */
test('aylik secilip bir ay secilince donem o ay olur ve pencere kapanir', async () => {
  await ciz();
  await ac();

  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Aylık' })));
  await act(async () => fireEvent.press(screen.getByText('Ağustos 2026')));

  expect(screen.getByTestId('donem-sondasi')).toHaveTextContent('ay:2026-08-01');
  expect(screen.queryByText('Ağustos 2026')).toBeNull();
});

test('haftalik listede gecmis haftalar vardir, secilen hafta donem olur', async () => {
  await ciz();
  await ac();

  await act(async () => fireEvent.press(screen.getByTestId('donem-2026-09-21')));

  expect(screen.getByTestId('donem-sondasi')).toHaveTextContent('hafta:2026-09-21');
});

/** Pencere mevcut donemle acilir: gorunumu ve secili donemi isaretli (kullanici nerede oldugunu gorur). */
test('pencere gecerli donemi isaretli acar', async () => {
  await ciz({ gorunum: 'ay', gosterilen: '2026-08-12' });
  await ac();

  expect(screen.getByRole('button', { name: 'Aylık' })).toBeSelected();
  expect(screen.getByTestId('donem-2026-08-01')).toBeSelected();
  expect(screen.getByTestId('donem-2026-09-01')).not.toBeSelected();
});

/** Haftalik/Aylik arasinda gecmek TEK BASINA donemi degistirmez: hangi hafta/ay secilince degisir. */
test('gorunum sekmesine basmak donemi degistirmez', async () => {
  await ciz();
  await ac();

  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Aylık' })));

  expect(screen.getByTestId('donem-sondasi')).toHaveTextContent(`hafta:${BUGUN}`);
});

/**
 * Kullanici karari: bu ekranda secilen donem ana sayfadaki takvimi TASIMAZ -- ana sayfa en son
 * kendi sectiginde kalir.
 */
test('secim ana sayfanin donemini degistirmez', async () => {
  await ciz();
  await ac();

  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Aylık' })));
  await act(async () => fireEvent.press(screen.getByText('Ağustos 2026')));

  expect(screen.getByTestId('donem-sondasi')).toHaveTextContent('ay:2026-08-01');
  expect(screen.getByTestId('ana-sayfa-sondasi')).toHaveTextContent(`hafta:${BUGUN}`);
});
