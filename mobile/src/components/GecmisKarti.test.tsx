import { render, screen, fireEvent } from '@testing-library/react-native';
import type { GecmisOturum } from '@grind/shared/api/queries';
import GecmisKarti from './GecmisKarti';

function ornekOturum(gecersizler: Partial<GecmisOturum> = {}): GecmisOturum {
  return {
    sessionId: 1,
    startedAt: '2026-09-18T10:00:00Z',
    templateName: 'Push Day',
    setCount: 12,
    totalVolume: 3400,
    medianRestSeconds: 90,
    sets: [],
    ...gecersizler,
  };
}

test('kapaliyken sadece ozet gorunur, set listesi yok', async () => {
  await render(<GecmisKarti oturum={ornekOturum()} onSil={jest.fn()} />);

  expect(screen.getByText('Push Day')).toBeTruthy();
  expect(screen.queryByText('Antrenmanı sil')).toBeNull();
});

test('dokununca acilir ve "Antrenmanı sil" gorunur', async () => {
  await render(<GecmisKarti oturum={ornekOturum()} onSil={jest.fn()} />);

  await fireEvent.press(screen.getByText('Push Day'));

  expect(screen.getByText('Antrenmanı sil')).toBeTruthy();
});

test('Antrenmani sil onay ister, Vazgec ile onSil cagrilmaz', async () => {
  const onSil = jest.fn();
  await render(<GecmisKarti oturum={ornekOturum()} onSil={onSil} />);

  await fireEvent.press(screen.getByText('Push Day'));
  await fireEvent.press(screen.getByText('Antrenmanı sil'));
  expect(screen.getByText(/seti silinecek/)).toBeTruthy();

  await fireEvent.press(screen.getByText('Vazgeç'));

  expect(screen.queryByText(/seti silinecek/)).toBeNull();
  expect(onSil).not.toHaveBeenCalled();
});

test('Evet sil onSil i cagirir', async () => {
  const onSil = jest.fn();
  await render(<GecmisKarti oturum={ornekOturum()} onSil={onSil} />);

  await fireEvent.press(screen.getByText('Push Day'));
  await fireEvent.press(screen.getByText('Antrenmanı sil'));
  await fireEvent.press(screen.getByText('Evet, sil'));

  expect(onSil).toHaveBeenCalledTimes(1);
});

test('sablonsuz antrenman "Serbest" gosterir', async () => {
  await render(<GecmisKarti oturum={ornekOturum({ templateName: null })} onSil={jest.fn()} />);

  expect(screen.getByText('Serbest')).toBeTruthy();
});
