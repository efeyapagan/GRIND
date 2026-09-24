import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, Scale, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useDil } from '@grind/shared/i18n';
import {
  useAddMeasurement,
  useDeleteMeasurement,
  useInfiniteMeasurements,
  useUpdateMeasurement,
  type Olcu,
} from '../api/queries';
import { apiHatasiniAyir } from '../lib/apiErrors';
import { ayniTrGunuMu, formatSaat, formatTarih } from '../lib/format';
import { usePageTitle } from '../ui/PageTitleContext';
import Modal from '../ui/Modal';
import SayiAlani from '../ui/SayiAlani';
import BirincilDugme from '../ui/BirincilDugme';
import IkincilDugme from '../ui/IkincilDugme';
import IkonDugmesi from '../ui/IkonDugmesi';
import BosDurum from '../ui/BosDurum';
import HataKutusu from '../ui/HataKutusu';

const BILINEN_ALANLAR = ['weight', 'heightCm', 'bodyFatPercent', 'waistCm', 'hipCm'] as const;

/** Formdan cikan govde -- hem POST (`useAddMeasurement`) hem PATCH (`useUpdateMeasurement`) icin uyumlu. */
interface OlcumGovdesi {
  weight: number;
  heightCm: number;
  bodyFatPercent?: number;
  waistCm?: number;
  hipCm?: number;
}

/**
 * Vücut ölçüleri sekmesi (issue #119, kullanıcı kararıyla revize): "Yeni ölçüm ekle" bir
 * PENCERE (dialog) açar -- boy ve kilo ZORUNLU, yağ oranı/bel/kalça çevresi opsiyonel. Aynı gün
 * aynı boy+kiloyla ikinci bir kayıt sunucudan 409 alır ("zaten kayıtlı"); bu, sunucunun `detail`
 * metniyle `apiHatasiniAyir`in genel hata yoluyla otomatik gösterilir (409'un alan hatası yoktur).
 * Liste her satırda SADECE dolu olan ölçüleri gösterir (bkz. `olcuMetni`, backend'in
 * `ExportTextFormatter`ındaki aynı mantığın istemci tarafı karşılığı).
 *
 * #293: Profil'in kendi sekmelerinde ust basliktaki metin tamamen kalkti (bkz. `RecordsPage.tsx`
 * ayni gerekce) -- `usePageTitle('')` onceki basligi temizler.
 *
 * #260: ayni gun icin FARKLI degerli ikinci bir olcum girilmeye calisilinca (ayni pencere icinde)
 * bir soru gosterilir: "Yerine kaydet" (gunun EN SON olcumunu PATCH ile gunceller), "Ekstra olcum"
 * (bugunku POST akisi, degismedi) veya "Vazgec" (hicbir sey kaydedilmez, form acik kalir --
 * degerler kaybolmaz). TAM AYNI boy+kiloyla ikinci girisim (issue #119) bu sorunun DISINDA kalir --
 * o durumda sunucu hala sert 409 dondurur, davranis degismedi (kullanici karari). "Bugun" ve "en
 * son olcum" tespiti ilk sayfadaki (`useInfiniteMeasurements`, yeniden eskiye siralı) kayitlardan
 * yapilir -- bu yalnizca hangi UI'nin gosterilecegine karar verir, sunucudaki gercek kurali
 * DEGISTIRMEZ.
 */
