import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  withSpring,
  withTiming,
  type EntryAnimationsValues,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import EkranKaydirici from '../../src/ui/EkranKaydirici';
import { ChevronLeft, ClipboardList, Plus } from 'lucide-react-native';
import {
  useExercises,
  useOpenSession,
  useSessionSets,
  useTemplate,
  type SetKaydi,
} from '@grind/shared/api/queries';
import { formatSaat } from '@grind/shared/lib/format';
import { adaGoreSirala } from '@grind/shared/lib/egzersizler';
import { GERI_AL_MS, useGecikmeliSilme } from '@grind/shared/lib/gecikmeliSilme';
import { hedefTamamlandi, varsayilanHareket } from '@grind/shared/lib/ilerleme';
import { dinlenmeBaslat, dinlenmeSuresi } from '@grind/shared/lib/dinlenme';
import { oturumdanSablonHareketleri, sablondanSapmaVarMi } from '@grind/shared/lib/sablonTaslagi';
import { usePageTitle } from '@grind/shared/pageTitle';
import SetList from '../../src/components/SetList';
import AntrenmanAltAlani from '../../src/components/AntrenmanAltAlani';
import SetPaneli from '../../src/components/SetPaneli';
import SetDuzenleyici from '../../src/components/SetDuzenleyici';
import { useDinlenme } from '../../src/components/useDinlenme';
import { useAltMenuPayi } from '../../src/ui/KabukTabBar';
import { useKlavyeYuksekligi } from '../../src/ui/useKlavyeYuksekligi';
import HareketGecmisi from '../../src/components/HareketGecmisi';
import HareketKartlari from '../../src/components/HareketKartlari';
import OdakKarti from '../../src/components/OdakKarti';
import SablonlaBasla from '../../src/components/SablonlaBasla';
import DevamEdenAntrenman from '../../src/components/DevamEdenAntrenman';
import SablonOlusturCagrisi from '../../src/components/SablonOlusturCagrisi';
import GeriAlSeridi from '../../src/ui/GeriAlSeridi';
import CamIkincilDugme from '../../src/ui/CamIkincilDugme';
import TurEtiketi from '../../src/ui/TurEtiketi';
import {
  useKuyrukluAddSessionExercise,
  useKuyrukluDeleteSession,
  useKuyrukluHareketKaldir,
  useKuyrukluReorderSessionExercises,
  useKuyrukluSetSil,
  useKuyrukluStartSession,
} from '../../src/kuyruk/kuyrukluMutasyonlar';
import { useEtkinTema, useIkonRenk } from '../../src/ui/renkler';

/** Klavye acikken yuzer set panelinin klavyenin ustunde biraktigi bosluk (#350). */
const KLAVYE_BOSLUGU = 8;
/**
 * Set panelinin acilisi (#350): alttan 48 pt yukari, alt menu balonuyla ayni hafif tasmali yay
 * (KabukTabBar `ACILIS_YAYI`) -- sert degil, "yerine oturan" bir his. Kapanis kisa bir asagi kayip sonme.
 */
const PANEL_ACILISI = FadeInDown.springify()
  .damping(14)
  .stiffness(180)
  .mass(0.8)
  .withInitialValues({ transform: [{ translateY: 48 }] });
const PANEL_KAPANISI = FadeOutDown.duration(150);
/** Odak kartiyla set paneli arasindaki bosluk (#354). */
const ODAK_BOSLUGU = 12;
/**
 * Odak kartinin acilisi (#354): hafif kucukten, set paneliyle ayni yayla buyur. Hazir `ZoomIn` 0'dan
 * buyudugu icin fazla sert kaciyordu; baslangic olcegi burada verilir.
 */
function odakAcilisi(_degerler: EntryAnimationsValues) {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.92 }] },
    animations: {
      opacity: withTiming(1, { duration: 150 }),
      transform: [{ scale: withSpring(1, { damping: 14, stiffness: 180, mass: 0.8 }) }],
    },
  };
}
const ODAK_KAPANISI = FadeOut.duration(150);
const kaydirmaYok = () => undefined;

interface BekleyenHareket {
  sessionId: number;
  exerciseId: number;
}

