import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, Scale, Trash2 } from 'lucide-react';
import { useDil } from '@grind/shared/i18n';
import { useAddMeasurement, useDeleteMeasurement, useInfiniteMeasurements, type Olcu } from '../api/queries';
import { apiHatasiniAyir } from '../lib/apiErrors';
import { formatSaat, formatTarih } from '../lib/format';
import { usePageTitle } from '../ui/PageTitleContext';
import Modal from '../ui/Modal';
import SayiAlani from '../ui/SayiAlani';
import BirincilDugme from '../ui/BirincilDugme';
import IkincilDugme from '../ui/IkincilDugme';
import IkonDugmesi from '../ui/IkonDugmesi';
import BosDurum from '../ui/BosDurum';
import HataKutusu from '../ui/HataKutusu';

const BILINEN_ALANLAR = ['weight', 'heightCm', 'bodyFatPercent', 'waistCm', 'hipCm'] as const;

/**
 * Vücut ölçüleri sekmesi (issue #119, kullanıcı kararıyla revize): "Yeni ölçüm ekle" bir
 * PENCERE (dialog) açar -- boy ve kilo ZORUNLU, yağ oranı/bel/kalça çevresi opsiyonel. Aynı gün
 * aynı boy+kiloyla ikinci bir kayıt sunucudan 409 alır ("zaten kayıtlı"); bu, sunucunun `detail`
 * metniyle `apiHatasiniAyir`in genel hata yoluyla otomatik gösterilir (409'un alan hatası yoktur).
 * Liste her satırda SADECE dolu olan ölçüleri gösterir (bkz. `olcuMetni`, backend'in
 * `ExportTextFormatter`ındaki aynı mantığın istemci tarafı karşılığı).
 */
