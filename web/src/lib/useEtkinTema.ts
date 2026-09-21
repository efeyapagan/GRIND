import { useSyncExternalStore } from 'react';
import type { EtkinTema } from './tema';

/*
 * Sayfanin O AN uyguladigi tema (#194). Kaynak `<html data-theme>`'in kendisidir -- React state'inde
 * ikinci bir kopya tutulmaz. Tema uc yoldan degisebilir (tema dugmesi, sistem dinleyicisi, ilk boya
 * script'i) ve hepsi ayni ozniteligi yazar; bu yuzden ozniteligi izlemek, hicbirini atlamaz.
 */
function abone(bildir: () => void): () => void {
  const gozlemci = new MutationObserver(bildir);
  gozlemci.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => gozlemci.disconnect();
}

function anlikTema(): EtkinTema {
  return document.documentElement.dataset.theme === 'light' ? 'acik' : 'koyu';
}

export function useEtkinTema(): EtkinTema {
  return useSyncExternalStore(abone, anlikTema);
}
