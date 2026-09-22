import { screen, fireEvent, waitFor } from '@testing-library/react-native';
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
 * #229: açık antrenmanda seçili kartın ok düğmesi sırayı değiştirir; sunucuya antrenmandaki TÜM
 * hareketlerin yeni sırası gider ve kartlar o sırayla görünür.
 */
test('kullanıcı açık antrenmanda hareketi aşağı taşır, yeni sıra sunucuya kaydedilir', async () => {
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

  // Sahte backend'in egzersiz listesinde yalnizca Bench Press var: secilebilen ve varsayilan secili kart o.
  await fireEvent.press(await screen.findByRole('button', { name: 'Bench Press: aşağı taşı' }));

  await waitFor(() =>
    expect(requestMock).toHaveBeenCalledWith(
      '/sessions/1/exercises/order',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ exerciseIds: [2, 1] }) }),
    ),
  );
  const kartlar = screen.getAllByRole('button', { name: /, \d+( \/ \d+)? set$/ });
  expect(kartlar.map((kart) => kart.props.accessibilityLabel)).toEqual(['Squat, 0 / 3 set', 'Bench Press, 0 / 4 set']);
  // Gercek rotalarla ilk acilis, paralel kosuda jest'in 5 sn'lik varsayilanini asiyor (antrenmandanSablon ile ayni).
}, 20_000);
