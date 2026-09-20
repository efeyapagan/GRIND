/**
 * jsdom'da `window.matchMedia` YOKTUR (#178). Bu stub hem sorguyu yanitlar hem de testin sistem
 * temasini calisma aninda degistirmesine izin verir -- `sistemTemasiniAyarla` kayitli dinleyicileri
 * tetikler, boylece "sistem temasi degisti" senaryosu gercek tarayicidaki gibi akar.
 */
type Dinleyici = (olay: MediaQueryListEvent) => void;

const dinleyiciler = new Map<string, Set<Dinleyici>>();
let acikMi = false;

function eslesme(sorgu: string): boolean {
  return sorgu.includes('light') ? acikMi : !acikMi;
}

export function matchMediaStubuKur(): void {
  window.matchMedia = ((sorgu: string) => {
    const kume = dinleyiciler.get(sorgu) ?? new Set<Dinleyici>();
    dinleyiciler.set(sorgu, kume);

    return {
      media: sorgu,
      get matches() {
        return eslesme(sorgu);
      },
      addEventListener: (_tur: 'change', dinleyici: Dinleyici) => {
        kume.add(dinleyici);
      },
      removeEventListener: (_tur: 'change', dinleyici: Dinleyici) => {
        kume.delete(dinleyici);
      },
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  }) as typeof window.matchMedia;
}

export function sistemTemasiniAyarla(acik: boolean): void {
  acikMi = acik;
  for (const [sorgu, kume] of dinleyiciler) {
    for (const dinleyici of kume) {
      dinleyici({ matches: eslesme(sorgu), media: sorgu } as MediaQueryListEvent);
    }
  }
}

/** Testler arasinda: kayitli dinleyicileri ve sistem temasini varsayilana (koyu) dondurur. */
export function matchMediaSifirla(): void {
  dinleyiciler.clear();
  acikMi = false;
}
