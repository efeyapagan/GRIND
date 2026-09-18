import { useState, type FormEvent } from 'react';
import { Scale, Trash2 } from 'lucide-react';
import { useAddMeasurement, useDeleteMeasurement, useMeasurements, type Olcu } from '../api/queries';
import { apiHatasiniAyir } from '../lib/apiErrors';
import { formatTrDate, formatTrTime } from '../lib/format';
import { usePageTitle } from '../ui/PageTitleContext';
import SayiAlani from '../ui/SayiAlani';
import BirincilDugme from '../ui/BirincilDugme';
import IkincilDugme from '../ui/IkincilDugme';
import IkonDugmesi from '../ui/IkonDugmesi';
import BosDurum from '../ui/BosDurum';
import HataKutusu from '../ui/HataKutusu';

const SAYFA_DUGMESI =
  'flex h-13 flex-1 items-center justify-center gap-1 rounded-xl bg-surface-2 text-label uppercase disabled:text-muted disabled:opacity-60';

const BILINEN_ALANLAR = ['weight', 'bodyFatPercent', 'waistCm'] as const;

/**
 * Vücut ölçüleri sekmesi (issue #119): kilo, yağ oranı ve bel çevresi -- ÜÇÜ DE opsiyonel, sunucu
 * en az birinin dolu olmasını ister (aynı kural burada da uygulanır, ama belirleyici olan sunucunun
 * cevabıdır). Bir kayıtta yalnızca bazı ölçüler girilebilir; liste her satırda SADECE dolu olan
 * ölçüleri gösterir (bkz. `OlcuMetni`, backend'in `ExportTextFormatter`ındaki aynı mantığın
 * istemci tarafı karşılığı).
 */
