import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface PageTitleContextValue {
  baslik: string;
  setBaslik: (baslik: string) => void;
}

const PageTitleContext = createContext<PageTitleContextValue | undefined>(undefined);

/**
 * Ust kabugun (App.tsx) baslik durumu (issue #65). Her sayfanin kendi govdesindeki `<h1>` kalkti;
 * ust kabuktaki baslik artik TEK dogruluk kaynagi. Sayfalar `usePageTitle` ile kendi basliklarini
 * bildirir, App.tsx `useHeaderTitle` ile okur -- Context'in AYNI Provider altindaki iki farkli
 * cocugu (header ve Outlet) birbirinden habersiz calisir, aradaki tek bag budur.
 */
export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [baslik, setBaslik] = useState('');
  return <PageTitleContext.Provider value={{ baslik, setBaslik }}>{children}</PageTitleContext.Provider>;
}

function usePageTitleContext(): PageTitleContextValue {
  const context = useContext(PageTitleContext);
  if (!context) {
    throw new Error('usePageTitle/useHeaderTitle, PageTitleProvider içinde kullanılmalıdır.');
  }
  return context;
}

/**
 * Bir sayfa kendi basligini bildirir. `useEffect` icinde cagrilir (render sirasinda DEGIL):
 * baslik bir baska bilesenin (App.tsx'in header'i) state'i, render sirasinda ona yazmak React'in
 * "iki bilesen ayni state'i ayni anda gunceller" uyarisini tetikler. Sabit bir yol degisince
 * (orn. '/history' -> '/records') efekt yeniden calisip basligi gunceller; ayni sayfa icinde
 * baslik degismiyorsa (orn. SablonDuzenlePage yuklenirken "Sablonu duzenle") efekt tekrar
 * calismaz -- bagimlilik dizisi zaten ayni degeri tasir.
 */
export function usePageTitle(baslik: string): void {
  const { setBaslik } = usePageTitleContext();
  useEffect(() => {
    setBaslik(baslik);
  }, [baslik, setBaslik]);
}

/** App.tsx'in ust kabukta gosterecegi guncel sayfa basligi. */
export function useHeaderTitle(): string {
  return usePageTitleContext().baslik;
}
