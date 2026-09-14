import { useEffect, useState, type RefObject } from 'react';

/**
 * Bir elemanin gercek piksel genisligi. SVG koordinatlari pikselle hesaplanir: viewBox'u
 * `preserveAspectRatio="none"` ile esnetmek noktalari elipse, koseleri egriye cevirirdi (dilim 2
 * gorsel notu). `ResizeObserver` yoksa (jsdom) `varsayilan` doner.
 */
export function useGenislik(ref: RefObject<HTMLElement | null>, varsayilan: number): number {
  const [genislik, setGenislik] = useState(varsayilan);

  useEffect(() => {
    const eleman = ref.current;
    if (!eleman || typeof ResizeObserver === 'undefined') {
      return;
    }
    const gozlemci = new ResizeObserver(([kayit]) => {
      const olculen = Math.round(kayit.contentRect.width);
      if (olculen > 0) {
        setGenislik(olculen);
      }
    });
    gozlemci.observe(eleman);
    return () => gozlemci.disconnect();
  }, [ref]);

  return genislik;
}
