import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Cake, ImagePlus, Trash2, UserRound, X } from 'lucide-react-native';
import { useDil } from '@grind/shared/i18n';
import {
  useFotografiKaldir,
  useFotografiYukle,
  useProfiliGuncelle,
  useProfilim,
  type Profil,
} from '@grind/shared/api/queries';
import { apiHatasiniAyir } from '@grind/shared/lib/apiErrors';
import { formatTarih } from '@grind/shared/lib/format';
import { PROFIL_FOTOGRAFI_KENARI } from '@grind/shared/lib/profilFotografi';
import { usePageTitle } from '@grind/shared/pageTitle';
import Alan from '../../../src/ui/Alan';
import BirincilDugme from '../../../src/ui/BirincilDugme';
import HataKutusu from '../../../src/ui/HataKutusu';
import EkranKaydirici from '../../../src/ui/EkranKaydirici';
import ProfilFotografi from '../../../src/components/ProfilFotografi';
import { ikonRenk } from '../../../src/ui/renkler';

const MAKS_ISIM_KARAKTER = 50;

/** web/src/pages/ProfiliDuzenlePage.tsx ile ayni (#283); fotograf galeriden, 1:1 kirpilarak secilir. */
export default function ProfiliDuzenleScreen() {
  const { t } = useTranslation();
  usePageTitle(t('ortak.profiliDuzenle'));
  const profil = useProfilim();

  return (
    <EkranKaydirici contentContainerClassName="gap-6 px-4 pt-2 pb-4">
      {profil.isError && <HataKutusu baslik={t('profil.guncellenemedi')} mesaj={t('profil.profilAlinamadi')} />}
      {profil.data && (
        <>
          <FotografAlani profil={profil.data} />
          <BilgiFormu profil={profil.data} />
        </>
      )}
    </EkranKaydirici>
  );
}

/** Galeri 1:1 kirpar; sonuc sunucuya gitmeden once `PROFIL_FOTOGRAFI_KENARI` JPEG'e kuculur. */
async function fotografSecVeKucult(): Promise<string | null> {
  const secim = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (secim.canceled || !secim.assets?.[0]) {
    return null;
  }
  const baglam = ImageManipulator.manipulate(secim.assets[0].uri).resize({
    width: PROFIL_FOTOGRAFI_KENARI,
    height: PROFIL_FOTOGRAFI_KENARI,
  });
  const gorsel = await baglam.renderAsync();
  const kayit = await gorsel.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  return kayit.uri;
}

