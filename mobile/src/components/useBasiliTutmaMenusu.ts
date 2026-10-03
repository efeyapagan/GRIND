import { useRef, useState } from 'react';
import type { View } from 'react-native';
import type { Kutu } from './BasiliTutmaMenusu';

/**
 * Karta basili tutunca acilan menunun durumu (#439; #538'de kaydedilenler ekraniyla, #623'te olcu
 * kartiyla paylasildi). Acilisin nereden baslayacagi icin kartin ekrandaki yeri olculur; olcum
 * gelmezse menu yine acilir, onizleme ortadan belirir.
 */
export function useBasiliTutmaMenusu<T extends { id: number }>() {
  const kartlar = useRef(new Map<number, View | null>());
  const [menu, setMenu] = useState<{ oge: T; kaynak: Kutu | null } | null>(null);

  function menuyuAc(oge: T) {
    setMenu({ oge, kaynak: null });
    kartlar.current.get(oge.id)?.measureInWindow((x, y, genislik, yukseklik) => {
      setMenu((acik) => (acik?.oge.id === oge.id ? { ...acik, kaynak: { x, y, genislik, yukseklik } } : acik));
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
