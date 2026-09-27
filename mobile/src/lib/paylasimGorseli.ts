import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard';

/** Cagiranin kullaniciya ne soyleyecegini bilmesi icin: sessiz basarisizlik YOK (#433). */
export type PaylasimSonucu = 'tamam' | 'izin-yok' | 'hata';

/**
 * Bicim PNG olmak ZORUNDA: JPEG seffafligi tasimaz ve arkaplani beyaz basar -- kartin tum degeri
 * story fotografinin ustunde durmasinda. Seffaflik ayrica yakalanan gorunumun (ve atalarinin)
 * arkaplansiz olmasini gerektirir, bkz. PaylasimKarti.
 */
const PNG_SECENEKLERI = { format: 'png', quality: 1 } as const;

type KartRef = RefObject<View | null>;

/**
 * Karti galeriye kaydeder. Izin ONCE istenir: reddedilecekse gorseli uretmek bosuna is.
 * `MediaLibrary.Asset.create` SDK 57'nin guncel yolu (`saveToLibraryAsync` kullanimdan kalkti).
 */
export async function galeriyeKaydet(ref: KartRef): Promise<PaylasimSonucu> {
  try {
    const izin = await MediaLibrary.requestPermissionsAsync();
    if (!izin.granted) {
      return 'izin-yok';
    }

    const uri = await captureRef(ref, { ...PNG_SECENEKLERI, result: 'tmpfile' });
    await MediaLibrary.Asset.create(uri);
    return 'tamam';
  } catch {
    return 'hata';
  }
}

/**
 * Karti panoya kopyalar; kullanici Instagram/Snap'te yapistirir. Izin GEREKMEZ.
 *
 * DIKKAT: `Clipboard.setImageAsync` MIME oneksiz base64 ister -- bir `data:` URI ya da dosya yolu
 * gondermek sessizce bos bir pano birakir. Bu yuzden dogrudan `result: 'base64'` ile yakalanir.
 */
export async function panoyaKopyala(ref: KartRef): Promise<PaylasimSonucu> {
  try {
    const base64 = await captureRef(ref, { ...PNG_SECENEKLERI, result: 'base64' });
    await Clipboard.setImageAsync(base64);
    return 'tamam';
  } catch {
    return 'hata';
  }
}
