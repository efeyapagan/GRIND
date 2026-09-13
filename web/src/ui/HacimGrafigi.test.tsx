import { render, screen } from '@testing-library/react';
import HacimGrafigi from './HacimGrafigi';

const NOKTALAR = [
  { etiket: '8 Eyl', deger: 1200 },
  { etiket: '10 Eyl', deger: 2400 },
  { etiket: 'Bugün', deger: 800, vurgulu: true },
];

test('grafik ozet adini tasir ve noktalari sirasiyla ekran okuyucu listesi olarak verir', () => {
  render(<HacimGrafigi noktalar={NOKTALAR} baslik="Bench Press hacmi, son 3 antrenman" />);

  expect(screen.getByRole('img', { name: 'Bench Press hacmi, son 3 antrenman' })).toBeInTheDocument();
  const maddeler = screen.getAllByRole('listitem');
  expect(maddeler.map((madde) => madde.textContent)).toEqual([
    '8 Eyl: 1.200 kg',
    '10 Eyl: 2.400 kg',
    'Bugün: 800 kg',
  ]);
});

test('en yuksek deger yalnizca bir kez kg ile yazilir', () => {
  render(<HacimGrafigi noktalar={NOKTALAR} baslik="Hacim" />);

  expect(screen.getAllByText('2.400 kg')).toHaveLength(1);
  expect(screen.queryByText('1.200 kg')).not.toBeInTheDocument();
});

test('bos girdi hicbir sey render etmez (gecersiz viewBox olusmaz)', () => {
  // F4 (review bulgusu): bos `noktalar`, `viewBox="0 0 0 100"` gibi gecersiz bir SVG uretirdi.
  const { container } = render(<HacimGrafigi noktalar={[]} baslik="Hacim" />);

  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(container).toBeEmptyDOMElement();
});
