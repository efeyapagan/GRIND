import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronUp, ClipboardList, Plus, Trash2, X } from 'lucide-react';
import {
  useCreateTemplate,
  useDeleteTemplate,
  useExercises,
  useTemplate,
  useUpdateTemplate,
  type Egzersiz,
  type Sablon,
  type SablonGirdisi,
} from '../api/queries';
import { apiHatasiniAyir } from '../lib/apiErrors';
import { adaGoreSirala } from '../lib/egzersizler';
import { VARSAYILAN_DINLENME_SN } from '../lib/dinlenme';
import Alan from '../ui/Alan';
import BirincilDugme from '../ui/BirincilDugme';
import Hap from '../ui/Hap';
import HataKutusu from '../ui/HataKutusu';
import IkincilDugme from '../ui/IkincilDugme';
import IkonDugmesi from '../ui/IkonDugmesi';
import SecimKutusu from '../ui/SecimKutusu';

const DINLENME_SECENEKLERI = [
  { deger: 0, etiket: 'Yok' },
  { deger: 30, etiket: '30 sn' },
  { deger: 60, etiket: '60 sn' },
  { deger: 90, etiket: '90 sn' },
  { deger: 120, etiket: '2 dk' },
  { deger: 180, etiket: '3 dk' },
  { deger: 240, etiket: '4 dk' },
  { deger: 300, etiket: '5 dk' },
];

const YENI_SATIR_HEDEF_SET = '3';
const ALAN_ETIKETI = 'text-label text-muted';

interface Satir {
  // React anahtari: satir tasininca ya da silinince durum (odak, girdi) dogru satirda kalsin.
  anahtar: number;
  exerciseId: number;
  exerciseName: string;
  isArchived: boolean;
  plannedSets: string;
  restSeconds: number;
}

function SayfaBasligi({ baslik }: { baslik: string }) {
  return (
    <header className="flex flex-col gap-1">
      <Link to="/templates" className="flex min-h-11 w-fit items-center gap-1 text-label text-muted">
        <ChevronLeft aria-hidden size={18} />
        Şablonlar
      </Link>
      <h1 className="text-title">{baslik}</h1>
    </header>
  );
}

/**
 * `/templates/new` ve `/templates/:id` (spec Karar 3). Form durumu yuklenen sablondan BIR KEZ kurulur:
 * `SablonFormu` sablon geldikten sonra ve id'ye gore `key`lenerek monte edilir, efektle kopyalama yok.
 */
export default function SablonDuzenlePage() {
  const { id } = useParams();
  const sablonId = id === undefined ? null : Number(id);
  const { data: sablon, isLoading, isError } = useTemplate(sablonId);

  if (sablonId === null) {
    return <SablonFormu sablon={null} />;
  }
  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 pt-2 pb-4">
        <SayfaBasligi baslik="Şablonu düzenle" />
        <p className="text-body text-muted">Yükleniyor...</p>
      </div>
    );
  }
  if (isError || !sablon) {
    return (
      <div className="flex flex-col gap-5 pt-2 pb-4">
        <SayfaBasligi baslik="Şablonu düzenle" />
        <p role="alert" className="text-body text-danger">
          Şablon alınamadı.
        </p>
      </div>
    );
  }
  return <SablonFormu key={sablon.id} sablon={sablon} />;
}

