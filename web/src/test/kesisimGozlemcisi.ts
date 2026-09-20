import { vi } from 'vitest';

/**
 * jsdom `IntersectionObserver`i uygulamaz -- sonsuz kaydirmali sayfalar (Gecmis #138, Insights/
 * Measurements #147) listenin sonundaki bir gozlemci ogesiyle calisir, bu yuzden testte sahte
 * bir tanimla degistirilir. `tetikle` gozlemlenen ogenin gorunur oldugunu (`isIntersecting:
 * true`) bildirir, sayfanin `fetchNextPage` cagirmasini tetikler.
 *
 * Cagiran taraf testin sonunda `vi.unstubAllGlobals()` cagirmali (bir `afterEach` ile).
 */
export function sahteKesisimGozlemcisiKur() {
  const geriCagirmalar: IntersectionObserverCallback[] = [];
  class SahteIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds: number[] = [];
    constructor(geriCagirma: IntersectionObserverCallback) {
      geriCagirmalar.push(geriCagirma);
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = () => [];
  }
  vi.stubGlobal('IntersectionObserver', SahteIntersectionObserver);
  return {
    tetikle: () => {
      const sahteEntry = { isIntersecting: true } as IntersectionObserverEntry;
      geriCagirmalar.forEach((cb) => cb([sahteEntry], new SahteIntersectionObserver(() => {})));
    },
  };
}
