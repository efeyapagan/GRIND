import { useEffect, useState } from 'react';

/**
 * Degeri, degismeyi BIRAKTIKTAN `gecikmeMs` sonra yansitir (#372: kullanici adi uygunlugu her
 * tusa basista degil, yazma durunca sorulur). Her degisiklikte sayac bastan baslar.
 *
 * Ilk deger beklemez: pencere mevcut adla aciliyor, onu "henuz yazilmamis" saymak yanlis olurdu.
 */
export function useGecikmeliDeger<T>(deger: T, gecikmeMs: number): T {
  const [gecikmis, setGecikmis] = useState(deger);

  useEffect(() => {
    const zamanlayici = setTimeout(() => setGecikmis(deger), gecikmeMs);
    return () => clearTimeout(zamanlayici);
  }, [deger, gecikmeMs]);

  return gecikmis;
}
