import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Dumbbell, Pin } from 'lucide-react-native';
import type { SablonOzeti } from '@grind/shared/lib/sablonOzeti';
import CamYuzey from './CamYuzey';
import IkonKapsulu from './IkonKapsulu';
import Izgara from './Izgara';
import SablonFiguru from './SablonFiguru';
import { KART_YUKSEKLIGI } from './SablonVitrinKarti';
import { useIkonRenk } from './renkler';

export const KAYITLI_KART_YUKSEKLIGI = KART_YUKSEKLIGI / 2;
const FIGUR_BOYUTU = 72;
/** Izgara kartin bu oranindan baslayip saga kadar uzanir; solan kenari soldaki yazinin altinda kaybolur. */
const IZGARA_BASLANGICI = 0.34;
/** Figurun merkezi: yazi sutununun sagi, sag ustteki ikonun solu. */
const FIGUR_MERKEZI = 0.62;
/** Ad ve "paylasti" satiri kartin bu kadarini kaplar; figurun ustune tasmaz. */
const YAZI_ORANI = 0.42;
/** Sag ustteki ikonun (dambil / sabitleme) karttan uzakligi; kose yuvarlakligindan uzak dursun. */
const IKON_UST = 12;

interface Props {
  ad: string;
  kaynakKullaniciAdi: string | null;
  ozet: SablonOzeti;
  genislik: number;
  onBasla: () => void;
  onMenu: () => void;
  disabled: boolean;
  ref?: React.Ref<View>;
  /** #538: verilirse sag ustte dambil yerine sabitleme dugmesi durur (kaydedilenler ekrani). */
  onSabitle?: () => void;
  sabitli?: boolean;
}

/**
 * #467/#538: baskasindan kaydedilen sablonun yatay karti -- `SablonVitrinKarti` ile ayni genislikte,
 * yarisi yukseklikte. Ad (vitrin basligiyla ayni punto) ve "X paylasti" en solda; ortadan saga kenarlara
 * ve yaziya dogru silinen izgara, ustunde baskin kategorinin figuru.
 *
 * Silme kartta gorunur bir ikonla degil (kullanici karari, #538), basili tutunca acilan
 * `SablonMenusu`nden yapilir -- cagiran taraf yonetir. Sabitleme dugmesi ayri bir Pressable'dir: ona
 * dokunmak karti baslatmaz.
 */
export default function SablonKayitliKarti({
  ad,
  kaynakKullaniciAdi,
  ozet,
  genislik,
  onBasla,
  onMenu,
  disabled,
  ref,
  onSabitle,
  sabitli = false,
}: Props) {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const izgaraSolu = Math.round(genislik * IZGARA_BASLANGICI);

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={ad}
      accessibilityHint={t('sablonlar.kartIpucu')}
      accessibilityActions={[{ name: 'longpress' }]}
      onAccessibilityAction={(olay) => olay.nativeEvent.actionName === 'longpress' && onMenu()}
      onPress={onBasla}
      onLongPress={onMenu}
      disabled={disabled}
      className="overflow-hidden rounded-2xl border border-surface-4"
      // Opaklik sinifla degil stille: ilk cizimden sonra sinif eklemek NativeWind tuzagi (#261).
      style={{ width: genislik, height: KAYITLI_KART_YUKSEKLIGI, opacity: disabled ? 0.6 : 1 }}
    >
      <CamYuzey />

      <View pointerEvents="none" className="absolute inset-y-0" style={{ left: izgaraSolu }}>
        <Izgara genislik={genislik - izgaraSolu} yukseklik={KAYITLI_KART_YUKSEKLIGI} solan />
      </View>
      <View
        pointerEvents="none"
        className="absolute"
        style={{
          left: Math.round(genislik * FIGUR_MERKEZI - FIGUR_BOYUTU / 2),
          top: (KAYITLI_KART_YUKSEKLIGI - FIGUR_BOYUTU) / 2,
        }}
      >
        <SablonFiguru kategori={ozet.kategori} boyut={FIGUR_BOYUTU} />
      </View>

      <View className="flex-1 justify-center p-4" style={{ width: genislik * YAZI_ORANI }}>
        <Text numberOfLines={2} className="text-heading font-bold text-fg">
          {ad}
        </Text>
        {kaynakKullaniciAdi && (
          <Text numberOfLines={1} className="mt-1 text-label text-muted">
            {t('sablonlar.kaydedilenKaynak', { kullaniciAdi: kaynakKullaniciAdi })}
          </Text>
        )}
      </View>

      {/* Sag ustteki ikon: top-3 ile kapsul kartin yuvarlak kosesine degiyordu (kullanici, #538). Konum
          sinifla degil sayiyla -- `top-5`/`top-8` gibi projede baska yerde gecmeyen siniflar canli
          yenilemede uygulanmadi. */}
      <View className="absolute" style={{ top: IKON_UST, right: 12 }}>
        {onSabitle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(sabitli ? 'sablonlar.sabitlemeyiKaldir' : 'sablonlar.basaSabitle')}
            accessibilityState={{ selected: sabitli }}
            onPress={onSabitle}
            hitSlop={8}
          >
            <IkonKapsulu boyut={40}>
              <Pin
                color={sabitli ? ikonRenk.accent : ikonRenk.muted}
                fill={sabitli ? ikonRenk.accent : 'none'}
                size={20}
              />
            </IkonKapsulu>
          </Pressable>
        ) : (
          <IkonKapsulu boyut={40}>
            <Dumbbell color={ikonRenk.accentSoft} size={20} />
          </IkonKapsulu>
        )}
      </View>
    </Pressable>
  );
}
