import { act, render, screen, fireEvent } from '@testing-library/react-native';
import PaylasimPenceresi from './PaylasimPenceresi';

const mockGaleriyeKaydet = jest.fn();
const mockPanoyaKopyala = jest.fn();

jest.mock('../lib/paylasimGorseli', () => ({
  galeriyeKaydet: (...a: unknown[]) => mockGaleriyeKaydet(...a),
  panoyaKopyala: (...a: unknown[]) => mockPanoyaKopyala(...a),
}));


const onKapat = jest.fn();

beforeEach(() => {
  mockGaleriyeKaydet.mockReset().mockResolvedValue('tamam');
  mockPanoyaKopyala.mockReset().mockResolvedValue('tamam');
  onKapat.mockReset();
});

async function pencereyiAc(templateName: string | null = 'Push Day') {
  return render(
    <PaylasimPenceresi templateName={templateName} setCount={12} durationSeconds={2880} acik onKapat={onKapat} />,
  );
}

/** Kullanici kararı: dokununca galeriye mi kaydedilecek yoksa kopyalanacak mi SORULUR. */
test('iki secenek de sunulur', async () => {
  await pencereyiAc();

  expect(screen.getByText('Galeriye kaydet')).toBeTruthy();
  expect(screen.getByText('Panoya kopyala')).toBeTruthy();
});

test('galeriye kaydet secilince kaydedilir ve pencere kapanir', async () => {
  await pencereyiAc();

  await act(async () => fireEvent.press(screen.getByText('Galeriye kaydet')));

  expect(mockGaleriyeKaydet).toHaveBeenCalled();
  expect(onKapat).toHaveBeenCalled();
});

test('panoya kopyala secilince kopyalanir', async () => {
  await pencereyiAc();

  await act(async () => fireEvent.press(screen.getByText('Panoya kopyala')));

  expect(mockPanoyaKopyala).toHaveBeenCalled();
});

/**
 * KRITIK (kabul kriteri): izin reddedilirse kullanici NE OLDUGUNU anlamali. Sessizce hicbir sey
 * olmamasi, ozelligin bozuk oldugu izlenimi birakir.
 */
test('izin reddedilince aciklama gosterilir ve pencere kapanmaz', async () => {
  mockGaleriyeKaydet.mockResolvedValue('izin-yok');

  await pencereyiAc();
  await act(async () => fireEvent.press(screen.getByText('Galeriye kaydet')));

  expect(screen.getByRole('alert')).toBeTruthy();
  expect(onKapat).not.toHaveBeenCalled();
});

test('beklenmeyen hatada da kullanici bilgilendirilir', async () => {
  mockPanoyaKopyala.mockResolvedValue('hata');

  await pencereyiAc();
  await act(async () => fireEvent.press(screen.getByText('Panoya kopyala')));

  expect(screen.getByRole('alert')).toBeTruthy();
});

/**
 * #470 (kullanici karari): kart en ustte isim, altinda set, ayni puntoyla altinda sure, en altta
 * (daha kucuk) dumbbell + GRIND tasir.
 */
test('kart ismi, set sayisini, sureyi ve GRIND yazisini tasir', async () => {
  await pencereyiAc('Push Day');

  expect(screen.getByText('Push Day')).toBeTruthy();
  expect(screen.getByText('12 set')).toBeTruthy();
  expect(screen.getByText('48 dk')).toBeTruthy(); // 2880 sn = 48 dk
  expect(screen.getByText('GRIND')).toBeTruthy();
});

/** Sablonsuz antrenmanda (#470) isim yerine "Serbest" gosterilir -- GecmisOzeti ile ayni desen. */
test('sablon adi yoksa kartta "Serbest" gosterilir', async () => {
  await pencereyiAc(null);

  expect(screen.getByText('Serbest')).toBeTruthy();
});

/** #470: set ve sure AYNI puntoda -- ismin kucugu, GRIND'in buyugu olmali. */
test('set ve sure satirlari ayni punto, isimden kucuk, GRIND satirindan buyuk', async () => {
  await pencereyiAc('Push Day');

  const isimStili = screen.getByText('Push Day').props.style;
  const setStili = screen.getByText('12 set').props.style;
  const sureStili = screen.getByText('48 dk').props.style;
  const markaStili = screen.getByText('GRIND').props.style;

  expect(setStili.fontSize).toBe(sureStili.fontSize);
  expect(setStili.fontSize).toBeLessThan(isimStili.fontSize);
  expect(markaStili.fontSize).toBeLessThan(setStili.fontSize);
});
