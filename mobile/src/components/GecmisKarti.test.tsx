import { render, screen, fireEvent, within } from '@testing-library/react-native';
import type { GecmisOturum } from '@grind/shared/api/queries';
import GecmisKarti from './GecmisKarti';

function ornekOturum(gecersizler: Partial<GecmisOturum> = {}): GecmisOturum {
  return {
    sessionId: 1,
    startedAt: '2026-09-18T10:00:00Z',
    templateName: 'Push Day',
    setCount: 12,
    totalVolume: 3400,
    durationSeconds: null,
    sets: [],
    ...gecersizler,
  };
}

test('kapaliyken sadece ozet gorunur, detay paneli yok', async () => {
  await render(<GecmisKarti oturum={ornekOturum()} onSil={jest.fn()} />);

  expect(screen.getByText('Push Day')).toBeTruthy();
  expect(screen.queryByTestId('gecmis-detay-paneli')).toBeNull();
  expect(screen.queryByText('Antrenmanı sil')).toBeNull();
});

// #382: kart yerinde asagi acilmaz; ayrintilar (setler + silme) ekrandaki cam panelde gorunur.
test('dokununca detay paneli acilir; set listesi ve "Antrenmanı sil" paneldedir', async () => {
  await render(<GecmisKarti oturum={ornekOturum()} onSil={jest.fn()} />);

  await fireEvent.press(screen.getByText('Push Day'));

  const panel = within(screen.getByTestId('gecmis-detay-paneli'));
  expect(panel.getByText('Bu antrenmanda set yok.')).toBeTruthy();
  expect(panel.getByText('Antrenmanı sil')).toBeTruthy();
});

test('paneldeki Kapat dugmesi paneli kapatir', async () => {
  await render(<GecmisKarti oturum={ornekOturum()} onSil={jest.fn()} />);

  await fireEvent.press(screen.getByText('Push Day'));
  await fireEvent.press(screen.getByLabelText('Kapat'));

  expect(screen.queryByTestId('gecmis-detay-paneli')).toBeNull();
});

test('salt-okunur kartin panelinde silme yolu yoktur', async () => {
  await render(<GecmisKarti oturum={ornekOturum()} />);

  await fireEvent.press(screen.getByText('Push Day'));

  expect(screen.getByTestId('gecmis-detay-paneli')).toBeTruthy();
  expect(screen.queryByText('Antrenmanı sil')).toBeNull();
});

test('paneldeki Antrenmani sil paneli kapatip onay ister, Vazgec ile onSil cagrilmaz', async () => {
  const onSil = jest.fn();
  await render(<GecmisKarti oturum={ornekOturum()} onSil={onSil} />);

  await fireEvent.press(screen.getByText('Push Day'));
  await fireEvent.press(screen.getByText('Antrenmanı sil'));
  expect(screen.queryByTestId('gecmis-detay-paneli')).toBeNull();
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

test('son 24 saat icindeki antrenman mutlak tarih yerine goreli zaman gosterir (#218)', async () => {
  const ucSaatOnce = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  await render(<GecmisKarti oturum={ornekOturum({ startedAt: ucSaatOnce })} onSil={jest.fn()} />);

  expect(screen.getByText('3 saat önce')).toBeTruthy();
});

test('ozet medyan dinlenme yerine antrenman suresini saat ve dakikayla gosterir (#246)', async () => {
  await render(<GecmisKarti oturum={ornekOturum({ durationSeconds: 3900 })} onSil={jest.fn()} />);

  expect(screen.getByText('1')).toBeTruthy();
  expect(screen.getByText('sa')).toBeTruthy();
  expect(screen.getByText('5')).toBeTruthy();
  expect(screen.getByText('dk')).toBeTruthy();
  expect(screen.queryByText('dinlenme')).toBeNull();
});
