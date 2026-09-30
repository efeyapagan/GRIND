import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Dumbbell } from 'lucide-react-native';
import Svg, { Line } from 'react-native-svg';
import type { SablonOzeti } from '@grind/shared/lib/sablonOzeti';
import CamYuzey from './CamYuzey';
import IkonKapsulu from './IkonKapsulu';
import SablonFiguru from './SablonFiguru';
import { useAccentParlama, useIkonRenk, useRenkPaleti } from './renkler';

export const KART_YUKSEKLIGI = 272;
const FIGUR_BOYUTU = 112;
const IZGARA_ARALIGI = 18;
const IZGARA_YUKSEKLIGI = 108;

interface Props {
  ad: string;
  ozet: SablonOzeti;
  hareketSayisi: number;
  genislik: number;
  onBasla: () => void;
  onMenu: () => void;
  disabled: boolean;
  /** #439: basili tutma menusu kartin ekrandaki yerini olcer. */
  ref?: React.Ref<View>;
  /** Menu acikken karuseldeki kart saklanir: onizleme onun yerinden kalkar. */
  gizli?: boolean;
}

/** Kartin ortasinda figurun arkasinda duran silik kare izgara. */
function Izgara({ genislik }: { genislik: number }) {
  const palet = useRenkPaleti();
  const dikeyler = Array.from({ length: Math.floor(genislik / IZGARA_ARALIGI) + 1 }, (_, i) => i * IZGARA_ARALIGI);
  const yataylar = Array.from({ length: Math.floor(IZGARA_YUKSEKLIGI / IZGARA_ARALIGI) + 1 }, (_, i) => i * IZGARA_ARALIGI);
  return (
    <Svg width={genislik} height={IZGARA_YUKSEKLIGI}>
      {dikeyler.map((x) => (
        <Line key={`d${x}`} x1={x} y1={0} x2={x} y2={IZGARA_YUKSEKLIGI} stroke={palet.fg} strokeOpacity={0.05} />
      ))}
      {yataylar.map((y) => (
        <Line key={`y${y}`} x1={0} y1={y} x2={genislik} y2={y} stroke={palet.fg} strokeOpacity={0.05} />
      ))}
    </Svg>
  );
}

/**
 * #439: antrenman ekranindaki yana kayan sablon karti. Cam yuzey (#338/#350 ile ayni `CamYuzey` +
 * 1 px `surface-4`), sag ustte acik rozet (`accent/20` zemin + `accent-soft` ikon), ortada izgara
 * ustunde baskin kategorinin figuru, altta birincil "Basla".
 *
 * Kartin tamami da antrenmani baslatir (buyuk dokunma alani). Basili tutma (menu + surukleme)
 * karttan degil `SablonKaruseli`nin jestinden gelir; ekran okuyucuda menu `longpress` eylemiyle acilir.
 */
export default function SablonVitrinKarti({
  ad,
  ozet,
  hareketSayisi,
  genislik,
  onBasla,
  onMenu,
  disabled,
  ref,
  gizli = false,
}: Props) {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const parlama = useAccentParlama();

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={ad}
      accessibilityHint={t('sablonlar.kartIpucu')}
      accessibilityActions={[{ name: 'longpress' }]}
      onAccessibilityAction={(olay) => olay.nativeEvent.actionName === 'longpress' && onMenu()}
      onPress={onBasla}
      disabled={disabled}
      className="overflow-hidden rounded-2xl border border-surface-4"
      // Opaklik sinifla degil stille: stil sinifi ezerdi, ve ilk cizimden sonra sinif eklemek NativeWind tuzagi (#261).
      style={{ width: genislik, height: KART_YUKSEKLIGI, opacity: gizli ? 0 : disabled ? 0.6 : 1 }}
    >
      <CamYuzey />

      <View pointerEvents="none" className="absolute inset-x-0" style={{ top: 88 }}>
        <Izgara genislik={genislik} />
      </View>
      <View pointerEvents="none" className="absolute right-3" style={{ top: 80 }}>
        <SablonFiguru kategori={ozet.kategori} boyut={FIGUR_BOYUTU} />
      </View>

      <View className="flex-1 flex-col p-4">
        <View className="flex-row items-start justify-between gap-3">
          <Text numberOfLines={1} className="min-w-0 flex-1 text-heading font-bold text-fg">
            {ad}
          </Text>
          <IkonKapsulu boyut={40}>
            <Dumbbell color={ikonRenk.accentSoft} size={20} />
          </IkonKapsulu>
        </View>
        <Text numberOfLines={2} className="mt-1 pr-12 text-body text-muted">
          {ozet.hareketAdlari.join(', ')}
        </Text>

        <View className="flex-1" />

        <View className="flex-row items-center gap-3">
          <Text className="text-body text-fg">{t('sablonlar.hareketSayisi', { count: hareketSayisi })}</Text>
          <View className="h-4 w-px bg-surface-4" />
          <Text className="text-body text-fg">{t('setler.setSayisi', { count: ozet.toplamSet })}</Text>
        </View>
        {/* Son kullanim tarihinin yeri: veri backend'e gelince (#440) bu satira yazilir.
            Yukseklik simdiden ayrildi ki satir eklenince kart ve karusel kaymasin. */}
        <View className="mb-3 mt-1 h-5" />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('sablonlar.kartBasla')}
          onPress={onBasla}
          disabled={disabled}
          className="h-11 items-center justify-center rounded-xl bg-accent"
          style={parlama}
        >
          <Text className="text-body-lg font-bold text-on-accent">{t('sablonlar.kartBasla')}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
