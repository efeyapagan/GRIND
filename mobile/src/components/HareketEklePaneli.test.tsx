import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Egzersiz } from '@grind/shared/api/queries';
import HareketEklePaneli from './HareketEklePaneli';

function egzersiz(id: number, name: string): Egzersiz {
  return { id, name, category: 'Push', measurement: 'WeightReps' } as Egzersiz;
}

const egzersizler = [egzersiz(1, 'Bench Press'), egzersiz(2, 'Squat')];

/**
 * Hareket ekleme listesi sayfanin ScrollView'i icinde mutlak konumlu bir kutuydu ve arama alani
 * odagi kaybedince (kaydirma, klavye) kapaniyordu. Artik ilerleme kartiyla ayni PENCEREdir: kendi
 * kaydirmasi ve klavye yonetimi var, odak kaybina bagli degil.
 */
test('kapaliyken pencere cizilmez', async () => {
  await render(<HareketEklePaneli acik={false} egzersizler={egzersizler} onSec={jest.fn()} onKapat={jest.fn()} />);

  expect(screen.queryByPlaceholderText('Hareket ara')).toBeNull();
});

test('acikken hareketler pencerede listelenir', async () => {
  await render(<HareketEklePaneli acik egzersizler={egzersizler} onSec={jest.fn()} onKapat={jest.fn()} />);

  expect(screen.getByText('Bench Press')).toBeTruthy();
  expect(screen.getByText('Squat')).toBeTruthy();
});

test('bir harekete dokunmak onu ekler ve pencereyi kapatir', async () => {
  const onSec = jest.fn();
  const onKapat = jest.fn();
  await render(<HareketEklePaneli acik egzersizler={egzersizler} onSec={onSec} onKapat={onKapat} />);

  await fireEvent.press(screen.getByText('Squat'));

  expect(onSec).toHaveBeenCalledWith(2);
  expect(onKapat).toHaveBeenCalled();
});

test('arama sonuclari suzer', async () => {
  await render(<HareketEklePaneli acik egzersizler={egzersizler} onSec={jest.fn()} onKapat={jest.fn()} />);

  await fireEvent.changeText(screen.getByPlaceholderText('Hareket ara'), 'bench');

  expect(screen.getByText('Bench Press')).toBeTruthy();
  expect(screen.queryByText('Squat')).toBeNull();
});
