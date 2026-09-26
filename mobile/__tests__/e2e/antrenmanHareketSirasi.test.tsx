import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { request } from '@grind/shared/api/client';
import { session } from '../../src/session';
import { sahteBackendOlustur } from '../../src/testUtils/sahteBackend';
import { renderRouterAsync } from '../../src/testUtils/renderRouterAsync';
import { suruklemeCasusu } from '../../src/testUtils/surukleme';

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
 */
test('kullanıcı açık antrenmanda hareketi sürükleyerek aşağı taşır, yeni sıra sunucuya kaydedilir', async () => {
  const surukleme = suruklemeCasusu();
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

  await surukleme.surukleBirak(0, 140);

  await waitFor(() =>
    expect(requestMock).toHaveBeenCalledWith(
      '/sessions/1/exercises/order',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ exerciseIds: [2, 1] }) }),
    ),
  );
  const kartlar = screen.getAllByRole('button', { name: /, \d+( \/ \d+)? set$/ });
  expect(kartlar.map((kart) => kart.props.accessibilityLabel)).toEqual(['Squat, 0 / 3 set', 'Bench Press, 0 / 4 set']);
  surukleme.geriAl();
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
