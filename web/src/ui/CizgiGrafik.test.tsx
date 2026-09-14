import { render, screen } from '@testing-library/react';
import CizgiGrafik from './CizgiGrafik';

const NOKTALAR = [
  { etiket: '25 Ağu', deger: 212.5 },
  { etiket: '1 Eyl', deger: 214 },
  { etiket: '10 Eyl', deger: 183 },
];

test('grafik erisilebilir adi tasir ve noktalari sirasiyla gizli listede birimle verir', () => {
  render(<CizgiGrafik noktalar={NOKTALAR} birim="kg" baslik="Bench Press ağırlık, 3 antrenman" />);

  expect(screen.getByRole('img', { name: 'Bench Press ağırlık, 3 antrenman' })).toBeInTheDocument();
  expect(screen.getAllByRole('listitem').map((madde) => madde.textContent)).toEqual([
    '25 Ağu: 212,5 kg',
    '1 Eyl: 214 kg',
    '10 Eyl: 183 kg',
  ]);
});

test('yalnizca ilk ve son noktanin degeri etiketlenir', () => {
  render(<CizgiGrafik noktalar={NOKTALAR} birim="kg" baslik="Grafik" />);

  expect(screen.getByText('212,5')).toBeInTheDocument();
  expect(screen.getByText('183')).toBeInTheDocument();
  expect(screen.queryByText('214')).not.toBeInTheDocument();
});

test('tek noktada cizgi cizilmez; nokta ve degeri gorunur', () => {
  const { container } = render(
    <CizgiGrafik noktalar={[{ etiket: '10 Eyl', deger: 65 }]} birim="kg" baslik="Tek" />,
  );

  expect(container.querySelectorAll('path')).toHaveLength(0);
  expect(container.querySelectorAll('circle')).toHaveLength(1);
  expect(screen.getByText('65')).toBeInTheDocument();
});

test('bos girdi hicbir sey render etmez', () => {
  const { container } = render(<CizgiGrafik noktalar={[]} birim="kg" baslik="Bos" />);

  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(container).toBeEmptyDOMElement();
});
