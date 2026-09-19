import { parseProblem } from './problem';

/**
 * Web `localStorage`, mobil `expo-secure-store` kullanacak -- bu dosya ikisini de bilmez, sadece
 * bu arayuzu bekler. Her platform kendi somut oturum modulunu `configureRequestClient` ile enjekte
 * eder (bkz. web/src/api/client.ts).
 */
export interface RequestSession {
  read(): { token: string } | null;
}

interface ClientConfig {
  baseUrl: string;
  session: RequestSession;
}

// Varsayilan: web'in bugunku davranisini (goreli "/api" yolu, oturum yok) korur -- hicbir
// platform `configureRequestClient` cagirmasa da testler/mevcut davranis bozulmaz.
let config: ClientConfig = {
  baseUrl: '/api',
  session: { read: () => null },
};

export function configureRequestClient(next: Partial<ClientConfig>): void {
  config = { ...config, ...next };
}

let oturumDusurIsleyici: () => void = () => {};

/**
 * 401 artik "token suresi doldu" ya da "hesap pasiflestirildi" (Faz 13) anlamina gelebilir --
 * istemci ikisini ayirt etmez, ikisinin de cevabi ayni: oturumu dusur, giris ekranina don.
 * AuthContext burayi kendi `logout`'uyla kaydeder; bu dosya sadece kaydi saglar.
 */
export function setUnauthorizedHandler(fn: () => void): void {
  oturumDusurIsleyici = fn;
}

export async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean; sifreTeyidi401?: boolean } = {},
): Promise<T> {
  const { auth = true, sifreTeyidi401 = false, headers, ...rest } = init;

  const basliklar: Record<string, string> = { ...(headers as Record<string, string> | undefined) };

  if (rest.body !== undefined && rest.body !== null && !basliklar['Content-Type']) {
    basliklar['Content-Type'] = 'application/json';
  }

  if (auth) {
    const oturum = config.session.read();
    if (oturum) {
      basliklar.Authorization = `Bearer ${oturum.token}`;
    }
  }

  const yanit = await fetch(`${config.baseUrl}${path}`, {
    ...rest,
    headers: basliklar,
  });

  if (!yanit.ok) {
    const govde = await govdeyiGuvenliOku(yanit);

    // `sifreTeyidi401`: profil guncelleme (issue #65) gibi "mevcut sifreni dogrula" uclarinda
    // 401, oturumun GECERSIZ oldugu anlamina gelmez -- kullanici sadece sifresini yanlis yazmistir.
    // Bunu genel oturum-dusurme isleyicisine (token suresi doldu/hesap pasif) karistirmak, bir
    // yazim hatasi icin kullaniciyi giris ekranina firlatirdi.
    if (yanit.status === 401 && !sifreTeyidi401) {
      // Once oturumu dusur, sonra hatayi firlat -- cagiran taraf hata yakalamayi unutsa bile
      // oturum durumu tutarli kalsin.
      oturumDusurIsleyici();
    }

    throw parseProblem(yanit.status, govde);
  }

  if (yanit.status === 204) {
    return undefined as T;
  }

  const metin = await yanit.text();
  if (!metin) {
    return undefined as T;
  }

  return JSON.parse(metin) as T;
}

async function govdeyiGuvenliOku(yanit: Response): Promise<unknown> {
  try {
    const metin = await yanit.text();
    if (!metin) {
      return null;
    }
    return JSON.parse(metin);
  } catch {
    return null;
  }
}
