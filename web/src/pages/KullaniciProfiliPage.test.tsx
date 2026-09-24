import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import { session } from '../auth/session';
import { sahteKesisimGozlemcisiKur } from '../test/kesisimGozlemcisi';
import { kendiProfilimiKur, kullaniciProfili, sayfa, sosyalSahneyiOlustur } from '../test/sosyalSahne';

/**
 * #284: başkasının profili. Başlık kendi profilindekiyle aynı bileşendir; "Profili düzenle" yerine
 * takip düğmesi durur. Kapı artık arkadaşlık değil hedefin gizlilik seviyesi (#294): Açık/Kısıtlı'da
 * yabancı bile (arkadaş olmasa da) sekmeleri görür, Gizli'de yalnızca Rekorlar sekmesi çizilir. Ölçüler
 * sekmesi başkasında yoktur.
 */
const OTURUM = {
  sessionId: 7,
  startedAt: '2026-09-10T08:00:00Z',
  endedAt: '2026-09-10T09:00:00Z',
  durationSeconds: 3600,
  templateName: 'Push Day',
  difficulty: null,
  totalVolume: 1000,
  setCount: 3,
  medianRestSeconds: null,
  sets: [],
};

const REKOR = {
  exerciseId: 1,
  exerciseName: 'Bench Press',
  category: 'Push',
  bestWeight: 100,
  bestWeightReps: 5,
  bestWeightAt: '2026-07-15T10:00:00Z',
  bestReps: 12,
  bestRepsWeight: 60,
  bestRepsAt: '2026-07-15T10:00:00Z',
};

beforeEach(() => {
  sahteKesisimGozlemcisiKur();
});

afterEach(() => {
  session.clear();
});

function arkadasiKur() {
  server.use(
    http.get('/api/users/ayse/profile', () =>
      HttpResponse.json(kullaniciProfili('ayse', 'Friends', { displayName: 'Ayşe Kaya', age: 24 })),
    ),
    http.get('/api/users/ayse/history', () => HttpResponse.json(sayfa([OTURUM]))),
    http.get('/api/users/ayse/records', () => HttpResponse.json([REKOR])),
  );
}

test('arkadasin basligi gorunur; duzenleme dugmesi yerine Takibi birak, sekmeler yalniz Gecmis ve Rekorlar', async () => {
  arkadasiKur();
  sosyalSahneyiOlustur('/u/ayse');

  expect(await screen.findByRole('heading', { name: 'Ayşe Kaya' })).toBeInTheDocument();
  expect(screen.getByText('@ayse')).toBeInTheDocument();
  expect(screen.getByText('24 yaş')).toBeInTheDocument();
  expect(screen.getByText('Arkadaş')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Takibi bırak' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Profili düzenle' })).not.toBeInTheDocument();

  const sekmeler = within(screen.getByRole('navigation', { name: 'Profil sekmeleri' })).getAllByRole('link');
  expect(sekmeler.map((sekme) => sekme.getAttribute('aria-label'))).toEqual(['Geçmiş', 'Rekorlar']);
});

test('arkadasin gecmisi salt-okunurdur: kart acilir ama silme yolu yoktur', async () => {
  const kullanici = userEvent.setup();
  arkadasiKur();
  sosyalSahneyiOlustur('/u/ayse/history');

  await kullanici.click(await screen.findByText('Push Day'));

  expect(screen.queryByRole('button', { name: /sil/i })).not.toBeInTheDocument();
});

test('arkadasin rekorlari sunucudan gelir; kendi serin ve plato rozetin cizilmez', async () => {
  arkadasiKur();
  sosyalSahneyiOlustur('/u/ayse/records');

  expect(await screen.findByText('Bench Press')).toBeInTheDocument();
  expect(screen.getByText('100 kg')).toBeInTheDocument();
  expect(screen.queryByText('En uzun seri')).not.toBeInTheDocument();
});

test('acik hesapta yabanci (arkadas degil) bile her iki sekmeyi de gorur', async () => {
  server.use(
    http.get('/api/users/mehmet/profile', () =>
      HttpResponse.json(kullaniciProfili('mehmet', 'None', { privacyLevel: 'Acik' })),
    ),
    http.get('/api/users/mehmet/history', () => HttpResponse.json(sayfa([OTURUM]))),
    http.get('/api/users/mehmet/records', () => HttpResponse.json([REKOR])),
  );
  sosyalSahneyiOlustur('/u/mehmet');

  const sekmeler = within(await screen.findByRole('navigation', { name: 'Profil sekmeleri' })).getAllByRole('link');
  expect(sekmeler.map((sekme) => sekme.getAttribute('aria-label'))).toEqual(['Geçmiş', 'Rekorlar']);
});

test('gizli hesapta yabanci yalniz Rekorlar sekmesini gorur, Gecmis linki yok', async () => {
  server.use(
    http.get('/api/users/mehmet/profile', () =>
      HttpResponse.json(kullaniciProfili('mehmet', 'None', { privacyLevel: 'Gizli' })),
    ),
    http.get('/api/users/mehmet/records', () => HttpResponse.json([REKOR])),
  );
  sosyalSahneyiOlustur('/u/mehmet');

  const sekmeler = within(await screen.findByRole('navigation', { name: 'Profil sekmeleri' })).getAllByRole('link');
  expect(sekmeler.map((sekme) => sekme.getAttribute('aria-label'))).toEqual(['Rekorlar']);
  expect(await screen.findByText('Bu hesap gizli — yalnızca rekorlar görünür')).toBeInTheDocument();
  expect(await screen.findByText('Bench Press')).toBeInTheDocument();
});

test('Takip et POST atar; sayac ve dugme sunucudan tazelenir', async () => {
  const kullanici = userEvent.setup();
  let takipEdiyor = false;
  server.use(
    http.get('/api/users/mehmet/profile', () =>
      HttpResponse.json(
        kullaniciProfili('mehmet', takipEdiyor ? 'Following' : 'None', { followerCount: takipEdiyor ? 3 : 2 }),
      ),
    ),
    http.post('/api/users/mehmet/follow', () => {
      takipEdiyor = true;
      return new HttpResponse(null, { status: 204 });
    }),
    http.get('/api/users/mehmet/history', () => HttpResponse.json(sayfa([]))),
    http.get('/api/users/mehmet/records', () => HttpResponse.json([])),
  );
  sosyalSahneyiOlustur('/u/mehmet');

  await kullanici.click(await screen.findByRole('button', { name: 'Takip et' }));

  expect(await screen.findByRole('button', { name: 'Takibi bırak' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Takipçiler/ })).toHaveTextContent('3Takipçiler');
});

test('kendi kullanici adina gidilirse kendi profiline yonlendirilir', async () => {
  kendiProfilimiKur();
  sosyalSahneyiOlustur('/u/efeypgn');

  expect(await screen.findByText('Kendi geçmişim')).toBeInTheDocument();
});
