/**
 * Tema tercihi ve uygulanmasi (#178; acik-tema spec Karar 1 ve 4). Tercih CIHAZDA saklanir
 * (`localStorage`), sunucuya gitmez -- tema bir cihaz tercihidir ve `User` tablosuna yazilsaydi
 * acilista API yanitini bekleyen, yanip sonen bir tema olurdu.
 *
 * `data-theme` HER ZAMAN yazilir; "sistem" seciliyken bile cozulmus deger (`light`/`dark`) gider.
 * Boylece acik palet index.css'te TEK bir seciciyle tanimlanir, ayrica bir `prefers-color-scheme`
 * kopyasi tutulmaz (DRY).
 *
 * DIKKAT: `web/index.html`'deki satir ici script bu modulun kucuk bir onceden-calistirmasidir --
 * modul script'i `defer` oldugu icin ilk boyada temayi yazabilecek tek yer orasidir. Anahtar ve
 * renkler orada da yazili; biri degisirse digeri de degismeli (tema.test.ts bunu sabitler).
 */
export type TemaTercihi = 'sistem' | 'acik' | 'koyu';
export type EtkinTema = 'acik' | 'koyu';

export const TEMA_ANAHTARI = 'grind.tema';
export const ACIK_SORGUSU = '(prefers-color-scheme: light)';

/** `<meta name="theme-color">` degerleri: index.css'teki iki paletin `--color-bg` tokenlari. */
export const TEMA_RENKLERI: Record<EtkinTema, string> = {
  koyu: '#121316',
  acik: '#fdf8f6',
};

const TERCIHLER: readonly string[] = ['sistem', 'acik', 'koyu'];

export function tercihiOku(): TemaTercihi {
  const saklanan = localStorage.getItem(TEMA_ANAHTARI);
  return saklanan !== null && TERCIHLER.includes(saklanan) ? (saklanan as TemaTercihi) : 'sistem';
}

export function etkinTema(tercih: TemaTercihi, sistemAcik: boolean): EtkinTema {
  if (tercih === 'sistem') {
    return sistemAcik ? 'acik' : 'koyu';
  }
  return tercih;
}

export function temayiUygula(tema: EtkinTema): void {
  document.documentElement.dataset.theme = tema === 'acik' ? 'light' : 'dark';
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', TEMA_RENKLERI[tema]);
}

/** Saklanan tercihi ve sistem tercihini okuyup DOM'a uygular; etkin temayi dondurur. */
export function temayiTazele(): EtkinTema {
  const tema = etkinTema(tercihiOku(), window.matchMedia(ACIK_SORGUSU).matches);
  temayiUygula(tema);
  return tema;
}

export function tercihiDegistir(tercih: TemaTercihi): EtkinTema {
  localStorage.setItem(TEMA_ANAHTARI, tercih);
  return temayiTazele();
}

/**
 * Sistem temasi degisince ekrani cevirir (tercih "sistem" degilse tazeleme sonucu degismez).
 * Dinleyiciyi kaldiran temizleyiciyi dondurur.
 */
export function sistemDinleyicisiKur(): () => void {
  const sorgu = window.matchMedia(ACIK_SORGUSU);
  const tepki = () => {
    temayiTazele();
  };

  sorgu.addEventListener('change', tepki);
  return () => sorgu.removeEventListener('change', tepki);
}
