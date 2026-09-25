import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Acik klavyenin GERCEK yuksekligi (kapaliyken 0) -- event payload'undan (`endCoordinates.height`)
 * okunur, cerceve olcumune dayanmaz (neden `KeyboardAvoidingView` degil: bkz. EkranKaydirici, #145).
 * Yalnizca iOS: Android'de pencere klavyeyle birlikte kuculur.
 *
 * `onAcildi`, yukseklik state'i native tarafa commit edildikten sonra (bir sonraki tick'te) cagrilir --
 * yeni yukseklige gore kaydirma/olcum yapan cagiran YARIS DURUMUNA dusmesin diye (#145).
 */
export function useKlavyeYuksekligi(onAcildi?: (klavyeYuksekligi: number) => void): number {
  const [klavyeYuksekligi, setKlavyeYuksekligi] = useState(0);
  // Dinleyici bir kez kurulur; en guncel geri cagrim ref uzerinden okunur.
  const acilincaRef = useRef(onAcildi);
  acilincaRef.current = onAcildi;

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }
    // `Will` (Did degil) kullanilir: klavye animasyonuyla ES ZAMANLI baslar, "Did" animasyon
    // bittikten sonra geldigi icin gorunur bir sicrama/gecikme yaratirdi.
    const gosterilince = Keyboard.addListener('keyboardWillShow', (e) => {
      const yukseklik = e.endCoordinates.height;
      setKlavyeYuksekligi(yukseklik);
      setTimeout(() => acilincaRef.current?.(yukseklik), 50);
    });
    const gizlenince = Keyboard.addListener('keyboardWillHide', () => {
      setKlavyeYuksekligi(0);
    });
    return () => {
      gosterilince.remove();
      gizlenince.remove();
    };
  }, []);

  return klavyeYuksekligi;
}
