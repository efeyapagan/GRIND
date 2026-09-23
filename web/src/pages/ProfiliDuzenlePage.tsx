import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cake, ImagePlus, Trash2, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useFotografiKaldir,
  useFotografiYukle,
  useProfiliGuncelle,
  useProfilim,
  type Profil,
} from '../api/queries';
import { apiHatasiniAyir } from '../lib/apiErrors';
import { fotografiKucult } from '../lib/fotografiKucult';
import { trBugundenOnce } from '../lib/format';
import { usePageTitle } from '../ui/PageTitleContext';
import Alan from '../ui/Alan';
import BirincilDugme from '../ui/BirincilDugme';
import HataKutusu from '../ui/HataKutusu';
import ProfilFotografi from '../components/ProfilFotografi';

const MAKS_ISIM_KARAKTER = 50;

/**
 * Profili düzenle (#283): fotoğraf seçilir seçilmez küçültülüp yüklenir (Kaydet'i beklemez); isim ve
 * doğum tarihi Kaydet ile gider. Kayıt aynı `profil` önbelleğini günceller, başlığa anında yansır.
 */
export default function ProfiliDuzenlePage() {
  const { t } = useTranslation();
  usePageTitle(t('ortak.profiliDuzenle'));
  const profil = useProfilim();

  if (profil.isError) {
    return <HataKutusu baslik={t('profil.guncellenemedi')} mesaj={t('profil.profilAlinamadi')} />;
  }
  if (!profil.data) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 pt-2 pb-4">
      <FotografAlani profil={profil.data} />
      <BilgiFormu profil={profil.data} />
    </div>
  );
}

function FotografAlani({ profil }: { profil: Profil }) {
  const { t } = useTranslation();
  const yukle = useFotografiYukle();
  const kaldir = useFotografiKaldir();
  const [hata, setHata] = useState(false);
  const mesgul = yukle.isPending || kaldir.isPending;

  async function sec(e: ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0];
    // Aynı dosya yeniden seçilebilsin diye girdi hemen boşaltılır.
    e.target.value = '';
    if (!dosya) {
      return;
    }
    setHata(false);
    try {
      const govde = new FormData();
      govde.append('file', await fotografiKucult(dosya), 'avatar.jpg');
      await yukle.mutateAsync(govde);
    } catch {
      setHata(true);
    }
  }

  function fotografiKaldir() {
    setHata(false);
    kaldir.mutate(undefined, { onError: () => setHata(true) });
  }

  return (
    <section className="flex flex-col items-center gap-3">
      <ProfilFotografi profil={profil} boyut="buyuk" />
      {hata && <HataKutusu baslik={t('profil.guncellenemedi')} mesaj={t('profil.fotografYuklenemedi')} />}
      <div className="flex w-full gap-2">
        <label
          htmlFor="profil-fotografi"
          className={`flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-surface-3 px-3 text-label text-fg focus-within:outline-2 focus-within:outline-accent-fg ${
            mesgul ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          <ImagePlus aria-hidden size={18} />
          {t('profil.fotografSec')}
          <input
            id="profil-fotografi"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={mesgul}
            onChange={sec}
            className="sr-only"
          />
        </label>
        {profil.hasAvatar && (
          <button
            type="button"
            onClick={fotografiKaldir}
            disabled={mesgul}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-surface-3 px-3 text-label text-danger disabled:opacity-60"
          >
            <Trash2 aria-hidden size={18} />
            {t('profil.fotografiKaldir')}
          </button>
        )}
      </div>
    </section>
  );
}

function BilgiFormu({ profil }: { profil: Profil }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const guncelle = useProfiliGuncelle();
  const [isim, setIsim] = useState(profil.displayName ?? '');
  const [dogumTarihi, setDogumTarihi] = useState(profil.birthDate ?? '');
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});

  async function gonder(e: FormEvent) {
    e.preventDefault();
    setGenelHata(null);
    setAlanHatalari({});
    try {
      // Boş alan "temizle" demektir (#280): sunucu `null`'u alanı silmek olarak yorumlar.
      await guncelle.mutateAsync({ displayName: isim.trim() || null, birthDate: dogumTarihi || null });
      navigate('/profile/history', { replace: true });
    } catch (hata) {
      const sonuc = apiHatasiniAyir(hata, ['displayname', 'birthdate']);
      setGenelHata(sonuc.genelHata);
      setAlanHatalari(sonuc.alanHatalari);
    }
  }

  return (
    <form onSubmit={gonder} className="flex flex-col gap-4 rounded-xl bg-surface-1 p-4">
      {genelHata && <HataKutusu baslik={t('profil.guncellenemedi')} mesaj={genelHata} />}
      <Alan
        id="profil-gorunen-isim"
        etiket={t('profil.gorunenIsim')}
        ikon={UserRound}
        autoComplete="name"
        maxLength={MAKS_ISIM_KARAKTER}
        value={isim}
        onChange={(e) => setIsim(e.target.value)}
        hata={alanHatalari.displayname}
      />
      <Alan
        id="profil-dogum-tarihi"
        etiket={t('profil.dogumTarihi')}
        ikon={Cake}
        type="date"
        autoComplete="bday"
        max={trBugundenOnce(0)}
        value={dogumTarihi}
        onChange={(e) => setDogumTarihi(e.target.value)}
        hata={alanHatalari.birthdate}
      />
      <BirincilDugme type="submit" yukseklik="normal" disabled={guncelle.isPending}>
        {t('ortak.kaydet')}
      </BirincilDugme>
    </form>
  );
}
