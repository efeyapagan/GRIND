import { screen, fireEvent } from '@testing-library/react-native';
import { request } from '@grind/shared/api/client';
import { session } from '../../src/session';
import { sahteBackendOlustur } from '../../src/testUtils/sahteBackend';
import { renderRouterAsync } from '../../src/testUtils/renderRouterAsync';

jest.mock('@grind/shared/api/client', () => {
  const actual = jest.requireActual('@grind/shared/api/client');
  return { ...actual, request: jest.fn() };
});

const requestMock = request as jest.Mock;

/** Sablonun hareketleri: bosken oturumdaki hareket bir SAPMA sayilir (#499). */
const SABLON_HAREKETI = {
  id: 1,
  exerciseId: 1,
  exerciseName: 'Bench Press',
  category: 'Push',
  isArchived: false,
  orderIndex: 0,
  plannedSets: 3,
  restSeconds: 90,
};

const OTURUM_HAREKETI = {
  exerciseId: 1,
  exerciseName: 'Bench Press',
  plannedSets: 3,
  completedSets: 0,
  restSeconds: 90,
};

/** Acik bir antrenmanla antrenman ekranini acar (gercek rotalar, yalnizca ag katmani sahte). */
async function acikAntrenmanlaAc({
  sablonHareketleri = [] as unknown[],
  oturumHareketleri = [] as unknown[],
} = {}) {
  await session.write('tok', new Date(Date.now() + 60_000).toISOString(), 'efe');
  const { sahteRequest, state } = sahteBackendOlustur();
  state.sablonlar.push({
    id: 1,
    name: 'Push Day',
    createdAt: new Date().toISOString(),
    exercises: sablonHareketleri,
  });
  state.acikOturum = {
    id: 1,
    startedAt: new Date().toISOString(),
    endedAt: null,
    isOpen: true,
    durationSeconds: null,
    templateId: 1,
    templateName: 'Push Day',
    progress: oturumHareketleri,
  };
  requestMock.mockImplementation(sahteRequest);
  await renderRouterAsync('./app', { initialUrl: '/antrenman' });
  return state;
}

/**
 * #487'de eklenen cikis #494'te yon degistirdi (kullanici karari): hedef Sablonlarim DEGIL, bu
 * ekranin "Antrenmana basla" gorunumu. Oturum ACIK kalir -- ustte ana sayfadaki kartin aynisi
 * durur ve "Antrenmana devam et" antrenmana geri cevirir.
 */
test('geri tusu baslatma gorunumunu acar, kart antrenmana geri cevirir', async () => {
  const state = await acikAntrenmanlaAc();

  await fireEvent.press(await screen.findByLabelText('Antrenmana başla ekranına dön'));

  expect(await screen.findByText('Şablonlarım')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Antrenmana devam et' })).toBeTruthy();
  // Antrenman KAPANMADI: gorunum degisti, oturum yerinde.
  expect(state.acikOturum).not.toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: 'Antrenmana devam et' }));

  expect(await screen.findByText('Hareket ekle')).toBeTruthy();
  expect(screen.queryByText('Şablonlarım')).toBeNull();
}, 20_000);

/**
 * Acik antrenman varken ikinci bir antrenman baslatilmaz: TUM baslatma dugmeleri soluk ve
 * basilamaz (kullanici karari) -- sablon kartlari da "Bos antrenman baslat" da.
 */
test('baslatma gorunumunde baslatma dugmeleri basilamaz', async () => {
  const state = await acikAntrenmanlaAc();
  const oncekiOturum = state.acikOturum;

  await fireEvent.press(await screen.findByLabelText('Antrenmana başla ekranına dön'));
  await screen.findByText('Şablonlarım');

  await fireEvent.press(screen.getByRole('button', { name: 'Başla' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Boş antrenman başlat' }));

  // Hicbiri yeni oturum acmadi ve ekran baslatma gorunumunde kaldi.
  expect(state.acikOturum).toBe(oncekiOturum);
  expect(screen.getByText('Şablonlarım')).toBeTruthy();
}, 20_000);

/**
 * #499 (kullanici bildirdi: "menu start workout olmasina ragmen ust baslik workout kaliyor"):
 * baslatma gorunumunde ust baslik da "Antrenmana basla" olur -- antrenman arka planda surse bile.
 */
test('baslatma gorunumunde ust baslik Antrenmana basla olur', async () => {
  await acikAntrenmanlaAc();

  await fireEvent.press(await screen.findByLabelText('Antrenmana başla ekranına dön'));
  await screen.findByText('Şablonlarım');

  expect(screen.getByRole('header')).toHaveTextContent('Antrenmana başla');
});

/**
 * #499 (kullanici karari): ust satirda artik "Devam ediyor" rozeti degil SABLON ADI durur;
 * baslangic saati bir alt satira, sablon adinin eski yerine iner. #502'de ayni rozet devam eden
 * antrenman KARTINDAN da kalkti, yani metin mobilde hicbir yerde cizilmiyor.
 */
test('ust satirda sablon adi durur, In progress rozeti kalkti', async () => {
  await acikAntrenmanlaAc({ sablonHareketleri: [SABLON_HAREKETI], oturumHareketleri: [OTURUM_HAREKETI] });

  expect(await screen.findByText('Push Day')).toBeTruthy();
  expect(screen.queryByText('Devam ediyor')).toBeNull();
  expect(screen.getByText(/^Başlangıç /)).toBeTruthy();
});

/** Liste sablonuyla AYNI: kisayola gerek yok (kullanici: "degisiklik yapilmadiysa cikmasin"). */
test('sapma yokken Sablon olarak kaydet gorunmez', async () => {
  await acikAntrenmanlaAc({ sablonHareketleri: [SABLON_HAREKETI], oturumHareketleri: [OTURUM_HAREKETI] });

  await screen.findByText('Push Day');
  expect(screen.queryByText('Şablon olarak kaydet')).toBeNull();
});

/** Sablonda olmayan hareket eklendiyse kisayol "Hareket ekle"nin altinda cikar. */
test('sapma varken Sablon olarak kaydet gorunur', async () => {
  await acikAntrenmanlaAc({ sablonHareketleri: [], oturumHareketleri: [OTURUM_HAREKETI] });

  expect(await screen.findByText('Şablon olarak kaydet')).toBeTruthy();
});
