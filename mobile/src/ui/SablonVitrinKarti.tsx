import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Dumbbell } from 'lucide-react-native';
import Svg, { Line } from 'react-native-svg';
import type { SablonOzeti } from '@grind/shared/lib/sablonOzeti';
import CamYuzey from './CamYuzey';
import SablonFiguru from './SablonFiguru';
import { useIkonRenk, useRenkPaleti } from './renkler';

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
 * Kartin tamami da antrenmani baslatir (buyuk dokunma alani); basili tutmak duzenle/sil menusunu
 * acar. Ekran okuyucuda ayni menu `longpress` eylemiyle acilir.
 */
export default function SablonVitrinKarti({ ad, ozet, hareketSayisi, genislik, onBasla, onMenu, disabled }: Props) {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const palet = useRenkPaleti();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ad}
      accessibilityHint={t('sablonlar.kartIpucu')}
      accessibilityActions={[{ name: 'longpress' }]}
      onAccessibilityAction={(olay) => olay.nativeEvent.actionName === 'longpress' && onMenu()}
      onPress={onBasla}
      onLongPress={onMenu}
      disabled={disabled}
      className={`overflow-hidden rounded-2xl border border-surface-4 ${disabled ? 'opacity-60' : ''}`}
      style={{ width: genislik, height: KART_YUKSEKLIGI }}
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
          <View className="size-10 items-center justify-center rounded-xl bg-accent/20">
            <Dumbbell color={ikonRenk.accentSoft} size={20} />
          </View>
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
          // iOS'ta accent parlamasi; Android'in `elevation`u renkli golge cizmedigi icin orada yok.
          style={{ shadowColor: palet.accent, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }}
        >
          <Text className="text-body-lg font-bold text-on-accent">{t('sablonlar.kartBasla')}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
