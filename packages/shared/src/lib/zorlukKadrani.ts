import type { Zorluk } from '../api/queries';

/**
 * Zorluk kadraninin geometrisi (#182) -- web ve mobil kadran ayni hesabi kullanir. Kadran bir
 * "surat kadrani": alti acik 240°'lik bir yay; ilk kademe sol altta, orta kademe tepede, son kademe
 * sag altta. Acilar ekran koordinatinda (0° = sag, 90° = asagi; y asagi dogru artar).
 */

/** Kolaydan zora sirali -- kadranin durak sirasi ve artir/azalt yonu bu diziden gelir. */
export const ZORLUK_KADEMELERI: readonly Zorluk[] = ['VeryEasy', 'Easy', 'Medium', 'Hard', 'Maximal'];

/** Sol alt: 150°. Buradan saat yonunde (tepe uzerinden) sag alta, 390° ≡ 30°'ye kadar gider. */
const BASLANGIC_ACI = 150;
const YAY_ACISI = 240;
const ARALIK_ACI = YAY_ACISI / (ZORLUK_KADEMELERI.length - 1);

export function durakAcisi(sira: number): number {
  return BASLANGIC_ACI + sira * ARALIK_ACI;
}

function radyan(derece: number): number {
  return (derece * Math.PI) / 180;
}

/** Bir durağın (ya da yay ucunun) merkezinin koordinati. */
export function durakKonumu(sira: number, merkez: number, yaricap: number): { x: number; y: number } {
  const aci = radyan(durakAcisi(sira));
  return { x: merkez + yaricap * Math.cos(aci), y: merkez + yaricap * Math.sin(aci) };
}

/**
 * Merkeze gore (dx, dy) noktasindaki dokunusun yay uzerindeki SUREKLI konumu, durak biriminde
 * (0 = ilk durak, 4 = son durak; iki durak arasi ondalik) -- #388, cevirirken titresim bununla
 * olculur. Yayin altindaki bosluga dusen dokunus en yakin uca kirpilir: bosluk tam ortasindan
 * (en alttan) ikiye bolunur.
 */
export function yayKonumu(dx: number, dy: number): number {
  const dokunusAcisi = (Math.atan2(dy, dx) * 180) / Math.PI;
  const bastanAci = (((dokunusAcisi - BASLANGIC_ACI) % 360) + 360) % 360;
  if (bastanAci > YAY_ACISI) {
    return bastanAci < (YAY_ACISI + 360) / 2 ? ZORLUK_KADEMELERI.length - 1 : 0;
  }
  return bastanAci / ARALIK_ACI;
}

/**
 * Dokunusun acisina EN YAKIN durak -- parmagin yaya tam oturmasi gerekmez; alt bosluktaki dokunus
 * en yakin uca duser (`yayKonumu`).
 */
export function enYakinDurak(dx: number, dy: number): number {
  return Math.round(yayKonumu(dx, dy));
}

/** Iki durak arasindaki ince "tik" sayisi (#388). */
const INCE_ADIM_SAYISI = 4;

export type KadranTitresimi = 'tok' | 'ince' | null;

/**
 * Kadran `onceki`den `yeni` konuma (`yayKonumu`) cevrilince verilecek titresim (#388, "tiiiirt"):
 * secim yeni bir duraga oturduysa tok vurus, duraklar arasinda bir ince adim gecildiyse ince tik,
 * yoksa hic.
 */
export function kadranTitresimi(onceki: number, yeni: number): KadranTitresimi {
  if (Math.round(yeni) !== Math.round(onceki)) {
    return 'tok';
  }
  if (Math.round(yeni * INCE_ADIM_SAYISI) !== Math.round(onceki * INCE_ADIM_SAYISI)) {
    return 'ince';
  }
  return null;
}

/**
 * Ilk duraktan `sonSira`ya (varsayilan: son durak), tepe uzerinden giden yayin SVG yolu (web
 * `<path>` ve react-native-svg `Path`). Tam yay kadranin zemini; secili duraga kadar olani dolgusu
 * (#182, surat kadrani ibresi gibi).
 */
export function yayYolu(merkez: number, yaricap: number, sonSira = ZORLUK_KADEMELERI.length - 1): string {
  const bas = durakKonumu(0, merkez, yaricap);
  const son = durakKonumu(sonSira, merkez, yaricap);
  const buyukYay = sonSira * ARALIK_ACI > 180 ? 1 : 0;
  return `M ${bas.x} ${bas.y} A ${yaricap} ${yaricap} 0 ${buyukYay} 1 ${son.x} ${son.y}`;
}

/** Merkezden en alttaki (ilk ve son) duraklarin merkezine dikey mesafe -- kadran kutusunun yuksekligi icin. */
export function altDurakDerinligi(yaricap: number): number {
  return yaricap * Math.sin(radyan(durakAcisi(0)));
}
