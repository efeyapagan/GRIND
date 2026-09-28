import { render, screen, fireEvent } from '@testing-library/react-native';
import KabukBaslik from './KabukBaslik';
import { ANTRENMAN_BARI_YUKSEKLIGI } from './olculer';

const mockPush = jest.fn();
let mockPathname = '/';
jest.mock('expo-router', () => ({
  // CizgiliBaslik (#466'dan beri antrenman barinda) odaklanmada cizgiyi animasyonla ciziyor.
  useFocusEffect: (geriCagri: () => void) => geriCagri(),
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0 }) }));
jest.mock('../components/YorumDiliSecici', () => {
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => (
      <Pressable accessibilityRole="button" accessibilityLabel="Yorum dili">
        <Text>🇹🇷</Text>
      </Pressable>
    ),
  };
});
let mockBaslik = 'Başlık';
jest.mock('@grind/shared/pageTitle', () => ({ useHeaderTitle: () => mockBaslik }));
// Dinlenme gostergesi RestTimerProvider ister; bu testlerin konusu degil.
jest.mock('../components/DinlenmeKabugu', () => ({ DinlenmeGostergesi: () => null }));

let mockOkunmamis: number | undefined = 0;
// #480: barin sag ucu (`BarSagUcu`) acik oturumu sorar -- oturum yokken "GRIND" yazisi durur.
let mockAcikOturum: { isOpen: boolean; startedAt: string } | null = null;
jest.mock('@grind/shared/api/queries', () => ({
  useOkunmamisBildirimSayisi: () => ({ data: mockOkunmamis }),
  useOpenSession: () => ({ data: mockAcikOturum }),
}));

beforeEach(() => {
  mockPush.mockReset();
  mockOkunmamis = 0;
  mockAcikOturum = null;
  mockBaslik = 'Başlık';
});

/** #324: ana sayfada sag ustte "GRIND" yazisinin yerini bildirim ve GRINDY kisayollari alir. */
test('ana sayfada bildirim ve GRINDY dugmeleri GRIND yazisinin yerini alir', async () => {
  mockPathname = '/';
  await render(<KabukBaslik />);

  expect(screen.queryByText('GRIND')).toBeNull();

  await fireEvent.press(screen.getByLabelText('Bildirimler'));
  expect(mockPush).toHaveBeenCalledWith('/bildirimler');

  await fireEvent.press(screen.getByLabelText("GRINDY'ye git"));
  expect(mockPush).toHaveBeenCalledWith('/insights');
});

test('ana sayfa disinda GRIND yazisi durur, kisayollar yoktur', async () => {
  mockPathname = '/templates';
  await render(<KabukBaslik />);

  expect(screen.getByText('GRIND')).toBeTruthy();
  expect(screen.queryByLabelText('Bildirimler')).toBeNull();
  expect(screen.queryByLabelText("GRINDY'ye git")).toBeNull();
});

/** #325: okunmamis varsa zilin ustunde sayi rozeti; etiket sayiyi tasir. */
test('okunmamis bildirim varsa rozet sayiyi gosterir, etiket sayiyi tasir', async () => {
  mockPathname = '/';
  mockOkunmamis = 3;
  await render(<KabukBaslik />);

  // Rozet sayisi erisilebilirlik agacindan gizli -- sorgu gizlileri de kapsar (SekmeDugmesi deseni).
  const gizliDahil = { includeHiddenElements: true };
  expect(screen.getByText('3', gizliDahil)).toBeTruthy();
  expect(screen.getByLabelText('Bildirimler, 3 okunmamış')).toBeTruthy();
});

test("okunmamis 9'dan fazlaysa rozet 9+ yazar", async () => {
  mockPathname = '/';
  mockOkunmamis = 12;
  await render(<KabukBaslik />);

  expect(screen.getByText('9+', { includeHiddenElements: true })).toBeTruthy();
});

test('okunmamis yoksa ya da sayi gelmediyse rozet cizilmez', async () => {
  mockPathname = '/';
  mockOkunmamis = undefined;
  await render(<KabukBaslik />);

  expect(screen.queryByTestId('zil-rozeti')).toBeNull();
  expect(screen.getByLabelText('Bildirimler')).toBeTruthy();
});

/**
 * #199: GRINDY ekraninda sag ustteki "GRIND" yazisinin yerini yorum dilinin bayragi alir --
 * kullanici yorumun dilini oradan degistirir.
 */
test('GRINDY ekraninda GRIND yazisi yerine bayrak vardir', async () => {
  mockPathname = '/insights';
  await render(<KabukBaslik />);

  expect(screen.queryByText('GRIND')).toBeNull();
  expect(screen.getByLabelText('Yorum dili')).toBeTruthy();
});

/** AYIRT EDICI: bayrak yalnizca o ekranda; diger ekranlarda "GRIND" durur. */
test('diger ekranlarda bayrak yoktur', async () => {
  mockPathname = '/templates';
  await render(<KabukBaslik />);

  expect(screen.getByText('GRIND')).toBeTruthy();
  expect(screen.queryByLabelText('Yorum dili')).toBeNull();
});

