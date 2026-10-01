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

// ---- Oneri listesinin acilma yonu (#559) ----

/**
 * #559 (kullanici bildirdi, ikinci bulgu): sablon formunda en sondaki hareketin adini girerken
 * asagi acilan oneri listesinin son 1-2 secenegi klavyenin altinda kaliyordu -- asagida yeterli
 * yer yoktu. `listeYukari` verilmezse varsayilan asagi acar (mevcut davranis, cogu satir icin dogru).
 */
test('listeYukari verilmezse oneri listesi asagi acar', async () => {
  const onSec = jest.fn();
  await render(
    <HareketSecici id="secici" egzersizler={EGZERSIZLER} secilenId={1} secilenAd="Bench Press" onSec={onSec} />,
  );

  await fireEvent(screen.getByTestId('secici'), 'focus');

  expect(screen.getByTestId('secici-liste').props.className).toContain('top-full');
  expect(screen.getByTestId('secici-liste').props.className).not.toContain('bottom-full');
});

test('listeYukari verilince oneri listesi yukari acar', async () => {
  const onSec = jest.fn();
  await render(
    <HareketSecici
      id="secici"
      egzersizler={EGZERSIZLER}
      secilenId={1}
      secilenAd="Bench Press"
      onSec={onSec}
      listeYukari
    />,
  );

  await fireEvent(screen.getByTestId('secici'), 'focus');

  expect(screen.getByTestId('secici-liste').props.className).toContain('bottom-full');
  expect(screen.getByTestId('secici-liste').props.className).not.toContain('top-full');
});
