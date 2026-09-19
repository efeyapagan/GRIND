import Constants from 'expo-constants';

const BACKEND_PORT = 5098;

/**
 * Telefon/simulator "localhost"u kendisi olarak anlar, Mac'i degil -- Expo'nun Metro dev
 * sunucusuna baglanmak icin zaten bildigi LAN IP'sini (`hostUri`) yeniden kullaniyoruz, ayri bir
 * .env veya elle IP girme adimi gerekmez. Prod derlemede `hostUri` olmaz; o zaman gercek API
 * adresi env degiskeniyle gelecek (Faz 3+ kapsaminda).
 */
function apiTabanUrlBul(): string {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:${BACKEND_PORT}/api`;
  }
  return `http://localhost:${BACKEND_PORT}/api`;
}

export const API_BASE_URL = apiTabanUrlBul();
