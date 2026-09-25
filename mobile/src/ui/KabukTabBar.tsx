import { useEffect } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useRouter, usePathname, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Dumbbell, Home, User, type LucideIcon } from 'lucide-react-native';
import { renkler } from '@grind/shared/designTokens';
import CamYuzey from './CamYuzey';
import { ikonRenk } from './renkler';

/**
 * Alt menu (issue #338, kullanici referansi: iOS 26 "liquid glass" sekme cubugu): icerigin USTUNDE
 * yuzen, tam yuvarlak cam bir hap; icinde uc esit, etiketli sekme -- Ana sayfa · Antrenman · Profil.
 * Onceki surumun (#119/#159) ortada tasan "+" dugmesi ve halkasi kalkti; "+" artik "Antrenman"
 * sekmesidir ve yine `/antrenman`a gider.
 *
 * Expo Router'in kendi `Tabs` bilesenini KULLANMIYORUZ -- aktif sekme web'deki gibi yol
 * karsilastirmasiyla (`usePathname`) bulunur.
 *
 * Cam: `CamYuzey` (set paneliyle ortak, #350) -- iOS'ta bulaniklik, Android'de neredeyse opak perde.
 *
 * Aktif sekme: arkasinda `surface-4` hap, ikon + etiket `accent-soft` (`accent` `surface-4` ustunde
 * 3.9:1 ile 12'lik etiket icin yetmez, `accent-soft` 7.2:1). Pasifler `muted`.
 */
const HAP_H = 48;
const HAP_MIN_W = 72;
const IC_BOSLUK = 6;
const BAR_H = HAP_H + IC_BOSLUK * 2;
/** Cubugun guvenli alanin ustunde biraktigi bosluk. */
const ALT_BOSLUK = 8;
/** Kaydirilan icerigin son satiri ile cubugun ust kenari arasinda kalan nefes payi. */
const ICERIK_NEFES = 16;

const stiller = StyleSheet.create({
  hap: {
    height: HAP_H,
    minWidth: HAP_MIN_W,
    borderRadius: HAP_H / 2,
    paddingHorizontal: 12,
    gap: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balon: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: HAP_H / 2,
    backgroundColor: renkler['surface-4'],
  },
});

/**
 * Cubuk icerigin ustunde yuzdugu icin, en alttaki satir/dugme arkasinda kalmasin diye icerigin
 * sonuna birakilacak bosluk (guvenli alan dahil). Onceki `TABBAR_HALKA_TASMASI`in yerini alir.
 */
export function altMenuPayi(altInset: number): number {
  return altInset + ALT_BOSLUK + BAR_H + ICERIK_NEFES;
}

export function useAltMenuPayi(): number {
  return altMenuPayi(useSafeAreaInsets().bottom);
}

interface SekmeTanimi {
  etiket: string;
  hedef: Href;
  Ikon: LucideIcon;
  aktif: boolean;
}

/** Balonun acilisi: hafif tasmali yay -- "kucukten buyuge" ama sert degil. Kapanis kisa bir sonme. */
const ACILIS_YAYI = { damping: 14, stiffness: 180, mass: 0.8 } as const;
const KAPANIS_MS = 150;
const BASLANGIC_OLCEGI = 0.5;

function Sekme({ etiket, hedef, Ikon, aktif }: SekmeTanimi) {
  const router = useRouter();
  const renk = aktif ? ikonRenk.accentSoft : ikonRenk.muted;

  // 0 = pasif (balon kucuk ve gorunmez), 1 = aktif (balon tam boy).
  const ilerleme = useSharedValue(aktif ? 1 : 0);
  useEffect(() => {
    ilerleme.value = aktif ? withSpring(1, ACILIS_YAYI) : withTiming(0, { duration: KAPANIS_MS });
  }, [aktif, ilerleme]);
  const balonStili = useAnimatedStyle(() => ({
    // Yay 1'i biraz asar: olcek bu tasmayla "balon" gibi esner, opaklik 1'de kesilir.
    opacity: Math.min(ilerleme.value, 1),
    transform: [{ scale: BASLANGIC_OLCEGI + (1 - BASLANGIC_OLCEGI) * ilerleme.value }],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={etiket}
      accessibilityState={{ selected: aktif }}
      onPress={() => router.navigate(hedef)}
      className="flex-1 items-center justify-center"
    >
      {/* Balon (aktif zemin) her sekmede HEP yerinde durur, yalnizca olcegi/opakligi canlanir: zemini
          sonradan eklemek Android'de koseleri dusuruyordu (#338, emulatorde goruldu). `collapsable`:
          arkaplansiz hap Android'de "duzlestirilip" yerel tarafta hic olusturulmuyordu. */}
      <View collapsable={false} style={stiller.hap}>
        <Animated.View pointerEvents="none" style={[stiller.balon, balonStili]} />
        <Ikon color={renk} size={22} />
        <Text className={`text-label ${aktif ? 'text-accent-soft' : 'text-muted'}`}>{etiket}</Text>
      </View>
    </Pressable>
  );
}

export default function KabukTabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const sekmeler: SekmeTanimi[] = [
    { etiket: t('kabuk.anaSayfa'), hedef: '/', Ikon: Home, aktif: pathname === '/' },
    {
      etiket: t('kabuk.antrenman'),
      hedef: '/antrenman',
      Ikon: Dumbbell,
      aktif: pathname.startsWith('/antrenman'),
    },
    { etiket: t('kabuk.profil'), hedef: '/profile', Ikon: User, aktif: pathname.startsWith('/profile') },
  ];

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-4 right-4"
      style={{ bottom: insets.bottom + ALT_BOSLUK }}
    >
      <View
        accessibilityRole="tablist"
        accessibilityLabel={t('kabuk.gezinme')}
        className="overflow-hidden rounded-full border border-surface-4"
        style={{ height: BAR_H }}
      >
        <CamYuzey />
        <View className="flex-1 flex-row items-center" style={{ paddingHorizontal: IC_BOSLUK }}>
          {sekmeler.map((sekme) => (
            <Sekme key={String(sekme.hedef)} {...sekme} />
          ))}
        </View>
      </View>
    </View>
  );
}
