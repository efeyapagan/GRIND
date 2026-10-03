import { render, screen } from '@testing-library/react-native';
import PaylasimKarti from './PaylasimKarti';

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
