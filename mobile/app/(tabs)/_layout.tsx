import { View } from 'react-native';
import { Slot, Redirect } from 'expo-router';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import { useAuth } from '../../src/auth/AuthContext';
import KabukBaslik from '../../src/ui/KabukBaslik';
import KabukTabBar from '../../src/ui/KabukTabBar';

/**
 * Korumali alanin ortak kabugu (App.tsx). `isAuthenticated` false ise `/login`'e yonlendirir
 * (web/src/auth/ProtectedRoute.tsx ile ayni sozlesme).
 */
export default function TabsLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <PageTitleProvider>
      <View className="flex-1 bg-bg">
        <KabukBaslik />
        {/* Global bir alt bosluk BILEREK yok (issue #159, kullanici karari): "+" dugmesinin
            halkasindan pay ayirmak icin TUM sayfalara rezerve edilen bosluk "olu alan" olarak
            goruldu. Bunun yerine sadece halkanin KESINLIKLE ustune binmemesi gereken spesifik
            bilesenler (bkz. `KabukTabBar`'daki `TABBAR_HALKA_TASMASI`) kendi payini alir; sıradan
            kaydirilabilir icerik halkanin arkasina gecebilir. */}
        <View className="flex-1">
          <Slot />
        </View>
        <KabukTabBar />
      </View>
    </PageTitleProvider>
  );
}
