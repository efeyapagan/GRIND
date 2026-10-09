import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';
import { duraklatildiMi, type Dinlenme } from '@grind/shared/lib/dinlenme';

/**
 * #414 dilim 2: dinlenme bitince uygulama arka plandayken de zil. Push DEGIL -- telefonun kendi kurdugu yerel
 * bildirim; baslik/metin tasimaz ve izin yalnizca SES icin istenir, yani ekranda bildirim kutusu cikmaz.
 * Uygulama acikken bildirim susar: bugunku uygulama ici bip calar (bu tercihten bagimsiz).
 *
 * Tercih cihazda durur (tema ve dil gibi), varsayilan KAPALI: bildirim izni yalnizca ozelligi isteyene sorulur.
 *
 * Android (dilim 3): Dynamic Island'in karsiligi ust paneldeki geri sayan kalici bildirimdir
 * (`modules/dinlenme-sayaci`, yalnizca kendi build'imizde -- Expo Go'da yoktur); sure dolunca baslikli bir
 * bildirim zil sesiyle gelir. Android'de her bildirim izin ister, bu yuzden ikisi de bu tercihe baglidir.
 */
export const SESLI_BILDIRIM_ANAHTARI = 'grind.dinlenmeSesi';
const BILDIRIM_KIMLIGI = 'grind-dinlenme-bitti';
/** `app.json`daki expo-notifications `sounds` girdisinin dosya adi; Expo Go'da sistemin varsayilan sesi calar. */
const SES = 'dinlenme_bitti.wav';
/** Android: bitis uyarisinin kanali (yuksek onem = ust panelde belirir, zil calar). */
const BITIS_KANALI = 'dinlenme-bitti';

interface SayacModulu {
  goster(bitisMs: number, baslik: string): void;
  kapat(): void;
}
/** Yalnizca kendi Android build'imizde vardir; Expo Go'da ve iOS'ta `null`. */
function androidSayaci(): SayacModulu | null {
  return Platform.OS === 'android' ? requireOptionalNativeModule<SayacModulu>('DinlenmeSayaci') : null;
}

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

/** Bitis anindaki bildirimi kurar. iOS'ta yalnizca ses; Android'de baslik sart (basliksiz bildirim bos gorunur). */
async function bitisBildiriminiKur(bitisMs: number, bittiBasligi: string) {
  const date = new Date(bitisMs);
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(BITIS_KANALI, {
      name: bittiBasligi,
      importance: Notifications.AndroidImportance.HIGH,
      sound: SES,
    });
    await Notifications.scheduleNotificationAsync({
      identifier: BILDIRIM_KIMLIGI,
      content: { title: bittiBasligi, sound: SES },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: BITIS_KANALI },
    });
    return;
  }
  await Notifications.scheduleNotificationAsync({
    identifier: BILDIRIM_KIMLIGI,
    content: { sound: SES },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

/**
 * Sayac degistikce bitis anindaki zili (ve Android'de ust paneldeki geri sayimi) kurar, tasir ya da kaldirir.
 */
export function useDinlenmeSesi(dinlenme: Dinlenme | null, bitti: boolean) {
  const { t } = useTranslation();
  const baslik = t('antrenman.dinlenme');
  const bittiBasligi = t('antrenman.dinlenmeBitti');
  const tercih = useSesliBildirim();
  // `bitti` hedefi DEGISTIRMEZ: sure doldugu an bildirim ya caldi ya calmak uzere -- o anda iptal etmek,
  // gec tetiklenen bildirimle yarisir ve zili yutar. Sayac temizlenince (hedef null) iptal edilir.
  const bitisMs = tercih && dinlenme && !duraklatildiMi(dinlenme) ? dinlenme.bitisMs : null;

  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return;
    }
    if (bitisMs === null) {
      androidSayaci()?.kapat();
    } else {
      androidSayaci()?.goster(bitisMs, baslik);
    }
    void Notifications.cancelScheduledNotificationAsync(BILDIRIM_KIMLIGI)
      // Suresi coktan dolmus (geri yuklenen) sayac icin gecmise bildirim kurulmaz: hemen calardi.
      .then(() => (bitisMs === null || bitti ? undefined : bitisBildiriminiKur(bitisMs, bittiBasligi)))
      .catch(() => {});
    // `bitti` bagimliliklarda YOK: sure dolunca yeniden kosup bildirimi iptal etmesin.
  }, [bitisMs, baslik, bittiBasligi]);
}
