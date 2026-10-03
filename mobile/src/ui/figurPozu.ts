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
 * #604: `govde` cop adam cizgileri degil, kasli siluetin TEK dolu yoludur (boyun, V govde, omuzlar,
 * kollar, bacaklar). Her parca ayni yonde dolanir; `nonzero` dolguda ust uste binen parcalar
 * birlesir, delik acilmaz.
 */
export interface FigurPozu {
  bar: { x1: number; x2: number; y: number; plakali: boolean } | null;
  bas: Nokta;
  govde: string;
  eller: [Nokta, Nokta];
  agirliklar: Nokta[];
}

// Tum yardimcilar 'worklet': ayni hesap hem testte (JS) hem animasyonda (UI thread) calisir.

function ara(a: number, b: number, p: number): number {
  'worklet';
  return Math.round((a + (b - a) * p) * 10) / 10;
}

function nokta(a: Nokta, b: Nokta, p: number): Nokta {
  'worklet';
  return { x: ara(a.x, b.x, p), y: ara(a.y, b.y, p) };
}

/** Path metninde bir ondalik yeter; kisa metin her karede daha ucuz kurulur. */
function s(n: number): string {
  'worklet';
  return `${Math.round(n * 10) / 10}`;
}

/**
 * Bir uzuv (kol, bacak, boyun): `a`dan `b`ye uzanan, uclari yuvarlak, ortasi kasla siskin dolu sekil.
 * `ra`/`rb` uclardaki, `rm` ortadaki yari kalinlik. Hep "+n kenari ileri, -n kenari geri" dolanir --
 * gidis yonu ne olursa olsun tum parcalar ayni yonde kapanir.
 */
