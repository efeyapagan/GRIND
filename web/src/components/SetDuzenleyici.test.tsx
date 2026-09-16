import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import SetDuzenleyici from './SetDuzenleyici';
import type { SetKaydi } from '../api/queries';

const KAYIT: SetKaydi = {
  id: 7,
  sessionId: 40,
  exerciseId: 1,
  exerciseName: 'Dips',
  weight: 70,
  reps: 12,
  recordType: 'None',
  rir: 2,
  createdAt: '2026-09-14T17:10:00Z',
  restSeconds: null,
};

interface Istek {
  method: string;
  path: string;
  govde: unknown;
}

/** PATCH ve DELETE isteklerini kaydeder; PATCH yaniti testte degistirilebilir. */
function istekleriIzle(patchYaniti: () => Response = () => HttpResponse.json({ ...KAYIT, weight: 72.5, reps: 10, rir: 1 })) {
  const istekler: Istek[] = [];
  server.use(
    http.patch('/api/sets/:id', async ({ request }) => {
      istekler.push({ method: 'PATCH', path: new URL(request.url).pathname, govde: await request.json() });
      return patchYaniti();
    }),
    http.delete('/api/sets/:id', ({ request }) => {
      istekler.push({ method: 'DELETE', path: new URL(request.url).pathname, govde: null });
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return istekler;
}

function duzenleyiciyiOlustur() {
  const onKapat = vi.fn();
  const onSil = vi.fn();
  const istemci = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={istemci}>
      <ul>
        <SetDuzenleyici kayit={KAYIT} sira={1} onKapat={onKapat} onSil={onSil} />
      </ul>
    </QueryClientProvider>,
  );
  return { onKapat, onSil, form: screen.getByRole('form', { name: '1. seti düzenle' }) };
}

test('mevcut degerlerle dolu acilir; Kaydet yeni degerleri PATCH ile gonderir ve kapanir', async () => {
  const istekler = istekleriIzle();
  const kullanici = userEvent.setup();
  const { onKapat, form } = duzenleyiciyiOlustur();

  const agirlik = within(form).getByLabelText('Ağırlık (kg)');
  const tekrar = within(form).getByLabelText('Tekrar');
  const rir = within(form).getByLabelText('RIR (opsiyonel)');
  expect(agirlik).toHaveValue('70');
  expect(tekrar).toHaveValue('12');
  expect(rir).toHaveValue('2');

  await kullanici.clear(agirlik);
  // Ekleme formuyla ayni kural: virgul kabul edilir, sunucuya nokta ile gider.
  await kullanici.type(agirlik, '72,5');
  await kullanici.clear(tekrar);
  await kullanici.type(tekrar, '10');
  await kullanici.clear(rir);
  await kullanici.type(rir, '1');
  await kullanici.click(within(form).getByRole('button', { name: 'Kaydet' }));

  await waitFor(() => expect(onKapat).toHaveBeenCalled());
  expect(istekler).toEqual([{ method: 'PATCH', path: '/api/sets/7', govde: { weight: 72.5, reps: 10, rir: 1 } }]);
});

test('gecersiz giriste alan hatasi gosterilir ve istek gitmez', async () => {
  const istekler = istekleriIzle();
  const kullanici = userEvent.setup();
  const { onKapat, form } = duzenleyiciyiOlustur();

  await kullanici.clear(within(form).getByLabelText('Tekrar'));
  await kullanici.click(within(form).getByRole('button', { name: 'Kaydet' }));

  expect(within(form).getByRole('alert')).toHaveTextContent('Tekrar sayısı girilmeli.');
  expect(istekler).toEqual([]);
  expect(onKapat).not.toHaveBeenCalled();
});

test('sunucu reddederse hata duyurulur, duzenleyici acik kalir ve yazilan deger korunur', async () => {
  istekleriIzle(() => HttpResponse.json({ title: 'Sunucu hatası', status: 500 }, { status: 500 }));
  const kullanici = userEvent.setup();
  const { onKapat, form } = duzenleyiciyiOlustur();

  const tekrar = within(form).getByLabelText('Tekrar');
  await kullanici.clear(tekrar);
  await kullanici.type(tekrar, '10');
  await kullanici.click(within(form).getByRole('button', { name: 'Kaydet' }));

  expect(await within(form).findByRole('alert')).toBeInTheDocument();
  expect(tekrar).toHaveValue('10');
  expect(onKapat).not.toHaveBeenCalled();
});

test('Vazgec istek atmadan kapatir; Seti sil silmeyi sayfaya birakir, kendisi DELETE atmaz', async () => {
  const istekler = istekleriIzle();
  const kullanici = userEvent.setup();
  const { onKapat, onSil, form } = duzenleyiciyiOlustur();

  await kullanici.click(within(form).getByRole('button', { name: 'Vazgeç' }));
  expect(onKapat).toHaveBeenCalled();

  // Silme GECIKMELIDIR (geri alma penceresi, #46 deseni): istegi sayfa atar, duzenleyici degil.
  await kullanici.click(within(form).getByRole('button', { name: 'Seti sil' }));
  expect(onSil).toHaveBeenCalled();
  expect(istekler).toEqual([]);
});
