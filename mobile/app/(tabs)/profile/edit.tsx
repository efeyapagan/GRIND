import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Cake, ImagePlus, Pencil, Trash2, UserRound, X } from 'lucide-react-native';
import { useDil } from '@grind/shared/i18n';
import {
  useFotografiKaldir,
  useFotografiYukle,
  useProfiliGuncelle,
  useProfilim,
  type Profil,
} from '@grind/shared/api/queries';
import { ApiError } from '@grind/shared/api/problem';
import { apiHatasiniAyir } from '@grind/shared/lib/apiErrors';
import { formatTarih } from '@grind/shared/lib/format';
import { PROFIL_FOTOGRAFI_KENARI } from '@grind/shared/lib/profilFotografi';
import { usePageTitle } from '@grind/shared/pageTitle';
import Alan from '../../../src/ui/Alan';
import BirincilDugme from '../../../src/ui/BirincilDugme';
import HataKutusu from '../../../src/ui/HataKutusu';
import EkranKaydirici from '../../../src/ui/EkranKaydirici';
import ProfilFotografi from '../../../src/components/ProfilFotografi';
import KullaniciAdiPenceresi from '../../../src/components/KullaniciAdiPenceresi';
import { useAuth } from '../../../src/auth/AuthContext';
import { useIkonRenk } from '../../../src/ui/renkler';

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

/** Galeri 1:1 kirpar (OS'un kendi kirpma ekrani). Iptal edilirse `null`. */
async function galeridenSec(): Promise<string | null> {
  const secim = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (secim.canceled || !secim.assets?.[0]) {
    return null;
  }
  return secim.assets[0].uri;
}

/** Kirpilan gorsel sunucuya gitmeden once `PROFIL_FOTOGRAFI_KENARI` JPEG'e kuculur. */
async function kucult(uri: string): Promise<string> {
  const baglam = ImageManipulator.manipulate(uri).resize({
    width: PROFIL_FOTOGRAFI_KENARI,
    height: PROFIL_FOTOGRAFI_KENARI,
  });
  const gorsel = await baglam.renderAsync();
  const kayit = await gorsel.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  return kayit.uri;
}

/** Hatanin kendi metni -- kullanici cihazda gordugunu aktarabilsin diye ekrana yazilir (#510). */
function hataMetni(hata: unknown): string {
  return hata instanceof Error ? hata.message : String(hata);
}

interface FotografHatasi {
  mesaj: string;
  ayrinti?: string;
}

