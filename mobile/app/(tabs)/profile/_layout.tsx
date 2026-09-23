import { View } from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { History, Ruler, Trophy } from 'lucide-react-native';
import SekmeDugmesi from '../../../src/ui/SekmeDugmesi';
import ProfilBasligi from '../../../src/components/ProfilBasligi';

const SEKMELER = [
  { to: '/profile/history', etiketAnahtari: 'kabuk.sekmeGecmis', ikon: History },
  { to: '/profile/records', etiketAnahtari: 'kabuk.sekmeRekorlar', ikon: Trophy },
  { to: '/profile/measurements', etiketAnahtari: 'kabuk.sekmeOlcumler', ikon: Ruler },
] as const;

/**
 * web/src/pages/ProfileLayout.tsx ile ayni (#283): Instagram tarzi baslik ve yalnizca ikonlu sekmeler
 * (Gecmis · Rekorlar · Olculer). Hesap ayarlari (`account`) ve Profili duzenle (`edit`) bu klasorde
 * durur ama sekme degildir -- onlarda baslik ve sekme cubugu cizilmez. Dosyalar tasinmadi: adresler
 * (`/profile/account`) degismesin.
 */
export default function ProfileLayout() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  if (!SEKMELER.some(({ to }) => to === pathname)) {
    return <Slot />;
  }

  return (
    <View className="flex-1">
      <ProfilBasligi />
      <View className="flex-row border-b border-surface-3">
        {SEKMELER.map(({ to, etiketAnahtari, ikon }) => (
          <SekmeDugmesi key={to} ikon={ikon} secili={pathname === to} onPress={() => router.navigate(to)}>
            {t(etiketAnahtari)}
          </SekmeDugmesi>
        ))}
      </View>
      <View className="flex-1">
        <Slot />
      </View>
    </View>
  );
}
