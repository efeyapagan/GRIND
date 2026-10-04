import { request } from '@grind/shared/api/client';
import { ApiError } from '@grind/shared/api/problem';
import { kuyruguGonder } from './gonderici';
import type { BekleyenIslem } from './kuyruk';

jest.mock('@grind/shared/api/client', () => ({ request: jest.fn() }));
const requestMock = request as jest.Mock;

const baslat: BekleyenIslem = { tur: 'oturumBaslat', anahtar: 'a1', oturumId: -1, templateId: 7, startedAt: '2026-10-03T10:00:00Z' };
const setEkle: BekleyenIslem = {
  tur: 'setEkle', anahtar: 's1', oturumId: -1, setId: -10, exerciseId: 3, weight: 60, reps: 8, rir: null,
  durationSeconds: null, createdAt: '2026-10-03T10:05:00Z',
};
const bitir: BekleyenIslem = { tur: 'oturumBitir', anahtar: 'b1', oturumId: -1, zorluk: 'Hard', endedAt: '2026-10-03T11:00:00Z' };

beforeEach(() => requestMock.mockReset());

/** Islemler sirayla gider; gecici kimlik sunucunun verdigiyle degisir, sonraki islem gercek kimligi kullanir. */
test('islemler sirayla gonderilir, gecici kimlikler gercekle eslenir', async () => {
  requestMock.mockImplementation(async (yol: string) => {
    if (yol === '/sessions') return { id: 501 };
    if (yol === '/sessions/501/sets') return { id: 900 };
    return {};
  });

  const sonuc = await kuyruguGonder([baslat, setEkle, bitir]);

  expect(sonuc.kalan).toEqual([]);
  expect(requestMock.mock.calls.map(([yol]) => yol)).toEqual(['/sessions', '/sessions/501/sets', '/sessions/501/finish']);
  expect(JSON.parse(requestMock.mock.calls[0][1].body)).toMatchObject({ templateId: 7, startedAt: '2026-10-03T10:00:00Z', clientRequestId: 'a1' });
  expect(JSON.parse(requestMock.mock.calls[1][1].body)).toMatchObject({ exerciseId: 3, clientCreatedAt: '2026-10-03T10:05:00Z', clientRequestId: 's1' });
  expect(JSON.parse(requestMock.mock.calls[2][1].body)).toMatchObject({ difficulty: 'Hard', clientEndedAt: '2026-10-03T11:00:00Z' });
  expect(sonuc.eslemeler).toEqual([{ tur: 'oturum', gecici: -1, gercek: 501 }, { tur: 'set', gecici: -10, gercek: 900 }]);
});

/** Ag hatasinda durur; gonderilemeyen islem ve sonrakiler kuyrukta kalir, sira bozulmaz. */
test('ag hatasinda durur, kalan islemler sirayla kuyrukta kalir', async () => {
  requestMock.mockImplementation(async (yol: string) => {
    if (yol === '/sessions') return { id: 501 };
    throw new TypeError('Network request failed');
  });

  const sonuc = await kuyruguGonder([baslat, setEkle, bitir]);

  expect(sonuc.durdu).toBe(true);
  expect(sonuc.kalan.map((islem) => islem.tur)).toEqual(['setEkle', 'oturumBitir']);
  // Basarili baslatmanin kimligi kalanlara uygulanmis olmali.
  expect(sonuc.kalan[0]).toMatchObject({ oturumId: 501 });
});

/** Sunucu islemi reddederse (4xx) kuyruk tikanmaz: islem atlanir, sonrakiler gider. */
test('4xx alan islem atlanir, kuyruk devam eder', async () => {
  requestMock.mockImplementation(async (yol: string) => {
    if (yol === '/sets/55') throw new ApiError(404, 'Set bulunamadı.');
    return {};
  });

  const sonuc = await kuyruguGonder([
    { tur: 'setSil', anahtar: 'x1', setId: 55 },
    { tur: 'setSil', anahtar: 'x2', setId: 56 },
  ]);

  expect(sonuc.kalan).toEqual([]);
  expect(sonuc.atlanan).toBe(1);
  expect(requestMock).toHaveBeenCalledTimes(2);
});

