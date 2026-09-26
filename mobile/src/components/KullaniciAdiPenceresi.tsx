import { useState } from 'react';
import { View, Text } from 'react-native';
import { AtSign } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useKullaniciAdiUygunMu } from '@grind/shared/api/queries';
import { ApiError } from '@grind/shared/api/problem';
import { apiHatasiniAyir } from '@grind/shared/lib/apiErrors';
import Modal from '../ui/Modal';
import Alan from '../ui/Alan';
import BirincilDugme from '../ui/BirincilDugme';
import HataKutusu from '../ui/HataKutusu';
import { useGecikmeliDeger } from '../ui/useGecikmeliDeger';
import { KULLANICI_ADI_KURALI } from '../lib/kullaniciAdi';
import type { ProfilGuncelleme } from '../auth/AuthContext';

/** Kullanici karari (#372): yazmayi biraktiktan 3 saniye sonra uygunluk sorulur. */
export const UYGUNLUK_GECIKMESI_MS = 3000;

interface Props {
  acik: boolean;
  onKapat: () => void;
  mevcutAd: string;
  updateProfile: (girdi: ProfilGuncelleme) => Promise<void>;
}

/**
 * Kullanici adi degistirme penceresi (#372). Profili duzenle ekranindaki kalem ikonu acar.
 *
 * Mevcut ad USTTE DUZ METIN (kullanici karari): degistirilemeyen bir degeri kutu icinde gostermek
 * "buraya da yazabilirim" izlenimi verirdi.
 *
 * Uygunluk her tusa basista degil, yazma durunca sorulur (`useGecikmeliDeger`) -- her harf icin
 * istek atmak hem gereksiz hem de yaniltici (yarim yazilmis ad hep "uygun" cikar). Bicim kurali
 * ISTEMCIDE: bozuk ada uc 400 doner, onu "alinmis" diye gostermek yanlis olurdu.
 *
 * Mevcut sifre ISTENMEZ (#378, kullanici karari): kullanici adi degistirmek icin teyit gerekmiyor.
 * Sifre degisimi teyidi korur.
 */
export default function KullaniciAdiPenceresi({ acik, onKapat, mevcutAd, updateProfile }: Props) {
  const { t } = useTranslation();
  const [yeniAd, setYeniAd] = useState(mevcutAd);
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const bicimGecerli = KULLANICI_ADI_KURALI.test(yeniAd);
  const degisti = yeniAd.toLowerCase() !== mevcutAd.toLowerCase();
  const sorulacakAd = useGecikmeliDeger(bicimGecerli && degisti ? yeniAd : '', UYGUNLUK_GECIKMESI_MS);
  const uygunluk = useKullaniciAdiUygunMu(sorulacakAd || null);
  // Yazmaya devam ederken eski adin sonucu ekranda kalmasin.
  const sonucGuncel = sorulacakAd === yeniAd && bicimGecerli && degisti;

  function durumMetni(): { metin: string; renk: string } | null {
    if (!bicimGecerli && yeniAd.length > 0) {
      return { metin: t('profil.kullaniciAdiKurali'), renk: 'text-danger' };
    }
    if (!degisti || !bicimGecerli) {
      return null;
    }
    if (!sonucGuncel || uygunluk.isPending) {
      return { metin: t('profil.kullaniciAdiKontrolEdiliyor'), renk: 'text-muted' };
    }
    if (uygunluk.isError) {
      return { metin: t('profil.kullaniciAdiKontrolEdilemedi'), renk: 'text-muted' };
    }
    return uygunluk.data
      // Olumlu sonuc yesil: `accent-soft` turuncu tonu uyari gibi okunuyordu (gozle kontrol).
      // Kontrast iki temada da metin esiginin ustunde (koyu 10.05, acik 4.88).
      ? { metin: t('profil.kullaniciAdiUygun'), renk: 'text-success' }
      : { metin: t('profil.kullaniciAdiAlinmis'), renk: 'text-danger' };
  }

  async function gonder() {
    setGenelHata(null);
    const hatalar: Record<string, string> = {};
    if (!bicimGecerli) {
      hatalar.newusername = t('profil.kullaniciAdiKurali');
    } else if (!degisti) {
      hatalar.newusername = t('profil.kullaniciAdiDegismedi');
    }
    setAlanHatalari(hatalar);
    if (Object.keys(hatalar).length > 0) {
      return;
    }

    setGonderiliyor(true);
    try {
      await updateProfile({ yeniKullaniciAdi: yeniAd });
      onKapat();
    } catch (hata) {
      // Cakisma kontrolu SUNUCUDA: uygunluk sorgusu bir on bilgidir, son soz Kaydet'indir
      // (arada baskasi o adi almis olabilir).
      if (hata instanceof ApiError && hata.status === 409) {
        setAlanHatalari({ newusername: t('profil.kullaniciAdiAlinmis') });
        return;
      }
      const sonuc = apiHatasiniAyir(hata, ['newusername']);
      setGenelHata(sonuc.genelHata);
      setAlanHatalari(sonuc.alanHatalari);
    } finally {
      setGonderiliyor(false);
    }
  }

  const durum = durumMetni();

  return (
    <Modal acik={acik} onKapat={onKapat} baslik={t('profil.kullaniciAdiDegistir')}>
      {genelHata && <HataKutusu baslik={t('profil.guncellenemedi')} mesaj={genelHata} />}
      <View className="flex-col gap-1">
        <Text className="text-label text-muted">{t('profil.mevcutKullaniciAdi')}</Text>
        <Text className="text-body-lg text-fg">@{mevcutAd}</Text>
      </View>
      <Alan
        id="profil-yeni-kullanici-adi"
        etiket={t('profil.yeniKullaniciAdi')}
        ikon={AtSign}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        value={yeniAd}
        onChangeText={setYeniAd}
        hata={alanHatalari.newusername}
      />
      {durum && (
        <Text accessibilityRole="text" className={`text-label ${durum.renk}`}>
          {durum.metin}
        </Text>
      )}
      <BirincilDugme yukseklik="normal" disabled={gonderiliyor} onPress={gonder}>
        {t('ortak.kaydet')}
      </BirincilDugme>
    </Modal>
  );
}
