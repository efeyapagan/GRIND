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
