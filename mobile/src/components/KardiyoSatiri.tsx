import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import type { KardiyoKaydi } from '@grind/shared/api/queries';
import { kardiyoOzetParcalari, kardiyoSureMetni, metreMi } from '@grind/shared/lib/kardiyo';
import Rozet from '../ui/Rozet';
import Hap from '../ui/Hap';
import { useKardiyoAlanlari } from './useKardiyoAlanlari';
import { useSaniyelikSaat } from './useSaniyelikSaat';

interface Props {
  kayit: KardiyoKaydi;
  /** Verilmezse satir salt-okunurdur (gecmis, arkadasin gecmisi). Akan kayitta da cagrilmaz. */
  onDuzenle?: (kayit: KardiyoKaydi) => void;
}

/**
 * #647: bir kardiyo kaydi -- buyuk sure, altinda dolu kutularin ozeti ("3,2 km · 9 km/sa · %6") ve rekor rozetleri.
 * Akan kayitta sure canli sayar ve "Suruyor" hapi durur. Bitmis kayda dokununca duzenleyici acilir (set satiri gibi).
 */
export default function KardiyoSatiri({ kayit, onDuzenle }: Props) {
  const { t } = useTranslation();
  const dil = useDil();
  const akiyor = kayit.durationSeconds === null;
  const simdi = useSaniyelikSaat(akiyor);
  const alanlar = useKardiyoAlanlari(kayit.exerciseId);
  const sure = kardiyoSureMetni(kayit, simdi);
  const ozet = kardiyoOzetParcalari(kayit, metreMi(alanlar), dil)
    .map(({ anahtar, deger }) => t(`kardiyo.ozet.${anahtar}`, { deger }))
    .join(' · ');
  const rozetler = [
    kayit.isDurationRecord ? t('kardiyo.rekorSure') : null,
    kayit.isDistanceRecord ? t('kardiyo.rekorMesafe') : null,
  ].filter((rozet): rozet is string => rozet !== null);
  const erisilebilirAd = [kayit.exerciseName, sure, ozet, ...rozetler, akiyor ? t('kardiyo.akiyor') : null]
    .filter(Boolean)
    .join(', ');

  const icerik = (
    <>
      <View className="min-w-0 flex-1 flex-col items-start gap-1">
        <Text testID={`kardiyo-sure-${kayit.id}`} className="text-metric text-fg">
          {sure}
        </Text>
        {ozet !== '' && <Text className="text-body text-muted">{ozet}</Text>}
        {rozetler.length > 0 && (
          <View className="flex-row flex-wrap gap-1">
            {rozetler.map((rozet) => (
              <Rozet key={rozet}>{rozet}</Rozet>
            ))}
          </View>
        )}
      </View>
      {akiyor && <Hap>{t('kardiyo.akiyor')}</Hap>}
    </>
  );

  return onDuzenle && !akiyor ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${erisilebilirAd}, ${t('setler.duzenle')}`}
      onPress={() => onDuzenle(kayit)}
      className="w-full flex-row items-center justify-between gap-2 py-2.5"
    >
      {icerik}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={erisilebilirAd} className="w-full flex-row items-center justify-between gap-2 py-2.5">
      {icerik}
    </View>
  );
}
