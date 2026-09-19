import * as SecureStore from 'expo-secure-store';

const DEPO_ANAHTARI = 'grind.oturum';

interface OturumVerisi {
  token: string;
  expiresAtUtc: string;
  username: string;
}

/**
 * expo-secure-store ASENKRON (web'in localStorage'inin aksine) -- ama paylasilan `client.ts`
 * (@grind/shared) `session.read()`i SENKRON cagirir (her istekte await edilmeyecek kadar sik).
 * Cozum: bellekte SENKRON okunabilen bir kopya tutulur; SecureStore sadece kalicilik icin
 * (uygulama acilisinda `hydrate()`, degisiklikte write/clear) kullanilir -- RN'de yaygin desen.
 */
let bellekOturum: OturumVerisi | null = null;

export const session = {
  read(): OturumVerisi | null {
    return bellekOturum;
  },
  async hydrate(): Promise<void> {
    const ham = await SecureStore.getItemAsync(DEPO_ANAHTARI);
    bellekOturum = ham ? (JSON.parse(ham) as OturumVerisi) : null;
  },
  async write(token: string, expiresAtUtc: string, username: string): Promise<void> {
    bellekOturum = { token, expiresAtUtc, username };
    await SecureStore.setItemAsync(DEPO_ANAHTARI, JSON.stringify(bellekOturum));
  },
  async clear(): Promise<void> {
    bellekOturum = null;
    await SecureStore.deleteItemAsync(DEPO_ANAHTARI);
  },
  isValid(): boolean {
    return bellekOturum !== null && new Date(bellekOturum.expiresAtUtc).getTime() > Date.now();
  },
};
