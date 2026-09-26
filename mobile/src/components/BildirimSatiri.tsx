import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Bildirim } from '@grind/shared/api/queries';
import { useDil } from '@grind/shared/i18n';
import { formatGoreliTarih, formatWeight } from '@grind/shared/lib/format';
import ProfilFotografi from './ProfilFotografi';

/**
 * Bildirim ekraninda bir satir (#325): takip ya da takip edilen birinin rekorlu antrenmani. Okunmamis
 * satir bu ziyaret boyunca bir ton acik zeminde durur. Dokunmak kisinin profilini (rekorda Rekorlar
 * sekmesini) acar.
 */
export default function BildirimSatiri({ bildirim }: { bildirim: Bildirim }) {
  const { t } = useTranslation();
  const dil = useDil();
  const router = useRouter();
  const kisi = bildirim.actor;
  const ad = kisi.displayName ?? kisi.username;
  const profil = `/profile/u/${encodeURIComponent(kisi.username)}`;

  return (
    <Pressable
      testID={`bildirim-${bildirim.kind}-${kisi.username}`}
      accessibilityRole="link"
      onPress={() => router.push(bildirim.kind === 'Follow' ? profil : `${profil}/records`)}
      className={`flex-row gap-3 rounded-xl p-3 ${bildirim.isUnread ? 'bg-surface-4' : 'bg-surface-2'}`}
    >
      <ProfilFotografi profil={kisi} boyut="kucuk" />
      <View className="min-w-0 flex-1 flex-col gap-1">
        <Text className="text-body text-fg">
          {bildirim.kind === 'Follow'
            ? t('bildirimler.takipEtti', { ad })
            : t('bildirimler.rekorKirdi', { ad, count: bildirim.records.length })}
        </Text>
        {bildirim.kind === 'Follow' && kisi.relation === 'Friends' && (
          <Text className="text-body text-muted">{t('bildirimler.artikArkadassiniz')}</Text>
        )}
        {bildirim.records.map((rekor) => (
          <Text key={rekor.exerciseId} numberOfLines={1} className="text-body text-muted">
            {t('bildirimler.rekorSatiri', {
              hareket: rekor.exerciseName,
              agirlik: formatWeight(rekor.weight, dil),
              tekrar: rekor.reps,
            })}
          </Text>
        ))}
        <Text className="text-label text-muted">{formatGoreliTarih(bildirim.occurredAt, dil)}</Text>
      </View>
    </Pressable>
  );
}
