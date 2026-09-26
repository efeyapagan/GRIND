import { screen, fireEvent, waitFor } from '@testing-library/react-native';
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

function ileriTarih(msSonra: number): string {
  return new Date(Date.now() + msSonra).toISOString();
}

beforeEach(async () => {
  await session.write('tok', ileriTarih(60_000), 'efe');
});

/** #186: "Şablonla başla" birincil yol olarak kalır; boş antrenman ikincil bir seçenektir. */
test('kullanıcı şablon seçmeden boş antrenman başlatır', async () => {
  const { sahteRequest, state } = sahteBackendOlustur();
  requestMock.mockImplementation(sahteRequest);

  await renderRouterAsync('./app', { initialUrl: '/antrenman' });

  await fireEvent.press(await screen.findByRole('button', { name: 'Boş antrenman başlat' }));

  await waitFor(() => expect(state.acikOturum).not.toBeNull());
  expect(state.acikOturum.templateId).toBeNull();
  // Gercek rotalarla ilk acilis, paralel kosuda jest'in 5 sn'lik varsayilanini asiyor (sablonlaAntrenman ile ayni).
}, 20_000);

/**
 * #209: set girmeden, antrenman sürerken hareket listesi şablon formuna taşınır. Gerçek rotalarla:
 * antrenman ekranı → parametreli `/templates/new` → kaydet → sunucuda şablon oluşur.
 */
test('kullanıcı açık antrenmanın hareketlerini set girmeden şablon olarak kaydeder', async () => {
  const { sahteRequest, state } = sahteBackendOlustur();
  state.acikOturum = {
    id: 1,
    startedAt: new Date().toISOString(),
    endedAt: null,
    isOpen: true,
    templateId: null,
    templateName: null,
    progress: [{ exerciseId: 1, exerciseName: 'Bench Press', plannedSets: null, completedSets: 0, restSeconds: 90 }],
  };
  requestMock.mockImplementation(sahteRequest);

  await renderRouterAsync('./app', { initialUrl: '/antrenman' });

  await fireEvent.press(await screen.findByRole('button', { name: 'Şablon olarak kaydet' }));

  // Form antrenmanın hareketiyle dolu açılır; kullanıcı yalnızca ad verir.
  expect(await screen.findByLabelText('1. hareket: kaldır')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Şablon adı'), 'Göğüs Günü');
  await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

  await waitFor(() => expect(state.sablonlar).toHaveLength(1));
  expect(state.sablonlar[0]).toMatchObject({
    name: 'Göğüs Günü',
    exercises: [{ exerciseId: 1, plannedSets: 3, restSeconds: 90 }],
  });
  expect(state.setler).toHaveLength(0);
}, 20_000);

/**
 * #407: şablon formunda hareket satırı basılı tutulup sürüklenerek taşınır (yukarı/aşağı okları
 * kaldırıldı); şablon yeni sırayla kaydedilir.
 */
test('kullanıcı şablon formunda hareketi sürükleyerek taşır, şablon yeni sırayla kaydedilir', async () => {
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
      { exerciseId: 1, exerciseName: 'Bench Press', plannedSets: null, completedSets: 0, restSeconds: 90 },
      { exerciseId: 2, exerciseName: 'Squat', plannedSets: null, completedSets: 0, restSeconds: 90 },
    ],
  };
  requestMock.mockImplementation(sahteRequest);

  await renderRouterAsync('./app', { initialUrl: '/antrenman' });
  await fireEvent.press(await screen.findByRole('button', { name: 'Şablon olarak kaydet' }));
  await screen.findByLabelText('2. hareket: kaldır');
  expect(screen.queryByRole('button', { name: /taşı$/ })).toBeNull();

  await surukleme.surukleBirak(0, 140);
  await fireEvent.changeText(screen.getByLabelText('Şablon adı'), 'Bacak Günü');
  await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

  await waitFor(() => expect(state.sablonlar).toHaveLength(1));
  expect(state.sablonlar[0].exercises.map((hareket: { exerciseId: number }) => hareket.exerciseId)).toEqual([2, 1]);
  surukleme.geriAl();
}, 20_000);
