import { expect, test } from 'vitest';
import { dilAlgila } from './i18n';

test('listede desteklenen ilk dil kazanir', () => {
  expect(dilAlgila(['tr-TR', 'en'])).toBe('tr');
  expect(dilAlgila(['en-US', 'tr'])).toBe('en');
  expect(dilAlgila(['de', 'tr'])).toBe('tr');
});

test('desteklenen dil yoksa Ingilizce, liste bossa Turkce', () => {
  expect(dilAlgila(['de'])).toBe('en');
  expect(dilAlgila([])).toBe('tr');
});
