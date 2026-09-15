import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalendar, type TakvimGunu } from '../api/queries';
import { formatAralik, trBugundenOnce } from '../lib/format';
import {
  ayBasligi,
  ayinGunu,
  ayIzgarasi,
  gorunumAraligi,
  gunBasligi,
  haftaGunleri,
  kaydir,
  setKademesi,
  type SetKademesi,
  type TakvimGorunumu,
} from '../lib/takvim';
import IkonDugmesi from '../ui/IkonDugmesi';
import SekmeDugmesi from '../ui/SekmeDugmesi';

const GORUNUMLER: { anahtar: TakvimGorunumu; etiket: string; bosMetin: string }[] = [
  { anahtar: 'ay', etiket: 'Aylık', bosMetin: 'Bu ay antrenman yok.' },
  { anahtar: 'hafta', etiket: 'Haftalık', bosMetin: 'Bu hafta antrenman yok.' },
];

const GUN_KISALTMALARI = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

/**
 * Spec Karar 2 genislemesi (#81): kademe tonlari `accent` opakligi. Numaranin kontrasti her kademede
 * olculdu: fg /20 11.2, /40 7.7, /60 5.2; tam accent uzerinde on-accent 4.54.
 */
const KADEME_SINIFI: Record<SetKademesi, string> = {
  0: 'bg-surface-2 text-muted',
  1: 'bg-accent/20 text-fg',
  2: 'bg-accent/40 text-fg',
  3: 'bg-accent/60 text-fg',
  4: 'bg-accent text-on-accent',
};

function sekmeId(anahtar: TakvimGorunumu): string {
  return `takvim-sekme-${anahtar}`;
}

function gunOzeti(gun: string, kayit: TakvimGunu | undefined): string {
  return kayit
    ? `${gunBasligi(gun)} · ${kayit.sessionCount} antrenman · ${kayit.setCount} set`
    : `${gunBasligi(gun)} · antrenman yok`;
}

interface Props {
  // "YYYY-MM-DD", TR gunu. Testte sabitlenir; uygulamada cihaz saatinden TR bugunu.
  bugun?: string;
}

/**
 * Bugun ekranindaki Takvim (#81): Aylik/Haftalik izgara, her hucrede ayin gunu, rengi o gunun set
 * sayisina gore kademeli. Gunler, set sayilari ve seriler `GET /api/stats/calendar`'dan gelir; istemci
 * yalnizca izgarayi kurar ve set sayisini renk kademesine cevirir. Gelecege gezinilmez. Gorunum
 * degisince bugune donulur; secim hatirlanmaz.
 */
export default function Takvim({ bugun = trBugundenOnce(0) }: Props) {
  const [gorunum, setGorunum] = useState<TakvimGorunumu>('ay');
  const [gosterilen, setGosterilen] = useState(bugun);
  const [secili, setSecili] = useState<string | null>(null);
  const { from, to } = gorunumAraligi(gorunum, gosterilen);
  const { data: ozet, isLoading, isError, isPlaceholderData } = useCalendar(from, to);

  const gunler = new Map((ozet?.days ?? []).map((kayit) => [kayit.date, kayit]));
  const satirlar = gorunum === 'ay' ? ayIzgarasi(gosterilen) : [haftaGunleri(gosterilen)];
  const sonrakiKapali = gorunumAraligi(gorunum, kaydir(gorunum, gosterilen, 1)).from > bugun;
  const donemBasligi =
    gorunum === 'ay' ? ayBasligi(gosterilen) : formatAralik(`${from}T12:00:00Z`, `${to}T12:00:00Z`);
  const bosMetin = GORUNUMLER.find((aday) => aday.anahtar === gorunum)?.bosMetin;

  function gorunumSec(yeni: TakvimGorunumu) {
    setGorunum(yeni);
    setGosterilen(bugun);
    setSecili(null);
  }

  function gezin(yon: -1 | 1) {
    setGosterilen(kaydir(gorunum, gosterilen, yon));
    setSecili(null);
  }

  return (
    <section aria-labelledby="takvim-basligi" className="flex flex-col gap-3">
      <h2 id="takvim-basligi" className="text-heading">
        Takvim
      </h2>

      <div role="tablist" aria-label="Takvim görünümü" className="flex border-b border-surface-3">
        {GORUNUMLER.map((aday) => (
          <SekmeDugmesi
            key={aday.anahtar}
            id={sekmeId(aday.anahtar)}
            secili={aday.anahtar === gorunum}
            aria-controls="takvim-paneli"
            onClick={() => gorunumSec(aday.anahtar)}
          >
            {aday.etiket}
          </SekmeDugmesi>
        ))}
      </div>

      <div id="takvim-paneli" role="tabpanel" aria-labelledby={sekmeId(gorunum)} className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <IkonDugmesi etiket="Önceki" onClick={() => gezin(-1)}>
            <ChevronLeft aria-hidden size={20} />
          </IkonDugmesi>
          <p className="text-body-lg tabular-nums">{donemBasligi}</p>
          <IkonDugmesi etiket="Sonraki" onClick={() => gezin(1)} disabled={sonrakiKapali}>
            <ChevronRight aria-hidden size={20} />
          </IkonDugmesi>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {GUN_KISALTMALARI.map((kisaltma) => (
            <span key={kisaltma} aria-hidden className="text-center text-label-xs text-muted uppercase">
              {kisaltma}
            </span>
          ))}
          {satirlar.flat().map((gun, sira) => {
            if (gun === null) {
              return <span key={`bos-${sira}`} aria-hidden />;
            }
            const kayit = gunler.get(gun);
            const seciliMi = gun === secili;
            const vurgu = seciliMi ? 'ring-2 ring-fg' : gun === bugun ? 'ring-1 ring-muted' : '';
            return (
              <button
                key={gun}
                type="button"
                aria-label={`${gunBasligi(gun)}: ${kayit ? `${kayit.setCount} set` : 'antrenman yok'}`}
                aria-pressed={seciliMi}
                aria-current={gun === bugun ? 'date' : undefined}
                onClick={() => setSecili(gun)}
                className={`flex aspect-square w-full items-center justify-center rounded-lg text-label tabular-nums ${
                  KADEME_SINIFI[setKademesi(kayit?.setCount ?? 0)]
                } ${vurgu}`}
              >
                {ayinGunu(gun)}
              </button>
            );
          })}
        </div>

        <p aria-live="polite" className="min-h-5 text-body text-muted tabular-nums">
          {secili ? gunOzeti(secili, gunler.get(secili)) : ''}
        </p>

        {isLoading && <p className="text-body text-muted">Yükleniyor...</p>}
        {isError && (
          <p role="alert" className="text-body text-danger">
            Takvim alınamadı.
          </p>
        )}
        {ozet && !isPlaceholderData && ozet.days.length === 0 && (
          <p className="text-body text-muted">{bosMetin}</p>
        )}

        {ozet && (
          <dl className="flex flex-wrap gap-6">
            <OzetDegeri etiket="Seri" gun={ozet.currentStreak} />
            <OzetDegeri etiket="En uzun seri" gun={ozet.longestStreak} />
            <OzetDegeri etiket="Antrenman günü" gun={ozet.trainedDayCount} />
          </dl>
        )}
      </div>
    </section>
  );
}

function OzetDegeri({ etiket, gun }: { etiket: string; gun: number }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-label text-muted">{etiket}</dt>
      <dd className="text-body-lg tabular-nums">{`${gun} gün`}</dd>
    </div>
  );
}