export default function MeasurementsPage() {
  usePageTitle('Ölçüler');
  const [sayfa, setSayfa] = useState(1);
  const { data, isLoading, isError } = useMeasurements(sayfa);
  const ekleMutasyonu = useAddMeasurement();
  const silMutasyonu = useDeleteMeasurement();

  const [kilo, setKilo] = useState('');
  const [yagOrani, setYagOrani] = useState('');
  const [belCevresi, setBelCevresi] = useState('');
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});
  const [silinecekId, setSilinecekId] = useState<number | null>(null);

  function sayiyaCevir(deger: string): number | undefined {
    return deger.trim() === '' ? undefined : Number(deger.replace(',', '.'));
  }

  function gonder(e: FormEvent) {
    e.preventDefault();
    setGenelHata(null);
    setAlanHatalari({});

    const govde = {
      weight: sayiyaCevir(kilo),
      bodyFatPercent: sayiyaCevir(yagOrani),
      waistCm: sayiyaCevir(belCevresi),
    };

    if (govde.weight === undefined && govde.bodyFatPercent === undefined && govde.waistCm === undefined) {
      setGenelHata('En az bir ölçü girmelisin.');
      return;
    }

    ekleMutasyonu.mutate(govde, {
      onSuccess: () => {
        setKilo('');
        setYagOrani('');
        setBelCevresi('');
      },
      onError: (hata) => {
        const ayrilmis = apiHatasiniAyir(hata, BILINEN_ALANLAR);
        setGenelHata(ayrilmis.genelHata);
        setAlanHatalari(ayrilmis.alanHatalari);
      },
    });
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      <form onSubmit={gonder} className="flex flex-col gap-3 rounded-xl bg-surface-1 p-4">
        <h2 className="text-heading">Yeni ölçü</h2>
        <div className="grid grid-cols-3 gap-2">
          <SayiAlani
            id="olcu-kilo"
            etiket="Kilo"
            ekranOkuyucuEki=" (kg)"
            birim="kg"
            inputMode="decimal"
            placeholder="—"
            value={kilo}
            onChange={setKilo}
            hata={alanHatalari.weight}
          />
          <SayiAlani
            id="olcu-yag-orani"
            etiket="Yağ"
            ekranOkuyucuEki=" (%)"
            birim="%"
            inputMode="decimal"
            placeholder="—"
            value={yagOrani}
            onChange={setYagOrani}
            hata={alanHatalari.bodyFatPercent}
          />
          <SayiAlani
            id="olcu-bel-cevresi"
            etiket="Bel"
            ekranOkuyucuEki=" (cm)"
            birim="cm"
            inputMode="decimal"
            placeholder="—"
            value={belCevresi}
            onChange={setBelCevresi}
            hata={alanHatalari.waistCm}
          />
        </div>
        {genelHata && <HataKutusu baslik="Ölçü kaydedilemedi" mesaj={genelHata} />}
        <BirincilDugme type="submit" yukseklik="normal" disabled={ekleMutasyonu.isPending}>
          Kaydet
        </BirincilDugme>
      </form>

      {isLoading && <p className="text-body text-muted">Yükleniyor...</p>}

      {isError && (
        <p role="alert" className="text-body text-danger">
          Ölçüler alınamadı. Lütfen sayfayı yenileyin.
        </p>
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <BosDurum ikon={Scale} baslik="Henüz ölçü yok" aciklama="Yukarıdan ilk ölçünü ekle." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <ul className="flex flex-col gap-3">
            {data.items.map((olcu) => (
              <OlcuKarti
                key={olcu.id}
                olcu={olcu}
                onayAcik={silinecekId === olcu.id}
                onSilmeyeBasla={() => setSilinecekId(olcu.id)}
                onVazgec={() => setSilinecekId(null)}
                onSil={() => {
                  silMutasyonu.mutate(olcu.id);
                  setSilinecekId(null);
                }}
              />
            ))}
          </ul>
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setSayfa((s) => s - 1)}
                disabled={data.page <= 1}
                className={SAYFA_DUGMESI}
              >
                Önceki
              </button>
              <span className="text-label tabular-nums">
                Sayfa {data.page} / {data.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setSayfa((s) => s + 1)}
                disabled={data.page >= data.totalPages}
                className={SAYFA_DUGMESI}
              >
                Sonraki
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Sadece DOLU olan ölçüleri, virgülle ayırarak yazar -- backend'in export metnindeki mantığın aynısı. */
function olcuMetni(olcu: Olcu): string {
  const parcalar: string[] = [];
  if (olcu.weight !== null) parcalar.push(`${olcu.weight} kg`);
  if (olcu.bodyFatPercent !== null) parcalar.push(`%${olcu.bodyFatPercent} yağ`);
  if (olcu.waistCm !== null) parcalar.push(`${olcu.waistCm} cm bel`);
  return parcalar.join(', ');
}

interface OlcuKartiProps {
  olcu: Olcu;
  onayAcik: boolean;
  onSilmeyeBasla: () => void;
  onVazgec: () => void;
  onSil: () => void;
}

/** Silme onaysız yapılmaz, geri-alınabilir DEĞİLDİR -- ölçü kaydı geri getirilecek bir şey üretmez. */
function OlcuKarti({ olcu, onayAcik, onSilmeyeBasla, onVazgec, onSil }: OlcuKartiProps) {
  if (onayAcik) {
    return (
      <li className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
        <p className="text-body">Bu ölçü kalıcı olarak silinecek.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSil}
            className="h-12 flex-1 rounded-xl bg-danger-bg text-label text-on-danger-bg"
          >
            Evet, sil
          </button>
          <div className="flex-1">
            <IkincilDugme onClick={onVazgec}>Vazgeç</IkincilDugme>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 p-4">
      <div className="flex flex-col gap-1">
        <span className="text-label text-muted">
          {formatTrDate(olcu.recordedAt)} {formatTrTime(olcu.recordedAt)}
        </span>
        <p className="text-body">{olcuMetni(olcu)}</p>
      </div>
      <IkonDugmesi etiket="Ölçüyü sil" onClick={onSilmeyeBasla}>
        <Trash2 aria-hidden size={18} />
      </IkonDugmesi>
    </li>
  );
}
