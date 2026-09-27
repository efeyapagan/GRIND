import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import { formatWeight } from '@grind/shared/lib/format';
import { setDegeri, type SetDegerAlanlari } from '@grind/shared/lib/setDegeri';

interface Props {
  kayit: SetDegerAlanlari;
  /** Ana degerin yazi sinifi (ör. `text-metric text-fg`). */
  className: string;
  /** "kg" / "tekrar" biriminin sinifi -- verilmezse ana yaziyla ayni boyda, soluk. */
  birimSinifi?: string;
}

/**
 * #346: bir setin degeri -- "60 kg × 8", "20 tekrar", "+5 kg × 20" ya da "1:15". Bugun ekranindaki set
 * satiri ve gecmisteki set listesi ayni bicimi kullanir; hangisinin cizilecegi `lib/setDegeri`'nde.
 */
export default function SetDegeriYazisi({ kayit, className, birimSinifi = 'text-muted' }: Props) {
  const { t } = useTranslation();
  const dil = useDil();
  const deger = setDegeri(kayit);

  if (deger.tur === 'sure') {
    return <Text className={className}>{deger.sure}</Text>;
  }

  const carpi = <Text className="font-light text-muted">×</Text>;

  if (deger.tur === 'tekrar') {
    return deger.ekAgirlik === null ? (
      <Text className={className}>
        {deger.tekrar} <Text className={birimSinifi}>{t('setGirdisi.tekrarBirimi')}</Text>
      </Text>
    ) : (
      <Text className={className}>
        +{formatWeight(deger.ekAgirlik, dil)} <Text className={birimSinifi}>kg</Text> {carpi} {deger.tekrar}
      </Text>
    );
  }

  return (
    <Text className={className}>
      {formatWeight(deger.agirlik, dil)} <Text className={birimSinifi}>kg</Text> {carpi} {deger.tekrar}
    </Text>
  );
}
