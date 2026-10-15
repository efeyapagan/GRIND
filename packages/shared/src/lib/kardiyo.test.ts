import { expect, test } from 'vitest';
import type { KardiyoDegerleri } from '../api/queries';
import {
  BOS_KARDIYO_DEGERLERI,
  ayarAlanlari,
  kardiyoGirdisiniAyristir,
  kardiyoOzetParcalari,
  kardiyoSuresiniAyristir,
  kardiyoSureMetni,
  metreMi,
  sonucAlanlari,
} from './kardiyo';

const kosu: KardiyoDegerleri = { ...BOS_KARDIYO_DEGERLERI, speedKmh: 9, inclinePercent: 6, distanceKm: 3.2 };

/** #647: ozet mesafeyle baslar, yalnizca dolu kutulari dile gore yazar. */
test('ozet dolu kutulari sabit sirayla ve dile gore bicimler', () => {
  expect(kardiyoOzetParcalari(kosu, false, 'tr')).toEqual([
    { anahtar: 'Distance', deger: '3,2' },
    { anahtar: 'Speed', deger: '9' },
    { anahtar: 'Incline', deger: '6' },
  ]);
  expect(kardiyoOzetParcalari(kosu, false, 'en')[0]).toEqual({ anahtar: 'Distance', deger: '3.2' });
});

/** Kurek ve kayak ergometresi (damper + mesafe) mesafeyi metre yazar; form da metre alir, km saklanir. */
test('damperli makinede mesafe metre gosterilir ve km saklanir', () => {
  const kurek = ['Damper', 'Distance', 'Cadence', 'Watts'] as const;
  expect(metreMi(kurek)).toBe(true);
  expect(metreMi(['Speed', 'Incline', 'Distance'])).toBe(false);
  expect(kardiyoOzetParcalari({ ...BOS_KARDIYO_DEGERLERI, distanceKm: 2.5 }, true, 'tr')).toEqual([
    { anahtar: 'DistanceMetre', deger: '2.500' },
  ]);
  expect(kardiyoGirdisiniAyristir({ Distance: '2500' }, kurek, true).degerler.distanceKm).toBe(2.5);
});

test('ayarlar baslamadan once, sonuclar durdurunca sorulur', () => {
  const eliptik = ['Level', 'Incline', 'Distance', 'Cadence'] as const;
  expect(ayarAlanlari(eliptik)).toEqual(['Incline', 'Level']);
  expect(sonucAlanlari(eliptik)).toEqual(['Distance', 'Cadence']);
});

test('bos kutu null, virgullu ondalik kabul, aralik disi ve kesirli tam sayi hatadir', () => {
  const sonuc = kardiyoGirdisiniAyristir(
    { Speed: '9,5', Incline: '', Level: '2.5', Distance: '250' },
    ['Speed', 'Incline', 'Level', 'Distance'],
    false,
  );
  expect(sonuc.degerler.speedKmh).toBe(9.5);
  expect(sonuc.degerler.inclinePercent).toBeNull();
  expect(sonuc.hatalar).toEqual(['Level', 'Distance']);
});

test('akan kaydin suresi baslangictan, bitmisinki kayittan', () => {
  const baslangic = '2026-10-15T10:00:00Z';
  const simdi = Date.parse(baslangic) + 75_000;
  expect(kardiyoSureMetni({ startedAt: baslangic, durationSeconds: null }, simdi)).toBe('1:15');
  expect(kardiyoSureMetni({ startedAt: baslangic, durationSeconds: 1200 }, simdi)).toBe('20:00');
});

test('sure kutulari saniyeye cevrilir, gecersiz ya da aralik disi null', () => {
  expect(kardiyoSuresiniAyristir('20', '30')).toBe(1230);
  expect(kardiyoSuresiniAyristir('', '45')).toBe(45);
  expect(kardiyoSuresiniAyristir('0', '0')).toBeNull();
  expect(kardiyoSuresiniAyristir('1', '60')).toBeNull();
  expect(kardiyoSuresiniAyristir('241', '0')).toBeNull();
});