export default function MeasurementsPage() {
  usePageTitle('Ölçüler');
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteMeasurements();
  const ekleMutasyonu = useAddMeasurement();
  const silMutasyonu = useDeleteMeasurement();

  const [modalAcik, setModalAcik] = useState(false);
  const [kilo, setKilo] = useState('');
  const [boy, setBoy] = useState('');
  const [yagOrani, setYagOrani] = useState('');
  const [belCevresi, setBelCevresi] = useState('');
  const [kalcaCevresi, setKalcaCevresi] = useState('');
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});
  const [silinecekId, setSilinecekId] = useState<number | null>(null);

  function formuSifirla() {
    setKilo('');
    setBoy('');
    setYagOrani('');
    setBelCevresi('');
    setKalcaCevresi('');
    setGenelHata(null);
    setAlanHatalari({});
  }

  function penceresiniAc() {
    formuSifirla();
    setModalAcik(true);
  }

  function sayiyaCevir(deger: string): number | undefined {
    return deger.trim() === '' ? undefined : Number(deger.replace(',', '.'));
  }

  function gonder(e: FormEvent) {
    e.preventDefault();
    setGenelHata(null);
    setAlanHatalari({});

    const govde = {
      weight: sayiyaCevir(kilo),
      heightCm: sayiyaCevir(boy),
      bodyFatPercent: sayiyaCevir(yagOrani),
      waistCm: sayiyaCevir(belCevresi),
      hipCm: sayiyaCevir(kalcaCevresi),
    };

    // Boy ve kilo ZORUNLU (kullanıcı kararı) -- sunucu da aynı kuralı uygular, burası sadece
    // hızlı geri bildirim (RegisterPage'deki istemci-tarafı doğrulama deseninin aynısı).
    const hatalar: Record<string, string> = {};
    if (govde.weight === undefined) hatalar.weight = 'Kilo gerekli.';
    if (govde.heightCm === undefined) hatalar.heightCm = 'Boy gerekli.';
    if (Object.keys(hatalar).length > 0) {
      setAlanHatalari(hatalar);
      return;
    }

    ekleMutasyonu.mutate(govde, {
      onSuccess: () => {
        formuSifirla();
        setModalAcik(false);
      },
      onError: (hata) => {
        const ayrilmis = apiHatasiniAyir(hata, BILINEN_ALANLAR);
        setGenelHata(ayrilmis.genelHata);
        setAlanHatalari(ayrilmis.alanHatalari);
      },
    });
  }

  const tumOlculer = data?.pages.flatMap((sayfa) => sayfa.items) ?? [];

  // Liste sonundaki gorunmez oge viewport'a girince bir sonraki sayfa cekilir (issue #147,
  // HistoryPage ile ayni desen). `hasNextPage` false iken gozlemci hic KURULMAZ.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) {
      return;
    }
    const gozlemci = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );
    gozlemci.observe(sentinel);
    return () => gozlemci.disconnect();
  }, [hasNextPage, fetchNextPage]);

  return (
    <div className="flex flex-col gap-5 pb-4">
      <BirincilDugme onClick={penceresiniAc} yukseklik="normal">
        <Plus aria-hidden size={20} />
        Yeni ölçüm ekle
      </BirincilDugme>

      <Modal acik={modalAcik} onKapat={() => setModalAcik(false)} baslik="Yeni ölçüm">
        <form onSubmit={gonder} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            <SayiAlani
              id="olcu-boy"
              etiket="Boy"
              ekranOkuyucuEki=" (cm)"
              birim="cm"
              inputMode="decimal"
              placeholder="—"
              value={boy}
              onChange={setBoy}
              hata={alanHatalari.heightCm}
            />
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
              etiket="Yağ oranı"
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
              etiket="Bel çevresi"
              ekranOkuyucuEki=" (cm)"
              birim="cm"
              inputMode="decimal"
              placeholder="—"
              value={belCevresi}
              onChange={setBelCevresi}
              hata={alanHatalari.waistCm}
            />
            <SayiAlani
              id="olcu-kalca-cevresi"
              etiket="Kalça çevresi"
              ekranOkuyucuEki=" (cm)"
              birim="cm"
              inputMode="decimal"
              placeholder="—"
              value={kalcaCevresi}
              onChange={setKalcaCevresi}
              hata={alanHatalari.hipCm}
            />
          </div>
          <p className="text-label text-muted">Boy ve kilo zorunlu; diğerleri opsiyonel.</p>
          {genelHata && <HataKutusu baslik="Ölçü kaydedilemedi" mesaj={genelHata} />}
          <BirincilDugme type="submit" yukseklik="normal" disabled={ekleMutasyonu.isPending}>
            Kaydet
          </BirincilDugme>
        </form>
      </Modal>

      {isLoading && <p className="text-body text-muted">Yükleniyor...</p>}

      {isError && (
        <p role="alert" className="text-body text-danger">
          Ölçüler alınamadı. Lütfen sayfayı yenileyin.
        </p>
      )}

      {!isLoading && !isError && data && tumOlculer.length === 0 && (
        <BosDurum ikon={Scale} baslik="Henüz ölçü yok" aciklama="Yukarıdan ilk ölçünü ekle." />
      )}

      {!isLoading && !isError && data && tumOlculer.length > 0 && (
        <>
          <ul className="flex flex-col gap-3">
            {tumOlculer.map((olcu) => (
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
          {/* Gorunmez sentinel: `<ul>`in DISINDA, `listitem` sayisini etkilemesin diye. */}
          <div ref={sentinelRef} aria-hidden className="h-px" />
          {isFetchingNextPage && <p className="text-body text-muted">Yükleniyor...</p>}
        </>
      )}
    </div>
  );
}

/** Sadece DOLU olan ölçüleri, virgülle ayırarak yazar -- backend'in export metnindeki mantığın aynısı. */
function olcuMetni(olcu: Olcu): string {
  const parcalar: string[] = [];
  if (olcu.weight !== null) parcalar.push(`${olcu.weight} kg`);
  if (olcu.heightCm !== null) parcalar.push(`${olcu.heightCm} cm boy`);
  if (olcu.bodyFatPercent !== null) parcalar.push(`%${olcu.bodyFatPercent} yağ`);
  if (olcu.waistCm !== null) parcalar.push(`${olcu.waistCm} cm bel`);
  if (olcu.hipCm !== null) parcalar.push(`${olcu.hipCm} cm kalça`);
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
  const dil = useDil();
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
          {formatTarih(olcu.recordedAt, dil)} {formatSaat(olcu.recordedAt)}
        </span>
        <p className="text-body">{olcuMetni(olcu)}</p>
      </div>
      <IkonDugmesi etiket="Ölçüyü sil" onClick={onSilmeyeBasla}>
        <Trash2 aria-hidden size={18} />
      </IkonDugmesi>
    </li>
  );
}
