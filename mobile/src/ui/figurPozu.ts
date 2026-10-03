import type { EgzersizKategorisi } from '@grind/shared/api/queries';

export interface Nokta {
  x: number;
  y: number;
}

/**
 * #474: sablon kartindaki figurun bir karesi (viewBox 0–100). `bar` plakaliysa iki ucunda plaka cizilir
 * (Push/Legs); barfiks bari (Pull) duz cizgidir. `eller` barin ya da dambilin tutuldugu noktalar,
 * `agirliklar` dambillerin merkezi.
 *
 * #604: `govde` cop adam cizgileri degil, ince-atletik (lean) bir siluetin TEK dolu yoludur: ~7,5 bas
 * boyunda, omuz iki bas genisliginde, gogus ve kanat kasindan bele inen yumusak bir V. Her parca ayni
 * yonde dolanir; `nonzero` dolguda ust uste binen parcalar birlesir, delik acilmaz.
 */
export interface FigurPozu {
  bar: { x1: number; x2: number; y: number; plakali: boolean } | null;
  bas: Nokta;
  govde: string;
  eller: [Nokta, Nokta];
  agirliklar: Nokta[];
}

/** Basin yaricapi: gercekci oran icin govdeye gore kucuk (boy ~7,5 bas). */
export const BAS_YARICAPI = 4.8;

// Tum yardimcilar 'worklet': ayni hesap hem testte (JS) hem animasyonda (UI thread) calisir.

function ara(a: number, b: number, p: number): number {
  'worklet';
  return Math.round((a + (b - a) * p) * 10) / 10;
}

function nokta(a: Nokta, b: Nokta, p: number): Nokta {
  'worklet';
  return { x: ara(a.x, b.x, p), y: ara(a.y, b.y, p) };
}

/** `n`den `aci` derece yonunde (ekran: 0 sag, -90 yukari) `boy` uzaklikta nokta. */
function uc(n: Nokta, aci: number, boy: number): Nokta {
  'worklet';
  const r = (aci * Math.PI) / 180;
  return { x: n.x + Math.cos(r) * boy, y: n.y + Math.sin(r) * boy };
}

/** Path metninde bir ondalik yeter; kisa metin her karede daha ucuz kurulur. */
function s(n: number): string {
  'worklet';
  return `${Math.round(n * 10) / 10}`;
}

function xy(n: Nokta): string {
  'worklet';
  return `${s(n.x)} ${s(n.y)}`;
}

/**
 * Bir uzuv (kol, bacak, boyun): `a`dan `b`ye uzanan, uclari yuvarlak, ortasi hafif kasli dolu sekil.
 * `ra`/`rb` uclardaki, `rm` ortadaki yari kalinlik. Hep "+n kenari ileri, -n kenari geri" dolanir --
 * gidis yonu ne olursa olsun tum parcalar ayni yonde kapanir.
 */
function uzuv(a: Nokta, b: Nokta, [ra, rm, rb]: readonly [number, number, number]): string {
  'worklet';
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const boy = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / boy;
  const ny = dx / boy;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  // Ikinci derece egrinin ortasi uc noktalar ile kontrol noktasinin ortalamasidir: ortada `rm` icin.
  const k = 2 * rm - (ra + rb) / 2;
  return (
    `M${s(a.x + nx * ra)} ${s(a.y + ny * ra)} ` +
    `Q${s(mx + nx * k)} ${s(my + ny * k)} ${s(b.x + nx * rb)} ${s(b.y + ny * rb)} ` +
    `A${s(rb)} ${s(rb)} 0 0 0 ${s(b.x - nx * rb)} ${s(b.y - ny * rb)} ` +
    `Q${s(mx - nx * k)} ${s(my - ny * k)} ${s(a.x - nx * ra)} ${s(a.y - ny * ra)} ` +
    `A${s(ra)} ${s(ra)} 0 0 0 ${s(a.x + nx * ra)} ${s(a.y + ny * ra)} Z`
  );
}

/** Deltoid: omuz ekleminde yuvarlak kas; uzuvlarla ayni yonde dolanan daire. */
function daire(m: Nokta, r: number): string {
  'worklet';
  return `M${s(m.x - r)} ${s(m.y)} A${s(r)} ${s(r)} 0 1 0 ${s(m.x + r)} ${s(m.y)} A${s(r)} ${s(r)} 0 1 0 ${s(m.x - r)} ${s(m.y)} Z`;
}

/** Noktalardan yumusak kenar: ic noktalar kontrol, aralarindaki orta noktalar egrinin uzerinde. */
function yumusak(noktalar: Nokta[]): string {
  'worklet';
  let d = '';
  for (let i = 1; i < noktalar.length - 1; i++) {
    const son = i === noktalar.length - 2;
    const sonraki = son
      ? noktalar[i + 1]
      : { x: (noktalar[i].x + noktalar[i + 1].x) / 2, y: (noktalar[i].y + noktalar[i + 1].y) / 2 };
    d += `Q${xy(noktalar[i])} ${xy(sonraki)} `;
  }
  return d;
}