/**
 * #466 (kullanici karari): antrenman ekraninin KENDI ust bari var -- sayfa basligi yerine alti
 * cizili "Antrenmana basla" ve saginda GRIND. Icerikle kaymaz, tepede sabit durur.
 */
test('antrenman ekraninda bar ekranin bildirdigi basligi ve GRIND i gosterir', async () => {
  mockPathname = '/antrenman';
  mockBaslik = 'Antrenmana başla';
  await render(<KabukBaslik />);

  expect(screen.getByText('Antrenmana başla')).toBeTruthy();
  expect(screen.getByText('GRIND')).toBeTruthy();
});

/** Sekme koku: geri tusu yok. */
test('antrenman ekraninda geri tusu yoktur', async () => {
  mockPathname = '/antrenman';
  await render(<KabukBaslik />);

  expect(screen.queryByLabelText('Geri')).toBeNull();
});

/** AYIRT EDICI: ayni sekmenin diger ekranlarinda bar durur (geri tusu oradan geliyor). */
test('sablonlar ekraninda ust bar durur', async () => {
  mockPathname = '/templates';
  await render(<KabukBaslik />);

  expect(screen.getByText('GRIND')).toBeTruthy();
});

/**
 * #480 (kullanici karari): "GRIND yazisi kalksin ve orada sure yazsin" -- acik antrenman varken
 * barin sag ucunda gecen sure durur, boylece baska bir ekrandaki kullanici antrenmaninin
 * surdugunu gorur. Sure barin ORTASINA konmadi: orasi dinlenme sayacinin yeri.
 */
test('acik antrenman varken GRIND yerini gecen sure alir', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-20T12:34:56Z'));
  mockPathname = '/templates';
  mockAcikOturum = { isOpen: true, startedAt: '2026-09-20T12:29:56Z' };

  await render(<KabukBaslik />);

  expect(screen.queryByText('GRIND')).toBeNull();
  expect(screen.getByText('5:00')).toBeTruthy();
  jest.useRealTimers();
});

/** Antrenman ekraninin kendi barinda da ayni kural isler (iki barda tek bilesen). */
test('antrenman ekraninda da acik antrenman varken sure gorunur', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-20T12:34:56Z'));
  mockPathname = '/antrenman';
  mockAcikOturum = { isOpen: true, startedAt: '2026-09-20T12:29:56Z' };

  await render(<KabukBaslik />);

  expect(screen.queryByText('GRIND')).toBeNull();
  expect(screen.getByText('5:00')).toBeTruthy();
  jest.useRealTimers();
});

/**
 * #487 (kullanici karari): antrenman sururken bar "Antrenmana basla" yaziyordu. Acik oturumda
 * baslik "Antrenman" olur; cizginin kisalmasi `CizgiliBaslik`in kendi olcumunden gelir
 * (bkz. CizgiliBaslik.test.tsx).
 */
/**
 * #499: antrenman barinin basligini EKRAN bildirir (`usePageTitle`) -- #494'un "Antrenmana basla"
 * gorunumunde antrenman ACIK olsa da baslik odur. Oturuma bakan eski kural orada "Antrenman"
 * yaziyordu (kullanici: "menu start workout ama ust baslik workout kaliyor").
 */
test('antrenman barinin basligi acik oturumda da ekrandan gelir', async () => {
  mockPathname = '/antrenman';
  mockAcikOturum = { isOpen: true, startedAt: '2026-09-20T12:29:56Z' };
  mockBaslik = 'Antrenmana başla';

  await render(<KabukBaslik />);

  expect(screen.getByRole('header')).toHaveTextContent('Antrenmana başla');
});

/** Ekran basligini henuz bildirmediyse (ilk cizim) bar bos kalmaz: oturuma gore makul bir deger. */
test('baslik bildirilmemisken oturuma gore yedek baslik yazilir', async () => {
  mockPathname = '/antrenman';
  mockBaslik = '';
  mockAcikOturum = { isOpen: true, startedAt: '2026-09-20T12:29:56Z' };

  const { rerender } = await render(<KabukBaslik />);
  expect(screen.getByRole('header')).toHaveTextContent('Antrenman');

  mockAcikOturum = null;
  await rerender(<KabukBaslik />);
  expect(screen.getByText('Antrenmana başla')).toBeTruthy();
});

/**
 * #487: dinlenme sayacinin genis paneli bu barin USTUNE oturur ve onu TAM kapatmali -- panel
 * kisa kalinca basligin altindaki turuncu cizgi altindan gorunuyordu. Iki yer de AYNI sabitten
 * okur (panel tarafi: DinlenmeKabugu.test.tsx).
 */
test('antrenman bari paylasilan yukseklik sabitini kullanir', async () => {
  mockPathname = '/antrenman';

  await render(<KabukBaslik />);

  expect(screen.getByTestId('antrenman-bari').props.style).toEqual(
    expect.objectContaining({ height: ANTRENMAN_BARI_YUKSEKLIGI }),
  );
});
