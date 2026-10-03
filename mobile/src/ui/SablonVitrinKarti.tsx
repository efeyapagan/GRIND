import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Dumbbell } from 'lucide-react-native';
import { useDil } from '@grind/shared/i18n';
import { formatKisaTarihHaftaGunuyle } from '@grind/shared/lib/format';
import type { SablonOzeti } from '@grind/shared/lib/sablonOzeti';
import BirincilDugme from './BirincilDugme';
import CamKatmanlari from './CamKatmanlari';
import IkonKapsulu from './IkonKapsulu';
import Izgara from './Izgara';
import SablonFiguru from './SablonFiguru';
import { useAccentParlama, useIkonRenk } from './renkler';

export const KART_YUKSEKLIGI = 272;
/** Karuseldeki kartlarin arasi. */
export const KART_ARALIGI = 12;
const EN_GENIS_KART = 300;
/** Kart ekranin bu kadarini kaplar; saginda bir sonrakinin ucu gorunur ki kaydirilabildigi belli olsun. */
const KART_ORANI = 0.72;

/** Karusel kartinin genisligi -- #538'den beri kaydedilen sablon kartlari da ayni genislikte. */
export function useVitrinKartGenisligi(): number {
  const { width } = useWindowDimensions();
  return Math.min(Math.round(width * KART_ORANI), EN_GENIS_KART);
}
const FIGUR_BOYUTU = 112;
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
  /** #440: bu sablonla en son baslatilan antrenmanin zamani; hic yoksa null. */
  lastUsedAt: string | null;
  /** #606: figur yalnizca karuselin ondeki kartinda oynar; digerleri ilk karesinde durur. */
  figurCanli?: boolean;
}

/**
 * #439: antrenman ekranindaki yana kayan sablon karti. Cam yuzey (#338/#350 ile ayni yuzey; #590 ile uc katmanli `CamKatmanlari`, eski
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
  lastUsedAt,
  figurCanli = true,
}: Props) {
  const { t } = useTranslation();
  const dil = useDil();
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
      className="overflow-hidden rounded-2xl"
      // Opaklik sinifla degil stille: stil sinifi ezerdi, ve ilk cizimden sonra sinif eklemek NativeWind tuzagi (#261).
      style={{ width: genislik, height: KART_YUKSEKLIGI, opacity: gizli ? 0 : disabled ? 0.6 : 1 }}
    >
      <CamKatmanlari koseSinifi="rounded-2xl" />

      <View pointerEvents="none" className="absolute inset-x-0" style={{ top: 88 }}>
        <Izgara genislik={genislik} yukseklik={IZGARA_YUKSEKLIGI} />
      </View>
      <View pointerEvents="none" className="absolute right-3" style={{ top: 80 }}>
        <SablonFiguru kategori={ozet.kategori} boyut={FIGUR_BOYUTU} canli={figurCanli} />
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
        {/* #440: yukseklik sabit (h-5) -- hangi satir cizilirse cizilsin kart ve karusel kaymasin. */}
        <View className="mb-3 mt-1 h-5">
          <Text numberOfLines={1} className="text-label text-muted">
            {lastUsedAt
              ? t('sablonlar.sonKullanim', { tarih: formatKisaTarihHaftaGunuyle(lastUsedAt, dil) })
              : t('sablonlar.henuzKullanilmadi')}
          </Text>
        </View>

        <BirincilDugme
          yukseklik="kompakt"
          accessibilityLabel={t('sablonlar.kartBasla')}
          onPress={onBasla}
          disabled={disabled}
          style={parlama}
        >
          {t('sablonlar.kartBasla')}
        </BirincilDugme>
      </View>
    </Pressable>
  );
}
