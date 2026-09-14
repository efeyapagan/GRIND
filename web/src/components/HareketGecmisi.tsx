import { useState, type ReactNode } from 'react';
import { useExerciseProgress, type IlerlemeAraligi, type IlerlemeNoktasi } from '../api/queries';
import { formatAralik, formatFark, formatKisaTarih, formatWeight } from '../lib/format';
import CizgiGrafik from '../ui/CizgiGrafik';

type SekmeAnahtari = 'agirlik' | 'antrenman' | 'birTekrar';

interface Sekme {
  anahtar: SekmeAnahtari;
  etiket: string;
  // Grafigin erisilebilir adinda kullanilir ("Bench Press ağırlık, 3 antrenman").
  ozetAdi: string;
  deger: (nokta: IlerlemeNoktasi) => number | null;
}

const SEKMELER: Sekme[] = [
  { anahtar: 'agirlik', etiket: 'Ağırlık', ozetAdi: 'ağırlık', deger: (nokta) => nokta.topWeight },
  { anahtar: 'antrenman', etiket: 'Antrenman', ozetAdi: 'antrenman hacmi', deger: (nokta) => nokta.volume },
  {
    anahtar: 'birTekrar',
    etiket: 'Tahmini 1RM',
    ozetAdi: 'tahmini 1RM',
    deger: (nokta) => nokta.estimatedOneRepMax,
  },
];

const ARALIKLAR: { anahtar: IlerlemeAraligi; etiket: string }[] = [
  { anahtar: '1a', etiket: '1 Ay' },
  { anahtar: '3a', etiket: '3 Ay' },
  { anahtar: 'tum', etiket: 'Tüm' },
];

const DEGER_ETIKETI = 'text-label text-muted';
const DEGER = 'text-metric tabular-nums';

interface Props {
  exerciseId: number;
  exerciseName: string;
}

/**
 * Secili hareketin ilerleme grafigi (dilim 3 spec Karar 5): sekmeler (en agir set / hacim / tahmini
 * 1RM), "Şu anki" ve "Fark", turuncu cizgi grafik, aralik secimi. Degerler sunucudan gelir; "Fark"
 * yalnizca iki sunucu degerinin farkidir (sunum). Aktif sekmenin alt cizgisi `accent` (spec Karar 3);
 * aralik secici notr.
 */
export default function HareketGecmisi({ exerciseId, exerciseName }: Props) {
  const [sekmeAnahtari, setSekmeAnahtari] = useState<SekmeAnahtari>('agirlik');
  const [aralik, setAralik] = useState<IlerlemeAraligi>('1a');
  const { data: noktalar, isLoading, isError } = useExerciseProgress(exerciseId, aralik);
  const baslikId = `hareket-gecmisi-${exerciseId}`;
  const panelId = `hareket-grafigi-${exerciseId}`;
  const sekme = SEKMELER.find((aday) => aday.anahtar === sekmeAnahtari) ?? SEKMELER[0];

  let icerik: ReactNode;
  if (isLoading) {
    icerik = <p className="text-body text-muted">Yükleniyor...</p>;
  } else if (isError || !noktalar) {
    icerik = (
      <p role="alert" className="text-body text-danger">
        Geçmiş alınamadı.
      </p>
    );
  } else if (noktalar.length === 0) {
    icerik = (
      <p className="text-body text-muted">
        {aralik === 'tum' ? 'Bu hareketin ilk antrenmanı' : 'Bu aralıkta kayıt yok'}
      </p>
    );
  } else {
    const cizilecekler = noktalar.flatMap((nokta) => {
      const deger = sekme.deger(nokta);
      return deger === null ? [] : [{ nokta, deger }];
    });

    if (cizilecekler.length === 0) {
      icerik = <p className="text-body text-muted">Tahmini 1RM için 1–12 tekrarlı ve ağırlıklı set gerekir.</p>;
    } else {
      const ilk = cizilecekler[0];
      const son = cizilecekler[cizilecekler.length - 1];
      icerik = (
        <>
          <dl className="flex gap-8">
            <div className="flex flex-col gap-1">
              <dt className={DEGER_ETIKETI}>Şu anki</dt>
              <dd className={DEGER}>{formatWeight(son.deger)}</dd>
            </div>
            {cizilecekler.length > 1 && (
              <div className="flex flex-col gap-1">
                <dt className={DEGER_ETIKETI}>Fark</dt>
                <dd className={DEGER}>{formatFark(son.deger - ilk.deger)}</dd>
              </div>
            )}
          </dl>
          <p className="text-label text-muted">{formatAralik(ilk.nokta.startedAt, son.nokta.startedAt)}</p>
          <CizgiGrafik
            noktalar={cizilecekler.map(({ nokta, deger }) => ({ etiket: formatKisaTarih(nokta.startedAt), deger }))}
            birim="kg"
            baslik={`${exerciseName} ${sekme.ozetAdi}, ${cizilecekler.length} antrenman`}
          />
        </>
      );
    }
  }

  return (
    <section aria-labelledby={baslikId} className="flex flex-col gap-3 pt-2">
      <h3 id={baslikId} className="text-label text-muted uppercase">
        Geçmiş
      </h3>
      <div role="tablist" aria-label={`${exerciseName} grafiği`} className="flex border-b border-surface-3">
        {SEKMELER.map((aday) => {
          const secili = aday.anahtar === sekmeAnahtari;
          return (
            <button
              key={aday.anahtar}
              type="button"
              role="tab"
              aria-selected={secili}
              aria-controls={panelId}
              onClick={() => setSekmeAnahtari(aday.anahtar)}
              className={`min-h-11 flex-1 border-b-2 px-2 text-label ${
                secili ? 'border-accent text-fg' : 'border-transparent text-muted'
              }`}
            >
              {aday.etiket}
            </button>
          );
        })}
      </div>
      <div id={panelId} role="tabpanel" aria-label={sekme.etiket} className="flex flex-col gap-2">
        {icerik}
      </div>
      <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
        {ARALIKLAR.map((aday) => {
          const secili = aday.anahtar === aralik;
          return (
            <button
              key={aday.anahtar}
              type="button"
              aria-pressed={secili}
              onClick={() => setAralik(aday.anahtar)}
              className={`min-h-11 flex-1 rounded-md text-label ${secili ? 'bg-surface-4 text-fg' : 'text-muted'}`}
            >
              {aday.etiket}
            </button>
          );
        })}
      </div>
    </section>
  );
}
