import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { KullaniciOzeti } from '@grind/shared/api/queries';
import Rozet from '../ui/Rozet';
import ProfilFotografi from './ProfilFotografi';
import TakipDugmesi from './TakipDugmesi';

/**
 * web/src/components/KullaniciSatiri.tsx ile ayni (#284): fotograf, ad, gorunen isim ve iliskiye gore
 * dugme; arkadasa dugme yerine gosterge. Satira dokunmak profili acar.
 */
export default function KullaniciSatiri({ kisi }: { kisi: KullaniciOzeti }) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View testID={`kullanici-satiri-${kisi.username}`} className="flex-row items-center gap-3 rounded-xl bg-surface-2 p-3">
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(`/profile/u/${encodeURIComponent(kisi.username)}`)}
        className="min-w-0 flex-1 flex-row items-center gap-3"
      >
        <ProfilFotografi profil={kisi} boyut="kucuk" />
        <View className="min-w-0 flex-1 flex-col">
          <Text numberOfLines={1} className="text-label text-fg">
            {kisi.username}
          </Text>
          {kisi.displayName && (
            <Text numberOfLines={1} className="text-body text-muted">
              {kisi.displayName}
            </Text>
          )}
        </View>
      </Pressable>
      {kisi.relation === 'Friends' ? (
        <Rozet ton="acik">{t('takip.arkadas')}</Rozet>
      ) : (
        <TakipDugmesi kullaniciAdi={kisi.username} iliski={kisi.relation} boyut="kucuk" />
      )}
    </View>
  );
}
