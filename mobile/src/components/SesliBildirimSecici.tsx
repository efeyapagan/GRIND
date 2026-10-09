import { useState } from 'react';
import { Platform, Switch, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { sesliBildirimiAyarla, useSesliBildirim } from '../bildirim/dinlenmeSesi';
import { useRenkPaleti } from '../ui/renkler';

/**
 * #414: dinlenme bitince arka planda zil calsin mi. Acilinca bildirim izni sorulur; verilmezse tercih kapali
 * kalir ve izni telefon ayarlarindan acmak gerektigi yazilir.
 */
export default function SesliBildirimSecici() {
  const { t } = useTranslation();
  const palet = useRenkPaleti();
  const acik = useSesliBildirim();
  const [izinYok, setIzinYok] = useState(false);
  // Android'de ayni tercih ust paneldeki geri sayimi da acar (orada her bildirim izin ister).
  const android = Platform.OS === 'android';
  const etiket = t(android ? 'profil.dinlenmeBildirimi' : 'profil.sesliBildirim');

  return (
    <View className="flex-col gap-1">
      <View className="min-h-12 flex-row items-center justify-between gap-3">
        <Text className="text-body-lg text-fg">{etiket}</Text>
        <Switch
          accessibilityLabel={etiket}
          value={acik}
          onValueChange={(istenen) => void sesliBildirimiAyarla(istenen).then((oldu) => setIzinYok(!oldu))}
          trackColor={{ true: palet.accent, false: palet['surface-3'] }}
          // Android'in varsayilan topu sistem yesili; paletten verilir (iOS'un beyaz topu kalir).
          thumbColor={android ? (acik ? palet['on-accent'] : palet.muted) : undefined}
        />
      </View>
      {izinYok ? (
        <Text accessibilityRole="alert" className="text-label text-danger">
          {t('profil.sesliBildirimIzinYok')}
        </Text>
      ) : (
        <Text className="text-label text-muted">{t(android ? 'profil.dinlenmeBildirimiAciklama' : 'profil.sesliBildirimAciklama')}</Text>
      )}
    </View>
  );
}
