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

/** Iki aci arasindaki en kisa mesafe (derece, 0–180). */
function aciFarki(a: number, b: number): number {
  const fark = (((a - b) % 360) + 360) % 360;
  return fark > 180 ? 360 - fark : fark;
}

/**
 * Merkeze gore (dx, dy) noktasindaki dokunusun acisina EN YAKIN durak -- parmagin yaya tam oturmasi
 * gerekmez. Yayin altindaki bosluga dokunus en yakin uca duser: bosluk iki ucun tam ortasinda
 * bolundugu icin cember uzerindeki en kisa mesafe bunu kendiliginden verir.
 */
export function enYakinDurak(dx: number, dy: number): number {
  const dokunusAcisi = (Math.atan2(dy, dx) * 180) / Math.PI;
  let enYakin = 0;
  for (let sira = 1; sira < ZORLUK_KADEMELERI.length; sira += 1) {
    if (aciFarki(dokunusAcisi, durakAcisi(sira)) < aciFarki(dokunusAcisi, durakAcisi(enYakin))) {
      enYakin = sira;
    }
  }
  return enYakin;
}

/** Ilk duraktan son duraga, tepe uzerinden giden yayin SVG yolu (web `<path>` ve react-native-svg `Path`). */
export function yayYolu(merkez: number, yaricap: number): string {
  const bas = durakKonumu(0, merkez, yaricap);
  const son = durakKonumu(ZORLUK_KADEMELERI.length - 1, merkez, yaricap);
  return `M ${bas.x} ${bas.y} A ${yaricap} ${yaricap} 0 1 1 ${son.x} ${son.y}`;
}

/** Merkezden en alttaki (ilk ve son) duraklarin merkezine dikey mesafe -- kadran kutusunun yuksekligi icin. */
export function altDurakDerinligi(yaricap: number): number {
  return yaricap * Math.sin(radyan(durakAcisi(0)));
}