function SablonFormu({ sablon }: { sablon: Sablon | null }) {
  const navigate = useNavigate();
  const { data: egzersizler } = useExercises();
  const olusturMutasyonu = useCreateTemplate();
  const guncelleMutasyonu = useUpdateTemplate();
  const silMutasyonu = useDeleteTemplate();

  const siraliEgzersizler = useMemo(() => adaGoreSirala(egzersizler ?? []), [egzersizler]);

  const [ad, setAd] = useState(sablon?.name ?? '');
  const [satirlar, setSatirlar] = useState<Satir[]>(() =>
    (sablon?.exercises ?? []).map((hareket, sira) => ({
      anahtar: sira,
      exerciseId: hareket.exerciseId,
      exerciseName: hareket.exerciseName,
      isArchived: hareket.isArchived,
      plannedSets: String(hareket.plannedSets),
      restSeconds: hareket.restSeconds,
    })),
  );
  const siradakiAnahtar = useRef(satirlar.length);

  const [adHatasi, setAdHatasi] = useState<string | null>(null);
  const [setHatalari, setSetHatalari] = useState<Record<number, string>>({});
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [silmeOnayi, setSilmeOnayi] = useState(false);
  const [silmeHatasi, setSilmeHatasi] = useState<string | null>(null);

  const secilenIdler = new Set(satirlar.map((satir) => satir.exerciseId));
  const eklenebilirEgzersiz = siraliEgzersizler.find((eg) => !secilenIdler.has(eg.id));

  function hareketEkle() {
    if (!eklenebilirEgzersiz) {
      return;
    }
    const anahtar = siradakiAnahtar.current;
    siradakiAnahtar.current += 1;
    setSatirlar((onceki) => [
      ...onceki,
      {
        anahtar,
        exerciseId: eklenebilirEgzersiz.id,
        exerciseName: eklenebilirEgzersiz.name,
        isArchived: false,
        plannedSets: YENI_SATIR_HEDEF_SET,
        restSeconds: VARSAYILAN_DINLENME_SN,
      },
    ]);
  }

  function satiriGuncelle(anahtar: number, degisiklik: Partial<Satir>) {
    setSatirlar((onceki) => onceki.map((satir) => (satir.anahtar === anahtar ? { ...satir, ...degisiklik } : satir)));
  }

  function egzersizSec(anahtar: number, exerciseId: number) {
    const egzersiz = siraliEgzersizler.find((eg) => eg.id === exerciseId);
    if (egzersiz) {
      satiriGuncelle(anahtar, { exerciseId: egzersiz.id, exerciseName: egzersiz.name, isArchived: false });
    }
  }

  function tasi(sira: number, yon: -1 | 1) {
    setSatirlar((onceki) => {
      const hedef = sira + yon;
      if (hedef < 0 || hedef >= onceki.length) {
        return onceki;
      }
      const yeni = [...onceki];
      [yeni[sira], yeni[hedef]] = [yeni[hedef], yeni[sira]];
      return yeni;
    });
  }

  /** Sunucu kurallarini yansitir ama belirleyici sunucudur (spec Karar 3). */
  function dogrula(): boolean {
    const kirpilmisAd = ad.trim();
    const yeniAdHatasi =
      kirpilmisAd.length < 2 || kirpilmisAd.length > 100 ? 'Şablon adı 2-100 karakter olmalı.' : null;
    const yeniSetHatalari: Record<number, string> = {};
    for (const satir of satirlar) {
      const metin = satir.plannedSets.trim();
      const sayi = Number(metin);
      if (metin === '' || !Number.isInteger(sayi) || sayi < 1 || sayi > 50) {
        yeniSetHatalari[satir.anahtar] = 'Hedef set 1-50 arasında olmalı.';
      }
    }
    setAdHatasi(yeniAdHatasi);
    setSetHatalari(yeniSetHatalari);
    return yeniAdHatasi === null && Object.keys(yeniSetHatalari).length === 0;
  }

  async function kaydet(e: FormEvent) {
    e.preventDefault();
    setGenelHata(null);
    if (!dogrula()) {
      return;
    }

    const girdi: SablonGirdisi = {
      name: ad.trim(),
      exercises: satirlar.map((satir) => ({
        exerciseId: satir.exerciseId,
        plannedSets: Number(satir.plannedSets.trim()),
        restSeconds: satir.restSeconds,
      })),
    };

    try {
      if (sablon) {
        await guncelleMutasyonu.mutateAsync({ id: sablon.id, girdi });
      } else {
        await olusturMutasyonu.mutateAsync(girdi);
      }
      navigate('/templates');
    } catch (hata) {
      // Ad alanina ait DataAnnotations hatasi alanin altina; digerleri (409, ic eleman hatalari)
      // genel hata kutusuna -- sessiz kalinmaz (apiHatasiniAyir I3).
      const sonuc = apiHatasiniAyir(hata, ['name']);
      setAdHatasi(sonuc.alanHatalari.name ?? null);
      setGenelHata(sonuc.genelHata);
    }
  }

  async function sil() {
    if (!sablon) {
      return;
    }
    setSilmeHatasi(null);
    try {
      await silMutasyonu.mutateAsync(sablon.id);
      navigate('/templates');
    } catch (hata) {
      setSilmeHatasi(apiHatasiniAyir(hata, []).genelHata);
      setSilmeOnayi(false);
    }
  }

  const kaydediliyor = olusturMutasyonu.isPending || guncelleMutasyonu.isPending;

  return (
    <form onSubmit={kaydet} noValidate className="flex flex-col gap-5 pt-2 pb-4">
      <SayfaBasligi baslik={sablon ? 'Şablonu düzenle' : 'Yeni şablon'} />

      {genelHata && <HataKutusu baslik="Şablon kaydedilemedi" mesaj={genelHata} />}

      <Alan
        id="sablon-adi"
        etiket="Şablon adı"
        ikon={ClipboardList}
        placeholder="Push Day"
        value={ad}
        onChange={(e) => setAd(e.target.value)}
        hata={adHatasi ?? undefined}
      />

      <section aria-labelledby="hareketler-basligi" className="flex flex-col gap-3">
        <h2 id="hareketler-basligi" className="text-heading">
          Hareketler
        </h2>
        {satirlar.length === 0 && <p className="text-body text-muted">Henüz hareket yok.</p>}
        <ol className="flex flex-col gap-3">
          {satirlar.map((satir, sira) => (
            <HareketSatiri
              key={satir.anahtar}
              satir={satir}
              sira={sira + 1}
              sonMu={sira === satirlar.length - 1}
              egzersizler={siraliEgzersizler}
              baskaSatirdaSecilenler={new Set(
                satirlar.filter((diger) => diger.anahtar !== satir.anahtar).map((diger) => diger.exerciseId),
              )}
              setHatasi={setHatalari[satir.anahtar]}
              onEgzersiz={(exerciseId) => egzersizSec(satir.anahtar, exerciseId)}
              onHedefSet={(deger) => satiriGuncelle(satir.anahtar, { plannedSets: deger })}
              onDinlenme={(saniye) => satiriGuncelle(satir.anahtar, { restSeconds: saniye })}
              onYukari={() => tasi(sira, -1)}
              onAsagi={() => tasi(sira, 1)}
              onKaldir={() => setSatirlar((onceki) => onceki.filter((diger) => diger.anahtar !== satir.anahtar))}
            />
          ))}
        </ol>
        <IkincilDugme onClick={hareketEkle} disabled={!eklenebilirEgzersiz}>
          <Plus aria-hidden size={18} />
          Hareket ekle
        </IkincilDugme>
      </section>

      <BirincilDugme type="submit" yukseklik="normal" disabled={kaydediliyor}>
        Kaydet
      </BirincilDugme>

      {sablon && (
        <div className="flex flex-col gap-3 border-t border-surface-3 pt-5">
          {silmeHatasi && (
            <p role="alert" className="text-label text-danger">
              {silmeHatasi}
            </p>
          )}
          {silmeOnayi ? (
            // Tarayicinin confirm()'u KULLANILMAZ (spec Karar 3): onay ayni yerde, iki adimda.
            <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
              <p className="text-body">
                Silmek istediğine emin misin? Bu şablonla yapılmış geçmiş antrenmanlar silinmez.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={sil}
                  disabled={silMutasyonu.isPending}
                  className="h-12 flex-1 rounded-xl bg-danger-bg text-label text-on-danger-bg disabled:opacity-60"
                >
                  Evet, sil
                </button>
                <div className="flex-1">
                  <IkincilDugme onClick={() => setSilmeOnayi(false)}>Vazgeç</IkincilDugme>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSilmeOnayi(true)}
              className="flex h-12 items-center justify-center gap-2 rounded-xl text-label text-danger"
            >
              <Trash2 aria-hidden size={18} />
              Şablonu sil
            </button>
          )}
        </div>
      )}
    </form>
  );
}

