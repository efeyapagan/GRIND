import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import DinlenmeSayaci from './DinlenmeSayaci';
import { dinlenmeBaslat, type Dinlenme } from '../lib/dinlenme';

function Sarmalayici({ saniye }: { saniye: number | null }) {
  const [dinlenme, setDinlenme] = useState<Dinlenme | null>(() =>
    saniye === null ? null : dinlenmeBaslat(Date.now(), saniye),
  );
  return <DinlenmeSayaci dinlenme={dinlenme} onDegis={setDinlenme} />;
}

// Sahte zamanlayicilar Date'i de sahteler; userEvent yerine fireEvent (userEvent kendi gecikmelerini
// sahte saatle bekler).
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-13T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

test('kalan sure gorunur ve saniyede bir azalir', () => {
  render(<Sarmalayici saniye={90} />);

  expect(screen.getByText('1:30')).toBeInTheDocument();
  act(() => {
    vi.advanceTimersByTime(30_000);
  });
  expect(screen.getByText('1:00')).toBeInTheDocument();
});

test('+15 sn sureyi uzatir, Atla sayaci kaldirir', () => {
  render(<Sarmalayici saniye={60} />);

  fireEvent.click(screen.getByRole('button', { name: '+15 sn' }));
  expect(screen.getByText('1:15')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Atla' }));
  expect(screen.queryByText('1:15')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Atla' })).not.toBeInTheDocument();
});

test('sure dolunca Dinlenme bitti duyurulur, titresir ve birkac saniye sonra satir kaybolur', () => {
  const titresim = vi.fn();
  Object.defineProperty(navigator, 'vibrate', { value: titresim, configurable: true });
  try {
    render(<Sarmalayici saniye={5} />);

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Dinlenme bitti');
    expect(titresim).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Atla' })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.queryByText('Dinlenme bitti')).not.toBeInTheDocument();
  } finally {
    Reflect.deleteProperty(navigator, 'vibrate');
  }
});

test('sayac yokken gorunur satir yoktur ama canli bolge hazirdir', () => {
  render(<Sarmalayici saniye={null} />);

  expect(screen.queryByRole('button', { name: 'Atla' })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
});
