import { beforeAll, expect, test } from 'vitest';
import { i18nBaslat } from '../i18n/i18n';
import { setDegeriMetni } from './setDegeri';

beforeAll(() => i18nBaslat('tr'));

/** #346: set uc bicimde yazilir -- kilolu, agirliksiz (ek agirlik varsa one eklenir) ve sureli. */
test('set olcum tipine gore yazilir', () => {
  expect(setDegeriMetni({ weight: 62.5, reps: 8, durationSeconds: null, measurement: 'WeightReps' }, 'tr')).toBe(
    '62,5 kg × 8',
  );
  expect(setDegeriMetni({ weight: 0, reps: 20, durationSeconds: null, measurement: 'Reps' }, 'tr')).toBe('20 tekrar');
  expect(setDegeriMetni({ weight: 5, reps: 20, durationSeconds: null, measurement: 'Reps' }, 'tr')).toBe('+5 kg × 20');
  expect(setDegeriMetni({ weight: 0, reps: null, durationSeconds: 75, measurement: 'Duration' }, 'tr')).toBe('1:15');
});

/** Plank #346'dan once "0 kg × n" girilebiliyordu: suresiz eski set eskisi gibi yazilir. */
test('sureli hareketin suresiz eski seti kilo × tekrar yazilir', () => {
  expect(setDegeriMetni({ weight: 0, reps: 60, durationSeconds: null, measurement: 'Duration' }, 'tr')).toBe('0 kg × 60');
});
