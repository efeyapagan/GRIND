import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { useUpdateSet, type SetKaydi } from '../api/queries';
import { apiHatasiniAyir } from '../lib/apiErrors';
import { SET_ALANLARI, setGirdisiMetni, setGirdisiniAyristir, setGirdisiniDogrula } from '../lib/setGirdisi';
import BirincilDugme from '../ui/BirincilDugme';
import IkincilDugme from '../ui/IkincilDugme';
import SayiAlani from '../ui/SayiAlani';

interface Props {
  kayit: SetKaydi;
  sira: number;
  onKapat: () => void;
  onSil: () => void;
}

/**
 * Kaydedilmis bir setin, satirina dokununca YERINDE acilan duzenleyicisi (issue #57). Alanlar mevcut
 * degerlerle dolu gelir; dogrulama ve sayi ayristirma set paneliyle ORTAKTIR (`lib/setGirdisi`).
 * Basarili kayitta kapanir, hata olursa acik kalir ve yazilanlar korunur.
 *
 * Silme burada YAPILMAZ: "Seti sil" yalnizca `onSil` ile sayfaya bildirir; sayfa geri alinabilir
 * (gecikmeli) silmeyi yurutur, cunku duzenleyici silme baslayinca listeden kalkar.
 *
 * DIKKAT: sunucuda `PATCH` icin `null` "degistirme" demektir -- RIR bu duzenleyiciyle BOSALTILAMAZ
 * (issue #57 kapsam disi).
 */
export default function SetDuzenleyici({ kayit, sira, onKapat, onSil }: Props) {
  const duzeltme = useUpdateSet();
  const [girdi, setGirdi] = useState(() => setGirdisiMetni(kayit));
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});
  const onek = `set-${kayit.id}`;

  async function kaydet(e: FormEvent) {
    e.preventDefault();
    setGenelHata(null);

    const dogrulamaHatalari = setGirdisiniDogrula(girdi);
    setAlanHatalari(dogrulamaHatalari);
    if (Object.keys(dogrulamaHatalari).length > 0) {
      return;
    }

    try {
      await duzeltme.mutateAsync({ id: kayit.id, ...setGirdisiniAyristir(girdi) });
      onKapat();
    } catch (hata) {
      const sonuc = apiHatasiniAyir(hata, SET_ALANLARI);
      setGenelHata(sonuc.genelHata);
      setAlanHatalari(sonuc.alanHatalari);
    }
  }

  return (
    <li className="rounded-lg bg-surface-2 p-3">
      <form aria-label={`${sira}. seti düzenle`} onSubmit={kaydet} className="flex flex-col gap-3">
        {genelHata && <p role="alert" className="text-label text-danger">{genelHata}</p>}
        <div className="grid grid-cols-3 gap-2">
          <SayiAlani
            id={`${onek}-agirlik`}
            etiket="Ağırlık"
            ekranOkuyucuEki=" (kg)"
            birim="kg"
            inputMode="decimal"
            placeholder="0"
            value={girdi.agirlik}
            onChange={(agirlik) => setGirdi((onceki) => ({ ...onceki, agirlik }))}
            hata={alanHatalari.weight}
          />
          <SayiAlani
            id={`${onek}-tekrar`}
            etiket="Tekrar"
            birim="tekrar"
            inputMode="numeric"
            placeholder="0"
            value={girdi.tekrar}
            onChange={(tekrar) => setGirdi((onceki) => ({ ...onceki, tekrar }))}
            hata={alanHatalari.reps}
          />
          <SayiAlani
            id={`${onek}-rir`}
            etiket="RIR"
            ekranOkuyucuEki=" (opsiyonel)"
            birim="kalan"
            inputMode="numeric"
            placeholder="—"
            value={girdi.rir}
            onChange={(rir) => setGirdi((onceki) => ({ ...onceki, rir }))}
            hata={alanHatalari.rir}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <IkincilDugme onClick={onKapat}>Vazgeç</IkincilDugme>
          </div>
          <div className="flex-1">
            <BirincilDugme type="submit" yukseklik="normal" disabled={duzeltme.isPending}>
              Kaydet
            </BirincilDugme>
          </div>
        </div>
        <button
          type="button"
          onClick={onSil}
          className="flex h-12 items-center justify-center gap-2 rounded-xl text-label text-danger"
        >
          <Trash2 aria-hidden size={18} />
          Seti sil
        </button>
      </form>
    </li>
  );
}
