import { useCallback, useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';
import EkranKaydirici from '../../src/ui/EkranKaydirici';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus } from 'lucide-react-native';
import {
  hareketiKaldir,
  setDegistiTazele,
  setiSil,
  useAddSessionExercise,
  useDeleteSession,
  useExercises,
  useOpenSession,
  useReorderSessionExercises,
  useSessionSets,
  useStartSession,
  type SetKaydi,
} from '@grind/shared/api/queries';
import { formatSaat } from '@grind/shared/lib/format';
import { adaGoreSirala } from '@grind/shared/lib/egzersizler';
import { GERI_AL_MS, useGecikmeliSilme } from '@grind/shared/lib/gecikmeliSilme';
import { varsayilanHareket } from '@grind/shared/lib/ilerleme';
import { dinlenmeBaslat, dinlenmeSuresi } from '@grind/shared/lib/dinlenme';
import { oturumdanSablonHareketleri } from '@grind/shared/lib/sablonTaslagi';
import { usePageTitle } from '@grind/shared/pageTitle';
import SetList from '../../src/components/SetList';
import AntrenmanAltAlani from '../../src/components/AntrenmanAltAlani';
import SetPaneli from '../../src/components/SetPaneli';
import { useDinlenme } from '../../src/components/useDinlenme';
import { useAltMenuPayi } from '../../src/ui/KabukTabBar';
import { useKlavyeYuksekligi } from '../../src/ui/useKlavyeYuksekligi';
import HareketGecmisi from '../../src/components/HareketGecmisi';
import HareketKartlari from '../../src/components/HareketKartlari';
import OdakKarti from '../../src/components/OdakKarti';
import SablonlaBasla from '../../src/components/SablonlaBasla';
import SablonOlusturCagrisi from '../../src/components/SablonOlusturCagrisi';
import GeriAlSeridi from '../../src/ui/GeriAlSeridi';
import IkincilDugme from '../../src/ui/IkincilDugme';
import TurEtiketi from '../../src/ui/TurEtiketi';
import { ikonRenk } from '../../src/ui/renkler';

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

