import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { request } from '@grind/shared/api/client';
import { queryKeys, type Egzersiz, type KardiyoKaydi } from '@grind/shared/api/queries';
import { BOS_KARDIYO_DEGERLERI } from '@grind/shared/lib/kardiyo';
import KardiyoPaneli from './KardiyoPaneli';

jest.mock('@grind/shared/api/client', () => ({
  request: jest.fn(),
  setUnauthorizedHandler: jest.fn(),
}));

const requestMock = request as jest.Mock;

const TREADMILL: Egzersiz = {
  id: 193,
  name: 'Treadmill',
  category: 'Cardio',
  measurement: 'Cardio',
  cardioFields: ['Speed', 'Incline', 'Distance'],
};
const MERDIVEN: Egzersiz = {
  id: 200,
  name: 'Stair Climber',
  category: 'Cardio',
  measurement: 'Cardio',
  cardioFields: ['Level', 'Floors'],
};

function kayit(gecersizler: Partial<KardiyoKaydi> = {}): KardiyoKaydi {
  return {
    ...BOS_KARDIYO_DEGERLERI,
    id: 1,
    sessionId: 5,
    exerciseId: 193,
    exerciseName: 'Treadmill',
    startedAt: new Date(Date.now() - 20 * 60_000).toISOString(),
    durationSeconds: null,
    speedKmh: 9,
    isDurationRecord: false,
    isDistanceRecord: false,
    ...gecersizler,
  };
}

function paneliCiz(egzersiz: Egzersiz, kardiyolar: KardiyoKaydi[] = [], onKaydedildi = jest.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });
  queryClient.setQueryData(queryKeys.exercises, [TREADMILL, MERDIVEN]);
  return render(
    <QueryClientProvider client={queryClient}>
      <KardiyoPaneli
        egzersizId={egzersiz.id}
        egzersizAdi={egzersiz.name}
        oturumId={5}
        kardiyolar={kardiyolar}
        onKaydedildi={onKaydedildi}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => requestMock.mockReset());

/** #647: her makine kendi kutularini sorar; baslamadan once yalnizca ayarlar (mesafe durdurunca). */
test('yalnizca makinenin ayar kutulari cizilir', async () => {
  await paneliCiz(TREADMILL);
  expect(screen.getByTestId('kardiyo-Speed')).toBeTruthy();
  expect(screen.getByTestId('kardiyo-Incline')).toBeTruthy();
  expect(screen.queryByTestId('kardiyo-Distance')).toBeNull();
});

test('merdivende seviye sorulur, egim sorulmaz', async () => {
  await paneliCiz(MERDIVEN);
  expect(screen.getByTestId('kardiyo-Level')).toBeTruthy();
  expect(screen.queryByTestId('kardiyo-Incline')).toBeNull();
});

test('Baslat ayarlarla kardiyoyu baslatir', async () => {
  requestMock.mockResolvedValue(kayit());
  await paneliCiz(TREADMILL);

  await fireEvent.changeText(screen.getByTestId('kardiyo-Speed'), '9');
  await act(async () => await fireEvent.press(screen.getByText('Başlat')));

  expect(requestMock).toHaveBeenCalledWith(
    '/sessions/5/cardio',
    expect.objectContaining({ method: 'POST', body: JSON.stringify({ exerciseId: 193, ...BOS_KARDIYO_DEGERLERI, speedKmh: 9 }) }),
  );
});

/** Akan kayitta sayac ve Durdur; durdurunca sonuc kutulari acilir, Kaydet sonuclari ve sureyi yazar. */
test('akan kardiyo durdurulur, sonuclar kaydedilir', async () => {
  const onKaydedildi = jest.fn();
  const akan = kayit();
  await paneliCiz(TREADMILL, [akan], onKaydedildi);
  expect(screen.getByTestId('kardiyo-sayaci').props.children).toBe('20:00');

  requestMock.mockResolvedValueOnce(kayit({ durationSeconds: 1200 }));
  await act(async () => await fireEvent.press(screen.getByText('Durdur')));
  expect(requestMock).toHaveBeenCalledWith('/cardio/1/stop', expect.objectContaining({ method: 'POST' }));

  await waitFor(() => expect(screen.getByTestId('kardiyo-Distance')).toBeTruthy());
  expect(screen.getByTestId('kardiyo-sure-dakika').props.value).toBe('20');

  requestMock.mockResolvedValueOnce(kayit({ durationSeconds: 1200, distanceKm: 3.2 }));
  await fireEvent.changeText(screen.getByTestId('kardiyo-Distance'), '3,2');
  await act(async () => await fireEvent.press(screen.getByText('Kaydet')));

  const [yol, secenekler] = requestMock.mock.calls[1];
  expect(yol).toBe('/cardio/1');
  expect(JSON.parse(secenekler.body)).toMatchObject({ durationSeconds: 1200, distanceKm: 3.2, speedKmh: 9 });
  expect(onKaydedildi).toHaveBeenCalled();
});

test('baska bir kardiyo akarken Baslat kapalidir', async () => {
  await paneliCiz(MERDIVEN, [kayit()]);

  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.getByText('Başlat')).toBeTruthy();
  await fireEvent.press(screen.getByText('Başlat'));
  expect(requestMock).not.toHaveBeenCalled();
});
