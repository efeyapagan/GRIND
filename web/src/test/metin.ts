import type { MatcherFunction } from '@testing-library/dom';

/**
 * Tasarimda bir deger birden fazla elemana bolunur ("60" + <span>kg</span> + <span>×</span> + "8"),
 * bu yuzden `getByText('60 kg × 8')` onu bulamaz. Bu esleyici textContent'i TAM olarak `metin`
 * olan elemani bulur; ayni metni tasiyan bir cocugu varsa (yalnizca onu saran bir kapsayici)
 * kapsayiciyi degil cocugu secer, boylece tek bir eslesme kalir.
 */
export function tamMetin(metin: string): MatcherFunction {
  return (_icerik, eleman) =>
    eleman?.textContent === metin &&
    Array.from(eleman.children).every((cocuk) => cocuk.textContent !== metin);
}
