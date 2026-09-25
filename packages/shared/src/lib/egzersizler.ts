import type { Egzersiz, EgzersizKategorisi } from '../api/queries';

/** Egzersiz secim listeleri Turkce alfabetik siradadir (Bugun paneli, sablon duzenleyici). */
export function adaGoreSirala(egzersizler: readonly Egzersiz[]): Egzersiz[] {
  return [...egzersizler].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

/**
 * Turkce harfleri ASCII karsiliklarina indirger ve kucultur. Arama BU sadelestirilmis
 * bicim uzerinden yapilir.
 *
 * DIKKAT -- `toLocaleLowerCase('tr')` KULLANILMAZ: Turkce yerelde 'I' harfi 'ı'ya duser, yani
 * "incline" yazan biri "Incline Dumbbell Press"i BULAMAZDI (hareket adlarinin cogu Ingilizce).
 * Aramanin isi dogru dil kurallarini uygulamak degil, kullanicinin yazdigini BULMAK: i/ı/İ/I
 * hepsi ayni kovaya girer, ş/s, ğ/g, ü/u, ö/o, ç/c de oyle. Boylece "sirt" yazan "Sırt"i,
 * "ıncline" yazan "Incline"i bulur.
 */
const SADELESTIRME: Record<string, string> = {
  İ: 'i',
  I: 'i',
  ı: 'i',
  Ş: 's',
  ş: 's',
  Ğ: 'g',
  ğ: 'g',
  Ü: 'u',
  ü: 'u',
  Ö: 'o',
  ö: 'o',
  Ç: 'c',
  ç: 'c',
};

export function aramaIcinSadelestir(metin: string): string {
  return [...metin].map((harf) => SADELESTIRME[harf] ?? harf).join('').toLowerCase();
}

/**
 * Isimde GECEN (bastan eslesme sarti yok) hareketleri dondurur; bos sorgu listenin tamamidir.
 * Arama ISTEMCIDE yapilir: havuz birkac duzine satir (15 global + kullanicinin kendi hareketleri,
 * #49 ile ~65), tamami zaten TEK bir istekle cekiliyor. Sunucuya gitmek her tus vurusunda bir
 * istek demekti ve liste yuzlerce satira cikmadan bunun karsiligi yok (PLAN.md, "Gercek
 * Kullanimdan Gelen Istekler"). Kategori (#77) verilirse ayni gerekceyle istemcide, aramayla
 * birlikte (VE) uygulanir; `null` tum kategorilerdir.
 */
/** Bir hareketin ADI ve varsa TAKMA ADI arama için tek bir metin havuzunda birleşir (#335). */
function aramaAdaylari(eg: Egzersiz): string[] {
  return eg.alternateName ? [eg.name, eg.alternateName] : [eg.name];
}

export function egzersizAra(
  egzersizler: readonly Egzersiz[],
  sorgu: string,
  kategori: EgzersizKategorisi | null = null,
): Egzersiz[] {
  const aranan = aramaIcinSadelestir(sorgu.trim());
  return egzersizler.filter(
    (eg) =>
      (kategori === null || eg.category === kategori) &&
      (aranan === '' ||
        aramaAdaylari(eg).some((ad) => aramaIcinSadelestir(ad).includes(aranan))),
  );
}

/** Oneri sayisi tavani: "Bunu mu demek istediniz?" altinda uzun bir liste aramanin yerini tutmaz. */
const ONERI_TAVANI = 3;

/**
 * Sorgunun uzunluguna gore kabul edilen hata sayisi. Kisa sorguda tek hata bile neredeyse her ada
 * uyar: 2 harf ve altinda oneri yok, 3-4 harfte 1, daha uzunlarda 2 hata.
 */
function hataEsigi(uzunluk: number): number {
  if (uzunluk <= 2) {
    return -1;
  }
  return uzunluk <= 4 ? 1 : 2;
}

/**
 * Sorgunun metnin ICINDEKI en iyi uyan parcaya uzakligi (Sellers yontemi): metnin basindaki ve
 * sonundaki fazlalik ucretsizdir, boylece "nench press" "Incline Bench Press"e 1 hata uzaktir.
 * Bir harfi eklemek, silmek, degistirmek ve yan yana iki harfi yer degistirmek (OSA) birer hatadir
 * -- yer degistirme parmak kaymasinin en sik bicimi ("bnech").
 */
function parcaMesafesi(sorgu: string, metin: string): number {
  const m = sorgu.length;
  const n = metin.length;
  // d[i][j]: sorgunun ilk i harfinin, metinde j'de BITEN bir parcaya uzakligi.
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => Array<number>(n + 1).fill(i));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const fark = sorgu[i - 1] === metin[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + fark);
      if (i > 1 && j > 1 && sorgu[i - 1] === metin[j - 2] && sorgu[i - 2] === metin[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return Math.min(...d[m]);
}

/**
 * Arama bos donunce gosterilecek "Bunu mu demek istediniz?" onerileri (#231): esik icinde kalan en
 * fazla 3 hareket, once en az hatali. Esitlikte adi sorguya uzunlukca en yakin olan once gelir:
 * gercek havuzda "... Bench Press" varyantlari coktur ve hepsi 1 hata alir, "nench press" yazan
 * duz Bench Press'i ariyordur. Kalan esitlikte Turkce alfabetik. Kategori `egzersizAra` ile ayni
 * sekilde uygulanir. Hesap istemcide: havuz birkac duzine satir, her adla karsilastirmak bir
 * milisaniyenin cok altinda (bkz. `egzersizAra`).
 */
export function egzersizOner(
  egzersizler: readonly Egzersiz[],
  sorgu: string,
  kategori: EgzersizKategorisi | null = null,
): Egzersiz[] {
  const aranan = aramaIcinSadelestir(sorgu.trim());
  const esik = hataEsigi(aranan.length);
  return egzersizler
    .filter((eg) => kategori === null || eg.category === kategori)
    .map((eg) => {
      // #335: takma ad varsa ikisinden DAHA İYİ (az hatalı) olan kazanır -- kullanıcı hangi
      // isimle yazarsa yazsın aynı öneri kalitesini alır.
      const adaylar = aramaAdaylari(eg).map((ad) => aramaIcinSadelestir(ad));
      const enIyi = adaylar
        .map((ad) => ({ hata: parcaMesafesi(aranan, ad), fark: Math.abs(ad.length - aranan.length) }))
        .sort((a, b) => a.hata - b.hata || a.fark - b.fark)[0];
      return { eg, hata: enIyi.hata, fark: enIyi.fark };
    })
    .filter(({ hata }) => hata <= esik)
    .sort((a, b) => a.hata - b.hata || a.fark - b.fark || a.eg.name.localeCompare(b.eg.name, 'tr'))
    .slice(0, ONERI_TAVANI)
    .map(({ eg }) => eg);
}
