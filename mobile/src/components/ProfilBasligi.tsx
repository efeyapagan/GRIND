import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { FotografSahibi, KullaniciProfili, TakipListesiTuru } from '@grind/shared/api/queries';
import ProfilFotografi from './ProfilFotografi';

const SAYACLAR = [
  { liste: 'friends', alan: 'friendCount', etiketAnahtari: 'profil.arkadaslar' },
  { liste: 'followers', alan: 'followerCount', etiketAnahtari: 'profil.takipciler' },
  { liste: 'following', alan: 'followingCount', etiketAnahtari: 'profil.takipEdilenler' },
] as const satisfies readonly { liste: TakipListesiTuru; alan: keyof KullaniciProfili; etiketAnahtari: string }[];

interface Props {
  kisi: FotografSahibi & { age: number | null };
  sayaclar: KullaniciProfili | undefined;
  adYani?: ReactNode;
  children: ReactNode;
}

/**
 * web/src/components/ProfilBasligi.tsx ile ayni (#283/#284): kendi profilinde ve başkasınınkinde tek
 * bileşen; veri ve düğmeler çağırandan gelir. Sayılar ve yaş sunucudan; sayaçlar takip listesini açar.
 */
export default function ProfilBasligi({ kisi, sayaclar, adYani, children }: Props) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="flex-col gap-3 px-4 pt-2 pb-4">
      <View className="flex-row items-center gap-4">
        <ProfilFotografi profil={kisi} boyut="orta" />
        <View className="min-w-0 flex-1 flex-col gap-2">
          <View className="flex-row items-center gap-2">
            <Text accessibilityRole="header" numberOfLines={1} className="shrink text-heading text-fg">
              {kisi.username}
            </Text>
            {adYani}
          </View>
          <View accessibilityLabel={t('profil.sayaclar')} className="flex-row gap-4">
            {SAYACLAR.map(({ liste, alan, etiketAnahtari }) => {
              const sayi = sayaclar?.[alan] ?? '–';
              return (
                <Pressable
                  key={liste}
                  accessibilityRole="link"
                  accessibilityLabel={t('profil.sayacEtiketi', { etiket: t(etiketAnahtari), sayi })}
                  onPress={() => router.push(`/profile/u/${encodeURIComponent(kisi.username)}/${liste}`)}
                  className="flex-col"
                >
                  <Text className="text-body-lg font-bold text-fg">{sayi}</Text>
                  <Text className="text-label text-muted">{t(etiketAnahtari)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
      {(kisi.displayName || kisi.age !== null) && (
        <View className="flex-col">
          {kisi.displayName && <Text className="text-body-lg text-fg">{kisi.displayName}</Text>}
          {kisi.age !== null && <Text className="text-body text-muted">{t('profil.yas', { count: kisi.age })}</Text>}
        </View>
      )}
      <View className="flex-row gap-2">{children}</View>
    </View>
  );
}
