import { AppState } from 'react-native';
import { focusManager } from '@tanstack/react-query';

/**
 * TanStack Query'nin odak takibini React Native'e baglar (issue #175).
 *
 * `refetchOnWindowFocus` VARSAYILAN OLARAK ACIK, ama query-core'un varsayilan dinleyicisi yalnizca
 * DOM'un `visibilitychange` olayini dinler -- RN'de bu olay hic tetiklenmez, dolayisiyla uygulama
 * on plana dondugunde HICBIR sorgu tazelenmezdi: kullanici telefonu cebine koyup geri dondugunde
 * ekran saatler oncesinin anlik goruntusunu gosteriyordu (acik antrenman dahil).
 *
 * `onlineManager` bilerek baglanmadi: NetInfo bagimliligi gerektirir, varsayilani zaten "cevrimici"
 * ve asil yeri cevrimdisi destegi (#174).
 */
export function odakDinleyicisiniKur(): void {
  focusManager.setEventListener((odagiBildir) => {
    const abonelik = AppState.addEventListener('change', (durum) => odagiBildir(durum === 'active'));
    return () => abonelik.remove();
  });
}
