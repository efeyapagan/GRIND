import { describe, expect, it } from 'vitest';
import { KART_BOSLUGU, kartHizalamaKaydirmasi } from './kartHizalama';

/**
 * #274: set paneli acilinca secili kart gorunur alana (ust baslik ile panel arasi) hizalanir --
 * web ve mobil ayni saf fonksiyonu kullanir (packages/shared/src/lib/kartHizalama.ts). Donen deger
 * kaydirma miktaridir (px): pozitif = sayfa asagi kayar.
 */
describe('kartHizalamaKaydirmasi', () => {
  const alan = { ust: 64, alt: 500 };

  it('panelin arkasinda kalan karti, alt kenari panelin hemen ustune gelecek kadar kaydirir', () => {
    expect(kartHizalamaKaydirmasi({ ust: 300, alt: 620 }, alan)).toBe(620 - (500 - KART_BOSLUGU));
  });

  it('kart zaten tamamen gorunuyorsa kaydirmaz', () => {
    expect(kartHizalamaKaydirmasi({ ust: 100, alt: 400 }, alan)).toBe(0);
  });

  it('ust basligin altinda kalan karti, ustu gorunecek kadar geri kaydirir', () => {
    expect(kartHizalamaKaydirmasi({ ust: 20, alt: 200 }, alan)).toBe(20 - (64 + KART_BOSLUGU));
  });

  it('alana sigmayan kartta ustu onceliklidir', () => {
    expect(kartHizalamaKaydirmasi({ ust: 300, alt: 900 }, alan)).toBe(300 - (64 + KART_BOSLUGU));
  });
});
