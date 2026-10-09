import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { DINLENME_DEPO_ANAHTARI } from '@grind/shared/lib/dinlenme';
import { SESLI_BILDIRIM_ANAHTARI } from './bildirim/dinlenmeSesi';
import { DEPO_ANAHTARI as OTURUM_ANAHTARI } from './session';
import { DIL_ANAHTARI } from './ui/DilContext';
import { TEMA_ANAHTARI } from './ui/TemaContext';
import { YORUM_DILI_ANAHTARI } from './ui/YorumDiliContext';

/** Bu kurulumda temizlik yapildi mi. AsyncStorage'da: uygulama silinince O silinir, anahtar zinciri silinmez. */
export const KURULUM_ISARETI = 'grind.kurulum';

/** Uygulamanin anahtar zincirinde (SecureStore) tuttugu her kayit. Yeni bir kayit eklenirse buraya da eklenir. */
export const ANAHTAR_ZINCIRI_KAYITLARI = [
  OTURUM_ANAHTARI,
  TEMA_ANAHTARI,
  DIL_ANAHTARI,
  YORUM_DILI_ANAHTARI,
  SESLI_BILDIRIM_ANAHTARI,
  DINLENME_DEPO_ANAHTARI,
] as const;

/**
 * #663: iOS'ta anahtar zinciri uygulama SILININCE temizlenmez. Uygulamayi silip yeniden kuran kullanici onceki
 * kurulumun temasini (sistem acikken koyu giris ekrani), dilini ve hatta acik hesabini geri buluyordu. Yeni
 * kurulumda uygulama her seyi sifirdan baslatmali: tema sistemi izler, dil cihazdan gelir, giris ekrani acilir.
 *
 * "Yeni kurulum" = AsyncStorage bombos (o, uygulamayla birlikte silinir). Isaret yok ama AsyncStorage'da veri
 * VARSA bu, bu surume guncellenen mevcut bir kurulumdur: tercihlerine dokunulmaz, yalnizca isaret yazilir.
 *
 * Saglayicilar anahtar zincirini okumadan ONCE bitmelidir (kok duzende `session.hydrate`ten once beklenir).
 * Depo hatasi uygulamanin acilmasini engellemez.
 */
export async function ilkKurulumTemizligi(): Promise<void> {
  try {
    if (await AsyncStorage.getItem(KURULUM_ISARETI)) {
      return;
    }
    const yeniKurulum = (await AsyncStorage.getAllKeys()).length === 0;
    if (yeniKurulum) {
      await Promise.all(ANAHTAR_ZINCIRI_KAYITLARI.map((anahtar) => SecureStore.deleteItemAsync(anahtar)));
    }
    await AsyncStorage.setItem(KURULUM_ISARETI, '1');
  } catch {
    // Temizlik bir iyilestirme; depo okunamiyorsa uygulama yine acilir.
  }
}
