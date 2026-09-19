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
        <View className="flex-1">
          <Slot />
        </View>
        <KabukTabBar />
      </View>
    </PageTitleProvider>
  );
}