export default function MeasurementsPage() {
  const { t } = useTranslation();
  usePageTitle('');
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteMeasurements();
  const ekleMutasyonu = useAddMeasurement();
  const guncelleMutasyonu = useUpdateMeasurement();
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
  // #260: dolu -- ayni gun icin farkli degerli ikinci bir olcum, kullaniciya soru sorulmasi
  // gerekiyor demektir. `hedefId`: "Yerine kaydet" secilirse guncellenecek (gunun en son) kayit.
  const [cakisma, setCakisma] = useState<{ govde: OlcumGovdesi; hedefId: number } | null>(null);
  const [cakismaHata, setCakismaHata] = useState<string | null>(null);

  function formuSifirla() {
    setKilo('');
    setBoy('');
    setYagOrani('');
    setBelCevresi('');
    setKalcaCevresi('');
    setGenelHata(null);
    setAlanHatalari({});
    setCakisma(null);
    setCakismaHata(null);
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

    const agirlik = sayiyaCevir(kilo);
    const boyDegeri = sayiyaCevir(boy);

    // Boy ve kilo ZORUNLU (kullanıcı kararı) -- sunucu da aynı kuralı uygular, burası sadece
    // hızlı geri bildirim (RegisterPage'deki istemci-tarafı doğrulama deseninin aynısı).
    if (agirlik === undefined || boyDegeri === undefined) {
      const hatalar: Record<string, string> = {};
      if (agirlik === undefined) hatalar.weight = t('olcumler.kiloGerekli');
      if (boyDegeri === undefined) hatalar.heightCm = t('olcumler.boyGerekli');
      setAlanHatalari(hatalar);
      return;
    }

    const govde: OlcumGovdesi = {
      weight: agirlik,
      heightCm: boyDegeri,
      bodyFatPercent: sayiyaCevir(yagOrani),
      waistCm: sayiyaCevir(belCevresi),
      hipCm: sayiyaCevir(kalcaCevresi),
    };

    // #260: bugunun (TR gunu) olculeri arasinda TAM AYNI boy+kiloyla bir kayit varsa (issue #119)
    // soru sorulmaz -- dogrudan gonderilir, sunucu hala sert 409 doner (davranis degismedi).
    // Bugun baska bir olcum var ama boy+kilo FARKLI ise soru sorulur.
    const suAn = new Date().toISOString();
    const bugununOlculeri = tumOlculer.filter((olcu) => ayniTrGunuMu(olcu.recordedAt, suAn));
    const tamAyniVarMi = bugununOlculeri.some(
      (olcu) => olcu.weight === govde.weight && olcu.heightCm === govde.heightCm,
    );
    if (bugununOlculeri.length > 0 && !tamAyniVarMi) {
      // Liste yeniden eskiye sirali (bkz. `useInfiniteMeasurements`) -- ilk oge gunun EN SON olcumu.
      setCakisma({ govde, hedefId: bugununOlculeri[0].id });
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

  function yerineKaydet() {
    if (!cakisma) {
      return;
    }
    setCakismaHata(null);
    guncelleMutasyonu.mutate(
      { id: cakisma.hedefId, ...cakisma.govde },
      {
        onSuccess: () => {
          formuSifirla();
          setModalAcik(false);
        },
        onError: (hata) => setCakismaHata(apiHatasiniAyir(hata, []).genelHata),
      },
    );
  }

  function ekstraOlcumEkle() {
    if (!cakisma) {
      return;
    }
    setCakismaHata(null);
    ekleMutasyonu.mutate(cakisma.govde, {
      onSuccess: () => {
        formuSifirla();
        setModalAcik(false);
      },
      onError: (hata) => setCakismaHata(apiHatasiniAyir(hata, []).genelHata),
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
        {t('olcumler.yeniOlcumEkle')}
      </BirincilDugme>

      <Modal
        acik={modalAcik}
        onKapat={() => setModalAcik(false)}
        baslik={cakisma ? t('olcumler.cakismaBaslik') : t('olcumler.yeniOlcum')}
      >
        {cakisma ? (
          // #260: ayni gun icin farkli degerli ikinci olcum -- form BILEREK arkada kalir (deger
          // kaybolmaz), "Vazgec" yalnizca bu soruyu kapatir, pencereyi degil.
          <div className="flex flex-col gap-3">
            {cakismaHata && <HataKutusu baslik={t('olcumler.kaydedilemedi')} mesaj={cakismaHata} />}
            <BirincilDugme
              yukseklik="normal"
              onClick={yerineKaydet}
              disabled={guncelleMutasyonu.isPending || ekleMutasyonu.isPending}
            >
              {t('olcumler.cakismaYerineKaydet')}
            </BirincilDugme>
            <IkincilDugme onClick={ekstraOlcumEkle} disabled={guncelleMutasyonu.isPending || ekleMutasyonu.isPending}>
              {t('olcumler.cakismaEkstraOlcum')}
            </IkincilDugme>
            <IkincilDugme onClick={() => setCakisma(null)}>{t('ortak.vazgec')}</IkincilDugme>
          </div>
        ) : (
          <form onSubmit={gonder} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              <SayiAlani
                id="olcu-boy"
                etiket={t('olcumler.boy')}
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
                etiket={t('olcumler.kilo')}
                ekranOkuyucuEki={t('setGirdisi.agirlikBirimEki')}
                birim="kg"
                inputMode="decimal"
                placeholder="—"
                value={kilo}
                onChange={setKilo}
                hata={alanHatalari.weight}
              />
              <SayiAlani
                id="olcu-yag-orani"
                etiket={t('olcumler.yagOrani')}
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
                etiket={t('olcumler.belCevresi')}
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
                etiket={t('olcumler.kalcaCevresi')}
                ekranOkuyucuEki=" (cm)"
                birim="cm"
                inputMode="decimal"
                placeholder="—"
                value={kalcaCevresi}
                onChange={setKalcaCevresi}
                hata={alanHatalari.hipCm}
              />
            </div>
            <p className="text-label text-muted">{t('olcumler.zorunluAciklama')}</p>
            {genelHata && <HataKutusu baslik={t('olcumler.kaydedilemedi')} mesaj={genelHata} />}
            <BirincilDugme type="submit" yukseklik="normal" disabled={ekleMutasyonu.isPending}>
              {t('ortak.kaydet')}
            </BirincilDugme>
          </form>
        )}
      </Modal>

      {isLoading && <p className="text-body text-muted">{t('ortak.yukleniyor')}</p>}

      {isError && (
        <p role="alert" className="text-body text-danger">
          {t('olcumler.hata')}
        </p>
      )}

      {!isLoading && !isError && data && tumOlculer.length === 0 && (
        <BosDurum ikon={Scale} baslik={t('olcumler.bosBaslik')} aciklama={t('olcumler.bosAciklama')} />
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
          {isFetchingNextPage && <p className="text-body text-muted">{t('ortak.yukleniyor')}</p>}
        </>
      )}
    </div>
  );
}

/** Sadece DOLU olan ölçüleri, virgülle ayırarak yazar -- backend'in export metnindeki mantığın aynısı. */
function olcuMetni(olcu: Olcu, t: TFunction): string {
  const parcalar: string[] = [];
  if (olcu.weight !== null) parcalar.push(`${olcu.weight} kg`);
  if (olcu.heightCm !== null) parcalar.push(t('olcumler.boyDegeri', { cm: olcu.heightCm }));
  if (olcu.bodyFatPercent !== null) parcalar.push(t('olcumler.yagDegeri', { yuzde: olcu.bodyFatPercent }));
  if (olcu.waistCm !== null) parcalar.push(t('olcumler.belDegeri', { cm: olcu.waistCm }));
  if (olcu.hipCm !== null) parcalar.push(t('olcumler.kalcaDegeri', { cm: olcu.hipCm }));
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
  const { t } = useTranslation();
  const dil = useDil();
  if (onayAcik) {
    return (
      <li className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
        <p className="text-body">{t('olcumler.silmeOnayi')}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSil}
            className="h-12 flex-1 rounded-xl bg-danger-bg text-label text-on-danger-bg"
          >
            {t('ortak.evetSil')}
          </button>
          <div className="flex-1">
            <IkincilDugme onClick={onVazgec}>{t('ortak.vazgec')}</IkincilDugme>
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
        <p className="text-body">{olcuMetni(olcu, t)}</p>
      </div>
      <IkonDugmesi etiket={t('olcumler.olcuyuSil')} onClick={onSilmeyeBasla}>
        <Trash2 aria-hidden size={18} />
      </IkonDugmesi>
    </li>
  );
}
