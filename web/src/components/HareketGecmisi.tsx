import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import { useExerciseProgress, type IlerlemeAraligi, type IlerlemeNoktasi } from '../api/queries';
import { formatAralik, formatFark, formatKisaTarih, formatWeight } from '../lib/format';
import CizgiGrafik, { type CizgiNoktasi } from '../ui/CizgiGrafik';
import SekmeDugmesi from '../ui/SekmeDugmesi';

type SekmeAnahtari = 'agirlik' | 'antrenman' | 'birTekrar';

const SEKMELER = [
  {
    anahtar: 'agirlik' as SekmeAnahtari,
    etiket: 'setGirdisi.agirlikEtiket',
    // Grafigin erisilebilir adinda kullanilir ("Bench Press ağırlık, 3 antrenman").
    ozetAdi: 'hareketGecmisi.ozetAgirlik',
    deger: (nokta: IlerlemeNoktasi) => nokta.topWeight,
  },
  {
    anahtar: 'antrenman' as SekmeAnahtari,
    etiket: 'antrenman.baslik',
    ozetAdi: 'hareketGecmisi.ozetAntrenman',
    deger: (nokta: IlerlemeNoktasi) => nokta.volume,
  },
  {
    anahtar: 'birTekrar' as SekmeAnahtari,
    etiket: 'hareketGecmisi.tahminiBirTekrar',
    ozetAdi: 'hareketGecmisi.ozetBirTekrar',
    deger: (nokta: IlerlemeNoktasi) => nokta.estimatedOneRepMax,
  },
] as const;

const ARALIKLAR = [
  { anahtar: '1a' as IlerlemeAraligi, etiket: 'hareketGecmisi.aralikBirAy' },
  { anahtar: '3a' as IlerlemeAraligi, etiket: 'hareketGecmisi.aralikUcAy' },
  { anahtar: 'tum' as IlerlemeAraligi, etiket: 'hareketGecmisi.aralikTum' },
] as const;

const DEGER_ETIKETI = 'text-label text-muted';
const DEGER = 'text-metric tabular-nums';

/** Sekme dugmesinin id'si -- tabpanel'in `aria-labelledby`si bunu hedef alir (M4). */
function sekmeId(exerciseId: number, anahtar: SekmeAnahtari): string {
  return `hareket-sekme-${exerciseId}-${anahtar}`;
}

interface Props {
  exerciseId: number;
  exerciseName: string;
}

/**
 * Secili hareketin "Geçmiş" bolumu (#50): varsayilan KAPALI bir native `<details>` (Gecmis
 * ekraniyla ayni desen -- acik/kapali durumu tarayici duyurur). Grafik yalnizca acikken MONTE
 * edilir; boylece kapaliyken ilerleme istegi hic atilmaz ve sekmeler erisilebilirlik agacinda
 * durmaz. Durum hatirlanmaz: her montajda kapali baslar.
 */
export default function HareketGecmisi({ exerciseId, exerciseName }: Props) {
  const { t } = useTranslation();
  const [acik, setAcik] = useState(false);

  return (
    <details className="pt-2" onToggle={(olay) => setAcik(olay.currentTarget.open)}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-label text-muted uppercase [&::-webkit-details-marker]:hidden">
        {t('kabuk.sekmeGecmis')}
        {acik ? <ChevronUp aria-hidden size={18} /> : <ChevronDown aria-hidden size={18} />}
      </summary>
      {acik && <HareketGrafigi exerciseId={exerciseId} exerciseName={exerciseName} />}
    </details>
  );
}

/**
 * Ilerleme grafigi (dilim 3 spec Karar 5): sekmeler (en agir set / hacim / tahmini 1RM), "Şu anki"
 * ve "Fark", turuncu cizgi grafik, aralik secimi. Degerler sunucudan gelir; "Fark" yalnizca iki
 * sunucu degerinin farkidir (sunum). Aktif sekmenin alt cizgisi `accent` (spec Karar 3); aralik
 * secici notr.
 */