function FotografAlani({ profil }: { profil: Profil }) {
  const ikonRenk = useIkonRenk();
  const { t } = useTranslation();
  const yukle = useFotografiYukle();
  const kaldir = useFotografiKaldir();
  const [hata, setHata] = useState<FotografHatasi | null>(null);
  // Galeri kapandiktan SONRA kucultme de cihazda zaman alir; gosterge yalnizca yuklemeyi degil onu da kapsar.
  const [hazirlaniyor, setHazirlaniyor] = useState(false);
  const calisiyor = hazirlaniyor || yukle.isPending;
  const mesgul = calisiyor || kaldir.isPending;

  /** Sunucu reddettiyse KENDI mesaji (ör. "JPEG, PNG ya da WebP olmalı"); ulasilamadiysa ayrintisiyla. */
  function sunucuHatasi(hataNesnesi: unknown): FotografHatasi {
    if (hataNesnesi instanceof ApiError) {
      return { mesaj: apiHatasiniAyir(hataNesnesi, []).genelHata ?? t('profil.fotografYuklenemedi') };
    }
    return {
      mesaj: t('profil.fotografGonderilemedi'),
      ayrinti: t('profil.hataAyrintisi', { ayrinti: hataMetni(hataNesnesi) }),
    };
  }

  /**
   * #510 (kullanici bildirdi, gercek iPhone -- simulatorde akis calisiyor): once tum hatalar tek,
   * sabit bir "yuklenemedi" mesajina yutuluyordu ve cihazda NEYIN patladigi gorulemiyordu. Akis
   * artik uc adima bolunur -- galeri, hazirlama (kucultme + dosya), gonderme -- ve her adimin hatasi
   * kendi adiyla ve hatanin kendi metniyle ekrana yazilir. Hazirlanamayan fotograf gonderilmez.
   */
  async function sec() {
    setHata(null);
    let govde: FormData;
    try {
      const secilen = await galeridenSec();
      if (!secilen) {
        return;
      }
      setHazirlaniyor(true);
      const kucuk = await kucult(secilen);
      govde = new FormData();
      // Expo 57'nin global fetch'i (expo/fetch) RN'in eski `{ uri, name, type }` parcasini DESTEKLEMEZ
      // ("Unsupported FormDataPart", istek hic gitmez) -- dosya Blob uyumlu `File` olarak eklenir; ad ve
      // tur (`.jpg` -> image/jpeg) dosyanin kendisinden gelir.
      govde.append('file', new File(kucuk));
    } catch (hataNesnesi) {
      setHazirlaniyor(false);
      setHata({
        mesaj: t('profil.fotografHazirlanamadi'),
        ayrinti: t('profil.hataAyrintisi', { ayrinti: hataMetni(hataNesnesi) }),
      });
      return;
    }
    setHazirlaniyor(false);
    try {
      await yukle.mutateAsync(govde);
    } catch (hataNesnesi) {
      setHata(sunucuHatasi(hataNesnesi));
    }
  }

  return (
    <View className="flex-col items-center gap-3">
      <View className="items-center justify-center">
        <ProfilFotografi profil={profil} boyut="buyuk" />
        {/* #510: yukleme ve hazirlama surerken gorunur gosterge -- dugmeyi soluklastirmak yetmiyordu. */}
        {calisiyor && (
          <View
            testID="fotograf-yukleniyor"
            accessibilityLabel={t('ortak.yukleniyor')}
            className="absolute inset-0 items-center justify-center"
          >
            <ActivityIndicator color={ikonRenk.fg} />
          </View>
        )}
      </View>
      {hata && <HataKutusu baslik={t('profil.fotografYuklenemedi')} mesaj={hata.mesaj} ayrinti={hata.ayrinti} />}
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
              setHata(null);
              kaldir.mutate(undefined, { onError: (hataNesnesi) => setHata(sunucuHatasi(hataNesnesi)) });
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
  const ikonRenk = useIkonRenk();
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
    <>
      {genelHata && <HataKutusu baslik={t('profil.guncellenemedi')} mesaj={genelHata} />}
      <View className="flex-col gap-4 rounded-xl bg-surface-1 p-4">
        <Alan
          id="profil-gorunen-isim"
          etiket={t('profil.gorunenIsim')}
          ikon={UserRound}
          autoComplete="name"
          maxLength={MAKS_ISIM_KARAKTER}
          value={isim}
          onChangeText={setIsim}
        />
      </View>
      <KullaniciAdiKarti />
      <View className="flex-col gap-4 rounded-xl bg-surface-1 p-4">
        <DogumTarihiAlani deger={dogumTarihi} degistir={setDogumTarihi} />
      </View>
      {/* Kullanici karari: Kaydet dogum tarihiyle AYNI kutuda degil -- alanlara degil, formun
          tamamina ait oldugu daha acik olsun. */}
      <View className="rounded-xl bg-surface-1 p-4">
        <BirincilDugme yukseklik="normal" disabled={guncelle.isPending} onPress={gonder}>
          {t('ortak.kaydet')}
        </BirincilDugme>
      </View>
    </>
  );
}

/**
 * Kullanici adi karti (#372): ad salt-okunur, degistirmek sagdaki kalem ikonundan acilan pencereyle.
 * Ad, profil yanitindan DEGIL `useAuth`tan okunur -- degisiklikten sonra yeni token'la birlikte
 * oradaki deger aninda tazelenir (`AuthContext.updateProfile`).
 */
function KullaniciAdiKarti() {
  const ikonRenk = useIkonRenk();
  const { t } = useTranslation();
  const { username, updateProfile } = useAuth();
  const [acik, setAcik] = useState(false);

  return (
    <View className="flex-col gap-1 rounded-xl bg-surface-1 p-4">
      <Text className="text-label text-fg">{t('ortak.kullaniciAdi')}</Text>
      <View className="flex-row items-center gap-2">
        <Text className="min-w-0 flex-1 text-body text-fg">@{username}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profil.kullaniciAdiDegistir')}
          onPress={() => setAcik(true)}
          className="size-11 items-center justify-center rounded-xl bg-surface-2"
        >
          <Pencil color={ikonRenk.fg} size={18} />
        </Pressable>
      </View>
      {acik && (
        <KullaniciAdiPenceresi
          acik={acik}
          onKapat={() => setAcik(false)}
          mevcutAd={username ?? ''}
          updateProfile={updateProfile}
        />
      )}
    </View>
  );
}

