import { render, screen } from '@testing-library/react-native';
import KategoriHaplari from './KategoriHaplari';

/** #647: Kardiyo kategorisi Other'dan once gelir. */
test('kategoriler Push, Pull, Legs, Kardiyo, Diger sirasiyla dizilir', async () => {
  await render(<KategoriHaplari secili={null} onSec={() => undefined} />);

  const etiketler = screen.getAllByText(/.+/).map((yazi) => yazi.props.children);
  expect(etiketler).toEqual(['Tümü', 'Push', 'Pull', 'Legs', 'Kardiyo', 'Diğer']);
});
