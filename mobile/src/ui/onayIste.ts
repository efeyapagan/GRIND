import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

/**
 * Yıkıcı bir takip/arkadaşlık eylemi öncesi yerel onay (#628). Düğme sırası sabit: [Vazgeç, eylem] —
 * testler ikinci düğmeyi eylem sayar. Metinler `t`'den gelir, bu yüzden hook (modül seviyesinde `t` çağrılmaz).
 */
export function useOnayIste() {
  const { t } = useTranslation();
  return ({ mesaj, eylemEtiketi, onEvet }: { mesaj: string; eylemEtiketi: string; onEvet: () => void }) => {
    Alert.alert(eylemEtiketi, mesaj, [
      { text: t('ortak.vazgec'), style: 'cancel' },
      { text: eylemEtiketi, style: 'destructive', onPress: onEvet },
    ]);
  };
}
