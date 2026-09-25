import { beforeAll, expect, test } from 'vitest';
import { i18nBaslat } from '../i18n/i18n';
import { parseProblem } from './problem';

// Govdesiz yanitin mesaji katalogdan gelir; web'de bunu test kurulumu yapiyordu.
beforeAll(() => i18nBaslat('tr'));

test('alan bazli dogrulama hatasi alanlara ayrilir', () => {
  const hata = parseProblem(400, {
    title: 'One or more validation errors occurred.',
    status: 400,
    errors: { Password: ['Şifre en az 8 karakter olmalı.'] },
  });

  expect(hata.status).toBe(400);
  expect(hata.fieldErrors.Password).toEqual(['Şifre en az 8 karakter olmalı.']);
});

test('is kurali hatasi detail alanindan okunur', () => {
  const hata = parseProblem(400, {
    title: 'Geçersiz istek',
    status: 400,
    detail: 'Bu aralıkta yorumlanacak kayıt yok.',
  });

  expect(hata.detail).toBe('Bu aralıkta yorumlanacak kayıt yok.');
  expect(hata.fieldErrors).toEqual({});
});

test('govdesiz yanit icin anlasilir bir mesaj uretilir', () => {
  const hata = parseProblem(503, null);

  expect(hata.status).toBe(503);
  expect(hata.detail.length).toBeGreaterThan(0);
});
