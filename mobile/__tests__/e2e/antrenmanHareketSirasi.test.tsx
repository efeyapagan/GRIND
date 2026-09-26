import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';
import { request } from '@grind/shared/api/client';
import { session } from '../../src/session';
import { sahteBackendOlustur } from '../../src/testUtils/sahteBackend';
import { renderRouterAsync } from '../../src/testUtils/renderRouterAsync';

jest.mock('@grind/shared/api/client', () => {
  const actual = jest.requireActual('@grind/shared/api/client');
  return { ...actual, request: jest.fn() };
});

const requestMock = request as jest.Mock;

beforeEach(async () => {
  await session.write('tok', new Date(Date.now() + 60_000).toISOString(), 'efe');
});

/**
 * #407 (#229'un yerine): açık antrenmanda hareket kartı basılı tutulup sürüklenerek taşınır; sunucuya
 * antrenmandaki TÜM hareketlerin yeni sırası gider ve kartlar yanıt beklenmeden o sırayla görünür.
 * Gerçek sürükleme RNTL'de simüle edilemez: `Gesture.Pan` casuslanır, basılı tutmayla açılan
 * (sürükleme) jestleri ayıklanıp son çizimdeki kartın jesti elle yürütülür (SurukleSiraliListe.test ile aynı).
 */
test('kullanıcı açık antrenmanda hareketi sürükleyerek aşağı taşır, yeni sıra sunucuya kaydedilir', async () => {
  const panSpy = jest.spyOn(Gesture, 'Pan');
  const { sahteRequest, state } = sahteBackendOlustur();
  state.acikOturum = {
    id: 1,
    startedAt: new Date().toISOString(),
    endedAt: null,
    isOpen: true,
    templateId: null,
    templateName: null,
    progress: [
      { exerciseId: 1, exerciseName: 'Bench Press', plannedSets: 4, completedSets: 0, restSeconds: 90 },
      { exerciseId: 2, exerciseName: 'Squat', plannedSets: 3, completedSets: 0, restSeconds: 90 },
    ],
  };
  // Sunucu yaniti gelmeden kartlar yeni sirada olmali (iyimser): yanit hic donmez.
  requestMock.mockImplementation((yol: string, secenek?: Parameters<typeof sahteRequest>[1]) =>
    yol === '/sessions/1/exercises/order' ? new Promise(() => {}) : sahteRequest(yol, secenek),
  );

  await renderRouterAsync('./app', { initialUrl: '/antrenman' });
  await screen.findByLabelText(/Bench Press, 0 \/ 4 set/);

  for (const satir of screen.getAllByTestId('surukle-satir')) {
    satir.props.onLayout({ nativeEvent: { layout: { height: 120 } } });
  }
  const suruklemeJestleri = panSpy.mock.results
    .map((sonuc) => sonuc.value)
    .filter((pan) => pan.config.activateAfterLongPress > 0);
  const benchJesti = suruklemeJestleri[suruklemeJestleri.length - 2].handlers;
  await act(async () => {
    benchJesti.onStart({ translationY: 0 });
    benchJesti.onUpdate({ translationY: 140 });
    benchJesti.onEnd({ translationY: 140 });
  });

  await waitFor(() =>
    expect(requestMock).toHaveBeenCalledWith(
      '/sessions/1/exercises/order',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ exerciseIds: [2, 1] }) }),
    ),
  );
  const kartlar = screen.getAllByRole('button', { name: /, \d+( \/ \d+)? set$/ });
  expect(kartlar.map((kart) => kart.props.accessibilityLabel)).toEqual(['Squat, 0 / 3 set', 'Bench Press, 0 / 4 set']);
  panSpy.mockRestore();
  // Gercek rotalarla ilk acilis, paralel kosuda jest'in 5 sn'lik varsayilanini asiyor (antrenmandanSablon ile ayni).
}, 20_000);

// #407: sıra artık yalnızca sürükleyerek değişir -- odak kartındaki yukarı/aşağı düğmeleri kaldırıldı.
test('odak kartında yukarı/aşağı taşı düğmesi yok', async () => {
  const { sahteRequest, state } = sahteBackendOlustur();
  state.acikOturum = {
    id: 1,
    startedAt: new Date().toISOString(),
    endedAt: null,
    isOpen: true,
    templateId: null,
    templateName: null,
    progress: [
      { exerciseId: 1, exerciseName: 'Bench Press', plannedSets: 4, completedSets: 0, restSeconds: 90 },
      { exerciseId: 2, exerciseName: 'Squat', plannedSets: 3, completedSets: 0, restSeconds: 90 },
    ],
  };
  requestMock.mockImplementation(sahteRequest);

  await renderRouterAsync('./app', { initialUrl: '/antrenman' });
  await fireEvent.press(await screen.findByLabelText(/Bench Press, 0 \/ 4 set/));
  await screen.findByTestId('odak-karti');

  expect(screen.queryByRole('button', { name: /taşı$/ })).toBeNull();
}, 20_000);
