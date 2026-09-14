import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import type { GecmisOturum } from '../api/queries';
import { useKaydirma } from '../lib/kaydirma';
import { formatTrDate, formatWeight } from '../lib/format';
import SetList from './SetList';
import IkincilDugme from '../ui/IkincilDugme';
import TurEtiketi from '../ui/TurEtiketi';

interface Props {
  oturum: GecmisOturum;
  onSil: () => void;
}

/**
 * Gecmis listesindeki tek antrenman karti (issue #46). Sola kaydirinca arkasindaki "Sil" cikar;
 * silme ONAYSIZ YAPILMAZ -- once kartin yerini bir onay blogu alir (tarayicinin `confirm()`'u
 * KULLANILMAZ, sablon silmedeki desenin aynisi).
 *
 * Kaydirma TEK yol degildir: kart acilinca icinde gorunur bir "Antrenmani sil" dugmesi durur.
 * Kaydirmayla acilan arkadaki dugme onun KOPYASIDIR, bu yuzden `aria-hidden` ve sekme sirasi
 * disindadir -- ayni eylem ekran okuyucuya iki kez duyurulmaz (issue #46 erisilebilirlik maddesi).
 */
export default function GecmisKarti({ oturum, onSil }: Props) {
  const kaydirma = useKaydirma();
  const [onayAcik, setOnayAcik] = useState(false);
  const bos = oturum.setCount === 0;

  function onayiAc() {
    kaydirma.kapat();
    setOnayAcik(true);
  }

  if (onayAcik) {
    return (
      <li className="overflow-hidden rounded-xl bg-surface-2">
        <div className="flex flex-col gap-3 p-4">
          <p className="text-body">
            {formatTrDate(oturum.startedAt)} tarihli antrenman ve {oturum.setCount} seti silinecek.
            Bu hareketlerin rekorları yeniden hesaplanır.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSil}
              className="h-12 flex-1 rounded-xl bg-danger-bg text-label text-on-danger-bg"
            >
              Evet, sil
            </button>
            <div className="flex-1">
              <IkincilDugme onClick={() => setOnayAcik(false)}>Vazgeç</IkincilDugme>
            </div>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="relative overflow-hidden rounded-xl bg-surface-2">
      {/* Kaydirmayla ortaya cikan kopya dugme: gorsel/dokunmatik kisayol. */}
      <div aria-hidden className="absolute inset-y-0 right-0 flex">
        <button
          type="button"
          tabIndex={-1}
          onClick={onayiAc}
          className="flex w-24 flex-col items-center justify-center gap-1 bg-danger-bg text-label-xs text-on-danger-bg uppercase"
        >
          <Trash2 size={20} />
          Sil
        </button>
      </div>

      <div
        {...kaydirma.isaretciler}
        className={`relative bg-surface-2 transition-transform motion-reduce:transition-none ${
          kaydirma.acik ? '-translate-x-24' : 'translate-x-0'
        } ${bos ? 'opacity-80' : ''}`}
      >
        <details className="group">
          <summary
            onClick={(e) => {
              // Kaydirarak acan parmak, birakinca karti da ACMAMALI; kart kaydirilmis
              // durumdayken dokunmak once kaydirmayi geri alir.
              if (kaydirma.kaydirildiMi() || kaydirma.acik) {
                e.preventDefault();
                kaydirma.kapat();
              }
            }}
            className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 group-open:bg-surface-3 focus-visible:-outline-offset-2 [&::-webkit-details-marker]:hidden"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2 text-label">
                <span className="flex items-center gap-1">
                  <CalendarDays aria-hidden size={18} className="text-muted" />
                  {formatTrDate(oturum.startedAt)}
                </span>
                <TurEtiketi>{oturum.templateName ?? 'Serbest'}</TurEtiketi>
              </span>
              <span className="flex items-baseline gap-4">
                <span className="flex items-baseline gap-1">
                  <span className={`text-metric tabular-nums ${bos ? 'text-muted' : ''}`}>
                    {oturum.setCount}
                  </span>{' '}
                  <span className="text-label-xs text-muted uppercase">set</span>
                </span>
                <span className="flex items-baseline gap-1">
                  <span className={`text-metric tabular-nums ${bos ? 'text-muted' : ''}`}>
                    {formatWeight(oturum.totalVolume)}
                  </span>{' '}
                  <span className="text-label-xs text-muted uppercase">kg</span>
                </span>
              </span>
            </div>
            <span
              aria-hidden
              className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-muted group-open:bg-surface-4 group-open:text-fg"
            >
              <ChevronDown size={20} className="group-open:hidden" />
              <ChevronUp size={20} className="hidden group-open:block" />
            </span>
          </summary>
          <div className="flex flex-col gap-3 p-4">
            <SetList varyant="gecmis" sets={oturum.sets} bosDurumMetni="Bu antrenmanda set yok." />
            {/* Kaydirma yapamayan herkesin (klavye, ekran okuyucu) silme yolu. */}
            <button
              type="button"
              onClick={onayiAc}
              className="flex h-12 items-center justify-center gap-2 rounded-xl text-label text-danger"
            >
              <Trash2 aria-hidden size={18} />
              Antrenmanı sil
            </button>
          </div>
        </details>
      </div>
    </li>
  );
}
