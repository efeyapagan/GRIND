import '../global.css';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Slot } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureRequestClient } from '@grind/shared/api/client';
import { session } from '../src/session';
import { API_BASE_URL } from '../src/apiConfig';
import { odakDinleyicisiniKur } from '../src/queryOdak';
import { AuthProvider } from '../src/auth/AuthContext';

const sorguIstemcisi = new QueryClient();

export default function RootLayout() {
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    configureRequestClient({ baseUrl: API_BASE_URL, session });
    // #175: RN'de `visibilitychange` yok -- odak takibi AppState'e baglanmadan uygulama on plana
    // dondugunde hicbir sorgu tazelenmez.
    odakDinleyicisiniKur();
    session.hydrate().finally(() => setHazir(true));
  }, []);

  if (!hazir) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#ff5722" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={sorguIstemcisi}>
        <AuthProvider>
          <Slot />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
