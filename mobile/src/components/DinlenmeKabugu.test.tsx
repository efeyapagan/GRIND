import { useEffect } from 'react';
import { render, screen } from '@testing-library/react-native';
import { useOpenSession } from '@grind/shared/api/queries';
import { RestTimerProvider, useRestTimer } from '@grind/shared/restTimer';
import { dinlenmeBaslat, duraklat } from '@grind/shared/lib/dinlenme';
import DinlenmeKabugu, { DinlenmeGostergesi } from './DinlenmeKabugu';
import { ANTRENMAN_BARI_YUKSEKLIGI } from '../ui/olculer';

jest.mock('@grind/shared/api/queries', () => ({ useOpenSession: jest.fn() }));
let mockPathname = '/';
jest.mock('expo-router', () => ({ usePathname: () => mockPathname }));

beforeEach(() => {
  mockPathname = '/';
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0 }) }));
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));

const useOpenSessionMock = useOpenSession as jest.Mock;

/** Antrenman ekraninin yaptigi gibi: set eklenince 90 sn'lik sayac baslatir. */
function SayaciBaslat() {
  const [, setDinlenme] = useRestTimer();
  useEffect(() => {
    setDinlenme(dinlenmeBaslat(Date.now(), 90));
  }, [setDinlenme]);
  return null;
}

function Kabuk() {
  return (
    <RestTimerProvider>
      <SayaciBaslat />
      <DinlenmeGostergesi />
      <DinlenmeKabugu />
    </RestTimerProvider>
  );
}

/**
 * #331: sayac bitmeden antrenman bitirilince (ya da iptal edilince) ana sayfada saymaya devam
 * ediyordu -- oturumla bagi kuran `useDinlenme` yalnizca antrenman ekraninda monte. Acik oturum
 * sorgusu "oturum yok" dedigi anda kabuktaki sayac kalkmali.
 */
test('acik antrenman kalmayinca dinlenme sayaci kabuktan kalkar', async () => {
  useOpenSessionMock.mockReturnValue({ data: { id: 7, isOpen: true }, isSuccess: true });
  const { rerender } = await render(<Kabuk />);
  expect(screen.getByText('1:30')).toBeTruthy();

  useOpenSessionMock.mockReturnValue({ data: null, isSuccess: true });
  await rerender(<Kabuk />);

  expect(screen.queryByText(/\d:\d\d/)).toBeNull();
});

// ---- Duraklatilmis sayac cizilmez (#477) ----

/** Antrenman ekraninin yaptigi gibi baslatir, sonra duraklatir. */
function SayaciDuraklat() {
  const [, setDinlenme] = useRestTimer();
  useEffect(() => {
    const simdi = Date.now();
    setDinlenme(duraklat(dinlenmeBaslat(simdi, 90)!, simdi + 30_000));
  }, [setDinlenme]);
  return null;
}

/**
 * #477: bitirme ekranindayken sayac duraklatilir ve o ekranda GORUNMEZ. Gizleme karari
 * duraklatilmis olmasindan turer -- sayan bir sey yoksa cizilecek bir sey de yok; boylece
 * kabugun hangi ekranda oldugunu bilmesi gerekmez.
 */
test('duraklatilmis sayac ne genis panelde ne gostergede cizilir', async () => {
  useOpenSessionMock.mockReturnValue({ data: { id: 1 }, isLoading: false, isError: false });

  await render(
    <RestTimerProvider>
      <SayaciDuraklat />
      <DinlenmeGostergesi />
      <DinlenmeKabugu />
    </RestTimerProvider>,
  );

  // Ne kalan sure ne de sayaca ait herhangi bir metin cizilir.
  expect(screen.queryByText(/\d:\d\d/)).toBeNull();
});

/**
 * #487 (kullanici bildirdi): genis panel `h-12` (48 px) iken antrenman barindan kisa kaliyordu ve
 * basligin altindaki kavisli turuncu cizgi panelin ALTINDAN gorunuyordu. Panel bari TAM kapatmali;
 * iki yer de AYNI sabitten okur (bar tarafi: KabukBaslik.test.tsx).
 */
test('genis panel antrenman bariyla ayni yukseklikte cizilir', async () => {
  mockPathname = '/antrenman';
  useOpenSessionMock.mockReturnValue({ data: { id: 7, isOpen: true }, isSuccess: true });

  await render(<Kabuk />);

  expect(screen.getByTestId('dinlenme-paneli').props.style).toEqual(
    expect.objectContaining({ height: ANTRENMAN_BARI_YUKSEKLIGI }),
  );
});

/**
 * #590: genis panel duz `bg-surface-2` bant degil cam (spec Karar 9); alt kenardaki ilerleme cizgisi
 * NativeWind kutusu degil SVG'dir (Karar 9 "ince cizim dili").
 */
test('genis panel cam yuzeydedir ve ilerleme cizgisi SVG ile cizilir', async () => {
  mockPathname = '/antrenman';
  useOpenSessionMock.mockReturnValue({ data: { id: 7, isOpen: true }, isSuccess: true });

  await render(<Kabuk />);

  expect(screen.getByTestId('dinlenme-bandi').props.className).not.toMatch(/bg-surface/);
  expect(screen.getByTestId('cam-kenar')).toBeTruthy();
  expect(screen.getByTestId('dinlenme-ilerleme')).toBeTruthy();
});
