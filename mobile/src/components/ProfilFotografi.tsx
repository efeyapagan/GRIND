import { Image, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import { useProfilFotografi, type FotografSahibi } from '@grind/shared/api/queries';
import { basHarf } from '@grind/shared/lib/profilFotografi';

const BOYUT = {
  kucuk: { kutu: 'size-11', harf: 'text-body-lg' },
  orta: { kutu: 'size-20', harf: 'text-title' },
  buyuk: { kutu: 'size-24', harf: 'text-title' },
} as const;

/**
 * web/src/components/ProfilFotografi.tsx ile ayni (#283). Resim `useProfilFotografi` ile kimlikli istekle
 * cekilip data URL olarak verilir: Android'in resim yukleyicisi `Image` kaynagindaki `headers`'i isteğe
 * eklemiyor, uc 401 donup daire bos kaliyordu (#292).
 */
export default function ProfilFotografi({ profil, boyut }: { profil: FotografSahibi; boyut: keyof typeof BOYUT }) {
  const { t } = useTranslation();
  const dil = useDil();
  const { data: adres } = useProfilFotografi(profil);

  return (
    // shrink-0: baslikta yanindaki `flex-1` sutun daireyi ezmesin (web'deki gibi).
    <View className={`shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-3 ${BOYUT[boyut].kutu}`}>
      {profil.hasAvatar && adres ? (
        <Image
          source={{ uri: adres }}
          accessibilityLabel={t('ortak.profilFotografi')}
          className="size-full"
          resizeMode="cover"
        />
      ) : (
        <Text importantForAccessibility="no" accessibilityElementsHidden className={`${BOYUT[boyut].harf} text-fg`}>
          {basHarf(profil.displayName ?? profil.username, dil)}
        </Text>
      )}
    </View>
  );
}
