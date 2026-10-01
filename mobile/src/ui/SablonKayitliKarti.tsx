import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Dumbbell } from 'lucide-react-native';
import type { SablonOzeti } from '@grind/shared/lib/sablonOzeti';
import IkonKapsulu from './IkonKapsulu';
import SablonFiguru from './SablonFiguru';
import { KART_YUKSEKLIGI } from './SablonVitrinKarti';
import { useIkonRenk } from './renkler';

export const KAYITLI_KART_YUKSEKLIGI = KART_YUKSEKLIGI / 2;

interface Props {
  ad: string;
  kaynakKullaniciAdi: string | null;
  ozet: SablonOzeti;
  genislik?: number;
  onBasla: () => void;
  onMenu: () => void;
  disabled: boolean;
  ref?: React.Ref<View>;
  /**
   * #556: bu liste dikey bir ScrollView'in icinde kayar (virtualization uygulanmiyor), bu yuzden
   * gorunum disina dusmesi beklenen kartlar icin figur animasyonu burdan durdurulur. Varsayilan
   * `true` -- cagiran taraf bildirmezse figur her zamanki gibi animasyonlu kalir.
   */
  canliFigur?: boolean;
}

/**
 * #467: "My Templates" altında kaydedilenler için yatay, uzun dikdörtgen kart --
 * `SablonVitrinKarti`nin yarı yükseklikte, tek dokunuşlu (ayrı bir "Başla" düğmesi yok) hali.
 * Basılı tutma menüsü (Düzenle/Sil) `SablonMenusu`den, çağıran taraf yönetir (SablonVitrinKarti ile aynı desen).
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
  canliFigur = true,
}: Props) {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();

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
      className="flex-row items-center gap-3 overflow-hidden rounded-2xl border border-surface-4 bg-surface-2 p-3"
      style={{ height: KAYITLI_KART_YUKSEKLIGI, width: genislik, opacity: disabled ? 0.6 : 1 }}
    >
      <SablonFiguru kategori={ozet.kategori} boyut={56} canli={canliFigur} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-body-lg font-bold text-fg">{ad}</Text>
        {kaynakKullaniciAdi && (
          <Text numberOfLines={1} className="text-label text-muted">
            {t('sablonlar.kaydedilenKaynak', { kullaniciAdi: kaynakKullaniciAdi })}
          </Text>
        )}
      </View>
      <IkonKapsulu boyut={40}>
        <Dumbbell color={ikonRenk.accentSoft} size={20} />
      </IkonKapsulu>
    </Pressable>
  );
}
