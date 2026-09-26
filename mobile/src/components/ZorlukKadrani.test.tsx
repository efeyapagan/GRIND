import { render, screen, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import ZorlukKadrani from './ZorlukKadrani';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Heavy: 'heavy' },
}));
beforeEach(() => jest.clearAllMocks());

/**
 * #153: antrenman bitiminde zorluk, halka üzerinde beş duraklı bir kadranla seçilir. Kadranı
 * PARMAKLA çevirme (pan) burada test EDİLMEZ: jest ortamında halkanın ekrandaki ölçüsü (layout)
 * sıfırdır, dokunuşun açısı hesaplanamaz. Testler kadranın ölçülebilir iki yüzeyini sabitler:
 * duraklara dokunma ve erişilebilirlik artır/azalt eylemi (`accessibilityRole="adjustable"`).
 */
test('secili kademenin adi ve cumlesi kadranin ortasinda yazar', async () => {
  await render(<ZorlukKadrani deger="Hard" onDegis={jest.fn()} />);

  expect(screen.getByText('Zor')).toBeTruthy();
  expect(screen.getByText('Nefesimi zor tutuyordum')).toBeTruthy();
});

test('duraga dokununca o kademe secilir', async () => {
  const onDegis = jest.fn();
  await render(<ZorlukKadrani deger="Medium" onDegis={onDegis} />);

  await fireEvent.press(screen.getByLabelText('Zor'));

  expect(onDegis).toHaveBeenCalledWith('Hard');
});

test('artirma eylemi bir ust kademeye gecer', async () => {
  const onDegis = jest.fn();
  await render(<ZorlukKadrani deger="Medium" onDegis={onDegis} />);

  await fireEvent(screen.getByLabelText('Antrenman zorluğu'), 'accessibilityAction', {
    nativeEvent: { actionName: 'increment' },
  });

  expect(onDegis).toHaveBeenCalledWith('Hard');
});

test('azaltma eylemi bir alt kademeye gecer', async () => {
  const onDegis = jest.fn();
  await render(<ZorlukKadrani deger="Medium" onDegis={onDegis} />);

  await fireEvent(screen.getByLabelText('Antrenman zorluğu'), 'accessibilityAction', {
    nativeEvent: { actionName: 'decrement' },
  });

  expect(onDegis).toHaveBeenCalledWith('Easy');
});

test('en ust kademede artirma kademeyi degistirmez', async () => {
  const onDegis = jest.fn();
  await render(<ZorlukKadrani deger="Maximal" onDegis={onDegis} />);

  await fireEvent(screen.getByLabelText('Antrenman zorluğu'), 'accessibilityAction', {
    nativeEvent: { actionName: 'increment' },
  });

  expect(onDegis).not.toHaveBeenCalled();
});

/** #388: secim bir duraga oturunca tok bir vurus hissedilir (ince "tik"ler yalnizca cevirirken, duraklar arasinda). */
test('duraga dokununca tek bir tok titresim verir', async () => {
  await render(<ZorlukKadrani deger="Medium" onDegis={jest.fn()} />);

  await fireEvent.press(screen.getByLabelText('Zor'));

  expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
  expect(Haptics.selectionAsync).not.toHaveBeenCalled();
});
