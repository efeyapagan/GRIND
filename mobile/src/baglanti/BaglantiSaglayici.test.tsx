import { act, render, screen } from '@testing-library/react-native';
import { AppState, Text } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { request, setBaglantiDinleyicisi } from '@grind/shared/api/client';
import BaglantiSaglayici, { useCevrimdisi } from './BaglantiSaglayici';
import CevrimdisiSeridi from './CevrimdisiSeridi';

jest.mock('@grind/shared/api/client', () => ({
  request: jest.fn(),
  setBaglantiDinleyicisi: jest.fn(),
}));

const requestMock = request as jest.Mock;
const dinleyiciKaydi = setBaglantiDinleyicisi as jest.Mock;
let simdi = 0;

function Durum() {
  return <Text testID="durum">{useCevrimdisi() ? 'cevrimdisi' : 'cevrimici'}</Text>;
}

/** `request()`in sonuc bildirimini taklit eder; saat `simdi`dedir (zamanlama kurallari `baglantiDurumu` testinde). */
async function bildir(sonuc: 'yanit' | 'agHatasi', an: number) {
  simdi = an;
  const dinleyici = dinleyiciKaydi.mock.calls.at(-1)![0] as (s: string) => void;
  await act(async () => dinleyici(sonuc));
}

beforeEach(() => {
  simdi = 0;
  jest.spyOn(Date, 'now').mockImplementation(() => simdi);
  requestMock.mockReset().mockRejectedValue(new TypeError('Network request failed'));
  dinleyiciKaydi.mockClear();
  onlineManager.setOnline(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function ciz() {
  await render(
    <BaglantiSaglayici>
      <CevrimdisiSeridi />
      <Durum />
    </BaglantiSaglayici>,
  );
}

/** #174: anlik kopma serit gostermez; 5 sn kesintisiz hata gosterir ve sorgular duraklar. */
test('5 sn kesintisiz ag hatasinda serit cikar ve sorgular cevrimdisina gecer', async () => {
  await ciz();

  await bildir('agHatasi', 0);
  await bildir('agHatasi', 3_000);
  expect(screen.queryByText('Çevrimdışı')).toBeNull();

  await bildir('agHatasi', 5_000);
  expect(screen.getByText('Çevrimdışı')).toBeTruthy();
  expect(screen.getByTestId('durum').props.children).toBe('cevrimdisi');
  expect(onlineManager.isOnline()).toBe(false);
});

test('sunucudan yanit gelince serit kalkar ve sorgular cevrimiciye doner', async () => {
  await ciz();
  await bildir('agHatasi', 0);
  await bildir('agHatasi', 6_000);
  expect(screen.getByText('Çevrimdışı')).toBeTruthy();

  await bildir('yanit', 7_000);

  expect(screen.queryByText('Çevrimdışı')).toBeNull();
  expect(onlineManager.isOnline()).toBe(true);
});

/** On plana donuste sunucu hemen saglik ucuyla yoklanir (3 sn tolerans baslar). */
test('uygulama on plana donunce saglik ucu yoklanir', async () => {
  const dinleyiciler: ((durum: string) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_tur, fn) => {
    dinleyiciler.push(fn as (durum: string) => void);
    return { remove: jest.fn() } as never;
  });
  await ciz();

  await act(async () => dinleyiciler.forEach((fn) => fn('active')));

  expect(requestMock).toHaveBeenCalledWith('/health', expect.objectContaining({ auth: false }));
});

test('cevrimiciyken serit hic cizilmez', async () => {
  await ciz();

  expect(screen.queryByTestId('cevrimdisi-seridi')).toBeNull();
});
