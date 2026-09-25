import { expect, test } from 'vitest';
import { enYakinRirDegeri, rirEtiketi } from './rir';
import { setGirdisiMetni } from './setGirdisi';

/**
 * #266: RIR kaydiricisi on duraklidir -- 0, 0–1, 1, 1–2, 2, 2–3, 3, 3–4, 4, 4+. Ara durak yarim
 * adim olarak saklanir (2–3 = 2.5), "4+" = 5. Web ve mobil kaydirici ile set haplari bu ortak
 * hesabi kullanir.
 */
test('tam durak kendi sayisini, ara durak araligi, 5 ve ustu 4+ yazar', () => {
  expect(rirEtiketi(0)).toBe('0');
  expect(rirEtiketi(2)).toBe('2');
  expect(rirEtiketi(0.5)).toBe('0–1');
  expect(rirEtiketi(2.5)).toBe('2–3');
  expect(rirEtiketi(5)).toBe('4+');
  // #266 oncesi RIR serbest tam sayiydi; eski kayitlardaki 5'ten buyuk degerler de "4+" gorunur.
  expect(rirEtiketi(7)).toBe('4+');
});

test('raydaki konum (0 = sol uc, 1 = sag uc) en yakin duragin degerine duser', () => {
  expect(enYakinRirDegeri(0)).toBe(0);
  expect(enYakinRirDegeri(1)).toBe(5);
  // On durak esit aralikli: 5. durak (2–3) 5/9 ≈ 0.556'da.
  expect(enYakinRirDegeri(0.54)).toBe(2.5);
  // Parmak rayin disina tasarsa en yakin uca duser.
  expect(enYakinRirDegeri(-0.2)).toBe(0);
  expect(enYakinRirDegeri(1.3)).toBe(5);
});

test('eski kayittaki 5 ustu RIR duzenleyiciye 4+ (5) olarak gelir', () => {
  // Sunucu artik 5'ten buyugunu reddeder: duzenleyici 7'yi oldugu gibi geri gonderseydi yalnizca
  // agirligi duzelten bir kayit bile 400 alirdi.
  expect(setGirdisiMetni({ weight: 60, reps: 12, rir: 7 }).rir).toBe('5');
});
