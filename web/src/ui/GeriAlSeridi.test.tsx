import { act, fireEvent, render, screen } from '@testing-library/react';
import GeriAlSeridi from './GeriAlSeridi';

// Sahte zamanlayicilar Date'i de sahteler ve RENDER'DAN ONCE kurulmalidir: serit araligini
// monte olurken kurar, sonradan sahteye gecmek o gercek araligi yakalamaz.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-14T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

function seridiOlustur(onGeriAl = vi.fn(), onSureDoldu = vi.fn()) {
  render(
    <GeriAlSeridi
      mesaj="Antrenman silindi"
      sureMs={5000}
      onGeriAl={onGeriAl}
      onSureDoldu={onSureDoldu}
    />,
  );
  return { onGeriAl, onSureDoldu };
}

test('sure dolunca onSureDoldu cagrilir, oncesinde cagrilmaz', () => {
  const { onSureDoldu } = seridiOlustur();

  act(() => {
    vi.advanceTimersByTime(4900);
  });
  expect(onSureDoldu).not.toHaveBeenCalled();

  act(() => {
    vi.advanceTimersByTime(200);
  });
  expect(onSureDoldu).toHaveBeenCalled();
});

test('geri al dugmesi onGeriAl cagirir ve sure dolmasini beklemez', () => {
  const { onGeriAl, onSureDoldu } = seridiOlustur();

  fireEvent.click(screen.getByRole('button', { name: 'Geri al' }));

  expect(onGeriAl).toHaveBeenCalled();
  expect(onSureDoldu).not.toHaveBeenCalled();
});

test('mesaj canli bolge olarak duyurulur', () => {
  seridiOlustur();

  expect(screen.getByRole('status')).toHaveTextContent('Antrenman silindi');
});