function uzuv(a: Nokta, b: Nokta, ra: number, rm: number, rb: number): string {
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

/**
 * V govde: omuz hizasinda (`ust`) genis, belde (`bel`) dar. Yanlar kanat kasi gibi hafif disari
 * bombeli, ust kenar trapez gibi boyna dogru kalkik. Uzuvla ayni dolanma yonu.
 */
function vGovde(ust: Nokta, bel: Nokta, omuzYari: number, belYari: number): string {
  'worklet';
  const dx = bel.x - ust.x;
  const dy = bel.y - ust.y;
  const boy = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / boy;
  const uy = dy / boy;
  const nx = -uy;
  const ny = ux;
  // Kanat kasinin en genis yeri govdenin ust ucte birinde.
  const kx = ust.x + ux * boy * 0.35;
  const ky = ust.y + uy * boy * 0.35;
  const kanat = omuzYari + 1;
  return (
    `M${s(ust.x + nx * omuzYari)} ${s(ust.y + ny * omuzYari)} ` +
    `Q${s(kx + nx * kanat)} ${s(ky + ny * kanat)} ${s(bel.x + nx * belYari)} ${s(bel.y + ny * belYari)} ` +
    `L${s(bel.x - nx * belYari)} ${s(bel.y - ny * belYari)} ` +
    `Q${s(kx - nx * kanat)} ${s(ky - ny * kanat)} ${s(ust.x - nx * omuzYari)} ${s(ust.y - ny * omuzYari)} ` +
    `Q${s(ust.x - ux * 4)} ${s(ust.y - uy * 4)} ${s(ust.x + nx * omuzYari)} ${s(ust.y + ny * omuzYari)} Z`
  );
}

/** Kaslarin yari kalinliklari: ucta (eklem) ince, ortada (kas karni) kalin. */
const KOL_UST = [4.5, 6, 3.5] as const;
const ON_KOL = [3.5, 4.5, 2.5] as const;
const UYLUK = [5.5, 6.5, 3.5] as const;
const BALDIR = [3.5, 4.5, 2.2] as const;
const DELTOID = 5.5;

interface Iskelet {
  boyun: Nokta;
  /** Govdenin ust (omuz hizasi) ve alt (bel) orta noktalari. */
  ust: Nokta;
  bel: Nokta;
  omuzYari: number;
  belYari: number;
  omuzlar: Nokta[];
  dirsekler: Nokta[];
  eller: Nokta[];
  kalcalar: Nokta[];
  dizler: Nokta[];
  ayaklar: Nokta[];
  /** Yandan cizilen figurde (squat) ayak ucu; onden cizilenlerde yok. */
  ayakUclari?: Nokta[];
}

/** Iskeletten kasli siluet: her parca ayri bir alt yol, hepsi tek `d`. */
function siluet(i: Iskelet, bas: Nokta): string {
  'worklet';
  const parcalar = [uzuv(bas, i.boyun, 3.5, 4, 5), vGovde(i.ust, i.bel, i.omuzYari, i.belYari)];
  for (let k = 0; k < i.kalcalar.length; k++) {
    parcalar.push(uzuv(i.kalcalar[k], i.dizler[k], UYLUK[0], UYLUK[1], UYLUK[2]));
    parcalar.push(uzuv(i.dizler[k], i.ayaklar[k], BALDIR[0], BALDIR[1], BALDIR[2]));
    if (i.ayakUclari) parcalar.push(uzuv(i.ayaklar[k], i.ayakUclari[k], 3, 3, 2));
  }
  for (let k = 0; k < i.omuzlar.length; k++) {
    parcalar.push(uzuv(i.omuzlar[k], i.dirsekler[k], KOL_UST[0], KOL_UST[1], KOL_UST[2]));
    parcalar.push(uzuv(i.dirsekler[k], i.eller[k], ON_KOL[0], ON_KOL[1], ON_KOL[2]));
    parcalar.push(daire(i.omuzlar[k], DELTOID));
  }
  return parcalar.join(' ');
}

/** Onden gorunen figurlerin ortak bacaklari: kalca, diz ve ayak `x`leri iki yana simetrik. */
function ondenBacaklar(kalcaY: number, dizY: number, ayakY: number) {
  'worklet';
  return {
    kalcalar: [{ x: 44, y: kalcaY }, { x: 56, y: kalcaY }],
    dizler: [{ x: 41, y: dizY }, { x: 59, y: dizY }],
    ayaklar: [{ x: 40, y: ayakY }, { x: 60, y: ayakY }],
  };
}

/** Push: overhead press -- bar basin ustunden omuz hizasina iner, kollar barla bukulur. */
function itis(p: number): FigurPozu {
  'worklet';
  const barY = ara(14, 26, p);
  const solEl = { x: 32, y: barY };
  const sagEl = { x: 68, y: barY };
  const bas = { x: 50, y: 32 };
  return {
    bar: { x1: 10, x2: 90, y: barY, plakali: true },
    bas,
    govde: siluet(
      {
        boyun: { x: 50, y: 44 },
        ust: { x: 50, y: 44 },
        bel: { x: 50, y: 68 },
        omuzYari: 13,
        belYari: 6.5,
        omuzlar: [{ x: 39, y: 47 }, { x: 61, y: 47 }],
        dirsekler: [nokta({ x: 30, y: 34 }, { x: 25, y: 43 }, p), nokta({ x: 70, y: 34 }, { x: 75, y: 43 }, p)],
        eller: [solEl, sagEl],
        ...ondenBacaklar(68, 82, 95),
      },
      bas,
    ),
    eller: [solEl, sagEl],
    agirliklar: [],
  };
}

/** Pull: barfiks -- govde asili hale iner, eller sabit barda kalir, dirsekler acilir. */
function cekis(p: number): FigurPozu {
  'worklet';
  // Govde noktasi `y`den asagi iner. Ayaklar viewBox'in altina tasmasin diye inis kisa (5 birim ~ 6 px).
  const in_ = (n: Nokta): Nokta => {
    'worklet';
    return { x: n.x, y: ara(n.y, n.y + 5, p) };
  };
  const solEl = { x: 34, y: 8 };
  const sagEl = { x: 66, y: 8 };
  const bas = in_({ x: 50, y: 22 });
  return {
    bar: { x1: 12, x2: 88, y: 8, plakali: false },
    bas,
    govde: siluet(
      {
        boyun: in_({ x: 50, y: 34 }),
        ust: in_({ x: 50, y: 34 }),
        bel: in_({ x: 50, y: 58 }),
        omuzYari: 13,
        belYari: 6.5,
        omuzlar: [in_({ x: 39, y: 37 }), in_({ x: 61, y: 37 })],
        dirsekler: [nokta({ x: 29, y: 26 }, { x: 33, y: 28 }, p), nokta({ x: 71, y: 26 }, { x: 67, y: 28 }, p)],
        eller: [solEl, sagEl],
        // Bacaklar barfikste dizden hafif bukuk, ayaklar arkaya toplanir.
        kalcalar: [in_({ x: 44, y: 58 }), in_({ x: 56, y: 58 })],
        dizler: [in_({ x: 41, y: 74 }), in_({ x: 59, y: 74 })],
        ayaklar: [in_({ x: 46, y: 89 }), in_({ x: 60, y: 87 })],
      },
      bas,
    ),
    eller: [solEl, sagEl],
    agirliklar: [],
  };
}

/** Legs: squat (yandan) -- ust govde (bar, bas, govde) kalcayla birlikte kalkar, diz acilir, ayak sabit. */
function squat(p: number): FigurPozu {
  'worklet';
  const kalk = (x: number, y: number): Nokta => {
    'worklet';
    return { x: ara(x, x + 6, p), y: ara(y, y - 8, p) };
  };
  const el = kalk(46, 30);
  const bar = kalk(22, 30);
  const bas = kalk(61, 17);
  const ayak = { x: 58, y: 93 };
  return {
    bar: { x1: bar.x, x2: ara(86, 92, p), y: bar.y, plakali: true },
    bas,
    govde: siluet(
      {
        boyun: kalk(57, 28),
        ust: kalk(54, 31),
        bel: kalk(42, 56),
        // Yandan: omuz hizasinda gogus + sirt kalinligi, belde karin.
        omuzYari: 9,
        belYari: 7,
        omuzlar: [kalk(54, 34)],
        dirsekler: [kalk(44, 42)],
        eller: [el],
        kalcalar: [kalk(40, 60)],
        dizler: [nokta({ x: 64, y: 66 }, { x: 57, y: 73 }, p)],
        ayaklar: [ayak],
        ayakUclari: [{ x: 66, y: 94 }],
      },
      bas,
    ),
    eller: [el, el],
    agirliklar: [],
  };
}

/** Other: iki kolla sirayla curl -- kivrik kol iner, duz kol kivrilir; dambil eli izler. */
function curl(p: number): FigurPozu {
  'worklet';
  const solEl = nokta({ x: 22, y: 36 }, { x: 28, y: 66 }, p);
  const sagEl = nokta({ x: 72, y: 66 }, { x: 78, y: 36 }, p);
  const bas = { x: 50, y: 16 };
  return {
    bar: null,
    bas,
    govde: siluet(
      {
        boyun: { x: 50, y: 28 },
        ust: { x: 50, y: 28 },
        bel: { x: 50, y: 58 },
        omuzYari: 13,
        belYari: 6.5,
        omuzlar: [{ x: 38, y: 31 }, { x: 62, y: 31 }],
        dirsekler: [{ x: 30, y: 49 }, { x: 70, y: 49 }],
        eller: [solEl, sagEl],
        ...ondenBacaklar(58, 76, 95),
      },
      bas,
    ),
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
