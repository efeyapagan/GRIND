import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDil, type Dil } from '@grind/shared/i18n';
import {
  useCalendar,
  useGunGecmisi,
  type GecmisOturum,
  type TakvimGunu,
} from '../api/queries';
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

/**
 * Secili gunun ozeti (#90): "14 Eylül · Push Day, Şablonsuz · 26 set". Sablon adlari eskiden yeniye;
 * seti olmayan oturum takvim gibi atlanir. Adlar yuklenirken "…", alinamazsa antrenman sayisi yazar.
 */
function gunOzeti(
  gun: string,
  kayit: TakvimGunu | undefined,
  oturumlar: GecmisOturum[] | undefined,
  gecmisHatali: boolean,
  dil: Dil,
): string {
  if (!kayit) {
    return `${gunBasligi(gun, dil)} · antrenman yok`;
  }
  const setliOturumlar = (oturumlar ?? [])
    .filter((oturum) => oturum.setCount > 0)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  let sablonlar: string;
  if (gecmisHatali || (oturumlar && setliOturumlar.length === 0)) {
    sablonlar = `${kayit.sessionCount} antrenman`;
  } else if (!oturumlar) {
    sablonlar = '…';
  } else {
    sablonlar = setliOturumlar.map((oturum) => oturum.templateName ?? 'Şablonsuz').join(', ');
  }
  return `${gunBasligi(gun, dil)} · ${sablonlar} · ${kayit.setCount} set`;
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
  const dil = useDil();
  const [gorunum, setGorunum] = useState<TakvimGorunumu>('ay');
  const [gosterilen, setGosterilen] = useState(bugun);
  const [secili, setSecili] = useState<string | null>(null);
  const { from, to } = gorunumAraligi(gorunum, gosterilen);
  const { data: ozet, isLoading, isError, isPlaceholderData } = useCalendar(from, to);

  const gunler = new Map((ozet?.days ?? []).map((kayit) => [kayit.date, kayit]));
  const seciliKayit = secili ? gunler.get(secili) : undefined;
  // #90: sablon adlari yalnizca ANTRENMANLI bir gun secilince istenir.
  const { data: gunOturumlari, isError: gunGecmisiHatali } = useGunGecmisi(seciliKayit ? secili : null);
  const satirlar = gorunum === 'ay' ? ayIzgarasi(gosterilen) : [haftaGunleri(gosterilen)];
  const sonrakiKapali = gorunumAraligi(gorunum, kaydir(gorunum, gosterilen, 1)).from > bugun;
  const donemBasligi =
    gorunum === 'ay' ? ayBasligi(gosterilen, dil) : formatAralik(`${from}T12:00:00Z`, `${to}T12:00:00Z`, dil);
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
    // #117: gorunur baslik kaldirildi; bolge adi aria-label ile.
    <section aria-label="Takvim" className="flex flex-col gap-3">

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

        {/* #84: izgara tam genislik degil, en fazla 256 px -- telefonda hucre ~33 px, ekrani kaplamasin. */}
        <div className="mx-auto grid w-full max-w-64 grid-cols-7 gap-1">
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
                aria-label={`${gunBasligi(gun, dil)}: ${kayit ? `${kayit.setCount} set` : 'antrenman yok'}`}
                aria-pressed={seciliMi}
                aria-current={gun === bugun ? 'date' : undefined}
                onClick={() => setSecili(gun)}
                // min-h-0: base katmanindaki 44 px dugme alt siniri kare hucreyi uzatmasin (#84; kullanici
                // kucuk izgarayi dokunma hedefinden one aldi).
                className={`flex aspect-square min-h-0 w-full items-center justify-center rounded-md text-label tabular-nums ${
                  KADEME_SINIFI[setKademesi(kayit?.setCount ?? 0)]
                } ${vurgu}`}
              >
                {ayinGunu(gun)}
              </button>
            );
          })}
        </div>

        <p aria-live="polite" className="min-h-5 text-body text-muted tabular-nums">
          {secili ? gunOzeti(secili, seciliKayit, gunOturumlari, gunGecmisiHatali, dil) : ''}
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
          <dl className="flex flex-wrap gap-x-6 gap-y-3">
            {/* #96: seriler hafta; #97: hedef satirlari yalnizca hedef varken. Hepsi API degeri. #117: en uzun
                seri Rekorlar'a, hedef secicisi Profil'e tasindi. */}
            <OzetDegeri etiket="Seri" deger={`${ozet.currentWeekStreak} hafta`} />
            <OzetDegeri etiket="Antrenman günü" deger={`${ozet.trainedDayCount} gün`} />
            {ozet.weeklyTargetDays !== null && (
              <>
                <OzetDegeri etiket="Bu hafta" deger={`${ozet.thisWeekTrainedDays} / ${ozet.weeklyTargetDays} gün`} />
                <OzetDegeri etiket="Hedef serisi" deger={`${ozet.currentTargetStreak ?? 0} hafta`} />
              </>
            )}
          </dl>
        )}
      </div>
    </section>
  );
}

function OzetDegeri({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-label text-muted">{etiket}</dt>
      <dd className="text-body-lg tabular-nums">{deger}</dd>
    </div>
  );
}

