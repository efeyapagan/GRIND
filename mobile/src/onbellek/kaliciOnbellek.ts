import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

/** Diskteki onbellek bu sureden eskiyse geri yuklenmez; `gcTime` da buna esitlenir (bkz. _layout). */
export const ONBELLEK_OMRU_MS = 7 * 24 * 60 * 60 * 1000;

/** Sunucu verisinin bicimi kirici sekilde degisirse artirilir: eski onbellek hic geri yuklenmez. */
const ONBELLEK_SURUMU = '1';

/** #174: onbellek kullaniciya baglidir; kullanici adi buyuk-kucuk harfe duyarsizdir (sunucudaki gibi). */
export function onbellekAnahtari(kullaniciAdi: string): string {
  return `grind.sorgular.${kullaniciAdi.toLowerCase()}`;
}

function kaliciDepo(kullaniciAdi: string) {
  return createAsyncStoragePersister({ storage: AsyncStorage, key: onbellekAnahtari(kullaniciAdi) });
}

/**
 * #174: kullanicinin diskteki onbellegini istemciye geri yukler ve sonraki degisiklikleri diske yazar.
 * `durdur` yazmayi keser (cikista, kullanici degisince). Diske yazma ancak `geriYuklendi` cozulunce
 * baslar: geri yuklemeden once degisen veri diske gitmez, sonraki ilk degisiklikle yazilir.
 */
export function kaliciOnbellegiBaslat(
  queryClient: QueryClient,
  kullaniciAdi: string,
): { durdur: () => void; geriYuklendi: Promise<void> } {
  const [durdur, geriYuklendi] = persistQueryClient({
    queryClient,
    persister: kaliciDepo(kullaniciAdi),
    maxAge: ONBELLEK_OMRU_MS,
    buster: ONBELLEK_SURUMU,
  });
  return { durdur, geriYuklendi };
}

/** #174: cikista kullanicinin diskteki onbellegi silinir -- paylasilan cihazda baska hesap gormesin. */
export async function kaliciOnbellegiSil(kullaniciAdi: string): Promise<void> {
  await AsyncStorage.removeItem(onbellekAnahtari(kullaniciAdi));
}
