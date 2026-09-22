import { render, screen, fireEvent } from '@testing-library/react-native';
import HareketSecici from './HareketSecici';
import type { Egzersiz } from '@grind/shared/api/queries';

const EGZERSIZLER: Egzersiz[] = [
  { id: 1, name: 'Bench Press', category: 'Push' },
  { id: 3, name: 'Squat', category: 'Legs' },
];

test('yazim hatasinda Bunu mu demek istediniz? onerisi gosterilir ve dokununca secilir (#231)', async () => {
  const onSec = jest.fn();
  await render(
    <HareketSecici id="secici" egzersizler={EGZERSIZLER} secilenId={1} secilenAd="Bench Press" onSec={onSec} />,
  );

  await fireEvent(screen.getByTestId('secici'), 'focus');
  await fireEvent.changeText(screen.getByTestId('secici'), 'sqaut');

  expect(screen.getByText('Bunu mu demek istediniz?')).toBeTruthy();
  expect(screen.queryByText('Eşleşen hareket yok.')).toBeNull();

  await fireEvent.press(screen.getByText('Squat'));

  expect(onSec).toHaveBeenCalledWith(3);
});
