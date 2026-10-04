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
import { DilProvider, baslangicDili } from '../src/ui/DilContext';
import { YorumDiliProvider } from '../src/ui/YorumDiliContext';
import { renkler } from '@grind/shared/designTokens';
import BaglantiSaglayici from '../src/baglanti/BaglantiSaglayici';
import CevrimdisiSeridi from '../src/baglanti/CevrimdisiSeridi';
import OnbellekKaliciligi from '../src/onbellek/OnbellekKaliciligi';
import KuyrukSaglayici from '../src/kuyruk/KuyrukSaglayici';
import CevrimdisiOnYukleme from '../src/onbellek/CevrimdisiOnYukleme';
import { ONBELLEK_OMRU_MS } from '../src/onbellek/kaliciOnbellek';

// #174: sorgular diske kalici yazilir; bellekten erken dusen sorgu diske de yazilmazdi -- `gcTime` kalicilik
// suresine esitlenir.
const sorguIstemcisi = new QueryClient({ defaultOptions: { queries: { gcTime: ONBELLEK_OMRU_MS } } });

/**
 * Saat/pil rengi (#271). Isletim sistemi semasini degil UYGULAMANIN temasini izler: kullanici
 * sistemi koyuyken uygulamayi acik yaparsa, beyaz zeminde beyaz saat kalirdi.
 */
function DurumCubugu() {
  const { etkinTema } = useTema();
  return <StatusBar style={etkinTema === 'acik' ? 'dark' : 'light'} />;
}

// #263 dilim 1: arayuz Turkce + Ingilizce. Ilk dil CIHAZ dilinden gelir; kullanicinin kayitli
// tercihi (varsa) DilProvider icinde asenkron okunup uygulanir.
i18nBaslat(baslangicDili());

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
        {/* #174: sunucuya ulasilabilirlik; cevrimdisiyken sorgular duraklar, serit gorunur. */}
        <BaglantiSaglayici>
          <TemaProvider>
            <DurumCubugu />
            <DilProvider>
              {/* Arayuz dilini varsayilan aldigi icin DilProvider'in ICINDE (#199). */}
              <YorumDiliProvider>
                <AuthProvider>
                  <OnbellekKaliciligi />
                  {/* #174 dilim 2: cevrimdisi antrenman islemlerinin kuyrugu. */}
                  <KuyrukSaglayici>
                    <CevrimdisiOnYukleme />
                    <CevrimdisiSeridi>
                      <Slot />
                    </CevrimdisiSeridi>
                  </KuyrukSaglayici>
                </AuthProvider>
              </YorumDiliProvider>
            </DilProvider>
          </TemaProvider>
        </BaglantiSaglayici>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
