import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { renkler } from '@grind/shared/designTokens';
import PaylasimKarti, { PAYLASIM_BASLIK_AZAMI_GENISLIK } from './PaylasimKarti';

/**
 * #598: aynı şablonun önceki antrenmanlarının en yükseğini geçen antrenman (hacim rekoru), paylaşılan
 * PNG'de GRIND'in altında "Volume PR" yazar; diğerlerinde yazı hiç çizilmez.
 */
test('hacim rekoru varsa GRIND altinda Volume PR yazar', async () => {
  await render(<PaylasimKarti templateName="Push Day" setCount={6} durationSeconds={2700} volumePr />);

  // Kenarlik icin ust uste bindirilmis kopyalar var: yazinin en az bir kopyasi olmali.
  expect(screen.getAllByText('Volume PR').length).toBeGreaterThan(0);
});

test('hacim rekoru yoksa Volume PR yazisi cizilmez', async () => {
  await render(<PaylasimKarti templateName="Push Day" setCount={6} durationSeconds={2700} />);

  expect(screen.queryByText('Volume PR')).toBeNull();
});

/** #598 (kullanici karari): sablonsuz antrenmanda ustte hicbir baslik yazmaz ("Serbest" / "No Template" yok). */
test('sablonsuz antrenmanda baslik yazilmaz', async () => {
  await render(<PaylasimKarti templateName={null} setCount={4} durationSeconds={1800} />);

  expect(screen.queryByTestId('paylasim-baslik')).toBeNull();
  expect(screen.queryByText('Serbest')).toBeNull();
});

/** #598: uzun sablon adi tek satira sigdirilmaz -- sabit bir azami genislikten sonra alt satira gecer. */
test('sablon adi azami genislikle sinirlidir ve satir sayisi kisitlanmaz', async () => {
  await render(
    <PaylasimKarti templateName="Upper Body Hypertrophy Push Day" setCount={4} durationSeconds={1800} />,
  );

  const baslik = screen.getByTestId('paylasim-baslik');
  expect(StyleSheet.flatten(baslik.props.style).maxWidth).toBe(PAYLASIM_BASLIK_AZAMI_GENISLIK);
  expect(baslik.props.numberOfLines).toBeUndefined();
});

const renk = (eleman: ReturnType<typeof screen.getByTestId>) => StyleSheet.flatten(eleman.props.style)?.color;

/**
 * #598 (kullanici karari): sablon adi, set sayisi, sure ve GRIND beyaz, harfleri siyah cerceveli --
 * story fotografinin ustunde her zeminde okunsun. Cerceve 8 siyah kopyadan olusur.
 */
test.each(['paylasim-baslik', 'paylasim-set-sayisi', 'paylasim-saat', 'paylasim-dakika', 'paylasim-marka'])(
  '%s beyaz ve siyah cercevelidir',
  async (testID) => {
    await render(<PaylasimKarti templateName="Push Day" setCount={6} durationSeconds={4500} />);

    expect(renk(screen.getByTestId(testID))).toBe('#FFFFFF');
    const kenarlar = screen.getAllByTestId(`${testID}-kenar`);
    expect(kenarlar).toHaveLength(8);
    kenarlar.forEach((kenar) => expect(renk(kenar)).toBe('#000000'));
  },
);

/** #598 (kullanici karari): birimler (SET / SA / DK) soluk turuncu (`accent-soft`); dumbbell turuncu kalir. */
test('birimler soluk turuncudur', async () => {
  await render(<PaylasimKarti templateName="Push Day" setCount={6} durationSeconds={4500} />);

  for (const birim of ['set', 'sa', 'dk']) {
    expect(renk(screen.getByText(birim))).toBe(renkler['accent-soft']);
  }
});

/** #598: Volume PR yazisi GRIND'den 5 punto kucuktur (once 3, sonra kullanici 2 punto daha istedi). */
test('Volume PR GRIND yazisindan 5 punto kucuktur', async () => {
  await render(<PaylasimKarti templateName="Push Day" setCount={6} durationSeconds={2700} volumePr />);

  const punto = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style).fontSize;
  expect(punto('paylasim-hacim-rekoru')).toBe(punto('paylasim-marka') - 5);
  expect(renk(screen.getByTestId('paylasim-hacim-rekoru'))).toBe('#FFFFFF');
});

/** #598: birimler (SETS / MIN) rakamdan 4 punto kucuktur (kullanici iki kez 2'ser punto istedi). */
test('birimler rakamlardan 4 punto kucuktur', async () => {
  await render(<PaylasimKarti templateName="Push Day" setCount={6} durationSeconds={2700} />);

  const rakam = StyleSheet.flatten(screen.getByTestId('paylasim-set-sayisi').props.style).fontSize;
  for (const birim of ['set', 'dk']) {
    expect(StyleSheet.flatten(screen.getByText(birim).props.style).fontSize).toBe(rakam - 4);
  }
});
