import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiHatasiniAyir } from '@grind/shared/lib/apiErrors';
import Modal from '../ui/Modal';
import SifreAlani from '../ui/SifreAlani';
import BirincilDugme from '../ui/BirincilDugme';
import HataKutusu from '../ui/HataKutusu';

const MIN_SIFRE_KARAKTER = 8;
const MAKS_SIFRE_BAYT = 72;

interface Props {
  acik: boolean;
  onKapat: () => void;
  updateProfile: (mevcutSifre: string, yeniKullaniciAdi?: string, yeniSifre?: string) => Promise<void>;
}

/**
 * Sifre degistirme penceresi (#372). Once hesap ayarlarinda satir ici bir formdu; kimlik bilgileri
 * Profili duzenle'de toplaninca ekranin ortasinda acilan bir pencereye tasindi. Dogrulama davranisi
 * aynen korundu (401 -> "Mevcut sifre yanlis.").
 */
export default function SifreDegistirPenceresi({ acik, onKapat, updateProfile }: Props) {
  const { t } = useTranslation();
  const [mevcutSifre, setMevcutSifre] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');
  const [yeniSifreTekrari, setYeniSifreTekrari] = useState('');
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  function dogrula(): boolean {
    const hatalar: Record<string, string> = {};
    if (mevcutSifre.length === 0) {
      hatalar.currentpassword = t('profil.mevcutSifreGerekli');
    }
    // Uzunluk kurali sunucununkiyle ayni (RegisterRequest): en az 8 karakter, en fazla 72 BAYT
    // (BCrypt siniri -- Turkce harfler iki bayt oldugu icin karakter sayisi yetmez).
    if (yeniSifre.length === 0) {
      hatalar.newpassword = t('profil.sifreGerekli');
    } else if (yeniSifre.length < MIN_SIFRE_KARAKTER) {
      hatalar.newpassword = t('profil.sifreEnAz8');
    } else if (new TextEncoder().encode(yeniSifre).length > MAKS_SIFRE_BAYT) {
      hatalar.newpassword = t('profil.sifreEnFazla72Bayt');
    }
    if (!hatalar.newpassword && yeniSifreTekrari !== yeniSifre) {
      hatalar.newpasswordconfirm = t('profil.sifrelerEslesmiyor');
    }
    setAlanHatalari(hatalar);
    return Object.keys(hatalar).length === 0;
  }

  async function gonder() {
    setGenelHata(null);
    if (!dogrula()) {
      return;
    }
    setGonderiliyor(true);
    try {
      await updateProfile(mevcutSifre, undefined, yeniSifre);
      setMevcutSifre('');
      setYeniSifre('');
      setYeniSifreTekrari('');
      onKapat();
    } catch (hata) {
      const sonuc = apiHatasiniAyir(hata, ['currentpassword', 'newpassword'], (apiHatasi) =>
        apiHatasi.status === 401 ? t('profil.mevcutSifreYanlis') : null,
      );
      setGenelHata(sonuc.genelHata);
      setAlanHatalari(sonuc.alanHatalari);
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <Modal acik={acik} onKapat={onKapat} baslik={t('profil.sifreDegistir')}>
      {genelHata && <HataKutusu baslik={t('profil.guncellenemedi')} mesaj={genelHata} />}
      <SifreAlani
        id="profil-mevcut-sifre"
        etiket={t('profil.mevcutSifre')}
        autoComplete="current-password"
        value={mevcutSifre}
        onChangeText={setMevcutSifre}
        hata={alanHatalari.currentpassword}
      />
      <SifreAlani
        id="profil-yeni-sifre"
        etiket={t('profil.yeniSifre')}
        autoComplete="new-password"
        ipucu={t('profil.sifreIpucu')}
        value={yeniSifre}
        onChangeText={setYeniSifre}
        hata={alanHatalari.newpassword}
      />
      <SifreAlani
        id="profil-yeni-sifre-tekrar"
        etiket={t('profil.yeniSifreTekrari')}
        gosterEtiketi={t('profil.yeniSifreTekrariniGoster')}
        autoComplete="new-password"
        value={yeniSifreTekrari}
        onChangeText={setYeniSifreTekrari}
        hata={alanHatalari.newpasswordconfirm}
      />
      <BirincilDugme yukseklik="normal" disabled={gonderiliyor} onPress={gonder}>
        {t('ortak.kaydet')}
      </BirincilDugme>
    </Modal>
  );
}
