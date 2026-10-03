import type { Sablon } from '@grind/shared/api/queries';
import { useBasiliTutmaMenusu } from './useBasiliTutmaMenusu';

/** Sablon kartinin basili tutma menusu (#439, #538); durum `useBasiliTutmaMenusu`ndadir. */
export function useSablonMenusu() {
  const { menu, ...gerisi } = useBasiliTutmaMenusu<Sablon>();
  return { menu: menu && { sablon: menu.oge, kaynak: menu.kaynak }, ...gerisi };
}
