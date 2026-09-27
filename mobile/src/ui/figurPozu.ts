import type { EgzersizKategorisi } from '@grind/shared/api/queries';

export interface Nokta {
  x: number;
  y: number;
}

/**
 * #474: sablon kartindaki figurun bir karesi (viewBox 0–100). `bar` plakaliysa iki ucunda plaka cizilir
 * (Push/Legs); barfiks bari (Pull) duz cizgidir. `eller` barin ya da dambilin tutuldugu noktalar,
 * `agirliklar` dambillerin merkezi.
 */
export interface FigurPozu {
  bar: { x1: number; x2: number; y: number; plakali: boolean } | null;
  bas: Nokta;
  govde: string;
  kollar: string;
  eller: [Nokta, Nokta];
  agirliklar: Nokta[];
}

// Tum yardimcilar 'worklet': ayni hesap hem testte (JS) hem animasyonda (UI thread) calisir.

function ara(a: number, b: number, p: number): number {
  'worklet';
  // Bir ondalik: p=0'da tam sayilar oldugu gibi yazilir, path metni bugunku cizimle birebir kalir.
  return Math.round((a + (b - a) * p) * 10) / 10;
}

function nokta(a: Nokta, b: Nokta, p: number): Nokta {
  'worklet';
  return { x: ara(a.x, b.x, p), y: ara(a.y, b.y, p) };
}

/** Bir ya da daha fazla kirik cizgi: her dizi "M ilk L ikinci L ..." olur. */
function yol(...cizgiler: Nokta[][]): string {
  'worklet';
  return cizgiler
    .map((noktalar) => noktalar.map((n, i) => `${i === 0 ? 'M' : 'L'}${n.x} ${n.y}`).join(' '))
    .join(' ');
}

/** Push: overhead press -- bar basin ustunden omuz hizasina iner, kollar barla bukulur. */
function itis(p: number): FigurPozu {
  'worklet';
  const barY = ara(14, 26, p);
  const solEl = { x: 32, y: barY };
  const sagEl = { x: 68, y: barY };
  return {
    bar: { x1: 10, x2: 90, y: barY, plakali: true },
    bas: { x: 50, y: 32 },
    govde: yol([{ x: 50, y: 44 }, { x: 50, y: 70 }], [{ x: 50, y: 70 }, { x: 40, y: 96 }], [{ x: 50, y: 70 }, { x: 60, y: 96 }]),
    kollar: yol(
      [{ x: 44, y: 46 }, nokta({ x: 32, y: 32 }, { x: 26, y: 40 }, p), solEl],
      [{ x: 56, y: 46 }, nokta({ x: 68, y: 32 }, { x: 74, y: 40 }, p), sagEl],
    ),
    eller: [solEl, sagEl],
    agirliklar: [],
  };
}

/** Pull: barfiks -- govde asili hale iner, eller sabit barda kalir, dirsekler acilir. */
function cekis(p: number): FigurPozu {
  'worklet';
  // Govde noktasi `y`den asagi iner. Ayaklar viewBox'in altina tasmasin diye inis kisa (5 birim ~ 6 px).
  const in_ = (x: number, y: number): Nokta => {
    'worklet';
    return { x, y: ara(y, y + 5, p) };
  };
  const solEl = { x: 34, y: 8 };
  const sagEl = { x: 66, y: 8 };
  return {
    bar: { x1: 12, x2: 88, y: 8, plakali: false },
    bas: in_(50, 24),
    govde: yol([in_(50, 36), in_(50, 64)], [in_(50, 64), in_(42, 80), in_(48, 94)], [in_(50, 64), in_(58, 80), in_(64, 92)]),
    kollar: yol(
      [in_(44, 38), nokta({ x: 32, y: 28 }, { x: 38, y: 26 }, p), solEl],
      [in_(56, 38), nokta({ x: 68, y: 28 }, { x: 62, y: 26 }, p), sagEl],
    ),
    eller: [solEl, sagEl],
    agirliklar: [],
  };
}

/** Legs: squat -- ust govde (bar, bas, govde) kalcayla birlikte kalkar, diz acilir, ayak sabit. */
function squat(p: number): FigurPozu {
  'worklet';
  const kalk = (x: number, y: number): Nokta => {
    'worklet';
    return { x: ara(x, x + 6, p), y: ara(y, y - 8, p) };
  };
  const el = kalk(46, 30);
  const kalca = kalk(40, 60);
  const bar = kalk(22, 30);
  return {
    bar: { x1: bar.x, x2: ara(86, 92, p), y: bar.y, plakali: true },
    bas: kalk(60, 16),
    govde: yol([kalk(56, 30), kalca], [kalca, nokta({ x: 64, y: 66 }, { x: 56, y: 72 }, p), { x: 58, y: 94 }]),
    kollar: yol([kalk(52, 36), el]),
    eller: [el, el],
    agirliklar: [],
  };
}

/** Other: iki kolla sirayla curl -- kivrik kol iner, duz kol kivrilir; dambil eli izler. */
function curl(p: number): FigurPozu {
  'worklet';
  const solEl = nokta({ x: 28, y: 36 }, { x: 34, y: 66 }, p);
  const sagEl = nokta({ x: 64, y: 64 }, { x: 72, y: 36 }, p);
  return {
    bar: null,
    bas: { x: 50, y: 16 },
    govde: yol([{ x: 50, y: 28 }, { x: 50, y: 62 }], [{ x: 50, y: 62 }, { x: 42, y: 94 }], [{ x: 50, y: 62 }, { x: 58, y: 94 }]),
    kollar: yol([{ x: 46, y: 32 }, { x: 36, y: 50 }, solEl], [{ x: 54, y: 32 }, { x: 62, y: 50 }, sagEl]),
    eller: [solEl, sagEl],
    agirliklar: [solEl, sagEl],
  };
}

/** #474: `p` 0 (baslangic, bugunku sabit cizim) ile 1 (hareketin oteki ucu) arasi. */
export function figurPozu(kategori: EgzersizKategorisi, p: number): FigurPozu {
  'worklet';
  if (kategori === 'Push') return itis(p);
  if (kategori === 'Pull') return cekis(p);
  if (kategori === 'Legs') return squat(p);
  return curl(p);
}
