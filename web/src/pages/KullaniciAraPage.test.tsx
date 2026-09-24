import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import { session } from '../auth/session';
import { kendiProfilimiKur, kullaniciProfili, kullaniciSatiri, sosyalSahneyiOlustur } from '../test/sosyalSahne';

/**
 * #284: kullanıcı arama. Giriş noktası Profil'in kök ekranlarında üst kabuktaki arama ikonu (#293'te
 * profil başlığından buraya taşındı, bkz. `App.test.tsx`daki ikon testi); sonuç satırları takip
 * listeleriyle aynı satırdır ve profile götürür.
 */
afterEach(() => {
  session.clear();
});

test('yazilani sunucuda arar ve sonuca dokununca profile goturur', async () => {
  const kullanici = userEvent.setup();
  kendiProfilimiKur();
  const aramalar: string[] = [];
  server.use(
    http.get('/api/users/search', ({ request }) => {
      aramalar.push(new URL(request.url).searchParams.get('q') ?? '');
      return HttpResponse.json([kullaniciSatiri('ayse', 'None', 'Ayşe Kaya')]);
    }),
    http.get('/api/users/ayse/profile', () => HttpResponse.json(kullaniciProfili('ayse', 'None'))),
  );
  sosyalSahneyiOlustur('/search');

  await kullanici.type(await screen.findByRole('searchbox', { name: 'Kullanıcı ara' }), 'ayş');
  await kullanici.click(await screen.findByRole('link', { name: /^ayse/ }));

  expect(await screen.findByRole('heading', { name: 'ayse' })).toBeInTheDocument();
  expect(aramalar.at(-1)).toBe('ayş');
});

test('sonuc yoksa bos durum gosterilir', async () => {
  const kullanici = userEvent.setup();
  server.use(http.get('/api/users/search', () => HttpResponse.json([])));
  sosyalSahneyiOlustur('/search');

  await kullanici.type(screen.getByRole('searchbox', { name: 'Kullanıcı ara' }), 'zzz');

  expect(await screen.findByText('Kullanıcı bulunamadı')).toBeInTheDocument();
});
