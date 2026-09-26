import '../global.css';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureRequestClient } from '@grind/shared/api/client';
import { i18nBaslat } from '@grind/shared/i18n';
import { session } from '../src/session';
import { API_BASE_URL } from '../src/apiConfig';
import { odakDinleyicisiniKur } from '../src/queryOdak';
import { AuthProvider } from '../src/auth/AuthContext';
import { TemaProvider, useTema } from '../src/ui/TemaContext';
import { renkler } from '@grind/shared/designTokens';

const sorguIstemcisi = new QueryClient();

/**
 * Saat/pil rengi (#271). Isletim sistemi semasini degil UYGULAMANIN temasini izler: kullanici
 * sistemi koyuyken uygulamayi acik yaparsa, beyaz zeminde beyaz saat kalirdi.
 */
function DurumCubugu() {
  const { etkinTema } = useTema();
  return <StatusBar style={etkinTema === 'acik' ? 'dark' : 'light'} />;
}

// #177 dilim 1: paylasilan yardimcilar metni ortak i18n orneginden uretir; mobil arayuz dilim 3'e
// kadar Turkce sabit.
i18nBaslat('tr');

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
        <ActivityIndicator color={renkler.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={sorguIstemcisi}>
        <TemaProvider>
          <DurumCubugu />
          <AuthProvider>
            <Slot />
          </AuthProvider>
        </TemaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
