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
  /** `@kullanıcı adı` satırının sonu: kendi profilinde arama ikonu, arkadaşta "Arkadaş" göstergesi. */
  adYani?: ReactNode;
  /** İsim satırının sonu -- yalnızca kendi profilinde düzenleme kalemi (issue #293). */
  duzenle?: ReactNode;
  /** En alttaki düğme satırı: başkasında takip düğmesi. Kendi profilinde YOK (issue #293). */
  children?: ReactNode;
}

/**
 * web/src/components/ProfilBasligi.tsx ile ayni (#283/#284, duzeni #293'te degisti): solda fotograf,
 * yaninda gorunen isim + yas (+ kalem), altinda `@kullanici adi` (+ arama/arkadas gostergesi), altinda
 * uc sayac. Gorunen isim yoksa ust satir kullanici adina duser. Veri ve ek ogeler cagirandan gelir.
 */
export default function ProfilBasligi({ kisi, sayaclar, adYani, duzenle, children }: Props) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="flex-col gap-3 px-4 pt-2 pb-4">
      <View className="flex-row items-center gap-4">
        <ProfilFotografi profil={kisi} boyut="orta" />
        <View className="min-w-0 flex-1 flex-col gap-2">
          <View className="flex-row items-center gap-2">
            <Text accessibilityRole="header" numberOfLines={1} className="shrink text-heading text-fg">
              {kisi.displayName || kisi.username}
            </Text>
            {kisi.age !== null && <Text className="shrink-0 text-body text-muted">{t('profil.yas', { count: kisi.age })}</Text>}
            {duzenle}
          </View>
          <View className="flex-row items-center gap-2">
            <Text numberOfLines={1} className="min-w-0 shrink text-body text-muted">
              @{kisi.username}
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
      {children && <View className="flex-row gap-2">{children}</View>}
    </View>
  );
}
