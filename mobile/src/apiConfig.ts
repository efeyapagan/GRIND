import Constants from 'expo-constants';

const BACKEND_PORT = 5098;

/**
 * Telefon/simulator "localhost"u kendisi olarak anlar, Mac'i degil -- Expo'nun Metro dev
 * sunucusuna baglanmak icin zaten bildigi LAN IP'sini (`hostUri`) yeniden kullaniyoruz, ayri bir
 * .env veya elle IP girme adimi gerekmez. `expo start --tunnel` ile evden uzakta calisirken
 * `hostUri` Metro tunelini gosterir ve backend'e ulasmaz; o zaman backend'i acan tunelin adresi
 * `EXPO_PUBLIC_API_URL` ile verilir (#249). Prod derlemede de gercek API adresi buradan gelir.
 */
export function apiTabanUrlBul(envUrl: string | undefined, hostUri: string | undefined): string {
  if (envUrl) return envUrl;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:${BACKEND_PORT}/api`;
  }
  return `http://localhost:${BACKEND_PORT}/api`;
}

// Expo EXPO_PUBLIC_* degiskenlerini yalnizca dogrudan `process.env.X` erisiminde derlemeye gomer.
export const API_BASE_URL = apiTabanUrlBul(
  process.env.EXPO_PUBLIC_API_URL,
  Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.hostUri,
);