const SABLON_UYGULANMADI ='Bugün zaten açık bir antrenmanın var; şablon uygulanmadı.';

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
  const { t } = useTranslation();
  const { data: oturum, isLoading: oturumYukleniyor, isError: oturumHataliMi } = useOpenSession();
  const gorunenOturum = !oturumYukleniyor && !oturumHataliMi ? (oturum ?? null) : null;
  usePageTitle(gorunenOturum ? 'Antrenman' : 'Antrenman başlat');
  const {
    data: setler,
    isLoading: setlerYukleniyor,
    isError: setlerHataliMi,
  } = useSessionSets(oturum?.id ?? null);
  const setlerYuklendi = !setlerYukleniyor && !setlerHataliMi && setler !== undefined;
  const oturumBos = setlerYuklendi && setler.length === 0;
  const { data: egzersizler } = useExercises();
  const baslatMutasyonu = useStartSession();
  const iptalMutasyonu = useDeleteSession();
  const hareketEkleMutasyonu = useAddSessionExercise();
  const siraMutasyonu = useReorderSessionExercises();
  const router = useRouter();
  const [baslatmaBilgisi, setBaslatmaBilgisi] = useState<string | null>(null);
  const [panelAcik, setPanelAcik] = useState(false);
  // Issue #273: "Hareket ekle" acma dugmesi ust basliga tasindiktan sonra bu durumu artik
  // AntrenmanAltAlani degil burasi tutar -- ust baslikla alt alan AYNI paneli acabilsin diye.
  const [hareketEkleAcik, setHareketEkleAcik] = useState(false);

  const queryClient = useQueryClient();
  const setSilmeyiTamamla = useCallback(
    (kayit: SetKaydi) => {
      void setiSil(kayit.id).then(
        () => setDegistiTazele(queryClient, kayit),
        () => undefined,
      );
    },
    [queryClient],
  );
  const setSilme = useGecikmeliSilme(setSilmeyiTamamla);

  const hareketKaldirmayiTamamla = useCallback(
    ({ sessionId, exerciseId }: BekleyenHareket) => {
      void hareketiKaldir(sessionId, exerciseId).then(
        () => setDegistiTazele(queryClient, { sessionId, exerciseId }),
        () => undefined,
      );
    },
    [queryClient],
  );
  const hareketKaldirma = useGecikmeliSilme(hareketKaldirmayiTamamla);
  const kaldirilanHareketId = hareketKaldirma.bekleyen?.exerciseId;

  const gorunenSetler = (setler ?? []).filter(
    (kayit) => kayit.id !== setSilme.bekleyen?.id && kayit.exerciseId !== kaldirilanHareketId,
  );
  const ilerleme = gorunenOturum?.progress ?? [];
  const gorunenIlerleme = ilerleme.filter((hareket) => hareket.exerciseId !== kaldirilanHareketId);

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
  if (oturumYok && (panelAcik || hareketEkleAcik)) {
    setPanelAcik(false);
    setHareketEkleAcik(false);
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
  const odakHareketi = panelAcik ? gorunenIlerleme.find((hareket) => hareket.exerciseId === etkinSecim) : undefined;
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

  function sablonlaBasla(templateId: number) {
    setBaslatmaBilgisi(null);
    baslatMutasyonu.mutate(templateId, {
      onSuccess: (acilan) => {
        if (acilan.templateId !== templateId) {
          setBaslatmaBilgisi(SABLON_UYGULANMADI);
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
        onKlavyeAcildi={panelAcik ? kaydirmaYok : undefined}
      >
        <View className="flex-col gap-1">
          <View className="flex-row items-center justify-between gap-2">
            {/* #153: zorluk sorusu artık bu başlıkta açılmıyor (kendi ekranı var), bu yüzden #151'in
                soruyu kapatan X düğmesi de kalktı -- sol tarafta yalnızca durum rozeti kalır. */}
            {gorunenOturum?.isOpen && (
              <View className="flex-row items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-1">
                <View className="size-2 rounded-full bg-success" />
                <Text className="text-label text-fg">Devam ediyor</Text>
              </View>
            )}
            {/* "Hareket ekle" artik oturum durumundan BAGIMSIZ HER ZAMAN burada durur (yeni tasarim):
                "Antrenmani iptal et" / "Antrenmani bitir" ise AYNI konumda -- alt alanda (bkz.
                AntrenmanAltAlani `bitirCagrisi`/`iptalCagrisi`), boylece bos oturumda da dolu
                oturumda da bu iki eylem hep AYNI yerde durur. */}
            {gorunenOturum?.isOpen && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setHareketEkleAcik(true)}
                className="min-h-11 flex-row items-center gap-1 rounded-lg px-2"
              >
                <Plus color={ikonRenk.muted} size={18} />
                <Text className="text-label text-muted">Hareket ekle</Text>
              </Pressable>
            )}
          </View>
        {gorunenOturum && (
          <View className="mt-2 flex-row items-center justify-between gap-2">
            <View>{gorunenOturum.templateName && <TurEtiketi>{gorunenOturum.templateName}</TurEtiketi>}</View>
            <Text className="text-label text-muted">Başlangıç {formatSaat(gorunenOturum.startedAt)}</Text>
          </View>
        )}
        {/* #209: bos listeden sablon olmaz -- eylem yalnizca hareket varken gorunur. */}
        {gorunenOturum && gorunenIlerleme.length > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={sablonOlarakKaydet}
            className="-ml-2 min-h-11 flex-row items-center gap-1 self-start rounded-lg px-2"
          >
            <ClipboardList color={ikonRenk.muted} size={18} />
            <Text className="text-label text-muted">{t('antrenman.sablonOlarakKaydet')}</Text>
          </Pressable>
        )}
        {baslatMutasyonu.isError && (
          <Text accessibilityRole="alert" className="text-label text-danger">
            Antrenman başlatılamadı. Lütfen tekrar deneyin.
          </Text>
        )}
        {iptalMutasyonu.isError && (
          <Text accessibilityRole="alert" className="text-label text-danger">
            Antrenman iptal edilemedi. Lütfen tekrar deneyin.
          </Text>
        )}
        {siraMutasyonu.isError && (
          <Text accessibilityRole="alert" className="text-label text-danger">
            {t('antrenman.siraKaydedilemedi')}
          </Text>
        )}
        {hareketEkleMutasyonu.isError && (
          <Text accessibilityRole="alert" className="text-label text-danger">
            Hareket eklenemedi. Lütfen tekrar deneyin.
          </Text>
        )}
        {baslatmaBilgisi && <Text className="text-label text-muted">{baslatmaBilgisi}</Text>}
      </View>

      {oturumYukleniyor && <Text className="text-body text-muted">Yükleniyor...</Text>}

      {oturumHataliMi && (
        <Text accessibilityRole="alert" className="text-body text-danger">
          Oturum bilgisi alınamadı. Lütfen sayfayı yenileyin.
        </Text>
      )}

      {gorunenOturum && (
        <>
          {setlerYukleniyor && <Text className="text-body text-muted">Yükleniyor...</Text>}
          {setlerHataliMi && (
            <Text accessibilityRole="alert" className="text-body text-danger">
              Setler alınamadı. Lütfen sayfayı yenileyin.
            </Text>
          )}
          {!setlerYukleniyor &&
            !setlerHataliMi &&
            (ilerleme.length > 0 ? (
              <HareketKartlari
                ilerleme={gorunenIlerleme}
                setler={gorunenSetler}
                onSec={kartSec}
                onSetSil={setiSilmeyeBasla}
              />
            ) : (
              <>
                {etkinSecim !== null && seciliEgzersizAdi && (
                  <HareketGecmisi key={etkinSecim} exerciseId={etkinSecim} exerciseName={seciliEgzersizAdi} />
                )}
                <SetList sets={gorunenSetler} onSetSil={setiSilmeyeBasla} />
              </>
            ))}
        </>
      )}

      {!oturumYukleniyor && !oturumHataliMi && !oturum && (
        <>
          <SablonlaBasla onBasla={sablonlaBasla} bekliyor={baslatMutasyonu.isPending} />
          {/* #186: ikincil yol -- sablonsuz antrenman; hareketler acildiktan sonra eklenir. */}
          <IkincilDugme onPress={() => baslatMutasyonu.mutate(null)} disabled={baslatMutasyonu.isPending}>
            {t('antrenman.bosBaslat')}
          </IkincilDugme>
        </>
      )}

      {setSilme.bekleyen && (
        <GeriAlSeridi
          key={`set-${setSilme.bekleyen.id}`}
          mesaj="Set silindi"
          sureMs={GERI_AL_MS}
          onGeriAl={setSilme.geriAl}
          onSureDoldu={setSilme.sureDoldu}
        />
      )}
      {hareketKaldirma.bekleyen && (
        <GeriAlSeridi
          key={`hareket-${hareketKaldirma.bekleyen.exerciseId}`}
          mesaj="Hareket kaldırıldı"
          sureMs={GERI_AL_MS}
          onGeriAl={hareketKaldirma.geriAl}
          onSureDoldu={hareketKaldirma.sureDoldu}
        />
      )}

      {gorunenOturum ? (
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
              className="flex-1 bg-black/40"
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
                onSetSil={setiSilmeyeBasla}
                onSiraDegis={siraDegistir}
                onKaldir={() => hareketiKaldirmayaBasla(odakHareketi.exerciseId)}
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
          {panelAcik && etkinSecim !== null && seciliEgzersizAdi && (
            <Animated.View entering={PANEL_ACILISI} exiting={PANEL_KAPANISI}>
              <SetPaneli
                egzersizId={etkinSecim}
                egzersizAdi={seciliEgzersizAdi}
                onKapat={() => setPanelAcik(false)}
                onSetEklendi={(exerciseId) =>
                  setDinlenme(dinlenmeBaslat(Date.now(), dinlenmeSuresi(ilerleme, exerciseId)))
                }
              />
            </Animated.View>
          )}
        </View>
      )}
    </View>
  );
}
