import { act, render, screen, fireEvent, within } from '@testing-library/react-native';
import { useArkadasDonemi } from '@grind/shared/api/queries';
import { TakvimDonemiProvider } from '../ui/TakvimDonemiContext';
import ArkadasKarsilastirma, { ANA_EKRAN_SATIRI } from './ArkadasKarsilastirma';

jest.mock('@grind/shared/api/queries', () => ({
  useArkadasDonemi: jest.fn(),
  useProfilFotografi: () => ({ data: null }),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const useArkadasDonemiMock = useArkadasDonemi as jest.Mock;

function arkadas(username: string, kismi: Record<string, unknown> = {}) {
  return {
    username,
    displayName: null,
    hasAvatar: false,
    avatarVersion: null,
    trainedDays: 0,
    weeklyTargetDays: null,
    trainedToday: false,
    setCount: 0,
    volume: 0,
    isSelf: false,
    ...kismi,
  };
}

function veriVer(liste: unknown[]) {
  useArkadasDonemiMock.mockReturnValue({ data: liste, isLoading: false, isError: false });
}

const BUGUN = '2026-09-30';

/** #420: kart takvimin donemini okur -- her zaman paylasilan saglayicinin icinde cizilir. */
async function ciz(gorunum: 'hafta' | 'ay' = 'hafta', gosterilen = BUGUN) {
  await render(
    <TakvimDonemiProvider bugun={BUGUN} baslangic={{ gorunum, gosterilen }}>
      <ArkadasKarsilastirma />
    </TakvimDonemiProvider>,
  );
}

beforeEach(() => {
  mockPush.mockReset();
  veriVer([]);
});

/** #425: liste artik hic bos olmaz -- kendi satiri hep gelir; arkadas yoksa ipucu satiri cizilir. */
test('yalnizca kendi satiri varken ipucu gosterilir', async () => {
  veriVer([arkadas('ben', { isSelf: true, trainedDays: 1, weeklyTargetDays: 3 })]);
  await ciz();

  expect(screen.getByText('Arkadaş ekleyince burada onlarla karşılaştırılırsın.')).toBeTruthy();
  expect(screen.getByLabelText('ben profilini aç')).toBeTruthy();
});

test('arkadas varken ipucu cizilmez', async () => {
  veriVer([
    arkadas('ben', { isSelf: true, trainedDays: 1, weeklyTargetDays: 3 }),
    arkadas('ali', { trainedDays: 2, weeklyTargetDays: 3 }),
  ]);
  await ciz();

  expect(screen.queryByText('Arkadaş ekleyince burada onlarla karşılaştırılırsın.')).toBeNull();
});

/** Kendi satiri siralamada AYRICALIKLI DEGIL: ayni kurala girer, lider olabilir. */
test('kendi satiri isaretlenir ve lider olabilir', async () => {
  veriVer([
    arkadas('ali', { trainedDays: 1, weeklyTargetDays: 4 }),
    arkadas('ben', { isSelf: true, trainedDays: 4, weeklyTargetDays: 4 }),
  ]);
  await ciz();

  const adlar = screen.getAllByRole('button').map((d) => d.props.accessibilityLabel);
  expect(adlar).toEqual(['ben profilini aç', 'ali profilini aç']);
  expect(screen.getByText('Sen')).toBeTruthy();
  expect(screen.getAllByText('Lider')).toHaveLength(1);
});

/** #418: sira hedefe ulasma oranina gore; hedefsizler en sonda (ortak paketteki kural). */
test('arkadaslar orana gore siralanir, hedefsiz en altta', async () => {
  veriVer([
    arkadas('hedefsiz', { trainedDays: 6 }),
    arkadas('dusuk', { trainedDays: 1, weeklyTargetDays: 4 }),
    arkadas('yuksek', { trainedDays: 4, weeklyTargetDays: 4 }),
  ]);
  await ciz();

  const adlar = screen.getAllByRole('button').map((d) => d.props.accessibilityLabel);

  expect(adlar).toEqual([
    'yuksek profilini aç',
    'dusuk profilini aç',
    'hedefsiz profilini aç',
  ]);
});

test('lider rozeti yalnizca en ustteki satirda', async () => {
  veriVer([
    arkadas('a', { trainedDays: 4, weeklyTargetDays: 4 }),
    arkadas('b', { trainedDays: 1, weeklyTargetDays: 4 }),
  ]);
  await ciz();

  expect(screen.getAllByText('Lider')).toHaveLength(1);
});

/** #488: hafta basinda herkes sifirdayken hic tac cizilmez. */
test('kimse antrenman yapmadiysa lider rozeti cizilmez', async () => {
  veriVer([
    arkadas('a', { weeklyTargetDays: 3 }),
    arkadas('b', { weeklyTargetDays: 4 }),
  ]);
  await ciz();

  expect(screen.queryByText('Lider')).toBeNull();
});

/** Biri calisir calismaz kiyas baslar: tac o kisiye gider. */
test('ilk antrenmani yapan lider olur', async () => {
  veriVer([
    arkadas('a', { weeklyTargetDays: 3 }),
    arkadas('b', { trainedDays: 1, weeklyTargetDays: 4 }),
  ]);
  await ciz();

  expect(screen.getAllByText('Lider')).toHaveLength(1);
});

test('bugun antrenman yapan isaretlenir', async () => {
  veriVer([arkadas('a', { trainedDays: 1, weeklyTargetDays: 3, trainedToday: true })]);
  await ciz();

  expect(screen.getByLabelText('Bugün antrenman yaptı')).toBeTruthy();
});

test('hedefsiz arkadas gun sayisiyla gosterilir', async () => {
  veriVer([arkadas('a', { trainedDays: 3 })]);
  await ciz();

  // #420: metin donemden bagimsiz -- "Bu hafta" gecmis bir haftada ya da ayda yalan olurdu.
  expect(screen.getByText('3 gün')).toBeTruthy();
});

test('hedefli arkadas gun/hedef gosterir', async () => {
  veriVer([arkadas('a', { trainedDays: 2, weeklyTargetDays: 5 })]);
  await ciz();

  expect(screen.getByText('2/5 gün')).toBeTruthy();
});

/**
 * #420/#518 (kullanici karari): ana ekranda en iyi 6 arkadas; 6'yi asarsa kartin ALTINDA "Tum
 * arkadaslari gor" baglantisi cikar ve ayri ekrani acar.
 */
test('ana ekranda en fazla alti satir ve altta tum arkadaslari gor', async () => {
  expect(ANA_EKRAN_SATIRI).toBe(6);
  veriVer(
    Array.from({ length: ANA_EKRAN_SATIRI + 2 }, (_, i) =>
      arkadas(`k${i}`, { trainedDays: i, weeklyTargetDays: 7 }),
    ),
  );
  await ciz();

  const satirlar = screen.getAllByLabelText(/profilini aç$/);
  expect(satirlar).toHaveLength(ANA_EKRAN_SATIRI);

  // Baglanti listenin ALTINDA: agac sirasinda son satirdan sonra gelir.
  const agac = JSON.stringify(screen.toJSON());
  expect(agac.indexOf('Tüm arkadaşları gör')).toBeGreaterThan(agac.lastIndexOf('profilini aç'));

  await act(async () => fireEvent.press(screen.getByText('Tüm arkadaşları gör')));
  expect(mockPush).toHaveBeenCalledWith('/arkadaslar');
});

test('alti ya da daha az arkadasta tum arkadaslari gor cizilmez', async () => {
  veriVer(Array.from({ length: 6 }, (_, i) => arkadas(`k${i}`, { trainedDays: 1, weeklyTargetDays: 3 })));
  await ciz();

  expect(screen.queryByText('Tüm arkadaşları gör')).toBeNull();
});

test('satira dokununca o kisinin profiline gidilir', async () => {
  veriVer([arkadas('efeypgn', { trainedDays: 1, weeklyTargetDays: 3 })]);
  await ciz();

  await act(async () => fireEvent.press(screen.getByLabelText('efeypgn profilini aç')));

  expect(mockPush).toHaveBeenCalledWith('/profile/u/efeypgn');
});

test('hata durumunda uyari gosterilir', async () => {
  useArkadasDonemiMock.mockReturnValue({ data: undefined, isLoading: false, isError: true });
  await ciz();

  expect(screen.getByText('Arkadaşlar alınamadı.')).toBeTruthy();
});

// ---- Donem (#420) ----

/** Liste takvimin DONEMIYLE istenir: gecmis bir hafta secilince o haftanin araligi gider. */
test('liste takvimin gosterdigi haftanin araligiyla istenir', async () => {
  await ciz('hafta', '2026-09-16');

  expect(useArkadasDonemiMock).toHaveBeenLastCalledWith('2026-09-14', '2026-09-20');
});

test('takvim aylikken liste ayin araligiyla istenir', async () => {
  await ciz('ay', BUGUN);

  expect(useArkadasDonemiMock).toHaveBeenLastCalledWith('2026-09-01', '2026-09-30');
});

/** Aylik donemde hedef x4 gosterilir (kullanici karari): haftada 3 gun hedefi olan, ayda 12. */
test('aylik donemde hedef dort kati gosterilir', async () => {
  veriVer([arkadas('a', { trainedDays: 6, weeklyTargetDays: 3 })]);
  await ciz('ay', BUGUN);

  expect(screen.getByText('6/12 gün')).toBeTruthy();
});

// ---- Cam satirlar ve ince ilerleme cizgisi (#491, gorsel tasarim spec'i Karar 9) ----

/** Satirlar duz `bg-surface-*` degil cam kart (`CamKart`). */
test('satirlar cam yuzeydedir', async () => {
  veriVer([
    arkadas('ben', { isSelf: true, trainedDays: 1, weeklyTargetDays: 3 }),
    arkadas('ali', { trainedDays: 2, weeklyTargetDays: 3 }),
  ]);
  await ciz();

  for (const ad of ['ben', 'ali']) {
    const sinif: string = screen.getByLabelText(`${ad} profilini aç`).props.className;
    expect(sinif).toContain('rounded-3xl');
    expect(sinif).not.toMatch(/bg-surface/);
  }
});

/**
 * #425: kendi satiri hemen bulunsun. Vurgu cam uzerinde SVG'de `fg` dolgusu + `fillOpacity` (spec
 * Karar 9). Kullanici bildirdi: `bg-fg opacity-5` sinifi uygulanmayip satiri TAM acik gri (koyu temada)
 * dolduruyordu -- opaklik burada sinifla DEGIL SVG ozelligiyle verilir ve dusuk kalir.
 */
test('kendi satirinin vurgusu dusuk opakliktadir, baskasininki yoktur', async () => {
  veriVer([
    arkadas('ben', { isSelf: true, trainedDays: 1, weeklyTargetDays: 3 }),
    arkadas('ali', { trainedDays: 2, weeklyTargetDays: 3 }),
  ]);
  await ciz();

  const vurgu = within(screen.getByLabelText('ben profilini aç')).getByTestId('kendi-satir-vurgusu');
  expect(vurgu.props.fillOpacity).toBeGreaterThan(0);
  expect(vurgu.props.fillOpacity).toBeLessThanOrEqual(0.1);
  expect(within(screen.getByLabelText('ali profilini aç')).queryByTestId('kendi-satir-vurgusu')).toBeNull();
});

/**
 * #668: `CamKart` icerigini kirpmaz; dikdortgen vurgu kendi kabinda kartin kosesine kirpilmali. Kirpilmayinca
 * acik temada (`fg` koyu) alt koseler koyu ve dik acili gorunuyordu.
 */
test('kendi satirinin vurgusu kartin yuvarlak kosesine kirpilir', async () => {
  veriVer([arkadas('ben', { isSelf: true, trainedDays: 1, weeklyTargetDays: 3 })]);
  await ciz();

  const kap = within(screen.getByLabelText('ben profilini aç')).getByTestId('kendi-satir-vurgusu-kabi');
  expect(kap.props.className).toEqual(expect.stringContaining('overflow-hidden'));
  expect(kap.props.className).toEqual(expect.stringContaining('rounded-3xl'));
  expect(within(kap).getByTestId('kendi-satir-vurgusu')).toBeTruthy();
});

/** Hedef cubugu NativeWind View degil SVG: ray tam genisliktedir, dolgu oran kadar (2/3 gun -> %67). */
test('hedef cubugu svg cizilir: ray tam, dolgu orana gore', async () => {
  veriVer([arkadas('ali', { trainedDays: 2, weeklyTargetDays: 3 })]);
  await ciz();

  const satir = within(screen.getByLabelText('ali profilini aç'));
  expect(satir.getByTestId('hedef-ray').props.width).toBe('100%');
  expect(satir.getByTestId('hedef-dolgu').props.width).toBe('67%');
});
