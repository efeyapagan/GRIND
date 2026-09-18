import { View, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Plus, User } from 'lucide-react-native';
import { ikonRenk } from './renkler';

/**
 * App.tsx'teki alt menunun RN karsiligi (issue #119/#120): Ana Sayfa · (+) · Profil, simetrik
 * 1-1, ortada tasan buyuk "+" dugmesi. UCU DE simgeden ibarettir, gorunur etiket YOK --
 * erisilebilir ad `accessibilityLabel`den gelir. "+" HER ZAMAN `/antrenman`a gider.
 *
 * Expo Router'in kendi `Tabs` bilesenini KULLANMIYORUZ -- React Navigation'in tabBar prop
 * seklini (descriptors/state) web'in duz NavLink desenine zorlamak yerine, web'deki
 * `usePathname`/`Link` mantigi burada da BIREBIR ayni sekilde (aktif yol karsilastirmasi) kuruldu.
 */
export default function KabukTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const anaSayfaAktif = pathname === '/';
  const profilAktif = pathname.startsWith('/profile');

  return (
    <View style={{ paddingBottom: insets.bottom }} className="bg-bg">
      <View className="h-16 flex-row items-center px-4">
        <View className="flex-1 items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ana sayfa"
            onPress={() => router.navigate('/')}
            className="h-12 min-w-16 items-center justify-center"
          >
            <Home color={anaSayfaAktif ? ikonRenk.accent : ikonRenk.muted} size={22} />
          </Pressable>
        </View>

        <View className="flex-1 items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Antrenman başlat"
            onPress={() => router.navigate('/antrenman')}
            style={{ marginTop: -28 }}
          >
            <View className="size-16 items-center justify-center rounded-full bg-accent shadow-lg">
              <Plus color={ikonRenk.onAccent} size={28} />
            </View>
          </Pressable>
        </View>

        <View className="flex-1 items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profil"
            onPress={() => router.navigate('/profile')}
            className="h-12 min-w-16 items-center justify-center"
          >
            <User color={profilAktif ? ikonRenk.accent : ikonRenk.muted} size={22} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