/**
 * Govde profili: omuz hizasindan (t=0) kasiga (t=1) her satir `[t, +n yari genislik, -n yari genislik]`.
 * Onden simetrik; yandan (squat, yuzu saga) +n sirt, -n gogus tarafidir.
 */
type Profil = readonly (readonly [number, number, number])[];

/** Onden: omuz, gogus/kanat kasi, ince bel, hafif kalca. */
const ON_PROFIL: Profil = [
  [0, 7.6, 7.6],
  [0.1, 8.6, 8.6],
  [0.3, 7.6, 7.6],
  [0.55, 5.6, 5.6],
  [0.8, 5.4, 5.4],
  [1, 3.6, 3.6],
];

/** Yandan: one cikan gogus, duz karin, arkada kalca. */
const YAN_PROFIL: Profil = [
  [0, 4.4, 4.8],
  [0.15, 4.8, 6.2],
  [0.4, 4.4, 4.9],
  [0.65, 4.1, 4.2],
  [0.85, 5.6, 4.3],
  [1, 4.4, 4],
];

/** Govde: `ust` (omuz hizasi ortasi) ile `alt` (kasik) arasinda profile gore; ust kenar trapez gibi boyna kalkar. */
function govdeYolu(ust: Nokta, alt: Nokta, profil: Profil): string {
  'worklet';
  const dx = alt.x - ust.x;
  const dy = alt.y - ust.y;
  const boy = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / boy;
  const uy = dy / boy;
  const nx = -uy;
  const ny = ux;
  const arti: Nokta[] = [];
  const eksi: Nokta[] = [];
  for (let i = 0; i < profil.length; i++) {
    const [t, wa, we] = profil[i];
    const cx = ust.x + ux * boy * t;
    const cy = ust.y + uy * boy * t;
    arti.push({ x: cx + nx * wa, y: cy + ny * wa });
    eksi.unshift({ x: cx - nx * we, y: cy - ny * we });
  }
  const trapez = { x: ust.x - ux * 2.5, y: ust.y - uy * 2.5 };
  return `M${xy(arti[0])} ${yumusak(arti)}L${xy(eksi[0])} ${yumusak(eksi)}Q${xy(trapez)} ${xy(arti[0])} Z`;
}

/** Yari kalinliklar `[eklem, kas karni, eklem]`: ince ama sekilli. */
const BOYUN = [1.9, 2.1, 2.6] as const;
const KOL_UST = [2.6, 3.2, 2] as const;
const ON_KOL = [2.1, 2.5, 1.5] as const;
const UYLUK = [2.9, 3.3, 2.1] as const;
const BALDIR = [2.1, 2.5, 1.3] as const;
const AYAK = [1.6, 1.6, 1.2] as const;
const DELTOID = 3.4;

interface Iskelet {
  bas: Nokta;
  /** Govdenin ust (omuz hizasi) ve alt (kasik) orta noktalari. */
  ust: Nokta;
  alt: Nokta;
  profil: Profil;
  omuzlar: Nokta[];
  dirsekler: Nokta[];
  eller: Nokta[];
  kalcalar: Nokta[];
  dizler: Nokta[];
  ayaklar: Nokta[];
  /** Yandan cizilen figurde (squat) ayak ucu; onden cizilenlerde yok. */
  ayakUclari?: Nokta[];
}

/** Iskeletten siluet: her parca ayri bir alt yol, hepsi tek `d`. */
function siluet(i: Iskelet): string {
  'worklet';
  const parcalar = [uzuv(i.bas, i.ust, BOYUN), govdeYolu(i.ust, i.alt, i.profil)];
  for (let k = 0; k < i.kalcalar.length; k++) {
    parcalar.push(uzuv(i.kalcalar[k], i.dizler[k], UYLUK));
    parcalar.push(uzuv(i.dizler[k], i.ayaklar[k], BALDIR));
    if (i.ayakUclari) parcalar.push(uzuv(i.ayaklar[k], i.ayakUclari[k], AYAK));
  }
  for (let k = 0; k < i.omuzlar.length; k++) {
    parcalar.push(uzuv(i.omuzlar[k], i.dirsekler[k], KOL_UST));
    parcalar.push(uzuv(i.dirsekler[k], i.eller[k], ON_KOL));
    parcalar.push(daire(i.omuzlar[k], DELTOID));
  }
  return parcalar.join(' ');
}

/**
 * Onden, omuz hizasi `y` olan figurun basi, govdesi ve bacaklari. Oranlar: boyun+bas 7,5, govde 24,
 * uyluk 18,5, baldir 17,5 -- toplam ~7,5 bas, bacak boyun yarisi. Uyluklar arasinda bosluk kalir.
 */
