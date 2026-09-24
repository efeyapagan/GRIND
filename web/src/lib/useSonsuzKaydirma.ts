import { useEffect, useRef } from 'react';

/**
 * Sonsuz kaydirma gozcusu (#138 deseni): dondurulen ref'i listenin sonundaki gorunmez ogeye bagla;
 * viewport'a girince `sonrakiniGetir` cagrilir. `dahaVar` false iken gozlemci hic kurulmaz.
 */
export function useSonsuzKaydirma(dahaVar: boolean, sonrakiniGetir: () => unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const oge = ref.current;
    if (!oge || !dahaVar) {
      return;
    }
    const gozlemci = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void sonrakiniGetir();
        }
      },
      { rootMargin: '200px' },
    );
    gozlemci.observe(oge);
    return () => gozlemci.disconnect();
  }, [dahaVar, sonrakiniGetir]);
  return ref;
}
