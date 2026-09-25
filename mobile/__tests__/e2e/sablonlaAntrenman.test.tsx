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

function ileriTarih(msSonra: number): string {
  return new Date(Date.now() + msSonra).toISOString();
}

/**
 * "Dokunma testleri" (kullanıcı isteği): tek tek menülere girip şablon oluşturur, o şablonla
 * antrenman başlatır, set ekler. `renderRouter` (expo-router/testing-library) GERÇEK dosya
 * tabanlı rotaları ve GERÇEK ekranları kullanır -- yalnızca ağ katmanı (sahteBackend) sahte.
 * Bu, tek tek ekranları izole test eden diğer dosyalardan farklı olarak menüler ARASI
 * gezinmeyi de (alt menü, geri linkleri, router.replace) doğrular.
 */
test('kullanıcı yeni şablon oluşturup o şablonla antrenman başlatır ve set ekler', async () => {
  await session.write('tok', ileriTarih(60_000), 'efe');
  const { sahteRequest, state } = sahteBackendOlustur();
  requestMock.mockImplementation(sahteRequest);

  await renderRouterAsync('./app', { initialUrl: '/' });

  // Ana Sayfa'dan alt menüdeki "+" ile Antrenman'a geç.
  await fireEvent.press(await screen.findByLabelText('Antrenman başlat'));
  expect(await screen.findByText('Şablon oluştur')).toBeTruthy();

  // Henüz şablon yok -- "Şablon oluştur" ile yeni şablon formuna geç.
  await fireEvent.press(screen.getByText('Şablon oluştur'));
  await fireEvent.changeText(await screen.findByLabelText('Şablon adı'), 'Push Day E2E');
  await fireEvent.press(screen.getByRole('button', { name: 'Hareket ekle' }));
  await waitFor(() => expect(screen.getByText('Egzersiz')).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

  // Kayıt sonrası sunucuda şablon gerçekten oluşmuş olmalı.
  await waitFor(() => expect(state.sablonlar).toHaveLength(1));
  expect(state.sablonlar[0]).toMatchObject({ name: 'Push Day E2E' });

  // #272: kaydetme artık doğrudan /antrenman'a döner; alt menüdeki "+" aynı ekranı açtığı için
  // bu dokunuş zararsız ve akışı gerçek kullanımdaki gibi bırakır.
  await fireEvent.press(await screen.findByLabelText('Antrenman başlat'));
  const sablonKarti = await screen.findByText('Push Day E2E');
  await fireEvent.press(sablonKarti);

  // Antrenman gerçekten sunucuda açılmış olmalı.
  await waitFor(() => expect(state.acikOturum).not.toBeNull());
  expect(state.acikOturum.templateName).toBe('Push Day E2E');

  // Hareket kartına dokununca set paneli açılır.
  await fireEvent.press(await screen.findByLabelText(/Bench Press, 0 \/ 3 set/));
  await fireEvent.changeText(await screen.findByLabelText('Ağırlık'), '60');
  await fireEvent.changeText(screen.getByLabelText('Tekrar'), '8');
  // #266: RIR alanına dokununca kaydırıcı açılır; ara durak "2–3" sunucuya 2.5 gider.
  await fireEvent.press(screen.getByLabelText('RIR (opsiyonel): girilmedi'));
  await fireEvent.press(screen.getByLabelText('2–3'));
  await fireEvent.press(screen.getByRole('button', { name: 'Set ekle' }));

  // Set gerçekten sunucuya gitmiş ve ilerleme güncellenmiş olmalı.
  await waitFor(() => expect(state.setler).toHaveLength(1));
  expect(state.setler[0]).toMatchObject({ weight: 60, reps: 8, exerciseId: 1, rir: 2.5 });
  expect(await screen.findByText('RIR 2–3')).toBeTruthy();
  await waitFor(() => expect(screen.getByLabelText(/Bench Press, 1 \/ 3 set/)).toBeTruthy());

  // #153: "Antrenmanı bitir" artık oturumu kapatmaz, ayrı zorluk ekranına götürür; kadrandan
  // "Zor" seçilip bitirilir. Bu adım GERÇEK rotayla gezinmeyi de doğrular (izole ekran testi yapamaz).
  await fireEvent.press(screen.getByRole('button', { name: 'Antrenmanı bitir' }));
  await fireEvent.press(await screen.findByLabelText('Zor'));
  await fireEvent.press(screen.getByRole('button', { name: 'Antrenmanı bitir' }));

  await waitFor(() => expect(state.acikOturum).toBeNull());
  expect(state.bitmisOturumlar[0]).toMatchObject({ difficulty: 'Hard', isOpen: false });
  // Tek testte şablon oluşturma + antrenman + set + bitirme var; gerçek rotalarla bu akış
  // jest'in 5 sn'lik varsayılanına sığmıyor (#153 adımlarıyla ~5 sn'ye dayandı).
}, 20_000);

/**
 * Yuzer set paneli (antrenman.tsx) acik oturum yokken de cizilebiliyordu: set girmeden antrenmani
 * iptal edince panel "Sablonla basla" ekraninin uzerinde asili kaliyordu (kullanici bulgusu).
 */
test('set paneli acikken antrenman iptal edilince panel ekranda kalmaz', async () => {
  await session.write('tok', ileriTarih(60_000), 'efe');
  const { sahteRequest, state } = sahteBackendOlustur();
  requestMock.mockImplementation(sahteRequest);
  state.sablonlar.push({
    id: 1,
    name: 'Push Day E2E',
    createdAt: new Date().toISOString(),
    exercises: [
      {
        id: 1,
        exerciseId: 1,
        exerciseName: 'Bench Press',
        category: 'Push',
        isArchived: false,
        orderIndex: 0,
        plannedSets: 3,
        restSeconds: 90,
      },
    ],
  });
  state.siradakiSablonId = 2;

  await renderRouterAsync('./app', { initialUrl: '/antrenman' });

  await fireEvent.press(await screen.findByText('Push Day E2E'));
  await waitFor(() => expect(state.acikOturum).not.toBeNull());

  // Karta dokunmak set panelini acar.
  await fireEvent.press(await screen.findByLabelText(/Bench Press, 0 \/ 3 set/));
  expect(await screen.findByLabelText('Ağırlık')).toBeTruthy();

  // Set girilmedigi icin alt alanda "Antrenmani iptal et" durur (setler sorgusu yuklenince).
  await fireEvent.press(await screen.findByRole('button', { name: 'Antrenmanı iptal et' }));

  await waitFor(() => expect(state.acikOturum).toBeNull());
  // Istemci acik oturum sorgusunu tazeleyince panel de kalkmali.
  await waitFor(() => expect(screen.queryByLabelText('Ağırlık')).toBeNull());
  expect(await screen.findByText('Şablonla başla')).toBeTruthy();
}, 20_000);
