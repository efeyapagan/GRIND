import { session } from '../auth/session';
import { parseProblem } from './problem';

// Dev'de Vite bu yolu proxy'ler (vite.config.ts), uretimde ayni origin varsayilir.
const TABAN_YOL = '/api';

let oturumDusurIsleyici: () => void = () => {};

/**
 * 401 artik "token suresi doldu" ya da "hesap pasiflestirildi" (Faz 13) anlamina gelebilir --
 * istemci ikisini ayirt etmez, ikisinin de cevabi ayni: oturumu dusur, giris ekranina don.
 * Task 3'teki AuthContext burayi kendi `logout`'uyla kaydeder; bu dosya sadece kaydi saglar.
 */
export function setUnauthorizedHandler(fn: () => void): void {
  oturumDusurIsleyici = fn;
}

export async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = init;

  const basliklar: Record<string, string> = { ...(headers as Record<string, string> | undefined) };

  if (rest.body !== undefined && rest.body !== null && !basliklar['Content-Type']) {
    basliklar['Content-Type'] = 'application/json';
  }

  if (auth) {
    const oturum = session.read();
    if (oturum) {
      basliklar.Authorization = `Bearer ${oturum.token}`;
    }
  }

  const yanit = await fetch(`${TABAN_YOL}${path}`, {
    ...rest,
    headers: basliklar,
  });

  if (!yanit.ok) {
    const govde = await govdeyiGuvenliOku(yanit);

    if (yanit.status === 401) {
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