function FotografAlani({ profil }: { profil: Profil }) {
  const { t } = useTranslation();
  const yukle = useFotografiYukle();
  const kaldir = useFotografiKaldir();
  const [hata, setHata] = useState(false);
  const mesgul = yukle.isPending || kaldir.isPending;

  async function sec() {
    setHata(false);
    try {
      const uri = await fotografSecVeKucult();
      if (!uri) {
        return;
      }
      const govde = new FormData();
      // Expo 57'nin global fetch'i (expo/fetch) RN'in eski `{ uri, name, type }` parcasini DESTEKLEMEZ
      // ("Unsupported FormDataPart", istek hic gitmez) -- dosya Blob uyumlu `File` olarak eklenir; ad ve
      // tur (`.jpg` -> image/jpeg) dosyanin kendisinden gelir.
      govde.append('file', new File(uri));
      await yukle.mutateAsync(govde);
    } catch {
      setHata(true);
    }
  }

  return (
    <View className="flex-col items-center gap-3">
      <ProfilFotografi profil={profil} boyut="buyuk" />
      {hata && <HataKutusu baslik={t('profil.guncellenemedi')} mesaj={t('profil.fotografYuklenemedi')} />}
      <View className="w-full flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          disabled={mesgul}
          onPress={sec}
          className={`h-10 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-surface-3 px-3 ${mesgul ? 'opacity-60' : ''}`}
        >
          <ImagePlus color={ikonRenk.fg} size={18} />
          <Text className="text-label text-fg">{t('profil.fotografSec')}</Text>
        </Pressable>
        {profil.hasAvatar && (
          <Pressable
            accessibilityRole="button"
            disabled={mesgul}
            onPress={() => {
              setHata(false);
              kaldir.mutate(undefined, { onError: () => setHata(true) });
            }}
            className={`h-10 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-surface-3 px-3 ${mesgul ? 'opacity-60' : ''}`}
          >
            <Trash2 color={ikonRenk.danger} size={18} />
            <Text className="text-label text-danger">{t('profil.fotografiKaldir')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** 'YYYY-AA-GG' <-> yerel gun; saat dilimi kaymasin diye UTC'ye cevrilmez. */
function tariheCevir(gun: string): Date {
  const [yil, ay, gunNo] = gun.split('-').map(Number);
  return new Date(yil, ay - 1, gunNo);
}

function gunMetni(tarih: Date): string {
  const iki = (n: number) => String(n).padStart(2, '0');
  return `${tarih.getFullYear()}-${iki(tarih.getMonth() + 1)}-${iki(tarih.getDate())}`;
}

/** Varsayilan secim 25 yil once -- takvim bugunden acilsaydi dogum yilina uzun bir kaydirma gerekirdi. */
function varsayilanTarih(): Date {
  const bugun = new Date();
  return new Date(bugun.getFullYear() - 25, bugun.getMonth(), bugun.getDate());
}

/**
 * Dogum tarihi: Android'de sistem takvim penceresi, iOS'ta satir icinde acilan tarih carki (platforma
 * uygun etkilesim, #211). Bos = tarih yok; temizle dugmesi `null` gonderir.
 */
function DogumTarihiAlani({ deger, degistir }: { deger: string; degistir: (gun: string) => void }) {
  const { t } = useTranslation();
  const dil = useDil();
  const [iosAcik, setIosAcik] = useState(false);
  const secili = deger ? tariheCevir(deger) : varsayilanTarih();

  // v9: `onChange` kullanimdan kalkti; `onValueChange` yalnizca secim onaylaninca cagrilir (iptal `onDismiss`).
  function secildi(_olay: unknown, tarih: Date) {
    degistir(gunMetni(tarih));
  }

  function ac() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: secili, mode: 'date', maximumDate: new Date(), onValueChange: secildi });
    } else {
      setIosAcik((acik) => !acik);
    }
  }

  return (
    <View className="flex-col gap-1">
      <Text className="text-label text-fg">{t('profil.dogumTarihi')}</Text>
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profil.dogumTarihi')}
          onPress={ac}
          className="h-12 flex-1 flex-row items-center gap-3 rounded-xl bg-surface-2 px-3"
        >
          <Cake color={ikonRenk.muted} size={20} />
          <Text className={`text-body ${deger ? 'text-fg' : 'text-muted'}`}>
            {deger ? formatTarih(`${deger}T12:00:00Z`, dil) : t('profil.tarihSecilmedi')}
          </Text>
        </Pressable>
        {deger !== '' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profil.dogumTarihiniTemizle')}
            onPress={() => degistir('')}
            className="size-12 items-center justify-center rounded-xl bg-surface-2"
          >
            <X color={ikonRenk.muted} size={20} />
          </Pressable>
        )}
      </View>
      {iosAcik && (
        <DateTimePicker
          value={secili}
          mode="date"
          display="spinner"
          maximumDate={new Date()}
          onValueChange={secildi}
        />
      )}
    </View>
  );
}

function BilgiFormu({ profil }: { profil: Profil }) {
  const { t } = useTranslation();
  const router = useRouter();
  const guncelle = useProfiliGuncelle();
  const [isim, setIsim] = useState(profil.displayName ?? '');
  const [dogumTarihi, setDogumTarihi] = useState(profil.birthDate ?? '');
  const [genelHata, setGenelHata] = useState<string | null>(null);

  async function gonder() {
    setGenelHata(null);
    try {
      // Bos alan "temizle" demektir (#280): sunucu `null`'u alani silmek olarak yorumlar.
      await guncelle.mutateAsync({ displayName: isim.trim() || null, birthDate: dogumTarihi || null });
      router.replace('/profile/history');
    } catch (hata) {
      setGenelHata(apiHatasiniAyir(hata, []).genelHata);
    }
  }

  return (
    <View className="flex-col gap-4 rounded-xl bg-surface-1 p-4">
      {genelHata && <HataKutusu baslik={t('profil.guncellenemedi')} mesaj={genelHata} />}
      <Alan
        id="profil-gorunen-isim"
        etiket={t('profil.gorunenIsim')}
        ikon={UserRound}
        autoComplete="name"
        maxLength={MAKS_ISIM_KARAKTER}
        value={isim}
        onChangeText={setIsim}
      />
      <DogumTarihiAlani deger={dogumTarihi} degistir={setDogumTarihi} />
      <BirincilDugme yukseklik="normal" disabled={guncelle.isPending} onPress={gonder}>
        {t('ortak.kaydet')}
      </BirincilDugme>
    </View>
  );
}
