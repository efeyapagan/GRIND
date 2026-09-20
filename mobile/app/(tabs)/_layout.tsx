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
        {/* pb-7 (28px): KabukTabBar'daki ortadaki "+" dugmesi kendi kutusunun (h-16) 28px
            USTUNE tasar (`marginTop: -28`) -- bu bosluk olmadan sayfa icerigi tam o kadar
            asagiya kadar uzayabiliyor ve "+" dugmesiyle CAKISIYORDU (kullanici bulgusu). */}
        <View className="flex-1 pb-7">
          <Slot />
        </View>
        <KabukTabBar />
      </View>
    </PageTitleProvider>
  );
}
