import { beforeAll, expect, test } from 'vitest';
import { i18nBaslat } from '../i18n/i18n';
import { setGirdisiMetni, setGirdisiniAyristir, setGirdisiniDogrula, type SetGirdisiMetni } from './setGirdisi';

beforeAll(() => i18nBaslat('tr'));

function girdi(alanlar: Partial<SetGirdisiMetni>): SetGirdisiMetni {
  return { agirlik: '', tekrar: '', rir: '', sure: '', ...alanlar };
}

/** #346: agirliksiz harekette kilo "ek agirlik"tir -- bos birakilabilir, RIR gonderilmez. */
test('agirliksiz harekette bos agirlik gecerlidir ve RIR gonderilmez', () => {
  const metin = girdi({ tekrar: '20', rir: '2' });

  expect(setGirdisiniDogrula(metin, 'Reps')).toEqual({});
  // Bos ek agirlik 0 gider: duzeltmede `null` "dokunma" demek olurdu.
  expect(setGirdisiniAyristir(metin, 'Reps')).toEqual({ weight: 0, reps: 20, rir: null, durationSeconds: null });
});

test('kilolu harekette agirlik hala zorunludur', () => {
  expect(setGirdisiniDogrula(girdi({ tekrar: '8' }), 'WeightReps')).toHaveProperty('weight');
});

/** #346: sureli harekette yalnizca saniye gonderilir; tam sayi ve 1–3600 arasi olmali. */
test('sureli harekette yalnizca sure dogrulanir ve gonderilir', () => {
  expect(setGirdisiniDogrula(girdi({}), 'Duration')).toHaveProperty('durationSeconds');
  expect(setGirdisiniDogrula(girdi({ sure: '4000' }), 'Duration')).toHaveProperty('durationSeconds');
  expect(setGirdisiniDogrula(girdi({ sure: '45' }), 'Duration')).toEqual({});
  expect(setGirdisiniAyristir(girdi({ agirlik: '5', tekrar: '3', sure: '45' }), 'Duration')).toEqual({
    weight: null,
    reps: null,
    rir: null,
    durationSeconds: 45,
  });
});

test('sureli set duzenleyiciye saniyesiyle, tekrari bos gelir', () => {
  expect(setGirdisiMetni({ weight: 0, reps: null, rir: null, durationSeconds: 75 })).toEqual({
    agirlik: '0',
    tekrar: '',
    rir: '',
    sure: '75',
  });
});
