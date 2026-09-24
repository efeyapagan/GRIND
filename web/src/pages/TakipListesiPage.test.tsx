import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import { session } from '../auth/session';
import {
  kendiProfilimiKur,
  kullaniciProfili,
  kullaniciSatiri,
  sayfa,
  sosyalSahneyiOlustur,
} from '../test/sosyalSahne';

/**
 * #284: takip listeleri. Satırın düğmesi BAKANIN ilişkisinden çizilir (sunucu `relation`'ı, #281):
 * yok → Takip et, beni takip ediyor → Geri takip et, takip ediyorum → Takibi bırak, arkadaş → düğme
 * değil "Arkadaş" göstergesi (arkadaşlık yanlışlıkla tek dokunuşla bozulmasın; bırakmak profilinden).
 */
afterEach(() => {
  session.clear();
});

test('profil basligindaki sayac kendi listesini acar', async () => {
  const kullanici = userEvent.setup();
  kendiProfilimiKur();
  server.use(http.get('/api/users/efeypgn/followers', () => HttpResponse.json(sayfa([]))));
  sosyalSahneyiOlustur('/profile');

  await kullanici.click(await screen.findByRole('link', { name: /Takipçiler/ }));

  expect(await screen.findByText('Henüz takipçi yok')).toBeInTheDocument();
});

test('satir dugmesi bakanin iliskisine gore cizilir', async () => {
  server.use(
    http.get('/api/users/efeypgn/followers', () =>
      HttpResponse.json(
        sayfa([
          kullaniciSatiri('ayse', 'Friends', 'Ayşe Kaya'),
          kullaniciSatiri('can', 'FollowedBy'),
          kullaniciSatiri('deniz', 'Following'),
          kullaniciSatiri('ece', 'None'),
        ]),
      ),
    ),
  );
  sosyalSahneyiOlustur('/u/efeypgn/followers');

  const satir = (ad: string) => within(screen.getByRole('listitem', { name: ad }));
  expect(await screen.findByText('Ayşe Kaya')).toBeInTheDocument();
  expect(satir('ayse').getByText('Arkadaş')).toBeInTheDocument();
  expect(satir('ayse').queryByRole('button')).not.toBeInTheDocument();
  expect(satir('can').getByRole('button', { name: 'Geri takip et' })).toBeInTheDocument();
  expect(satir('deniz').getByRole('button', { name: 'Takibi bırak' })).toBeInTheDocument();
  expect(satir('ece').getByRole('button', { name: 'Takip et' })).toBeInTheDocument();
});

test('Geri takip et POST atar ve liste sunucudan tazelenince satir Arkadas olur', async () => {
  const kullanici = userEvent.setup();
  let geriTakip = false;
  server.use(
    http.get('/api/users/efeypgn/followers', () =>
      HttpResponse.json(sayfa([kullaniciSatiri('can', geriTakip ? 'Friends' : 'FollowedBy')])),
    ),
    http.post('/api/users/can/follow', () => {
      geriTakip = true;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  sosyalSahneyiOlustur('/u/efeypgn/followers');

  await kullanici.click(await screen.findByRole('button', { name: 'Geri takip et' }));

  expect(await within(screen.getByRole('listitem', { name: 'can' })).findByText('Arkadaş')).toBeInTheDocument();
});

test('satira dokunmak o kisinin profilini acar', async () => {
  const kullanici = userEvent.setup();
  server.use(
    http.get('/api/users/efeypgn/following', () => HttpResponse.json(sayfa([kullaniciSatiri('mehmet', 'Following')]))),
    http.get('/api/users/mehmet/profile', () =>
      HttpResponse.json(kullaniciProfili('mehmet', 'Following', { privacyLevel: 'Gizli' })),
    ),
    http.get('/api/users/mehmet/records', () => HttpResponse.json([])),
  );
  sosyalSahneyiOlustur('/u/efeypgn/following');

  await kullanici.click(await screen.findByRole('link', { name: 'mehmet' }));

  expect(await screen.findByRole('heading', { name: 'mehmet' })).toBeInTheDocument();
});
