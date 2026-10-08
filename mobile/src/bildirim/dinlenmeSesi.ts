import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { duraklatildiMi, type Dinlenme } from '@grind/shared/lib/dinlenme';

/**
 * #414 dilim 2: dinlenme bitince uygulama arka plandayken de zil. Push DEGIL -- telefonun kendi kurdugu yerel
 * bildirim; baslik/metin tasimaz ve izin yalnizca SES icin istenir, yani ekranda bildirim kutusu cikmaz.
 * Uygulama acikken bildirim susar: bugunku uygulama ici bip calar (bu tercihten bagimsiz).
 *
 * Tercih cihazda durur (tema ve dil gibi), varsayilan KAPALI: bildirim izni yalnizca ozelligi isteyene sorulur.
 * Simdilik yalnizca iOS; Android'in ust panel sayaci sonraki dilim.
 */
export const SESLI_BILDIRIM_ANAHTARI = 'grind.dinlenmeSesi';
const BILDIRIM_KIMLIGI = 'grind-dinlenme-bitti';
/** `app.json`daki expo-notifications `sounds` girdisinin dosya adi; Expo Go'da sistemin varsayilan sesi calar. */
const SES = 'dinlenme-bitti.wav';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldShowBanner: false,
    shouldShowList: false,
    shouldSetBadge: false,
  }),
});

let acik = false;
let yuklendi = false;
const dinleyenler = new Set<() => void>();

function yayinla(yeni: boolean) {
  acik = yeni;
  dinleyenler.forEach((dinleyen) => dinleyen());
}

function abone(dinleyen: () => void) {
  dinleyenler.add(dinleyen);
  return () => {
    dinleyenler.delete(dinleyen);
  };
}

function tercihiYukle() {
  if (yuklendi) {
    return;
  }
  yuklendi = true;
  SecureStore.getItemAsync(SESLI_BILDIRIM_ANAHTARI)
    .then((saklanan) => yayinla(saklanan === 'acik'))
    .catch(() => {});
}

/**
 * Tercihi degistirir. Acarken bildirim izni (yalnizca ses) istenir; verilmezse tercih KAPALI kalir ve `false`
 * doner -- arayuz kullaniciya izni telefon ayarlarindan acmasini soyler.
 */
export async function sesliBildirimiAyarla(istenen: boolean): Promise<boolean> {
  if (istenen) {
    const izin = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: false, allowSound: true, allowBadge: false },
    });
    if (!izin.granted) {
      return false;
    }
  }
  yayinla(istenen);
  await (istenen
    ? SecureStore.setItemAsync(SESLI_BILDIRIM_ANAHTARI, 'acik')
    : SecureStore.deleteItemAsync(SESLI_BILDIRIM_ANAHTARI)
  ).catch(() => {});
  return true;
}

export function useSesliBildirim(): boolean {
  useEffect(tercihiYukle, []);
  return useSyncExternalStore(abone, () => acik);
}

/** Sayac degistikce bitis anindaki zili kurar, tasir ya da iptal eder. */
export function useDinlenmeSesi(dinlenme: Dinlenme | null, bitti: boolean) {
  const tercih = useSesliBildirim();
  const bitisMs = tercih && dinlenme && !bitti && !duraklatildiMi(dinlenme) ? dinlenme.bitisMs : null;

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }
    void Notifications.cancelScheduledNotificationAsync(BILDIRIM_KIMLIGI)
      .then(() =>
        bitisMs === null
          ? undefined
          : Notifications.scheduleNotificationAsync({
              identifier: BILDIRIM_KIMLIGI,
              content: { sound: SES },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(bitisMs) },
            }),
      )
      .catch(() => {});
  }, [bitisMs]);
}
