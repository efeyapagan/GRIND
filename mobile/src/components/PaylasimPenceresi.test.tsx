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

async function pencereyiAc() {
  return render(<PaylasimPenceresi setCount={12} durationSeconds={2880} acik onKapat={onKapat} />);
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

/** Kartin kendisi: set sayisi ustte, sure altinda, en altta GRIND (kullanici karari). */
test('kart set sayisini, sureyi ve GRIND yazisini tasir', async () => {
  await pencereyiAc();

  expect(screen.getByText('12')).toBeTruthy();
  expect(screen.getByText('48')).toBeTruthy(); // 2880 sn = 48 dk
  expect(screen.getByText('GRIND')).toBeTruthy();
});