/**
 * web/src/pages/AntrenmanPage.tsx ile ayni (issue #119/#120). #186: "Sablonla basla"nin altinda
 * ikincil "Bos antrenman baslat"; #209: hareketi olan acik antrenmanda "Sablon olarak kaydet".
 *
 * #273: set girilmis (dolu) bir oturumda "Hareket ekle" ve "Antrenmani bitir" yer degistirdi --
 * sablon uzerinden gidildigi icin hareket eklemek nadiren gerekir, bitirmek EN SIK yapilan islemdir.
 * Ust baslikta artik sade bir metin olan "Hareket ekle" durur; alt alanda (hareket kartlarinin
 * hemen ardinda) turuncu "Antrenmani bitir" durur. Bos oturumda (#47) bu degismez -- ust baslik
 * hala "Iptal et", alt alan hala "Hareket ekle" gosterir.
 */
export default function AntrenmanScreen() {
  const ikonRenk = useIkonRenk();
  const etkinTema = useEtkinTema();
  const { t } = useTranslation();
  const { data: oturum, isLoading: oturumYukleniyor, isError: oturumSorgusuHatali } = useOpenSession();
  // #174: onbellekteki veri (null = acik antrenman yok da dahil) varken arka plan yenilemesinin hatasi
  // ekrani hataya dusurmez; hata yalnizca hic veri yokken (undefined) sayilir.
  const oturumHataliMi = oturumSorgusuHatali && oturum === undefined;
  const gorunenOturum = !oturumYukleniyor && !oturumHataliMi ? (oturum ?? null) : null;
  const {
    data: setler,
    isLoading: setlerYukleniyor,
    isError: setlerSorgusuHatali,
  } = useSessionSets(oturum?.id ?? null);
  const setlerHataliMi = setlerSorgusuHatali && setler === undefined;
  const setlerYuklendi = !setlerYukleniyor && !setlerHataliMi && setler !== undefined;
  const oturumBos = setlerYuklendi && setler.length === 0;
  const { data: egzersizler } = useExercises();
  // #174 dilim 2: yazmalar kuyruklu -- cevrimdisiyken kuyruga girer, ekran hemen guncellenir.
  const baslatMutasyonu = useKuyrukluStartSession();
  const iptalMutasyonu = useKuyrukluDeleteSession();
  const hareketEkleMutasyonu = useKuyrukluAddSessionExercise();
  const siraMutasyonu = useKuyrukluReorderSessionExercises();
  const router = useRouter();
  const [baslatmaBilgisi, setBaslatmaBilgisi] = useState<string | null>(null);
  /**
   * #494 (kullanici karari): acik antrenmandayken geri tusu ekrandan CIKMAZ, bu ekrani
   * "Antrenmana basla" gorunumune dondurur -- oturum acik kalir, arka planda sayar. Gorunumde
   * ustte ana sayfadaki "devam eden antrenman" kartinin aynisi durur ve TUM baslatma dugmeleri
   * soluk/basilamaz olur: acik antrenman varken ikinci bir antrenman baslatilmaz.
   */
  const [baslatmaGorunumu, setBaslatmaGorunumu] = useState(false);
  /**
   * #502 (kullanici bildirdi: "sablon olusturup kaydedince aktif antrenmana atiyor"): rota bu
   * gorunumu ACIKCA isteyebilir (`BASLATMA_GORUNUMU_YOLU`). Parametre TEK SEFERLIKTIR ve okunur
   * okunmaz temizlenir; yoksa sekmeye her donuste -- kullanici antrenmanina donmek istese bile --
   * baslatma gorunumu acilirdi.
   */
  const { baslat } = useLocalSearchParams<{ baslat?: string }>();
  // Ekranin iki yuzu; ayni anda yalnizca biri cizilir.
  const antrenmaniGoster = gorunenOturum !== null && !baslatmaGorunumu;
  /**
   * #502: "ikinci antrenman baslatilmaz" engelinin gercek sarti ACIK ANTRENMAN VAR olmasidir --
   * "baslatma gorunumundeyim" degil. #494'te ikisi ayni seye denk geliyordu (bu gorunume yalnizca
   * acik antrenmandan geri tusuyla gelinirdi); rota da gorunumu isteyebildigi icin ayrildilar ve
   * sart artik acikca yazilir. Yoksa antrenmani OLMAYAN kullanici, sablon olusturup dondugunde
   * basilamayan dugmelerle karsilasiyordu.
   */
  const acikAntrenmanVar = gorunenOturum?.isOpen === true;
  const baslatmayiGoster = !oturumYukleniyor && !oturumHataliMi && (oturum == null || baslatmaGorunumu);
  /**
   * #499 (kullanici bildirdi: "menu start workout olmasina ragmen ust baslik workout kaliyor"):
   * ust bar basligi EKRANIN gosterdigi yuzden gelir, oturumun acik olup olmamasindan degil --
   * baslatma gorunumunde antrenman surse bile baslik "Antrenmana basla"dir.
   */
  usePageTitle(t(antrenmaniGoster ? 'kabuk.antrenman' : 'sablonlar.antrenmanaBasla'));
  const [panelAcik, setPanelAcik] = useState(false);
  // #396: duzenlenen set -- duzenleyici ekranin ortasinda acilir. `panelAcik`a dokunulmaz: odak
  // modundan gelindiyse duzenleyici kapaninca odak karti + set paneli geri gelir.
  const [duzenlenen, setDuzenlenen] = useState<{ kayit: SetKaydi; sira: number } | null>(null);
  // Issue #273: "Hareket ekle" acma dugmesi ust basliga tasindiktan sonra bu durumu artik
  // AntrenmanAltAlani degil burasi tutar -- ust baslikla alt alan AYNI paneli acabilsin diye.
  const [hareketEkleAcik, setHareketEkleAcik] = useState(false);

  const setSilmeyiTamamla = useKuyrukluSetSil();
  const setSilme = useGecikmeliSilme(setSilmeyiTamamla);

  const hareketKaldirmayiTamamla = useKuyrukluHareketKaldir();
  const hareketKaldirma = useGecikmeliSilme<BekleyenHareket>(hareketKaldirmayiTamamla);
  const kaldirilanHareketId = hareketKaldirma.bekleyen?.exerciseId;

  const gorunenSetler = (setler ?? []).filter(
    (kayit) => kayit.id !== setSilme.bekleyen?.id && kayit.exerciseId !== kaldirilanHareketId,
  );
  const ilerleme = gorunenOturum?.progress ?? [];
  const gorunenIlerleme = ilerleme.filter((hareket) => hareket.exerciseId !== kaldirilanHareketId);
  /**
   * #499 (kullanici karari): "Sablon olarak kaydet" yalnizca liste sablonundan SAPTIYSA gorunur --
   * hareket eklendiyse YA DA cikarildiysa (`sablondanSapmaVarMi`). Sablonsuz antrenmanda liste
   * zaten yeni bir sablon adayidir. Sablon henuz yuklenmediyse kisayol GOSTERILMEZ: olmayan bir
   * sapmayi varsaymaktansa bir sorgu beklemek yeter (bitirme ekranindaki kuralla ayni tercih).
   */
  const { data: oturumSablonu } = useTemplate(gorunenOturum?.templateId ?? null);
  const sablonOlarakKaydetGorunur =
    antrenmaniGoster &&
    gorunenIlerleme.length > 0 &&
    (gorunenOturum.templateId === null ||
      (oturumSablonu ? sablondanSapmaVarMi(gorunenIlerleme, oturumSablonu.exercises) : false));

  const secilebilirIdler = useMemo(() => new Set((egzersizler ?? []).map((eg) => eg.id)), [egzersizler]);
  const sablonVarsayilani = egzersizler ? varsayilanHareket(gorunenIlerleme, secilebilirIdler) : null;
  const [secim, setSecim] = useState<number | null>(null);
  const sablonluOturumId = gorunenOturum && ilerleme.length > 0 ? gorunenOturum.id : null;
  const [varsayilanUygulananOturum, setVarsayilanUygulananOturum] = useState<number | null>(null);
  if (egzersizler && sablonluOturumId !== null && sablonluOturumId !== varsayilanUygulananOturum) {
    setVarsayilanUygulananOturum(sablonluOturumId);
    setSecim(sablonVarsayilani);
  }
  const etkinSecim = secim ?? sablonVarsayilani ?? adaGoreSirala(egzersizler ?? [])[0]?.id ?? null;
  const seciliEgzersizAdi = egzersizler?.find((eg) => eg.id === etkinSecim)?.name ?? null;
  // Sayacin kendisi ortak kabukta cizilir (DinlenmeKabugu); burada yalnizca set eklenince
  // baslatilir. Kanca ayrica kalici depo senkronunu yurutur.
  const [, setDinlenme] = useDinlenme(etkinSecim);

  const antrenmandakiIdler = new Set(ilerleme.map((hareket) => hareket.exerciseId));
  const eklenebilirEgzersizler = adaGoreSirala(egzersizler ?? []).filter((eg) => !antrenmandakiIdler.has(eg.id));

  // Antrenman iptal edilince/bitince acik kalan panel "Sablonla basla" ekraninin uzerinde
  // asili kaliyordu (kullanici bulgusu). Durum render sirasinda sifirlanir -- `varsayilanUygulananOturum`
  // ile ayni desen. `oturumYok`: yukleniyor/hata degil, GERCEKTEN oturum yok demek.
  const oturumYok = !oturumYukleniyor && !oturumHataliMi && !oturum;
  if (oturumYok && (panelAcik || hareketEkleAcik || duzenlenen)) {
    setPanelAcik(false);
    setHareketEkleAcik(false);
    setDuzenlenen(null);
  }

  function secimYap(exerciseId: number): boolean {
    if (!secilebilirIdler.has(exerciseId)) {
      return false;
    }
    setSecim(exerciseId);
    return true;
  }

  function kartSec(exerciseId: number) {
    if (secimYap(exerciseId)) {
      setPanelAcik(true);
    }
  }

  // #354: set paneli acikken secili hareketin karti da buyuyerek one cikar (`OdakKarti`) ve panelin
  // ust kenarina kadar kalan alani doldurur -- ikisi birlikte ekrani kaplar. Onceki "karti panelin
  // ustune kaydir" hizalamasi (#274) bu yuzden kalkti: kart artik zaten panelin ustunde.
  // #396: set duzenlenirken odak karti ve set paneli gizlenir -- duzenleyici ekranda tek basina durur.
  const odakHareketi = panelAcik && !duzenlenen ? gorunenIlerleme.find((hareket) => hareket.exerciseId === etkinSecim) : undefined;

  // #385: set eklenince panel kapanmaz, ilk acildigi hale doner (`formSurumu` SetPaneli'ni yeniden
  // kurar). Yalnizca hedefe ULASILAN setten sonra kapanir: set eklenirken hedef henuz dolmamissa
  // hareket "bekleyen" olarak not edilir, sunucudan tazelenen ilerleme hedefe varinca panel kapanir
  // -- sayim istemcide yeniden yapilmaz. Hedefsiz ya da zaten dolu harekette panel yalnizca [x]'le kapanir.
  const [formSurumu, setFormSurumu] = useState(0);
  const [hedefBekleyenId, setHedefBekleyenId] = useState<number | null>(null);
  if (hedefBekleyenId !== null && hedefBekleyenId !== odakHareketi?.exerciseId) {
    setHedefBekleyenId(null);
  } else if (odakHareketi && hedefBekleyenId !== null && hedefTamamlandi(odakHareketi)) {
    setHedefBekleyenId(null);
    setPanelAcik(false);
  }

  function setEklendi(exerciseId: number) {
    setDinlenme(dinlenmeBaslat(Date.now(), dinlenmeSuresi(ilerleme, exerciseId)));
    setFormSurumu((surum) => surum + 1);
    const hareket = ilerleme.find((kayit) => kayit.exerciseId === exerciseId);
    if (hareket && hareket.plannedSets !== null && !hedefTamamlandi(hareket)) {
      setHedefBekleyenId(exerciseId);
    }
  }

  const [panelYuksekligi, setPanelYuksekligi] = useState(0);
  const altMenuPayi = useAltMenuPayi();
  // #350: yuzer panel klavyeden habersizdi -- klavye acilinca arkasinda kaliyordu. Klavye acikken
  // klavyenin hemen ustunde, kapaliyken alt menunun ustunde durur.
  const klavyeYuksekligi = useKlavyeYuksekligi();
  const panelAlti = klavyeYuksekligi > 0 ? klavyeYuksekligi + KLAVYE_BOSLUGU : altMenuPayi;

  function hareketEkle(exerciseId: number) {
    if (!gorunenOturum) {
      return;
    }
    hareketEkleMutasyonu.mutate(
      { sessionId: gorunenOturum.id, exerciseId },
      { onSuccess: () => setSecim(exerciseId) },
    );
  }

  // #229: web ile ayni -- kaldirilmayi bekleyen hareket sunucuda hala listede, sona eklenir.
  function siraDegistir(exerciseIds: number[]) {
    if (!gorunenOturum) {
      return;
    }
    const tamListe = kaldirilanHareketId === undefined ? exerciseIds : [...exerciseIds, kaldirilanHareketId];
    siraMutasyonu.mutate({ sessionId: gorunenOturum.id, exerciseIds: tamListe });
  }

  function setiSilmeyeBasla(kayit: SetKaydi) {
    hareketKaldirma.sureDoldu();
    setSilme.baslat(kayit);
  }

  function setiDuzenle(kayit: SetKaydi, sira: number) {
    setDuzenlenen({ kayit, sira });
  }

  function hareketiKaldirmayaBasla(exerciseId: number) {
    if (!gorunenOturum) {
      return;
    }
    setSilme.sureDoldu();
    hareketKaldirma.baslat({ sessionId: gorunenOturum.id, exerciseId });
    if (etkinSecim === exerciseId) {
      setSecim(null);
      setPanelAcik(false);
    }
  }

  function sablonOlarakKaydet() {
    router.push({
      pathname: '/templates/new',
      params: { donus: '/antrenman', hareketler: JSON.stringify(oturumdanSablonHareketleri(gorunenIlerleme)) },
    });
  }

  /**
   * #494: baslatma gorunumu EKRANA OZEL ve gecicidir -- odak birakilinca sifirlanir. Ust bardaki
   * sureye ya da ana sayfadaki karta dokunup donen kullanici antrenmanini gorur, az once biraktigi
   * sablon listesini degil.
   */
  useFocusEffect(
    useCallback(() => () => setBaslatmaGorunumu(false), []),
  );

  // Odak efektinden AYRI: parametreyi orada temizlemek efektin kendi temizleyicisini tetikleyip
  // gorunumu ayni anda geri kapatirdi.
  useEffect(() => {
    if (baslat === '1') {
      setBaslatmaGorunumu(true);
      router.setParams({ baslat: undefined });
    }
  }, [baslat, router]);

  function sablonlaBasla(templateId: number) {
    setBaslatmaBilgisi(null);
    // #502: antrenman baslatildiginda baslatma YUZU birakilir -- yoksa acilan antrenman yerine
    // onu baslatan ekran ekranda kalirdi.
    setBaslatmaGorunumu(false);
    baslatMutasyonu.mutate(templateId, {
      onSuccess: (acilan) => {
        if (acilan.templateId !== templateId) {
          setBaslatmaBilgisi(t('antrenman.sablonUygulanmadi'));
        }
      },
    });
  }

  return (
    <View style={{ flex: 1 }}>
      <EkranKaydirici
        contentContainerClassName="flex-grow gap-5 px-4 pt-2 pb-4"
        // Klavye yalnizca set panelinden acilir; liste o an odak kartinin arkasinda. Varsayilan "en
        // alta kay" listeyi camin arkasinda oynatir ve kart kapaninca kullanici baska yerde kalirdi.
        onKlavyeAcildi={panelAcik || duzenlenen ? kaydirmaYok : undefined}
      >
        <View className="flex-col gap-1">
          <View className="flex-row items-start justify-between gap-2">
            {/* #153: zorluk sorusu artık bu başlıkta açılmıyor (kendi ekranı var), bu yüzden #151'in
                soruyu kapatan X düğmesi de kalktı. #499 (kullanici karari): "Devam ediyor" rozeti
                de kalkti -- yerini SABLON ADI aldi; oturumun baslangic saati bir alt satira,
                sablon adinin eski yerine indi. */}
            {antrenmaniGoster && gorunenOturum.isOpen && (
              <View className="min-w-0 flex-1 flex-row items-center gap-1 pt-1">
                {/* #487: antrenman ekrani bir sekme koku, ust barda geri tusu yok (#466) --
                    baslatan kullanici geri cikamiyordu. Cikis "Devam ediyor" rozetinin SOLUNDA
                    durur (kullanici karari). #494: hedef Sablonlarim DEGIL, bu ekranin
                    "Antrenmana basla" gorunumu -- oturum acik kalir. Yukseklik satiri buyutmesin
                    diye kutu kucuk, dokunma alani `hitSlop` ile buyutulur. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('antrenman.baslatmaGorunumu')}
                  onPress={() => setBaslatmaGorunumu(true)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
                  className="-ml-1 size-8 items-center justify-center"
                >
                  <ChevronLeft color={ikonRenk.fg} size={22} />
                </Pressable>
                {gorunenOturum.templateName && <TurEtiketi>{gorunenOturum.templateName}</TurEtiketi>}
              </View>
            )}
            {/* "Hareket ekle" artik oturum durumundan BAGIMSIZ HER ZAMAN burada durur (yeni tasarim):
                "Antrenmani iptal et" / "Antrenmani bitir" ise AYNI konumda -- alt alanda (bkz.
                AntrenmanAltAlani `bitirCagrisi`/`iptalCagrisi`), boylece bos oturumda da dolu
                oturumda da bu iki eylem hep AYNI yerde durur. */}
            {antrenmaniGoster && gorunenOturum.isOpen && (
              <View className="shrink-0 items-end">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setHareketEkleAcik(true)}
                  className="min-h-11 flex-row items-center gap-1 rounded-lg px-2"
                >
                  <Plus color={ikonRenk.muted} size={18} />
                  <Text className="text-label text-muted">{t('antrenman.hareketEkle')}</Text>
                </Pressable>
                {/* #499 (kullanici karari): "Sablon olarak kaydet" artik "Hareket ekle"nin ALTINDA
                    ve YALNIZCA liste sablonundan saptiysa (hareket eklendi ya da cikarildi) --
                    degismemis bir listeyi yeniden sablon yapmanin anlami yok. #209: bos listeden
                    sablon olmaz. */}
                {sablonOlarakKaydetGorunur && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={sablonOlarakKaydet}
                    className="min-h-11 flex-row items-center gap-1 rounded-lg px-2"
                  >
                    <ClipboardList color={ikonRenk.muted} size={18} />
                    <Text className="text-label text-muted">{t('antrenman.sablonOlarakKaydet')}</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        {antrenmaniGoster && (
          <Text className="text-label text-muted">
            {t('antrenman.baslangic', { saat: formatSaat(gorunenOturum.startedAt) })}
          </Text>
        )}
        {baslatMutasyonu.isError && (
          <Text accessibilityRole="alert" className="text-label text-danger">
            {t('antrenman.baslatilamadi')}
          </Text>
        )}
        {iptalMutasyonu.isError && (
          <Text accessibilityRole="alert" className="text-label text-danger">
            {t('antrenman.iptalEdilemedi')}
          </Text>
        )}
        {siraMutasyonu.isError && (
          <Text accessibilityRole="alert" className="text-label text-danger">
            {t('antrenman.siraKaydedilemedi')}
          </Text>
        )}
        {hareketEkleMutasyonu.isError && (
          <Text accessibilityRole="alert" className="text-label text-danger">
            {t('antrenman.hareketEklenemedi')}
          </Text>
        )}
        {baslatmaBilgisi && <Text className="text-label text-muted">{baslatmaBilgisi}</Text>}
      </View>

      {oturumYukleniyor && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}

      {oturumHataliMi && (
        <Text accessibilityRole="alert" className="text-body text-danger">
          {t('antrenman.oturumAlinamadi')}
        </Text>
      )}

      {antrenmaniGoster && (
        <>
          {setlerYukleniyor && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}
          {setlerHataliMi && (
            <Text accessibilityRole="alert" className="text-body text-danger">
              {t('antrenman.setlerAlinamadi')}
            </Text>
          )}
          {!setlerYukleniyor &&
            !setlerHataliMi &&
            (ilerleme.length > 0 ? (
              <HareketKartlari
                ilerleme={gorunenIlerleme}
                setler={gorunenSetler}
                onSec={kartSec}
                onSetDuzenle={setiDuzenle}
                onSiraDegis={siraDegistir}
              />
            ) : (
              <>
                {etkinSecim !== null && seciliEgzersizAdi && (
                  <HareketGecmisi key={etkinSecim} exerciseId={etkinSecim} exerciseName={seciliEgzersizAdi} />
                )}
                <SetList sets={gorunenSetler} onSetDuzenle={setiDuzenle} />
              </>
            ))}
        </>
      )}

      {baslatmayiGoster && (
        <>
          {/* #494: acik antrenman varken bu gorunume geri tusuyla gelinir. Ustte ana sayfadaki
              kartin AYNISI durur ("Sablonlarim" basliginin uzerinde) ve "Devam et" ekrani
              antrenmana geri cevirir -- gezinmez, cunku zaten bu ekrandayiz. */}
          {acikAntrenmanVar && <DevamEdenAntrenman onDevam={() => setBaslatmaGorunumu(false)} />}
          {/* Acik antrenman varken TUM baslatma dugmeleri soluk ve basilamaz (kullanici karari):
              ikinci bir antrenman baslatilmaz. */}
          <SablonlaBasla onBasla={sablonlaBasla} bekliyor={baslatMutasyonu.isPending || acikAntrenmanVar} />
          {/* #186: ikincil yol -- sablonsuz antrenman; hareketler acildiktan sonra eklenir. */}
          {/* #589: cam yuzey (spec Karar 9). */}
          <CamIkincilDugme
            onPress={() => {
              setBaslatmaGorunumu(false);
              baslatMutasyonu.mutate(null);
            }}
            disabled={baslatMutasyonu.isPending || acikAntrenmanVar}
          >
            {t('antrenman.bosBaslat')}
          </CamIkincilDugme>
        </>
      )}

      {setSilme.bekleyen && (
        <GeriAlSeridi
          key={`set-${setSilme.bekleyen.id}`}
          mesaj={t('setler.setSilindi')}
          sureMs={GERI_AL_MS}
          onGeriAl={setSilme.geriAl}
          onSureDoldu={setSilme.sureDoldu}
        />
      )}
      {hareketKaldirma.bekleyen && (
        <GeriAlSeridi
          key={`hareket-${hareketKaldirma.bekleyen.exerciseId}`}
          mesaj={t('antrenman.hareketKaldirildi')}
          sureMs={GERI_AL_MS}
          onGeriAl={hareketKaldirma.geriAl}
          onSureDoldu={hareketKaldirma.sureDoldu}
        />
      )}

      {antrenmaniGoster ? (
        <AntrenmanAltAlani
          egzersizler={eklenebilirEgzersizler}
          onHareketEkle={hareketEkle}
          acik={hareketEkleAcik}
          onAcikDegis={setHareketEkleAcik}
          // #153: bitirme burada kapanmaz, zorluk kadraninin oldugu ekrana goturur -- antrenman
          // oradan kapanir. `push` (replace degil): kullanici vazgecip geri donebilmeli.
          bitirCagrisi={oturumBos ? undefined : { onBitir: () => router.push('/antrenman-bitir') }}
          // Issue #47: set GIRILMEMIS acik oturumda "bitir" yerine "iptal et" -- yanlislikla
          // dokunulan bir sablon kartinin geri alinmasi budur ("bitir" bu durumda gecmise BOS bir
          // antrenman birakirdi, sorunun ta kendisi).
          iptalCagrisi={
            oturumBos
              ? { onIptal: () => iptalMutasyonu.mutate(gorunenOturum.id), beklemede: iptalMutasyonu.isPending }
              : undefined
          }
        />
      ) : (
        <SablonOlusturCagrisi />
      )}
      </EkranKaydirici>

      {/* Set giris paneli artik secili kartin altinda DEGIL, alt sekme cubugunun hemen ustunde
          yuzer bir panel (`position: absolute`) -- web/AddSetForm.tsx'in sticky panelinin RN
          karsiligi. `altMenuPayi`: alt menu icerigin ustunde yuzdugu icin (#338, bkz. KabukTabBar.tsx)
          panel onun UZERINE binmesin diye menunun kapladigi alanin ustunde durur; klavye acikken
          klavyenin ustune cikar (#350, `panelAlti`).
          #350: panel alttan yaylanarak acilir, asagi kayip soner. Dis kabuk (olculen) oturum boyunca
          yerinde durur, yalnizca icteki katman canlanir: odak karti kabugun yuksekligine gore yerlesir,
          animasyonun ara konumuna gore degil; cikis animasyonu da ancak kabuk yerindeyken oynayabilir.
          #354: panelin ustunde, ekranin kalanini kaplayan odak katmani -- once cizilir ki panel ustte
          kalsin. Kartin disindaki bosluk (perde) ikisini birlikte kapatir. */}
      {odakHareketi && (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Animated.View entering={FadeIn.duration(150)} exiting={ODAK_KAPANISI} style={StyleSheet.absoluteFill}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('antrenman.kartiKapat')}
              onPress={() => setPanelAcik(false)}
              // #271: acik temada karartma daha hafif -- %40'lik siyah, acik yuzeyleri gri bir
              // camura ceviriyordu; ayirici islevi icin acik temada %20 yetiyor.
              className={`flex-1 ${etkinTema === 'acik' ? 'bg-black/20' : 'bg-black/40'}`}
            />
          </Animated.View>
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              top: 8,
              left: 0,
              right: 0,
              bottom: panelAlti + panelYuksekligi + ODAK_BOSLUGU,
            }}
            className="px-4"
          >
            <Animated.View entering={odakAcilisi} exiting={ODAK_KAPANISI} className="flex-1">
              <OdakKarti
                hareket={odakHareketi}
                idler={gorunenIlerleme.map((hareket) => hareket.exerciseId)}
                setler={gorunenSetler.filter((kayit) => kayit.exerciseId === odakHareketi.exerciseId)}
                onSetDuzenle={setiDuzenle}
                onKaldir={() => hareketiKaldirmayaBasla(odakHareketi.exerciseId)}
                onKapat={() => setPanelAcik(false)}
              />
            </Animated.View>
          </View>
        </View>
      )}
      {gorunenOturum && (
        <View
          testID="set-paneli"
          pointerEvents="box-none"
          onLayout={(e) => setPanelYuksekligi(e.nativeEvent.layout.height)}
          style={{ position: 'absolute', left: 0, right: 0, bottom: panelAlti }}
          className="px-4"
        >
          {panelAcik && !duzenlenen && etkinSecim !== null && seciliEgzersizAdi && (
            <Animated.View entering={PANEL_ACILISI} exiting={PANEL_KAPANISI}>
              <SetPaneli
                key={formSurumu}
                egzersizId={etkinSecim}
                egzersizAdi={seciliEgzersizAdi}
                onSetEklendi={setEklendi}
              />
            </Animated.View>
          )}
        </View>
      )}
      {/* #396: set duzenleyici ekranin ortasinda -- duzenlemede "Set ekle" paneli olmadigi icin odak
          karti + alt panel duzeni altta bos bir alan birakirdi. Alt menunun (klavye acikken klavyenin)
          ustunde kalan alana ortalanir (`panelAlti`); perde odak katmanindakiyle ayni. */}
      {duzenlenen && (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Animated.View entering={FadeIn.duration(150)} exiting={ODAK_KAPANISI} style={StyleSheet.absoluteFill}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('antrenman.duzenlemeyiKapat')}
              onPress={() => setDuzenlenen(null)}
              className={`flex-1 ${etkinTema === 'acik' ? 'bg-black/20' : 'bg-black/40'}`}
            />
          </Animated.View>
          <View
            pointerEvents="box-none"
            style={{ position: 'absolute', top: 8, left: 0, right: 0, bottom: panelAlti }}
            className="justify-center px-4"
          >
            <Animated.View entering={odakAcilisi} exiting={ODAK_KAPANISI}>
              <SetDuzenleyici
                key={duzenlenen.kayit.id}
                kayit={duzenlenen.kayit}
                sira={duzenlenen.sira}
                onKapat={() => setDuzenlenen(null)}
                onSil={() => {
                  setiSilmeyeBasla(duzenlenen.kayit);
                  setDuzenlenen(null);
                }}
              />
            </Animated.View>
          </View>
        </View>
      )}
    </View>
  );
}
