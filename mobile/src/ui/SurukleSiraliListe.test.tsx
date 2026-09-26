import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';
import SurukleSiraliListe from './SurukleSiraliListe';

/**
 * #344: basili tutup surukleyerek sira degistirme. Gercek surukleme RNTL'de simule edilemez
 * (jest'te dokunmatik olay akisi yok), bu yuzden `Gesture.Pan` casuslanip jestin kendi
 * callback'leri elle cagriliyor -- KaydirilabilirSatir.test.tsx'teki desenin aynisi.
 */
const HARFLER = ['a', 'b', 'c'];

function ciz(onSirala: jest.Mock) {
  return render(
    <SurukleSiraliListe
      ogeler={HARFLER}
      anahtar={(harf) => harf}
      onSirala={onSirala}
      satirCiz={(harf) => <Text>{harf}</Text>}
    />,
  );
}

/** Kac'inci satirin jesti: her satir kendi `Gesture.Pan()`ini kurar, sirayla. */
function satirJesti(panSpy: jest.SpyInstance, indeks: number) {
  return panSpy.mock.results[indeks].value.handlers;
}

/** Basili tut + surukle + birak; jest durum guncelledigi icin `act` icinde. */
async function surukleBirak(handlers: Record<string, (olay: unknown) => void>, otelemeY: number) {
  await act(async () => {
    handlers.onStart({ translationY: 0 });
    handlers.onUpdate({ translationY: otelemeY });
    handlers.onEnd({ translationY: otelemeY });
  });
}

/** Satir yuksekligi olculmeden surukleme hesabi yapilamaz; onLayout'u elle tetikler. */
function yuksekligiBildir(satirYuksekligi = 64) {
  for (const satir of screen.getAllByTestId('surukle-satir')) {
    satir.props.onLayout({ nativeEvent: { layout: { height: satirYuksekligi } } });
  }
}

test('iki satir asagi surukleyip birakinca yeni sira bildirilir', async () => {
  const panSpy = jest.spyOn(Gesture, 'Pan');
  const onSirala = jest.fn();
  await ciz(onSirala);
  yuksekligiBildir();

  await surukleBirak(satirJesti(panSpy, 0), 140);

  expect(onSirala).toHaveBeenCalledWith(['b', 'c', 'a']);
  panSpy.mockRestore();
});

test('yarim satirdan az surukleyip birakinca sira degismedigi icin bildirim yapilmaz', async () => {
  const panSpy = jest.spyOn(Gesture, 'Pan');
  const onSirala = jest.fn();
  await ciz(onSirala);
  yuksekligiBildir();

  await surukleBirak(satirJesti(panSpy, 1), 12);

  expect(onSirala).not.toHaveBeenCalled();
  panSpy.mockRestore();
});

test('surukleme basili tutmadan aktiflesmez (liste kaydirmayi yutmasin)', async () => {
  const panSpy = jest.spyOn(Gesture, 'Pan');
  await ciz(jest.fn());

  expect(panSpy.mock.results[0].value.config.activateAfterLongPress).toBeGreaterThan(0);
  panSpy.mockRestore();
});
