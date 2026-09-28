import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react-native';
import { useDil } from '@grind/shared/i18n';
import type { GecmisOturum } from '@grind/shared/api/queries';
import { formatGoreliTarih, formatWeight } from '@grind/shared/lib/format';
import AntrenmanSuresi from './AntrenmanSuresi';
import TurEtiketi from '../ui/TurEtiketi';
import { useIkonRenk } from '../ui/renkler';

/**
 * Gecmis antrenmaninin ozeti -- tarih, tur etiketi, set/hacim/sure. #382: hem listedeki kartta
 * (`GecmisKarti`) hem de ayrinti panelinin (`GecmisDetayPaneli`) basliginda ayni gorunur.
 * #471: her sayinin altinda ne oldugunu soyleyen soluk (`accent-soft`) bir etiket var.
 */
export default function GecmisOzeti({ oturum }: { oturum: GecmisOturum }) {
  const ikonRenk = useIkonRenk();
  const { t } = useTranslation();
  const dil = useDil();
  const bos = oturum.setCount === 0;
  return (
    <View className="min-w-0 flex-1 flex-col gap-1">
      <View className="flex-row flex-wrap items-center gap-2">
        <View className="flex-row items-center gap-1">
          <CalendarDays color={ikonRenk.muted} size={18} />
          <Text className="text-label text-fg">{formatGoreliTarih(oturum.startedAt, dil)}</Text>
        </View>
        <TurEtiketi>{oturum.templateName ?? t('gecmis.serbest')}</TurEtiketi>
      </View>
      <View className="flex-row flex-wrap items-start gap-4">
        <OzetDegeri etiket={t('gecmis.etiketSetSayisi')}>
          <View className="flex-row items-baseline gap-1">
            <Text className={`text-metric ${bos ? 'text-muted' : 'text-fg'}`}>{oturum.setCount}</Text>
            <Text className="text-label-xs text-muted uppercase">{t('gecmis.setBirimi')}</Text>
          </View>
        </OzetDegeri>
        <OzetDegeri etiket={t('gecmis.etiketHacim')}>
          <View className="flex-row items-baseline gap-1">
            <Text className={`text-metric ${bos ? 'text-muted' : 'text-fg'}`}>{formatWeight(oturum.totalVolume, dil)}</Text>
            <Text className="text-label-xs text-muted uppercase">kg</Text>
          </View>
        </OzetDegeri>
        {/* #246: medyan dinlenmenin (#71) yerini aldi. Acik antrenmanda sure yok, etiketiyle birlikte cizilmez. */}
        {oturum.durationSeconds !== null && (
          <OzetDegeri etiket={t('gecmis.etiketSure')}>
            <AntrenmanSuresi saniye={oturum.durationSeconds} />
          </OzetDegeri>
        )}
      </View>
    </View>
  );
}

/** #471: bir ozet degeri ve altinda ne oldugunu soyleyen soluk turuncu etiket. */
function OzetDegeri({ etiket, children }: { etiket: string; children: React.ReactNode }) {
  return (
    <View className="flex-col">
      {children}
      <Text className="text-label-xs text-accent-soft">{etiket}</Text>
    </View>
  );
}
