import { useEffect } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import CamKatmanlari from '../ui/CamKatmanlari';
import { useEtkinTema } from '../ui/renkler';
import DuzenleSilSecenekleri from './DuzenleSilSecenekleri';

interface Props {
  /** Menunun ustunde gosterilen ozet (tarih + degerler). */
  ozet: string;
  onKapat: () => void;
  onDuzenle: () => void;
  onSil: () => void;
}

/**
 * #623: olcu kartina basili tutunca acilan menu -- sablon menusundeki (`SablonMenusu`) Duzenle / Sil
 * secenekleri ve silmenin yerinde onayi (`DuzenleSilSecenekleri`). Karti buyutup yerinden kaldirmaz
 * (olcu karti salt metin); arka plan kararir, perdeye dokunmak menuyu kapatir.
 */
export default function OlcuMenusu({ ozet, onKapat, onDuzenle, onSil }: Props) {
  const { t } = useTranslation();
  const etkinTema = useEtkinTema();

  useEffect(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onKapat}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('ortak.kapat')}
        onPress={onKapat}
        className={`absolute inset-0 ${etkinTema === 'acik' ? 'bg-black/30' : 'bg-black/60'}`}
      />
      <View pointerEvents="box-none" className="flex-1 justify-center px-4">
        <View testID="olcu-menusu" className="overflow-hidden rounded-2xl">
          <CamKatmanlari koseSinifi="rounded-2xl" />
          <Text numberOfLines={2} className="px-5 pt-4 text-label text-muted">
            {ozet}
          </Text>
          <DuzenleSilSecenekleri
            duzenleEtiketi={t('olcumler.olcuyuDuzenle')}
            silEtiketi={t('olcumler.olcuyuSil')}
            silOnayMesaji={t('olcumler.silmeOnayi')}
            onDuzenle={onDuzenle}
            onSil={onSil}
          />
        </View>
      </View>
    </Modal>
  );
}
