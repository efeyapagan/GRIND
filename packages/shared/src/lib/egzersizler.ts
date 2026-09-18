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
export function egzersizAra(
  egzersizler: readonly Egzersiz[],
  sorgu: string,
  kategori: EgzersizKategorisi | null = null,
): Egzersiz[] {
  const aranan = aramaIcinSadelestir(sorgu.trim());
  return egzersizler.filter(
    (eg) =>
      (kategori === null || eg.category === kategori) &&
      (aranan === '' || aramaIcinSadelestir(eg.name).includes(aranan)),
  );
}
