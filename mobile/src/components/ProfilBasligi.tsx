import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useKullaniciProfili, useProfilim } from '@grind/shared/api/queries';
import { useAuth } from '../auth/AuthContext';
import HataKutusu from '../ui/HataKutusu';
import ProfilFotografi from './ProfilFotografi';

const DUGMELER = [
  { to: '/profile/edit', etiketAnahtari: 'ortak.profiliDuzenle' },
  { to: '/profile/account', etiketAnahtari: 'ortak.hesapAyarlari' },
] as const;

/** web/src/components/ProfilBasligi.tsx ile ayni (#283); sayilar ve yas sunucudan gelir. */
export default function ProfilBasligi() {
  const { t } = useTranslation();
  const router = useRouter();
  const { username } = useAuth();
  const profil = useProfilim();
  const sayaclar = useKullaniciProfili(username);

  if (profil.isError) {
    return (
      <View className="px-4 pt-2">
        <HataKutusu baslik={t('profil.guncellenemedi')} mesaj={t('profil.profilAlinamadi')} />
      </View>
    );
  }
  if (!profil.data) {
    return <View className="min-h-40" />;
  }

  const sayacListesi = [
    { sayi: sayaclar.data?.friendCount, etiket: t('profil.arkadaslar') },
    { sayi: sayaclar.data?.followerCount, etiket: t('profil.takipciler') },
    { sayi: sayaclar.data?.followingCount, etiket: t('profil.takipEdilenler') },
  ];

  return (
    <View className="flex-col gap-3 px-4 pt-2 pb-4">
      <View className="flex-row items-center gap-4">
        <ProfilFotografi profil={profil.data} boyut="orta" />
        <View className="min-w-0 flex-1 flex-col gap-2">
          <Text accessibilityRole="header" numberOfLines={1} className="text-heading text-fg">
            {profil.data.username}
          </Text>
          <View accessibilityLabel={t('profil.sayaclar')} className="flex-row gap-4">
            {sayacListesi.map(({ sayi, etiket }) => (
              <View
                key={etiket}
                accessible
                accessibilityLabel={t('profil.sayacEtiketi', { etiket, sayi: sayi ?? '–' })}
                className="flex-col"
              >
                <Text className="text-body-lg font-bold text-fg">{sayi ?? '–'}</Text>
                <Text className="text-label text-muted">{etiket}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      {(profil.data.displayName || profil.data.age !== null) && (
        <View className="flex-col">
          {profil.data.displayName && <Text className="text-body-lg text-fg">{profil.data.displayName}</Text>}
          {profil.data.age !== null && (
            <Text className="text-body text-muted">{t('profil.yas', { count: profil.data.age })}</Text>
          )}
        </View>
      )}
      <View className="flex-row gap-2">
        {DUGMELER.map(({ to, etiketAnahtari }) => (
          <Pressable
            key={to}
            accessibilityRole="button"
            onPress={() => router.push(to)}
            className="h-10 flex-1 items-center justify-center rounded-xl bg-surface-3 px-3"
          >
            <Text className="text-label text-fg">{t(etiketAnahtari)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
