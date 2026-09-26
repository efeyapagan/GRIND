import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { useArkadasHaftasi } from '@grind/shared/api/queries';
import ArkadasKarsilastirma, { ANA_EKRAN_SATIRI } from './ArkadasKarsilastirma';

jest.mock('@grind/shared/api/queries', () => ({
  useArkadasHaftasi: jest.fn(),
  useProfilFotografi: () => ({ data: null }),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const useArkadasHaftasiMock = useArkadasHaftasi as jest.Mock;

function arkadas(username: string, kismi: Record<string, unknown> = {}) {
  return {
    username,
    displayName: null,
    hasAvatar: false,
    avatarVersion: null,
    trainedDaysThisWeek: 0,
    weeklyTargetDays: null,
    trainedToday: false,
    weeklySetCount: 0,
    weeklyVolume: 0,
    ...kismi,
  };
}

function veriVer(liste: unknown[]) {
  useArkadasHaftasiMock.mockReturnValue({ data: liste, isLoading: false, isError: false });
}

beforeEach(() => {
  mockPush.mockReset();
  veriVer([]);
});

test('arkadas yokken bos durum gosterilir', async () => {
  await render(<ArkadasKarsilastirma />);

  expect(screen.getByText('Henüz arkadaşın yok')).toBeTruthy();
});

/** #418: sira hedefe ulasma oranina gore; hedefsizler en sonda (ortak paketteki kural). */
test('arkadaslar orana gore siralanir, hedefsiz en altta', async () => {
  veriVer([
    arkadas('hedefsiz', { trainedDaysThisWeek: 6 }),
    arkadas('dusuk', { trainedDaysThisWeek: 1, weeklyTargetDays: 4 }),
    arkadas('yuksek', { trainedDaysThisWeek: 4, weeklyTargetDays: 4 }),
  ]);
  await render(<ArkadasKarsilastirma />);

  const adlar = screen.getAllByRole('button').map((d) => d.props.accessibilityLabel);

  expect(adlar).toEqual([
    'yuksek profilini aç',
    'dusuk profilini aç',
    'hedefsiz profilini aç',
  ]);
});

test('lider rozeti yalnizca en ustteki satirda', async () => {
  veriVer([
    arkadas('a', { trainedDaysThisWeek: 4, weeklyTargetDays: 4 }),
    arkadas('b', { trainedDaysThisWeek: 1, weeklyTargetDays: 4 }),
  ]);
  await render(<ArkadasKarsilastirma />);

  expect(screen.getAllByText('Lider')).toHaveLength(1);
});

test('bugun antrenman yapan isaretlenir', async () => {
  veriVer([arkadas('a', { trainedDaysThisWeek: 1, weeklyTargetDays: 3, trainedToday: true })]);
  await render(<ArkadasKarsilastirma />);

  expect(screen.getByLabelText('Bugün antrenman yaptı')).toBeTruthy();
});

test('hedefsiz arkadas gun sayisiyla gosterilir', async () => {
  veriVer([arkadas('a', { trainedDaysThisWeek: 3 })]);
  await render(<ArkadasKarsilastirma />);

  expect(screen.getByText('Bu hafta 3 gün')).toBeTruthy();
});

test('hedefli arkadas gun/hedef gosterir', async () => {
  veriVer([arkadas('a', { trainedDaysThisWeek: 2, weeklyTargetDays: 5 })]);
  await render(<ArkadasKarsilastirma />);

  expect(screen.getByText('2/5 gün')).toBeTruthy();
});

/** Ana ekran yalnizca ilk 5'i cizer; gerisi "Tümünü gör" ekraninda (kullanici karari). */
test('ana ekranda en fazla bes satir ve Tumunu gor', async () => {
  veriVer(
    Array.from({ length: ANA_EKRAN_SATIRI + 2 }, (_, i) =>
      arkadas(`k${i}`, { trainedDaysThisWeek: i, weeklyTargetDays: 7 }),
    ),
  );
  await render(<ArkadasKarsilastirma />);

  // Satirlar + "Tümünü gör" dugmesi
  expect(screen.getAllByRole('button')).toHaveLength(ANA_EKRAN_SATIRI + 1);
  expect(screen.getByText('Tümünü gör')).toBeTruthy();
});

test('bes ya da daha az arkadasta Tumunu gor cizilmez', async () => {
  veriVer([arkadas('a', { trainedDaysThisWeek: 1, weeklyTargetDays: 3 })]);
  await render(<ArkadasKarsilastirma />);

  expect(screen.queryByText('Tümünü gör')).toBeNull();
});

test('satira dokununca o kisinin profiline gidilir', async () => {
  veriVer([arkadas('efeypgn', { trainedDaysThisWeek: 1, weeklyTargetDays: 3 })]);
  await render(<ArkadasKarsilastirma />);

  await act(async () => fireEvent.press(screen.getByLabelText('efeypgn profilini aç')));

  expect(mockPush).toHaveBeenCalledWith('/profile/u/efeypgn');
});

test('hata durumunda uyari gosterilir', async () => {
  useArkadasHaftasiMock.mockReturnValue({ data: undefined, isLoading: false, isError: true });
  await render(<ArkadasKarsilastirma />);

  expect(screen.getByText('Arkadaşlar alınamadı.')).toBeTruthy();
});
