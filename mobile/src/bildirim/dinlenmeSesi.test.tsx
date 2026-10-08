import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { dinlenmeBaslat, duraklat, sureEkle, type Dinlenme } from '@grind/shared/lib/dinlenme';
import { SESLI_BILDIRIM_ANAHTARI, sesliBildirimiAyarla, useDinlenmeSesi, useSesliBildirim } from './dinlenmeSesi';

// #414 dilim 2: dinlenme bitince arka planda zil -- yerel, yalnizca sesli bildirim (push degil, kutu yok).

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('kimlik')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const izinIste = Notifications.requestPermissionsAsync as jest.Mock;
const kur = Notifications.scheduleNotificationAsync as jest.Mock;
const iptal = Notifications.cancelScheduledNotificationAsync as jest.Mock;
// Modul yuklenirken BIR KEZ kurulur; sonraki `clearAllMocks` cagri kaydini siler.
const [{ handleNotification }] = (Notifications.setNotificationHandler as jest.Mock).mock.calls[0];

const SIMDI = Date.UTC(2026, 9, 9, 10, 0, 0);
const SAYAC = dinlenmeBaslat(SIMDI, 90)!;

beforeEach(async () => {
  jest.clearAllMocks();
  izinIste.mockResolvedValue({ granted: true });
  await sesliBildirimiAyarla(false);
  jest.clearAllMocks();
});

function kanca(dinlenme: Dinlenme | null, bitti = false) {
  return renderHook(({ d, b }: { d: Dinlenme | null; b: boolean }) => useDinlenmeSesi(d, b), {
    initialProps: { d: dinlenme, b: bitti },
  });
}

/** Yalnizca ses: baslik ve metin YOK (ekranda kutu cikmasin), bitis aninda calar. */
test('tercih acikken sayac baslayinca bitis anina sessiz-kutulu tek zil kurulur', async () => {
  await act(async () => void (await sesliBildirimiAyarla(true)));

  await kanca(SAYAC);

  await waitFor(() => expect(kur).toHaveBeenCalledTimes(1));
  const [istek] = kur.mock.calls[0];
  expect(istek.content).toEqual({ sound: 'dinlenme-bitti.wav' });
  expect(istek.trigger).toEqual({ type: 'date', date: new Date(SIMDI + 90_000) });
});

test('sure uzatilinca eski zil iptal edilir, yeni bitis anina yenisi kurulur', async () => {
  await act(async () => void (await sesliBildirimiAyarla(true)));
  const { rerender } = await kanca(SAYAC);
  await waitFor(() => expect(kur).toHaveBeenCalledTimes(1));
  iptal.mockClear();

  await rerender({ d: sureEkle(SAYAC, 15), b: false });

  await waitFor(() => expect(kur).toHaveBeenCalledTimes(2));
  expect(iptal).toHaveBeenCalledTimes(1);
  expect(kur.mock.calls[1][0].trigger.date).toEqual(new Date(SIMDI + 105_000));
});

test.each([
  ['temizlenince', null],
  ['duraklatilinca', duraklat(SAYAC, SIMDI + 10_000)],
])('sayac %s zil iptal edilir', async (_ad, sonraki) => {
  await act(async () => void (await sesliBildirimiAyarla(true)));
  const { rerender } = await kanca(SAYAC);
  await waitFor(() => expect(kur).toHaveBeenCalledTimes(1));
  iptal.mockClear();

  await rerender({ d: sonraki, b: false });

  await waitFor(() => expect(iptal).toHaveBeenCalledTimes(1));
  expect(kur).toHaveBeenCalledTimes(1);
});

/** Varsayilan KAPALI: kullanici istemedikce ne zil kurulur ne izin sorulur. */
test('tercih kapaliyken zil kurulmaz', async () => {
  await kanca(SAYAC);

  await waitFor(() => expect(iptal).toHaveBeenCalled());
  expect(kur).not.toHaveBeenCalled();
  expect(izinIste).not.toHaveBeenCalled();
});

/** Uygulama acikken bugunku uygulama ici bip calar; bildirim ne ses verir ne kutu gosterir. */
test('uygulama acikken gelen bildirim susar', async () => {
  expect(await handleNotification()).toEqual({
    shouldPlaySound: false, shouldShowBanner: false, shouldShowList: false, shouldSetBadge: false,
  });
});

/** Izin yalnizca SES icin istenir (kutu izni istenmez); verilirse tercih cihaza yazilir. */
test('acilinca yalnizca ses izni istenir ve tercih saklanir', async () => {
  const yaz = jest.spyOn(SecureStore, 'setItemAsync').mockResolvedValue();
  const { result } = await renderHook(() => useSesliBildirim());

  let oldu = false;
  await act(async () => {
    oldu = await sesliBildirimiAyarla(true);
  });

  expect(oldu).toBe(true);
  expect(izinIste).toHaveBeenCalledWith({ ios: { allowAlert: false, allowSound: true, allowBadge: false } });
  expect(result.current).toBe(true);
  expect(yaz).toHaveBeenCalledWith(SESLI_BILDIRIM_ANAHTARI, 'acik');
});

test('izin verilmezse tercih kapali kalir', async () => {
  izinIste.mockResolvedValue({ granted: false });
  const yaz = jest.spyOn(SecureStore, 'setItemAsync').mockResolvedValue();
  const { result } = await renderHook(() => useSesliBildirim());

  let oldu = true;
  await act(async () => {
    oldu = await sesliBildirimiAyarla(true);
  });

  expect(oldu).toBe(false);
  expect(result.current).toBe(false);
  expect(yaz).not.toHaveBeenCalled();
});