function onden(y: number) {
  'worklet';
  return {
    bas: { x: 50, y: y - 7.5 },
    ust: { x: 50, y },
    alt: { x: 50, y: y + 24 },
    profil: ON_PROFIL,
    omuzlar: [{ x: 42, y: y + 1.5 }, { x: 58, y: y + 1.5 }],
    kalcalar: [{ x: 46, y: y + 22 }, { x: 54, y: y + 22 }],
    dizler: [{ x: 45.6, y: y + 40.5 }, { x: 54.4, y: y + 40.5 }],
    ayaklar: [{ x: 45, y: y + 58 }, { x: 55, y: y + 58 }],
  };
}

/** Push: overhead press -- bar basin ustunden alin hizasina iner, dirsekler yana acilir. */
function itis(p: number): FigurPozu {
  'worklet';
  const barY = ara(14, 24, p);
  const solEl = { x: 35, y: barY };
  const sagEl = { x: 65, y: barY };
  const govde = onden(37);
  return {
    bar: { x1: 10, x2: 90, y: barY, plakali: true },
    bas: govde.bas,
    govde: siluet({
      ...govde,
      dirsekler: [nokta({ x: 38, y: 27 }, { x: 30, y: 34 }, p), nokta({ x: 62, y: 27 }, { x: 70, y: 34 }, p)],
      eller: [solEl, sagEl],
    }),
    eller: [solEl, sagEl],
    agirliklar: [],
  };
}

/** Pull: barfiks -- ustte bas bara yakin, asagida kollar uzanir; eller barda sabit. */
function cekis(p: number): FigurPozu {
  'worklet';
  const solEl = { x: 35, y: 8 };
  const sagEl = { x: 65, y: 8 };
  const govde = onden(ara(23, 30, p));
  return {
    bar: { x1: 12, x2: 88, y: 8, plakali: false },
    bas: govde.bas,
    govde: siluet({
      ...govde,
      dirsekler: [nokta({ x: 31, y: 18 }, { x: 37, y: 20 }, p), nokta({ x: 69, y: 18 }, { x: 63, y: 20 }, p)],
      eller: [solEl, sagEl],
    }),
    eller: [solEl, sagEl],
    agirliklar: [],
  };
}

/**
 * Legs: squat (yandan, yuzu saga) -- dipten kalkar. Eklemler ACIyla hareket eder: noktalar dogrusal
 * kaydirilsaydi hareketin ortasinda uyluk ve govde kisalirdi.
 */
function squat(p: number): FigurPozu {
  'worklet';
  const ayak = { x: 54, y: 93 };
  const diz = uc(ayak, ara(-60, -88, p), 17);
  const kalca = uc(diz, ara(180, 265, p), 18);
  const omuz = uc(kalca, ara(-55, -85, p), 26);
  const bas = uc(omuz, ara(-60, -80, p), 7.5);
  // Bar sirtin ustunde, omzun biraz arkasinda; el bari omuz yaninda tutar.
  const barX = omuz.x - 1.5;
  const barY = Math.round((omuz.y - 1.5) * 10) / 10;
  const el = { x: barX + 2, y: barY };
  return {
    bar: { x1: barX - 32, x2: barX + 32, y: barY, plakali: true },
    bas,
    govde: siluet({
      bas,
      ust: omuz,
      alt: kalca,
      profil: YAN_PROFIL,
      omuzlar: [omuz],
      dirsekler: [{ x: omuz.x - 6, y: omuz.y + 6 }],
      eller: [el],
      kalcalar: [kalca],
      dizler: [diz],
      ayaklar: [ayak],
      ayakUclari: [{ x: 62, y: 94 }],
    }),
    eller: [el, el],
    agirliklar: [],
  };
}

/** Other: iki kolla sirayla curl -- kivrik kol iner, duz kol kivrilir; dambil eli izler. */
function curl(p: number): FigurPozu {
  'worklet';
  const govde = onden(31);
  const solEl = nokta({ x: 35, y: 35 }, { x: 38, y: 58 }, p);
  const sagEl = nokta({ x: 62, y: 58 }, { x: 65, y: 35 }, p);
  return {
    bar: null,
    bas: govde.bas,
    govde: siluet({
      ...govde,
      dirsekler: [{ x: 38.5, y: 45.5 }, { x: 61.5, y: 45.5 }],
      eller: [solEl, sagEl],
    }),
    eller: [solEl, sagEl],
    agirliklar: [solEl, sagEl],
  };
}

/** #474: `p` 0 (baslangic, "hareketi azalt" acikken duran kare) ile 1 (hareketin oteki ucu) arasi. */
export function figurPozu(kategori: EgzersizKategorisi, p: number): FigurPozu {
  'worklet';
  if (kategori === 'Push') return itis(p);
  if (kategori === 'Pull') return cekis(p);
  if (kategori === 'Legs') return squat(p);
  return curl(p);
}
