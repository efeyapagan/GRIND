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
 * #651 (kullanici karari): yazilar beyaz, etraflarinda yalnizca cok hafif bir golge var --
 * kalin siyah cerceve (#598) kaldirildi.
 */
test.each([
  'paylasim-baslik',
  'paylasim-set-sayisi',
  'paylasim-saat',
  'paylasim-dakika',
  'paylasim-marka',
])('%s beyaz ve hafif golgelidir, cerceve yoktur', async (testID) => {
  await render(<PaylasimKarti templateName="Push Day" setCount={6} durationSeconds={4500} />);

  const stilNesnesi = StyleSheet.flatten(screen.getByTestId(testID).props.style);
  expect(stilNesnesi.color).toBe('#FFFFFF');
  expect(stilNesnesi.textShadowColor).toBe('rgba(0, 0, 0, 0.45)');
  expect(Math.abs(stilNesnesi.textShadowOffset.height)).toBeLessThanOrEqual(1);
  expect(stilNesnesi.textShadowRadius).toBeLessThanOrEqual(3);
  expect(screen.queryAllByTestId(`${testID}-kenar`)).toHaveLength(0);
});

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
