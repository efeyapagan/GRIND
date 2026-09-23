import { Image, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import { kimlikliKaynak } from '@grind/shared/api/client';
import { avatarYolu, type Profil } from '@grind/shared/api/queries';
import { basHarf } from '@grind/shared/lib/profilFotografi';

const BOYUT = { orta: 'size-20', buyuk: 'size-24' } as const;

/**
 * web/src/components/ProfilFotografi.tsx ile ayni (#283). Fotograf ucu kimlik ister (#280): RN `Image`
 * kaynagina yetki basligi dogrudan verilebildigi icin web'deki data URL adimina gerek yok. Adresteki
 * `v` surumu onbellegi kirar.
 */
export default function ProfilFotografi({ profil, boyut }: { profil: Profil; boyut: keyof typeof BOYUT }) {
  const { t } = useTranslation();
  const dil = useDil();

  return (
    // shrink-0: baslikta yanindaki `flex-1` sutun daireyi ezmesin (web'deki gibi).
    <View className={`shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-3 ${BOYUT[boyut]}`}>
      {profil.hasAvatar && profil.avatarVersion !== null ? (
        <Image
          source={kimlikliKaynak(avatarYolu(profil.username, profil.avatarVersion))}
          accessibilityLabel={t('ortak.profilFotografi')}
          className="size-full"
          resizeMode="cover"
        />
      ) : (
        <Text importantForAccessibility="no" accessibilityElementsHidden className="text-title text-fg">
          {basHarf(profil.displayName ?? profil.username, dil)}
        </Text>
      )}
    </View>
  );
}
