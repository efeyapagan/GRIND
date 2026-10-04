import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useArkadaslikYaniti, type Bildirim } from '@grind/shared/api/queries';
import { useDil } from '@grind/shared/i18n';
import { formatGoreliTarih } from '@grind/shared/lib/format';
import { setDegeriMetni } from '@grind/shared/lib/setDegeri';
import { useCevrimiciEylem } from '../baglanti/useCevrimiciEylem';
import CamDolgu from '../ui/CamDolgu';
import ProfilFotografi from './ProfilFotografi';

/**
 * Bildirim ekraninda bir satir (#325): takip, rekorlu antrenman ya da arkadasin haftalik hedefini
 * tamamlamasi (#419). Okunmamis satir bu ziyaret boyunca bir ton acik zeminde durur. Dokunmak
 * kisinin profilini acar -- rekorda dogrudan Rekorlar sekmesini.
 * #628: arkadaslik istegi satir icinde Kabul et / Reddet ile yanitlanir.
 */
export default function BildirimSatiri({ bildirim }: { bildirim: Bildirim }) {
  const { t } = useTranslation();
  const dil = useDil();
  const router = useRouter();
  const yanit = useArkadaslikYaniti();
  const cevrimici = useCevrimiciEylem();
  const kisi = bildirim.actor;
  const ad = kisi.displayName ?? kisi.username;
  const profil = `/profile/u/${encodeURIComponent(kisi.username)}`;

  return (
    <Pressable
      testID={`bildirim-${bildirim.kind}-${kisi.username}`}
      accessibilityRole="link"
      onPress={() => router.push(bildirim.kind === 'Records' ? `${profil}/records` : profil)}
      className={`flex-row gap-3 rounded-xl p-3 ${bildirim.isUnread ? 'bg-surface-4' : 'bg-surface-2'}`}
    >
      <ProfilFotografi profil={kisi} boyut="kucuk" />
      <View className="min-w-0 flex-1 flex-col gap-1">
        <Text className="text-body text-fg">
          {bildirim.kind === 'Follow' && t('bildirimler.takipEtti', { ad })}
          {bildirim.kind === 'WeeklyGoal' && t('bildirimler.hedefiTamamladi', { ad })}
          {bildirim.kind === 'Records' && t('bildirimler.rekorKirdi', { ad, count: bildirim.records.length })}
          {bildirim.kind === 'FriendRequest' && t('bildirimler.arkadaslikIstegi', { ad })}
        </Text>
        {bildirim.kind === 'Follow' && kisi.relation === 'Friends' && (
          <Text className="text-body text-muted">{t('bildirimler.artikArkadassiniz')}</Text>
        )}
        {bildirim.records.map((rekor) => (
          <Text key={rekor.exerciseId} numberOfLines={1} className="text-body text-muted">
            {t('bildirimler.rekorSatiri', { hareket: rekor.exerciseName, deger: setDegeriMetni(rekor, dil) })}
          </Text>
        ))}
        {bildirim.kind === 'FriendRequest' && (
          <View className="flex-row gap-2 pt-1">
            <Pressable
              accessibilityRole="button"
              disabled={yanit.isPending}
              onPress={cevrimici(() => yanit.mutate({ kullaniciAdi: kisi.username, kabul: true }))}
              className="h-9 flex-1 items-center justify-center rounded-xl bg-accent"
            >
              <Text className="text-label font-bold text-on-accent">{t('takip.kabulEt')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={yanit.isPending}
              onPress={cevrimici(() => yanit.mutate({ kullaniciAdi: kisi.username, kabul: false }))}
              className="h-9 flex-1 items-center justify-center rounded-xl"
            >
              <CamDolgu opaklik={0.1} yaricap={12} />
              <Text className="text-label text-fg">{t('takip.reddet')}</Text>
            </Pressable>
          </View>
        )}
        <Text className="text-label text-muted">{formatGoreliTarih(bildirim.occurredAt, dil)}</Text>
      </View>
    </Pressable>
  );
}
