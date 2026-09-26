import { render, screen, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import RirAlani from './RirAlani';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

/**
 * #266: RIR artık yazılmaz, alana dokununca açılan on duraklık kaydırıcıdan seçilir. Parmakla
 * SÜRÜKLEME burada test EDİLMEZ: jest ortamında rayın ekrandaki ölçüsü sıfırdır; konum → durak hesabı
 * `web/src/lib/rir.test.ts`te (ortak kaynak). Burada açılma, durağa dokunma, erişilebilirlik
 * artır eylemi, Temizle ve bilgi düğmesi.
 */
test('kapali baslar; alana dokununca kaydirici acilir ve secili durak aciklamasiyla yazar', async () => {
  await render(<RirAlani id="rir" deger={2.5} onDegis={jest.fn()} />);

  expect(screen.queryByLabelText('RIR')).toBeNull();
  await fireEvent.press(screen.getByLabelText('RIR (opsiyonel): 2–3'));

  expect(screen.getByLabelText('RIR')).toBeTruthy();
  expect(screen.getByText('Zorlayıcı ancak kontrollü ve güvenli.')).toBeTruthy();
});

/** Kullanıcı kararı: tutamaç hep görünsün -- boş alan açılınca 0'dan başlar. */
test('deger yokken alan acilinca 0 secilir', async () => {
  const onDegis = jest.fn();
  await render(<RirAlani id="rir" deger={null} onDegis={onDegis} />);

  await fireEvent.press(screen.getByLabelText('RIR (opsiyonel): girilmedi'));

  expect(onDegis).toHaveBeenCalledWith(0);
});

test('duraga dokununca o deger secilir', async () => {
  const onDegis = jest.fn();
  await render(<RirAlani id="rir" deger={2.5} onDegis={onDegis} />);

  await fireEvent.press(screen.getByLabelText(/^RIR \(opsiyonel\)/));
  await fireEvent.press(screen.getByLabelText('4+'));

  expect(onDegis).toHaveBeenCalledWith(5);
});

test('artirma eylemi bir durak (yarim adim) ilerler', async () => {
  const onDegis = jest.fn();
  await render(<RirAlani id="rir" deger={2.5} onDegis={onDegis} />);

  await fireEvent.press(screen.getByLabelText(/^RIR \(opsiyonel\)/));
  await fireEvent(screen.getByLabelText('RIR'), 'accessibilityAction', {
    nativeEvent: { actionName: 'increment' },
  });

  expect(onDegis).toHaveBeenCalledWith(3);
});

test('Temizle secili degeri kaldirir ve paneli kapatir', async () => {
  const onDegis = jest.fn();
  await render(<RirAlani id="rir" deger={2} onDegis={onDegis} />);

  await fireEvent.press(screen.getByLabelText(/^RIR \(opsiyonel\)/));
  await fireEvent.press(screen.getByRole('button', { name: 'Temizle' }));

  expect(onDegis).toHaveBeenCalledWith(null);
  expect(screen.queryByLabelText('RIR')).toBeNull();
});

test('duzenleyicide (temizlenemez) Temizle sunulmaz', async () => {
  await render(<RirAlani id="rir" deger={2} onDegis={jest.fn()} temizlenebilir={false} />);

  await fireEvent.press(screen.getByLabelText(/^RIR \(opsiyonel\)/));

  expect(screen.queryByRole('button', { name: 'Temizle' })).toBeNull();
});

test('bilgi dugmesi RIRin ne oldugunu aciklar', async () => {
  await render(<RirAlani id="rir" deger={null} onDegis={jest.fn()} />);

  await fireEvent.press(screen.getByLabelText('RIR (opsiyonel): girilmedi'));
  await fireEvent.press(screen.getByLabelText('RIR nedir?'));

  expect(screen.getByText(/setin sonunda yedekte kaç tekrar/)).toBeTruthy();
});

/** #388: secili durak degisince alt menudeki (#379) hafif "tik" hissedilir; ayni duraga dokunmak titretmez. */
test('baska duraga gecince bir kez hafif titresim verir, secili duraga dokununca vermez', async () => {
  await render(<RirAlani id="rir" deger={2} onDegis={jest.fn()} />);
  await fireEvent.press(screen.getByLabelText(/^RIR \(opsiyonel\)/));

  await fireEvent.press(screen.getByLabelText('2'));
  expect(Haptics.selectionAsync).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByLabelText('4+'));
  expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
});
