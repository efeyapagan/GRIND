import { View, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Plus, User } from 'lucide-react-native';
import { ikonRenk } from './renkler';
import Parilti from './Parilti';

/**
 * App.tsx'teki alt menunun RN karsiligi (issue #119/#120): Ana Sayfa · (+) · Profil, simetrik
 * 1-1, ortada tasan buyuk "+" dugmesi. UCU DE simgeden ibarettir, gorunur etiket YOK --
 * erisilebilir ad `accessibilityLabel`den gelir. "+" HER ZAMAN `/antrenman`a gider.
 *
 * Expo Router'in kendi `Tabs` bilesenini KULLANMIYORUZ -- React Navigation'in tabBar prop
 * seklini (descriptors/state) web'in duz NavLink desenine zorlamak yerine, web'deki
 * `usePathname`/`Link` mantigi burada da BIREBIR ayni sekilde (aktif yol karsilastirmasi) kuruldu.
 *
 * Gorsel (issue #159, kullanici referansi -- 5. revizyon): SVG bezier ile cizilen "flare" (tumsek)
 * denemeleri kullaniciya "damla/centik" gibi gorundu -- "+ butonunun yuvarlagi gibi olsun"
 * denildi. Bu surumde flare bir SVG egrisi DEGIL, dogrudan bir DAIRE (`FLARE_SIZE`) -- halka ve
 * "+" dugmesiyle AYNI merkezde (`CENTER_Y`), sadece daha buyuk. Uc daire de (flare > halo >
 * button) TAM ES MERKEZLI oldugu icin halka HER ACIDAN flare tarafindan sarilir (sadece
 * tepeden degil) -- "kesik" ya da "olu alan" gorunmez. Halka ile buton arasindaki serit ince
 * (`(HALO_SIZE-BUTTON_SIZE)/2` = 2px); flare ile halka arasindaki pay da dar tutuldu (6px) ki
 * flare gereksiz genis/yuksek durmasin.
 *
 * "Olu alan" sikayetinin asil kaynagi (kullanici bulgusu): alttaki guvenli alan bosluğu
 * (`insets.bottom`, ev tusu cizgisi olan telefonlarda ~34px) `bg` renkteydi, cubugun kendi
 * rengiyle (`surface-1`) DEVAM ETMIYORDU -- ekranin en altinda, cubuktan farkli renkte, koyu
 * temada gorunmesi zor ama GERCEK bir seri/alan olusturuyordu. Simdi bu alan da `surface-1` --
 * cubuk gorsel olarak ekranin en altina kadar devam ediyor.
 */
const BAR_H = 48;
const BUTTON_SIZE = 64;
const HALO_SIZE = 68;
const FLARE_SIZE = 80;
/** Ucu de ayni merkezde (satirin dikey ortasindan biraz asagida) -- flare'in en yuksek noktasi
 * bardan 24px tasar ("cok yuksek olmasin" istegiyle uyumlu), halonun ustunden 6px, butonun
 * ustunden 10px daha yukaridadir; hicbiri birbirinin disina TASMAZ (yaricap sirasi: flare>halo>buton). */
const CENTER_Y = 16;
/** Flare'in bar'in UST kenarindan tastigi miktar (issue #159 devami): "olu alan" sikayeti asil
 * olarak buraya, TUM sayfalara global pb ile rezerve edilen bosluga aitti (kullanici karari:
 * genel bosluk KALDIRILSIN, sadece bunun gibi butonu/paneli sarkan spesifik bilesenler kendi
 * payini alsin). Sadece "+" halkasinin ustune KESINLIKLE binmemesi gereken sabit/mt-auto
 * bilesenler (ornek: AddSetForm'daki "Hareket ekle", antrenman-bitir'deki "Antrenmanı bitir")
 * bu degeri kendi alt bosluguna EKLER; sıradan kaydirilabilir icerik (liste kartlari vb.) HİÇBİR
 * ek bosluk almaz, kaydirinca halkanin arkasina gecebilir -- bu artik kabul edilebilir. */
export const TABBAR_HALKA_TASMASI = FLARE_SIZE / 2 - CENTER_Y;

function EsMerkezliDaire({
  boyut,
  renkSinifi,
  children,
}: {
  boyut: number;
  renkSinifi: string;
  children?: React.ReactNode;
}) {
  return (
    <View
      className={`absolute items-center justify-center rounded-full ${renkSinifi}`}
      style={{
        width: boyut,
        height: boyut,
        borderRadius: boyut / 2,
        left: '50%',
        marginLeft: -boyut / 2,
        top: CENTER_Y - boyut / 2,
      }}
    >
      {children}
    </View>
  );
}

export default function KabukTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const anaSayfaAktif = pathname === '/';
  const profilAktif = pathname.startsWith('/profile');

  return (
    <View style={{ paddingBottom: insets.bottom }} className="bg-surface-1">
      <View style={{ height: BAR_H }} className="bg-surface-1">
        <EsMerkezliDaire boyut={FLARE_SIZE} renkSinifi="bg-surface-1" />
        <EsMerkezliDaire boyut={HALO_SIZE} renkSinifi="bg-bg" />
        <EsMerkezliDaire boyut={BUTTON_SIZE} renkSinifi="bg-accent shadow-lg">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Antrenman başlat"
            onPress={() => router.navigate('/antrenman')}
            className="h-full w-full items-center justify-center"
          >
            <Plus color={ikonRenk.onAccent} size={28} />
          </Pressable>
        </EsMerkezliDaire>

        <View className="h-full flex-row items-center px-4">
          <View className="flex-1 items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ana sayfa"
              onPress={() => router.navigate('/')}
              className="h-10 min-w-16 items-center justify-center"
            >
              {anaSayfaAktif && <Parilti bicim="daire" />}
              <Home color={anaSayfaAktif ? ikonRenk.accent : ikonRenk.muted} size={22} />
            </Pressable>
          </View>

          <View className="flex-1" />

          <View className="flex-1 items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profil"
              onPress={() => router.navigate('/profile')}
              className="h-10 min-w-16 items-center justify-center"
            >
              {profilAktif && <Parilti bicim="daire" />}
              <User color={profilAktif ? ikonRenk.accent : ikonRenk.muted} size={22} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
