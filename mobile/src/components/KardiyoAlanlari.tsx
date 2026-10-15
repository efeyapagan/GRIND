import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { KardiyoAlani } from '@grind/shared/api/queries';
import type { KardiyoGirdisi } from '@grind/shared/lib/kardiyo';
import SayiAlani from '../ui/SayiAlani';

/** Birimi olan kutular; seviye, damper, kat, adim ve atlama birimsizdir. */
const BIRIMLER: Partial<Record<KardiyoAlani, 'Speed' | 'Incline' | 'Distance' | 'Cadence' | 'Watts'>> = {
  Speed: 'Speed',
  Incline: 'Incline',
  Distance: 'Distance',
  Cadence: 'Cadence',
  Watts: 'Watts',
};

const ONDALIKLI: readonly KardiyoAlani[] = ['Speed', 'Incline', 'Distance'];

interface Props {
  /** Kutularin id oneki (testler ve erisilebilirlik): `<onek>-<alan>`. */
  onek: string;
  alanlar: readonly KardiyoAlani[];
  /** Kurek ve kayak ergometresinde mesafe metre girilir (`metreMi`). */
  metre: boolean;
  girdi: KardiyoGirdisi;
  onDegis: (alan: KardiyoAlani, deger: string) => void;
  hatalar: readonly KardiyoAlani[];
}

/** #647: kardiyo kutularinin iki sutunlu izgarasi -- panel ve duzenleyici ortak. */
export default function KardiyoAlanlari({ onek, alanlar, metre, girdi, onDegis, hatalar }: Props) {
  const { t } = useTranslation();
  return (
    <View className="flex-row flex-wrap gap-2">
      {alanlar.map((alan) => {
        const birim = BIRIMLER[alan];
        const metreMesafe = alan === 'Distance' && metre;
        return (
          <View key={alan} className="min-w-[45%] flex-1">
            <SayiAlani
              id={`${onek}-${alan}`}
              etiket={t(`kardiyo.alan.${alan}`)}
              birim={birim ? t(metreMesafe ? 'kardiyo.birim.DistanceMetre' : `kardiyo.birim.${birim}`) : ''}
              inputMode={ONDALIKLI.includes(alan) && !metreMesafe ? 'decimal' : 'numeric'}
              placeholder="0"
              value={girdi[alan] ?? ''}
              onChange={(deger) => onDegis(alan, deger)}
              hata={hatalar.includes(alan) ? t('kardiyo.gecersizDeger') : undefined}
            />
          </View>
        );
      })}
    </View>
  );
}
