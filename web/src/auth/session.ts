/**
 * Oturum bilgisi localStorage'da tutulur (spec Karar 5). Token'in kendisi burada dogrulanmaz
 * (imza kontrolu backend'in isi) -- sadece son bilinen sona erme zamanina (`expiresAtUtc`)
 * bakilarak yerelde "gecerli mi" sorusuna hizlica cevap verilir, boylece suresi dolmus bir
 * token'la gereksiz bir 401 turu atilmaz.
 */

const DEPO_ANAHTARI = 'grind.oturum';

interface OturumVerisi {
  token: string;
  expiresAtUtc: string;
  username: string;
}

function guvenliOku(): OturumVerisi | null {
  const ham = localStorage.getItem(DEPO_ANAHTARI);
  if (!ham) {
    return null;
  }

  try {
    return JSON.parse(ham) as OturumVerisi;
  } catch {
    return null;
  }
}

export const session = {
  read(): OturumVerisi | null {
    return guvenliOku();
  },

  write(token: string, expiresAtUtc: string, username: string): void {
    const veri: OturumVerisi = { token, expiresAtUtc, username };
    localStorage.setItem(DEPO_ANAHTARI, JSON.stringify(veri));
  },

  clear(): void {
    localStorage.removeItem(DEPO_ANAHTARI);
  },

  isValid(): boolean {
    const veri = guvenliOku();
    if (!veri) {
      return false;
    }

    const sonaErme = new Date(veri.expiresAtUtc).getTime();
    return Number.isFinite(sonaErme) && sonaErme > Date.now();
  },
};
