import { act, screen } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';

/**
 * Gercek rotalarla cizilen ekranlarda `SurukleSiraliListe` satirini basili tutup surukler (#407).
 * Gercek surukleme RNTL'de simule edilemez: `Gesture.Pan` casuslanir, basili tutmayla acilan
 * (surukleme) jestleri ayiklanir ve SON cizimdeki satirin jesti elle yurutulur -- ekranda baska
 * Pan jestleri de (sekme gecisi, takvim) oldugu icin sira numarasina guvenilmez.
 */
export function suruklemeCasusu() {
  const panSpy = jest.spyOn(Gesture, 'Pan');

  async function surukleBirak(satirIndeksi: number, otelemeY: number, satirYuksekligi = 120) {
    const satirlar = screen.getAllByTestId('surukle-satir');
    for (const satir of satirlar) {
      satir.props.onLayout({ nativeEvent: { layout: { height: satirYuksekligi } } });
    }
    const jestler = panSpy.mock.results
      .map((sonuc) => sonuc.value)
      .filter((pan) => pan.config.activateAfterLongPress > 0);
    const { handlers } = jestler[jestler.length - satirlar.length + satirIndeksi];
    await act(async () => {
      handlers.onStart({ translationY: 0 });
      handlers.onUpdate({ translationY: otelemeY });
      handlers.onEnd({ translationY: otelemeY });
    });
  }

  return { surukleBirak, geriAl: () => panSpy.mockRestore() };
}
