import { useRef, useState } from 'react';
import type { View } from 'react-native';
import type { Sablon } from '@grind/shared/api/queries';
import type { Kutu } from './SablonMenusu';

/**
 * Sablon kartina basili tutunca acilan menunun durumu (#439; #538'de kaydedilenler ekraniyla
 * paylasildi). Acilisin nereden baslayacagi icin kartin ekrandaki yeri olculur; olcum gelmezse menu
 * yine acilir, onizleme ortadan belirir.
 */
export function useSablonMenusu() {
  const kartlar = useRef(new Map<number, View | null>());
  const [menu, setMenu] = useState<{ sablon: Sablon; kaynak: Kutu | null } | null>(null);

  function menuyuAc(sablon: Sablon) {
    setMenu({ sablon, kaynak: null });
    kartlar.current.get(sablon.id)?.measureInWindow((x, y, genislik) => {
      setMenu((acik) => (acik?.sablon.id === sablon.id ? { ...acik, kaynak: { x, y, genislik } } : acik));
    });
  }

  /** Kartin `ref`i: olcum icin kartin gorunumunu id'siyle saklar. */
  function kartRef(id: number) {
    return (kart: View | null) => {
      kartlar.current.set(id, kart);
    };
  }

  return { menu, menuyuAc, menuyuKapat: () => setMenu(null), kartRef };
}
