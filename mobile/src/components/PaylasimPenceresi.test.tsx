import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
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
 * (daha kucuk) dumbbell + GRIND tasir. #598: rakamlar birimlerinden ayri cizilir.
 */
test('kart ismi, set sayisini, sureyi ve GRIND yazisini tasir', async () => {
  await pencereyiAc('Push Day');

  expect(screen.getByTestId('paylasim-baslik').props.children).toBe('Push Day');
  expect(screen.getByTestId('paylasim-set-sayisi').props.children).toBe(12);
  expect(screen.getByText('set')).toBeTruthy();
  expect(screen.getByTestId('paylasim-dakika').props.children).toBe(48); // 2880 sn = 48 dk
  expect(screen.getByText('dk')).toBeTruthy();
  expect(screen.getByTestId('paylasim-marka').props.children).toBe('GRIND');
});

/** #470: set ve sure AYNI puntoda -- ismin kucugu, GRIND'in buyugu olmali. */
test('set ve sure satirlari ayni punto, isimden kucuk, GRIND satirindan buyuk', async () => {
  await pencereyiAc('Push Day');

  const punto = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style).fontSize;

  expect(punto('paylasim-set-sayisi')).toBe(punto('paylasim-dakika'));
  expect(punto('paylasim-set-sayisi')).toBeLessThan(punto('paylasim-baslik'));
  expect(punto('paylasim-marka')).toBeLessThan(punto('paylasim-set-sayisi'));
});
