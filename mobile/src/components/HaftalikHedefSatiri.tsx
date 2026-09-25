import { View, Text, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useGuncelTakvimOzeti } from '@grind/shared/api/queries';
import { ikonRenk } from '../ui/renkler';

/**
 * Hesap ayarlarindaki haftalik antrenman hedefi satiri (#97; #117). #324: secim artik bir modalda
 * degil, ana sayfadaki "Haftalik hedef" kartiyla AYNI ekranda (`/haftalik-hedef`) yapilir -- tek
 * hedef ekrani. Satir yalnizca guncel hedefi gosterir ve o ekrani acar.
 */
export default function HaftalikHedefSatiri() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: ozet, isError } = useGuncelTakvimOzeti();
  const hedef = ozet?.weeklyTargetDays ?? null;

  return (
    <View className="flex-col gap-1">
      <Text className="text-label text-muted">{t('profil.haftalikHedef')}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={!ozet}
        onPress={() => router.push('/haftalik-hedef')}
        className={`h-12 w-full flex-row items-center justify-between rounded-lg bg-inset px-4 ${ozet ? '' : 'opacity-60'}`}
      >
        <Text className="text-body-lg text-fg">
          {hedef === null ? t('profil.hedefYok') : t('profil.haftadaGun', { count: hedef })}
        </Text>
        <ChevronRight color={ikonRenk.muted} size={20} />
      </Pressable>

      {isError && (
        <Text accessibilityRole="alert" className="text-label text-danger">
          {t('profil.hedefAlinamadi')}
        </Text>
      )}
    </View>
  );
}
