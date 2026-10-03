import { useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/**
 * #606 (kullanici bildirdi: sablon karuselini kaydirirken kasma; "Hareketi Azalt" acilinca geciyor):
 * yana kayan karuselde ondeki -- snap edilmis -- kartin sirasi. Her kartin figuru (`SablonFiguru`) surekli
 * oynadiginda butun kartlarinki ayni anda UI thread'inde ciziliyordu; figur yalnizca ondeki kartta oynar.
 *
 * Durum yalnizca ondeki kart DEGISINCE guncellenir: kaydirma olaylari her karede gelir, her birinde
 * yeniden cizim kasmanin kendisini geri getirirdi.
 */
export function useOndekiKart(sira: number, adet: number) {
  const [ondeki, setOndeki] = useState(0);

  function kaydirildi(olay: NativeSyntheticEvent<NativeScrollEvent>) {
    const yeni = Math.min(Math.max(adet - 1, 0), Math.max(0, Math.round(olay.nativeEvent.contentOffset.x / sira)));
    setOndeki((eski) => (eski === yeni ? eski : yeni));
  }

  return [ondeki, kaydirildi] as const;
}
