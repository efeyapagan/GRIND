import { act, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from '@grind/shared/api/client';
import { session } from '../../src/session';
import { sahteBackendOlustur } from '../../src/testUtils/sahteBackend';
import { renderRouterAsync } from '../../src/testUtils/renderRouterAsync';

jest.mock('@grind/shared/api/client', () => {
  const actual = jest.requireActual('@grind/shared/api/client');
  return { ...actual, request: jest.fn() };
});

/**
 * Baglanti durumu testten yonetilir (kurallari `baglantiDurumu` testlerinde); cevrimdisi/cevrimici gecisi
 * ekranlari yeniden cizdirsin diye kucuk bir store. Kuyruk, iyimser guncelleme ve ekranlar GERCEKTIR.
 */
jest.mock('../../src/baglanti/BaglantiSaglayici', () => {
  const React = require('react');
  const dinleyiciler = new Set<() => void>();
  let deger = false;
  const BaglantiBaglami = React.createContext(false);
  return {
    __esModule: true,
    BaglantiBaglami,
    __cevrimdisiYap(yeni: boolean) {
      deger = yeni;
      dinleyiciler.forEach((fn) => fn());
    },
    useCevrimdisi: () =>
      React.useSyncExternalStore(
        (fn: () => void) => {
          dinleyiciler.add(fn);
          return () => dinleyiciler.delete(fn);
        },
        () => deger,
      ),
    default: ({ children }: { children: React.ReactNode }) => children,
  };
});

const requestMock = request as jest.Mock;
const { __cevrimdisiYap: cevrimdisiYap } = jest.requireMock('../../src/baglanti/BaglantiSaglayici');

function ileriTarih(msSonra: number): string {
  return new Date(Date.now() + msSonra).toISOString();
}

beforeEach(async () => {
  await AsyncStorage.clear();
  cevrimdisiYap(false);
});

/**
 * #174 dilim 2 (kullanici karari): internet cekmeyen salonda antrenman kesintisiz yapilir -- sablonla baslatma,
 * set girme ve bitirme cevrimdisi calisir; paylasim penceresi acilmaz. Baglanti gelince islemler sirayla
 * sunucuya gider.
 */
test('cevrimdisi sablonla baslatip set girilen antrenman bitirilir, baglanti gelince sirayla gonderilir', async () => {
  await session.write('tok', ileriTarih(60_000), 'efe');
  const { sahteRequest, state } = sahteBackendOlustur();
  state.sablonlar = [
    {
      id: 1, name: 'Push Day', visibility: 'Friends', savedFromUsername: null, lastUsedAt: null, isPinned: false,
      exercises: [{ exerciseId: 1, exerciseName: 'Bench Press', category: 'Push', isArchived: false, plannedSets: 3, restSeconds: 90 }],
    },
  ];
  const yazmalar: string[] = [];
  requestMock.mockImplementation(async (yol: string, secenek: RequestInit = {}) => {
    const method = secenek.method ?? 'GET';
    if (method !== 'GET') {
      yazmalar.push(`${method} ${yol}`);
      if (yol === '/sessions') return { id: 77 };
      if (yol === '/sessions/77/sets') return { id: 500 };
      if (yol === '/sessions/77/finish') return {};
    }
    return sahteRequest(yol, secenek as never);
  });

  // Cevrimiciyken sablonlar ve hareketler onbellege gelir.
  await renderRouterAsync('./app', { initialUrl: '/antrenman' });
  expect(await screen.findByText('Push Day')).toBeTruthy();

  // Salonda cekim yok.
  cevrimdisiYap(true);
  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Başla' })));

  await fireEvent.press(await screen.findByLabelText(/Bench Press, 0 \/ 3 set/));
  await fireEvent.changeText(await screen.findByLabelText('Ağırlık'), '60');
  await fireEvent.changeText(screen.getByLabelText('Tekrar'), '8');
  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Set ekle' })));

  // Set sayaci telefonda artti; sunucuya hicbir yazma gitmedi.
  expect((await screen.findAllByLabelText(/Bench Press, 1 \/ 3 set/)).length).toBeGreaterThan(0);
  expect(yazmalar).toEqual([]);

  await fireEvent.press(kartiKapatDugmesi());
  await act(async () => fireEvent.press(await screen.findByText('Antrenmanı bitir')));
  await act(async () => fireEvent.press(await screen.findByText('Atla')));

  // Paylasim penceresi internet yokken hic acilmaz.
  expect(screen.queryByText('Antrenmanı paylaş')).toBeNull();
  expect(yazmalar).toEqual([]);

  // Baglanti geldi: islemler SIRAYLA, gercek kimliklerle gider.
  cevrimdisiYap(false);
  await waitFor(() => expect(yazmalar).toEqual(['POST /sessions', 'POST /sessions/77/sets', 'POST /sessions/77/finish']));
}, 30_000);

/** Odak kartini kapatan dugme ("Kartı kapat" perdesi). */
function kartiKapatDugmesi() {
  return screen.getByLabelText('Kartı kapat');
}
