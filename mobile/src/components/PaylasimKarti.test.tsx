import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
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