/** Sunucu hatasi (5xx) gecicidir: durulur, islem sonra tekrar denenir. */
test('5xx alinca durur ve islem kuyrukta kalir', async () => {
  requestMock.mockRejectedValue(new ApiError(503, 'Hizmet yok'));

  const sonuc = await kuyruguGonder([{ tur: 'setSil', anahtar: 'x1', setId: 55 }]);

  expect(sonuc.durdu).toBe(true);
  expect(sonuc.kalan).toHaveLength(1);
});

/** Oturum dusmusse (401) islem atilmaz: yeniden giristen sonra gonderilir, antrenman kaybolmaz. */
test('401 alinca durur ve islem kuyrukta kalir', async () => {
  requestMock.mockRejectedValue(new ApiError(401, 'Yetkisiz'));

  const sonuc = await kuyruguGonder([{ tur: 'setSil', anahtar: 'x1', setId: 55 }]);

  expect(sonuc.durdu).toBe(true);
  expect(sonuc.kalan).toHaveLength(1);
});

/** #174 dilim 3: sablon once gider; gercek kimligi onunla baslatilan antrenmana uygulanir. */
test('sablon olusturma anahtarla gider, gercek kimlik sonraki baslatmaya uygulanir', async () => {
  requestMock.mockImplementation(async (yol: string) => {
    if (yol === '/templates') return { id: 12 };
    if (yol === '/sessions') return { id: 501 };
    return {};
  });

  const sonuc = await kuyruguGonder([
    { tur: 'sablonOlustur', anahtar: 't1', sablonId: -50, name: 'Leg Day', exercises: [{ exerciseId: 3, plannedSets: 3, restSeconds: 90 }] },
    { tur: 'oturumBaslat', anahtar: 'a1', oturumId: -1, templateId: -50, startedAt: '2026-10-04T10:00:00Z' },
    { tur: 'sablonSabitle', anahtar: 'p1', sablonId: 12, isPinned: true },
    { tur: 'sablonSirala', anahtar: 'r1', templateIds: [12, 7] },
    { tur: 'sablonGuncelle', anahtar: 'g1', sablonId: 7, name: 'Push', exercises: [] },
    { tur: 'sablonSil', anahtar: 's1', sablonId: 9 },
  ]);

  expect(sonuc.kalan).toEqual([]);
  expect(requestMock.mock.calls.map(([yol, secenek]) => `${secenek.method} ${yol}`)).toEqual([
    'POST /templates',
    'POST /sessions',
    'PUT /templates/12/pin',
    'PUT /templates/order',
    'PUT /templates/7',
    'DELETE /templates/9',
  ]);
  expect(JSON.parse(requestMock.mock.calls[0][1].body)).toMatchObject({ name: 'Leg Day', clientRequestId: 't1' });
  expect(JSON.parse(requestMock.mock.calls[1][1].body)).toMatchObject({ templateId: 12 });
  expect(JSON.parse(requestMock.mock.calls[2][1].body)).toEqual({ isPinned: true });
  expect(JSON.parse(requestMock.mock.calls[3][1].body)).toEqual({ templateIds: [12, 7] });
});

/** Sunucu cevrimdisi olusturulan sablonu reddederse (orn. ad cakismasi) onunla yapilan antrenman sablonsuz gider. */
test('reddedilen sablon olusturma antrenmani kaybettirmez, baslatma sablonsuz gider', async () => {
  const olustur: BekleyenIslem = {
    tur: 'sablonOlustur', anahtar: 't1', sablonId: -5, name: 'Leg Day', exercises: [{ exerciseId: 3, plannedSets: 4, restSeconds: 90 }],
  };
  requestMock.mockImplementation(async (yol: string) => {
    if (yol === '/templates') throw new ApiError(409, 'cakisma');
    if (yol === '/sessions') return { id: 501 };
    return {};
  });

  const sonuc = await kuyruguGonder([olustur, { ...baslat, templateId: -5 }, bitir]);

  expect(sonuc.atlanan).toBe(1);
  expect(requestMock.mock.calls.map(([yol]) => yol)).toEqual(['/templates', '/sessions', '/sessions/501/finish']);
  expect(JSON.parse(requestMock.mock.calls[1][1].body)).toMatchObject({ templateId: null });
});