interface HareketSatiriProps {
  satir: Satir;
  sira: number;
  sonMu: boolean;
  egzersizler: Egzersiz[];
  baskaSatirdaSecilenler: Set<number>;
  setHatasi?: string;
  onEgzersiz: (exerciseId: number) => void;
  onHedefSet: (deger: string) => void;
  onDinlenme: (saniye: number) => void;
  onYukari: () => void;
  onAsagi: () => void;
  onKaldir: () => void;
}

/**
 * Tek hareket karti. Surukle-birak YOK (spec Karar 3): yukari/asagi/kaldir dugmeleri erisilebilir ve
 * basit. Her girdinin erisilebilir adi satir numarasini tasir ("1. hareket: Hedef set"); gorunen
 * etiket kisa kalir.
 */
function HareketSatiri({
  satir,
  sira,
  sonMu,
  egzersizler,
  baskaSatirdaSecilenler,
  setHatasi,
  onEgzersiz,
  onHedefSet,
  onDinlenme,
  onYukari,
  onAsagi,
  onKaldir,
}: HareketSatiriProps) {
  const onEk = `${sira}. hareket`;
  const idOnEki = `hareket-${satir.anahtar}`;
  // Arsivlenmis egzersiz secim listesinde yok (GET /api/exercises arsivlileri dondurmez) ama sablonda
  // kalabilir: kendi adiyla ayrica secenek olarak gosterilir, veri kaybolmaz.
  const listedeYok = !egzersizler.some((eg) => eg.id === satir.exerciseId);
  const dinlenmeSecenekleri = DINLENME_SECENEKLERI.some((secenek) => secenek.deger === satir.restSeconds)
    ? DINLENME_SECENEKLERI
    : [...DINLENME_SECENEKLERI, { deger: satir.restSeconds, etiket: `${satir.restSeconds} sn` }].sort(
        (a, b) => a.deger - b.deger,
      );

  return (
    <li className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-label"
          >
            {sira}
          </span>
          {satir.isArchived && <Hap>Artık kullanılmıyor</Hap>}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <IkonDugmesi etiket={`${onEk}: yukarı taşı`} onClick={onYukari} disabled={sira === 1}>
            <ChevronUp aria-hidden size={20} />
          </IkonDugmesi>
          <IkonDugmesi etiket={`${onEk}: aşağı taşı`} onClick={onAsagi} disabled={sonMu}>
            <ChevronDown aria-hidden size={20} />
          </IkonDugmesi>
          <IkonDugmesi etiket={`${onEk}: kaldır`} onClick={onKaldir}>
            <X aria-hidden size={20} />
          </IkonDugmesi>
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${idOnEki}-egzersiz`} className={ALAN_ETIKETI}>
          <span className="sr-only">{onEk}: </span>
          Egzersiz
        </label>
        <SecimKutusu
          id={`${idOnEki}-egzersiz`}
          value={satir.exerciseId}
          onChange={(e) => onEgzersiz(Number(e.target.value))}
        >
          {listedeYok && <option value={satir.exerciseId}>{satir.exerciseName}</option>}
          {egzersizler.map((eg) => (
            <option key={eg.id} value={eg.id} disabled={baskaSatirdaSecilenler.has(eg.id)}>
              {eg.name}
            </option>
          ))}
        </SecimKutusu>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idOnEki}-set`} className={ALAN_ETIKETI}>
            <span className="sr-only">{onEk}: </span>
            Hedef set
          </label>
          <input
            id={`${idOnEki}-set`}
            inputMode="numeric"
            value={satir.plannedSets}
            onChange={(e) => onHedefSet(e.target.value)}
            className="h-12 w-full rounded-lg bg-inset px-4 text-body-lg text-fg tabular-nums focus:bg-surface-3"
          />
          {setHatasi && (
            <p role="alert" className="text-label text-danger">
              {setHatasi}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idOnEki}-dinlenme`} className={ALAN_ETIKETI}>
            <span className="sr-only">{onEk}: </span>
            Dinlenme
          </label>
          <SecimKutusu
            id={`${idOnEki}-dinlenme`}
            value={satir.restSeconds}
            onChange={(e) => onDinlenme(Number(e.target.value))}
          >
            {dinlenmeSecenekleri.map((secenek) => (
              <option key={secenek.deger} value={secenek.deger}>
                {secenek.etiket}
              </option>
            ))}
          </SecimKutusu>
        </div>
      </div>
    </li>
  );
}
