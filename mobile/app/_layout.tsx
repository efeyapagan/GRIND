import '../global.css';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureRequestClient } from '@grind/shared/api/client';
import { session } from '../src/session';
import { API_BASE_URL } from '../src/apiConfig';

const sorguIstemcisi = new QueryClient();

export default function RootLayout() {
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    configureRequestClient({ baseUrl: API_BASE_URL, session });
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
    <QueryClientProvider client={sorguIstemcisi}>
      <Slot />
    </QueryClientProvider>
  );
}
