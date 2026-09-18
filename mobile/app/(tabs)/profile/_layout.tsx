import { View } from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import SekmeDugmesi from '../../../src/ui/SekmeDugmesi';

const SEKMELER = [
  { to: '/profile/records', etiket: 'Rekorlar' },
  { to: '/profile/history', etiket: 'Geçmiş' },
  { to: '/profile/measurements', etiket: 'Ölçüler' },
  { to: '/profile/account', etiket: 'Hesap' },
] as const;

/** web/src/pages/ProfileLayout.tsx ile ayni (issue #119/#120): Rekorlar, Geçmiş, Ölçüler, Hesap. */
export default function ProfileLayout() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View className="flex-1">
      <View className="flex-row border-b border-surface-3">
        {SEKMELER.map(({ to, etiket }) => (
          <SekmeDugmesi key={to} secili={pathname === to} onPress={() => router.navigate(to)}>
            {etiket}
          </SekmeDugmesi>
        ))}
      </View>
      <View className="flex-1">
        <Slot />
      </View>
    </View>
  );
}
