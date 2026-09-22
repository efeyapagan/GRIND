import { useTranslation } from 'react-i18next';

interface Props {
  boyut?: number;
}

/**
 * GRINDY, AI kocunun gecici maskotu (issue #239): gulumseyen bir kettlebell. Renkler yalnizca tema
 * token siniflarindan gelir, iki temada da calisir. Kalici tasarim sonra ele alinacak;
 * mobile/src/ui/GrindyMaskot.tsx ayni cizimi tasir.
 */
export default function GrindyMaskot({ boyut = 56 }: Props) {
  const { t } = useTranslation();
  return (
    <svg
      role="img"
      aria-label={t('yorumlar.maskotEtiketi')}
      viewBox="0 0 64 64"
      width={boyut}
      height={boyut}
      className="shrink-0"
    >
      <path d="M22 26V17a10 10 0 0 1 20 0v9" fill="none" strokeWidth={6} strokeLinecap="round" className="stroke-accent" />
      <ellipse cx={32} cy={41} rx={22} ry={20} className="fill-accent" />
      <ellipse cx={24} cy={38} rx={3} ry={4} className="fill-on-accent" />
      <ellipse cx={40} cy={38} rx={3} ry={4} className="fill-on-accent" />
      <circle cx={25} cy={36.5} r={1} className="fill-accent" />
      <circle cx={41} cy={36.5} r={1} className="fill-accent" />
      <circle cx={18} cy={45} r={3} opacity={0.25} className="fill-on-accent" />
      <circle cx={46} cy={45} r={3} opacity={0.25} className="fill-on-accent" />
      <path d="M26 47q6 5 12 0" fill="none" strokeWidth={2.5} strokeLinecap="round" className="stroke-on-accent" />
    </svg>
  );
}