function HareketGrafigi({ exerciseId, exerciseName }: Props) {
  const { t } = useTranslation();
  const dil = useDil();
  const [sekmeAnahtari, setSekmeAnahtari] = useState<SekmeAnahtari>('agirlik');
  const [aralik, setAralik] = useState<IlerlemeAraligi>('1a');
  const { data: noktalar, isLoading, isError } = useExerciseProgress(exerciseId, aralik);
  const panelId = `hareket-grafigi-${exerciseId}`;
  const sekme = SEKMELER.find((aday) => aday.anahtar === sekmeAnahtari) ?? SEKMELER[0];

  let icerik: ReactNode;
  if (isLoading) {
    icerik = <p className="text-body text-muted">{t('ortak.yukleniyor')}</p>;
  } else if (isError || !noktalar) {
    icerik = (
      <p role="alert" className="text-body text-danger">
        {t('hareketGecmisi.hata')}
      </p>
    );
  } else if (noktalar.length === 0) {
    icerik = (
      <p className="text-body text-muted">
        {aralik === 'tum' ? t('hareketGecmisi.ilkAntrenman') : t('hareketGecmisi.aralikBos')}
      </p>
    );
  } else {
    const cizilecekler = noktalar.flatMap((nokta) => {
      const deger = sekme.deger(nokta);
      return deger === null ? [] : [{ nokta, deger }];
    });

    if (cizilecekler.length === 0) {
      icerik = <p className="text-body text-muted">{t('hareketGecmisi.birTekrarAciklama')}</p>;
    } else {
      const ilk = cizilecekler[0];
      const son = cizilecekler[cizilecekler.length - 1];
      icerik = (
        <>
          <dl className="flex gap-8">
            <div className="flex flex-col gap-1">
              <dt className={DEGER_ETIKETI}>{t('hareketGecmisi.suAnki')}</dt>
              <dd className={DEGER}>{formatWeight(son.deger, dil)}</dd>
            </div>
            {cizilecekler.length > 1 && (
              <div className="flex flex-col gap-1">
                <dt className={DEGER_ETIKETI}>{t('hareketGecmisi.fark')}</dt>
                <dd className={DEGER}>{formatFark(son.deger - ilk.deger, dil)}</dd>
              </div>
            )}
          </dl>
          <p className="text-label text-muted">{formatAralik(ilk.nokta.startedAt, son.nokta.startedAt, dil)}</p>
          <CizgiGrafik
            noktalar={cizilecekler.map(
              ({ nokta, deger }): CizgiNoktasi => ({
                etiket: formatKisaTarih(nokta.startedAt, dil),
                deger,
                // #230: pozisyon her noktanin detayinda ("N. hareket"); farkli pozisyonlu nokta
                // ince bir isaretle ayirt edilir.
                not: t('hareketGecmisi.noktaPozisyonu', { n: nokta.position }),
                vurgula: nokta.positionChanged,
              }),
            )}
            birim="kg"
            baslik={t('hareketGecmisi.grafikBasligi', {
              ad: exerciseName,
              ozet: t(sekme.ozetAdi),
              count: cizilecekler.length,
            })}
          />
          {cizilecekler.some(({ nokta }) => nokta.positionChanged) && (
            <p className="text-label text-muted">{t('hareketGecmisi.pozisyonDegistiIpucu')}</p>
          )}
        </>
      );
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div
        role="tablist"
        aria-label={t('hareketGecmisi.grafikEtiket', { ad: exerciseName })}
        className="flex border-b border-surface-3"
      >
        {SEKMELER.map((aday) => (
          <SekmeDugmesi
            key={aday.anahtar}
            id={sekmeId(exerciseId, aday.anahtar)}
            secili={aday.anahtar === sekmeAnahtari}
            aria-controls={panelId}
            onClick={() => setSekmeAnahtari(aday.anahtar)}
          >
            {t(aday.etiket)}
          </SekmeDugmesi>
        ))}
      </div>
      {/* M4 (review bulgusu): tabpanel'in erisilebilir adi artik SECILI sekmenin id'sine baglanir
          (aria-labelledby) -- sabit bir aria-label yerine, hangi sekmenin acik oldugunu dogru
          bildirir (WAI-ARIA tabs deseni). */}
      <div id={panelId} role="tabpanel" aria-labelledby={sekmeId(exerciseId, sekmeAnahtari)} className="flex flex-col gap-2">
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
              {t(aday.etiket)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
