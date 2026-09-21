import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Zorluk } from '../api/queries';
import {
  altDurakDerinligi,
  durakKonumu,
  enYakinDurak,
  yayYolu,
  ZORLUK_KADEMELERI,
} from '../lib/zorlukKadrani';

interface Props {
  deger: Zorluk;
  onDegis: (zorluk: Zorluk) => void;
}

const GENISLIK = 280;
const MERKEZ = GENISLIK / 2;
const YAY_YARICAP = 112;
const YAY_KALINLIK = 22;
const DURAK_YARICAP = 22;
/** Yay alti acik: kutu, en alttaki duraklarin bittigi yerde biter (tam kare degil). */
const YUKSEKLIK = MERKEZ + altDurakDerinligi(YAY_YARICAP) + DURAK_YARICAP + 2;

/**
 * Antrenman zorlugunun bes durakli surat kadrani (#182, #153'un web yarisi). Mobildeki kadranla ayni
 * geometriyi kullanir (`lib/zorlukKadrani`): 1 sol altta, 5 sag altta. Secim uc yoldan yapilir --
 * yayi surukleyerek (isaretcinin acisina en yakin durak), bir duraga tiklayarak ya da klavyeyle
 * (`role="slider"`: oklar, Home/End). Ucu de ayni `sirayiSec`e baglanir (DRY).
 *
 * Kontrollu bilesen: secili kademeyi kendisi TUTMAZ, `deger` ile alir. Secili durak `accent` alir
 * (gercek bir "secili" hal -- spec Karar 2), digerleri `surface-4`te durur.
 */
export default function ZorlukKadrani({ deger, onDegis }: Props) {
  const { t } = useTranslation();
  const surukleniyor = useRef(false);
  const seciliSira = Math.max(0, ZORLUK_KADEMELERI.indexOf(deger));
  const secili = ZORLUK_KADEMELERI[seciliSira];

  function sirayiSec(sira: number) {
    if (sira >= 0 && sira < ZORLUK_KADEMELERI.length && sira !== seciliSira) {
      onDegis(ZORLUK_KADEMELERI[sira]);
    }
  }

  /** Isaretcinin SVG icindeki konumunu (ekran olcusu viewBox'tan farkli olabilir) aciya cevirir. */
  function isaretcidenSec(olay: PointerEvent<SVGSVGElement>) {
    const kutu = olay.currentTarget.getBoundingClientRect();
    if (kutu.width === 0) {
      return;
    }
    const olcek = GENISLIK / kutu.width;
    const dx = (olay.clientX - kutu.left) * olcek - MERKEZ;
    const dy = (olay.clientY - kutu.top) * olcek - MERKEZ;
    sirayiSec(enYakinDurak(dx, dy));
  }

  function tusaBasildi(olay: KeyboardEvent<HTMLDivElement>) {
    const hedef: Record<string, number> = {
      ArrowRight: seciliSira + 1,
      ArrowUp: seciliSira + 1,
      ArrowLeft: seciliSira - 1,
      ArrowDown: seciliSira - 1,
      Home: 0,
      End: ZORLUK_KADEMELERI.length - 1,
    };
    if (olay.key in hedef) {
      olay.preventDefault();
      sirayiSec(hedef[olay.key]);
    }
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={t('ortak.zorlukKadrani')}
      aria-valuemin={1}
      aria-valuemax={ZORLUK_KADEMELERI.length}
      aria-valuenow={seciliSira + 1}
      aria-valuetext={t(`ortak.zorluk.${secili}`)}
      onKeyDown={tusaBasildi}
      className="relative mx-auto w-70 max-w-full rounded-xl"
    >
      <svg
        viewBox={`0 0 ${GENISLIK} ${YUKSEKLIK}`}
        className="block w-full touch-none select-none"
        onPointerDown={(olay) => {
          surukleniyor.current = true;
          olay.currentTarget.setPointerCapture?.(olay.pointerId);
          isaretcidenSec(olay);
        }}
        onPointerMove={(olay) => surukleniyor.current && isaretcidenSec(olay)}
        onPointerUp={() => (surukleniyor.current = false)}
        onPointerCancel={() => (surukleniyor.current = false)}
      >
        <path
          d={yayYolu(MERKEZ, YAY_YARICAP)}
          fill="none"
          strokeWidth={YAY_KALINLIK}
          strokeLinecap="round"
          className="stroke-surface-2"
        />
        {ZORLUK_KADEMELERI.map((kademe, sira) => {
          const seciliMi = sira === seciliSira;
          const { x, y } = durakKonumu(sira, MERKEZ, YAY_YARICAP);
          return (
            // Klavye kaydiricidan gelir; duraklar fare/dokunma icin (tab sirasina girmez).
            <g
              key={kademe}
              role="button"
              tabIndex={-1}
              aria-label={t(`ortak.zorluk.${kademe}`)}
              aria-pressed={seciliMi}
              onClick={() => sirayiSec(sira)}
              className="cursor-pointer"
            >
              <circle cx={x} cy={y} r={DURAK_YARICAP} className={seciliMi ? 'fill-accent' : 'fill-surface-4'} />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className={`text-body font-bold ${seciliMi ? 'fill-on-accent' : 'fill-muted'}`}
              >
                {sira + 1}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Yayin ortasi: secili kademenin adi ve RPE cumlesi. Isaretciyi SVG'ye birakir. */}
      <div className="pointer-events-none absolute inset-x-14 top-[38%] flex flex-col items-center gap-1 text-center">
        <span className="text-heading font-bold text-fg">{t(`ortak.zorluk.${secili}`)}</span>
        <span className="text-body text-muted">{t(`ortak.zorlukCumlesi.${secili}`)}</span>
      </div>
    </div>
  );
}
