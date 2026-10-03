import { describe, expect, test } from 'vitest';
import {
  KIRPMA_EN_FAZLA_YAKINLASTIRMA,
  kaydirmaSinirla,
  kirpmaDikdortgeni,
  yakinlastirmaSinirla,
} from './fotografKirpma';

// #565: kullanici fotografi kare bir cercevede yakinlastirip kaydirarak kirpar. Gorsel cerceveyi
// "cover" ile doldurur (kisa kenar = cerceve), yakinlastirma 1x-4x, kaydirma cerceve noktasinda.

const CERCEVE = 300;
const YATAY = { genislik: 2000, yukseklik: 1000 };
const DIKEY = { genislik: 1000, yukseklik: 2000 };

describe('kirpmaDikdortgeni', () => {
  test('baslangicta yatay gorselin ortasindan kisa kenar kadar kare alinir', () => {
    expect(kirpmaDikdortgeni(YATAY, CERCEVE, { yakinlastirma: 1, x: 0, y: 0 })).toEqual({
      originX: 500,
      originY: 0,
      width: 1000,
      height: 1000,
    });
  });

  test('baslangicta dikey gorselin ortasindan kisa kenar kadar kare alinir', () => {
    expect(kirpmaDikdortgeni(DIKEY, CERCEVE, { yakinlastirma: 1, x: 0, y: 0 })).toEqual({
      originX: 0,
      originY: 500,
      width: 1000,
      height: 1000,
    });
  });

  test('2x yakinlastirmada kare kisa kenarin yarisidir ve ortadadir', () => {
    expect(kirpmaDikdortgeni(YATAY, CERCEVE, { yakinlastirma: 2, x: 0, y: 0 })).toEqual({
      originX: 750,
      originY: 250,
      width: 500,
      height: 500,
    });
  });

  /** Gorseli saga kaydirmak (x > 0) cercevede gorselin SOLUNU gosterir: kare sola kayar. */
  test('kaydirma cerceve noktasindan gorsel pikseline cevrilir', () => {
    // 1x'te 1 cerceve noktasi = 1000 / 300 piksel; 150 nokta = 500 piksel.
    expect(kirpmaDikdortgeni(YATAY, CERCEVE, { yakinlastirma: 1, x: 150, y: 0 })).toEqual({
      originX: 0,
      originY: 0,
      width: 1000,
      height: 1000,
    });
  });

  test('sinir disina tasan bir konumda bile kare gorselin icinde kalir', () => {
    const kare = kirpmaDikdortgeni(YATAY, CERCEVE, { yakinlastirma: 1, x: 9999, y: -9999 });

    expect(kare.originX).toBe(0);
    expect(kare.originY).toBe(0);
    expect(kare.originX + kare.width).toBeLessThanOrEqual(YATAY.genislik);
    expect(kare.originY + kare.height).toBeLessThanOrEqual(YATAY.yukseklik);
  });
});

describe('kaydirmaSinirla', () => {
  /** Cercevenin icinde bos alan kalmamali: gorselin kenari cercevenin kenarini gecemez. */
  test('1x yatay gorselde yatay kaydirma tasan genisligin yarisiyla, dikey hic kaymaz', () => {
    // Gosterilen genislik 600, cerceve 300: her yone en fazla 150.
    expect(kaydirmaSinirla(YATAY, CERCEVE, { yakinlastirma: 1, x: 400, y: 50 })).toEqual({ x: 150, y: 0 });
    expect(kaydirmaSinirla(YATAY, CERCEVE, { yakinlastirma: 1, x: -400, y: -50 })).toEqual({ x: -150, y: 0 });
  });

  test('yakinlastirma arttikca kaydirma payi buyur', () => {
    // 2x: gosterilen 1200 x 600, cerceve 300: x en fazla 450, y en fazla 150.
    expect(kaydirmaSinirla(YATAY, CERCEVE, { yakinlastirma: 2, x: 999, y: 999 })).toEqual({ x: 450, y: 150 });
  });

  test('sinir icindeki kaydirma degismez', () => {
    expect(kaydirmaSinirla(YATAY, CERCEVE, { yakinlastirma: 1, x: 40, y: 0 })).toEqual({ x: 40, y: 0 });
  });
});

describe('yakinlastirmaSinirla', () => {
  test('1x ile en fazla yakinlastirma arasinda tutulur', () => {
    expect(yakinlastirmaSinirla(0.5)).toBe(1);
    expect(yakinlastirmaSinirla(2.5)).toBe(2.5);
    expect(yakinlastirmaSinirla(10)).toBe(KIRPMA_EN_FAZLA_YAKINLASTIRMA);
  });
});
