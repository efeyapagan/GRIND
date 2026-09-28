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
    isSelf: false,
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

/** #425: liste artik hic bos olmaz -- kendi satiri hep gelir; arkadas yoksa ipucu satiri cizilir. */
test('yalnizca kendi satiri varken ipucu gosterilir', async () => {
  veriVer([arkadas('ben', { isSelf: true, trainedDaysThisWeek: 1, weeklyTargetDays: 3 })]);
  await render(<ArkadasKarsilastirma />);

  expect(screen.getByText('Arkadaş ekleyince burada onlarla karşılaştırılırsın.')).toBeTruthy();
  expect(screen.getByLabelText('ben profilini aç')).toBeTruthy();
});

test('arkadas varken ipucu cizilmez', async () => {
  veriVer([
    arkadas('ben', { isSelf: true, trainedDaysThisWeek: 1, weeklyTargetDays: 3 }),
    arkadas('ali', { trainedDaysThisWeek: 2, weeklyTargetDays: 3 }),
  ]);
  await render(<ArkadasKarsilastirma />);

  expect(screen.queryByText('Arkadaş ekleyince burada onlarla karşılaştırılırsın.')).toBeNull();
});

/** Kendi satiri siralamada AYRICALIKLI DEGIL: ayni kurala girer, lider olabilir. */
test('kendi satiri isaretlenir ve lider olabilir', async () => {
  veriVer([
    arkadas('ali', { trainedDaysThisWeek: 1, weeklyTargetDays: 4 }),
    arkadas('ben', { isSelf: true, trainedDaysThisWeek: 4, weeklyTargetDays: 4 }),
  ]);
  await render(<ArkadasKarsilastirma />);

  const adlar = screen.getAllByRole('button').map((d) => d.props.accessibilityLabel);
  expect(adlar).toEqual(['ben profilini aç', 'ali profilini aç']);
  expect(screen.getByText('Sen')).toBeTruthy();
  expect(screen.getAllByText('Lider')).toHaveLength(1);
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

/** #488: hafta basinda herkes sifirdayken hic tac cizilmez. */
test('kimse antrenman yapmadiysa lider rozeti cizilmez', async () => {
  veriVer([
    arkadas('a', { weeklyTargetDays: 3 }),
    arkadas('b', { weeklyTargetDays: 4 }),
  ]);
  await render(<ArkadasKarsilastirma />);

  expect(screen.queryByText('Lider')).toBeNull();
});

/** Biri calisir calismaz kiyas baslar: tac o kisiye gider. */
test('ilk antrenmani yapan lider olur', async () => {
  veriVer([
    arkadas('a', { weeklyTargetDays: 3 }),
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
