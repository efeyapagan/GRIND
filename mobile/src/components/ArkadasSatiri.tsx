import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Crown, Flame } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import { formatWeight } from '@grind/shared/lib/format';
import { hedefOrani, type ArkadasHaftasi } from '@grind/shared/lib/arkadasSiralamasi';
import ProfilFotografi from './ProfilFotografi';
import { useIkonRenk } from '../ui/renkler';

interface Props {
  arkadas: ArkadasHaftasi;
  /** Listenin en ustundeki satir (#418): yalnizca bir kisi lider rozeti alir. */
  lider: boolean;
}

/**
 * Arkadas karsilastirmasinin bir satiri (#418): fotograf, ad, haftalik ilerleme, bugun isareti,
 * haftalik hacim. Dokununca o kisinin profiline gider.
 *
 * Hedefi olmayan arkadas (kullanici karari) cubuk yerine yalnizca gun sayisini gosterir --
 * "0/0" gibi anlamsiz bir oran cizmek yerine ne yaptigini soyler.
 */
export default function ArkadasSatiri({ arkadas, lider }: Props) {
  const { t } = useTranslation();
  const dil = useDil();
  const router = useRouter();
  const ikonRenk = useIkonRenk();

  const ad = arkadas.displayName ?? arkadas.username ?? '';
  const gun = arkadas.trainedDaysThisWeek ?? 0;
  const oran = hedefOrani(arkadas);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('arkadaslar.satirEtiketi', { ad })}
      onPress={() => router.push(`/profile/u/${arkadas.username}`)}
      className="min-h-16 w-full flex-row items-center gap-3 rounded-xl bg-surface-2 p-3"
    >
      <ProfilFotografi
        profil={{
          username: arkadas.username ?? '',
          displayName: arkadas.displayName ?? null,
          hasAvatar: arkadas.hasAvatar ?? false,
          avatarVersion: arkadas.avatarVersion ?? null,
        }}
        boyut="kucuk"
      />
      <View className="min-w-0 flex-1 flex-col gap-1">
        <View className="flex-row items-center gap-1.5">
          <Text numberOfLines={1} className="min-w-0 flex-1 text-body font-semibold text-fg">
            {ad}
          </Text>
          {lider && (
            <View className="flex-row items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5">
              <Crown color={ikonRenk.accentSoft} size={12} />
              <Text className="text-label-xs text-accent-soft">{t('arkadaslar.lider')}</Text>
            </View>
          )}
          {/* Etiket ikonda DEGIL saran View'da: lucide SVG'leri `accessibilityLabel`i
              erisilebilirlik agacina tasimiyor (ProfilFotografi'ndaki `Image` ile ayni desen). */}
          {arkadas.trainedToday && (
            <View accessible accessibilityLabel={t('arkadaslar.bugunAntrenman')}>
              <Flame color={ikonRenk.success} size={16} />
            </View>
          )}
        </View>
        {oran === null ? (
          <Text className="text-label text-muted">{t('arkadaslar.hedefsizGun', { count: gun })}</Text>
        ) : (
          <View className="flex-row items-center gap-2">
            {/* Cubuk bir ilerleme GOSTERGESI, dokunulabilir degil -- erisilebilirlik agacinda
                degeri satirin metninde zaten var. */}
            <View className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-4">
              <View className="h-full rounded-full bg-accent" style={{ width: `${Math.round(oran * 100)}%` }} />
            </View>
            <Text className="shrink-0 text-label text-muted">
              {t('arkadaslar.hedefliGun', { gun, hedef: arkadas.weeklyTargetDays })}
            </Text>
          </View>
        )}
      </View>
      <Text className="shrink-0 text-label text-muted">
        {t('arkadaslar.haftalikHacim', { kg: formatWeight(arkadas.weeklyVolume ?? 0, dil) })}
      </Text>
    </Pressable>
  );
}
