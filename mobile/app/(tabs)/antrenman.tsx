import { useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, View, Text, Pressable, type ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import EkranKaydirici from '../../src/ui/EkranKaydirici';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus, X } from 'lucide-react-native';
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
import { kartHizalamaKaydirmasi } from '@grind/shared/lib/kartHizalama';
import { oturumdanSablonHareketleri } from '@grind/shared/lib/sablonTaslagi';
import { usePageTitle } from '@grind/shared/pageTitle';
import SetList from '../../src/components/SetList';
import AntrenmanAltAlani from '../../src/components/AntrenmanAltAlani';
import SetPaneli from '../../src/components/SetPaneli';
import { useDinlenme } from '../../src/components/useDinlenme';
import { TABBAR_HALKA_TASMASI } from '../../src/ui/KabukTabBar';
import HareketGecmisi from '../../src/components/HareketGecmisi';
import HareketKartlari from '../../src/components/HareketKartlari';
import SablonlaBasla from '../../src/components/SablonlaBasla';
import SablonOlusturCagrisi from '../../src/components/SablonOlusturCagrisi';
import GeriAlSeridi from '../../src/ui/GeriAlSeridi';
import IkincilDugme from '../../src/ui/IkincilDugme';
import TurEtiketi from '../../src/ui/TurEtiketi';
import { ikonRenk } from '../../src/ui/renkler';

const SABLON_UYGULANMADI = 'Bugün zaten açık bir antrenmanın var; şablon uygulanmadı.';

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
  const [dinlenme, setDinlenme] = useDinlenme(etkinSecim);

  const antrenmandakiIdler = new Set(ilerleme.map((hareket) => hareket.exerciseId));
  const eklenebilirEgzersizler = adaGoreSirala(egzersizler ?? []).filter((eg) => !antrenmandakiIdler.has(eg.id));

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
      hizalanacak.current = true;
    }
  }

  // #274: panel secili kartin altinda acilir; kart genisleyip yerlesince (onLayout) ekran, kart +
  // panel gorunecek kadar kayar -- web ile ayni karar (`kartHizalamaKaydirmasi`). Klavye acilinca da
  // (EkranKaydirici'nin varsayilan "en alta kay"i yerine) ayni hizalama klavyenin ustune yapilir.
  const kaydiriciRef = useRef<ScrollView>(null);
  const kaydirmaY = useRef(0);
  const seciliKartRef = useRef<View>(null);
  const hizalanacak = useRef(false);
  function kartiHizala(klavyeYuksekligi: number) {
    const kaydirici = kaydiriciRef.current;
    const kart = seciliKartRef.current;
    kaydirici?.getNativeScrollRef()?.measureInWindow((_x, alanY, _g, alanH) => {
      kart?.measureInWindow((_kx, kartY, _kg, kartH) => {
        const alanAlt = Math.min(
          alanY + alanH - TABBAR_HALKA_TASMASI,
          Dimensions.get('window').height - klavyeYuksekligi,
        );
        // Klavye acikken kart (gecmis + panel) cogu zaman sigmaz; o zaman "ustu oncelikli" kurali
        // girdileri klavyenin arkasina iterdi. Yalnizca kartin ALT kenari (panelin sonu) hizalanir.
        const kartAlt = kartY + kartH;
        const kaydirma = kartHizalamaKaydirmasi(
          { ust: klavyeYuksekligi > 0 ? kartAlt : kartY, alt: kartAlt },
          { ust: alanY, alt: alanAlt },
        );
        if (kaydirma !== 0) {
          kaydirici.scrollTo({ y: Math.max(0, kaydirmaY.current + kaydirma), animated: true });
        }
      });
    });
  }

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
    <EkranKaydirici
      ref={kaydiriciRef}
      contentContainerClassName="flex-grow gap-5 px-4 pt-2 pb-4"
      scrollEventThrottle={16}
      onScroll={(e) => {
        kaydirmaY.current = e.nativeEvent.contentOffset.y;
      }}
      onKlavyeAcildi={panelAcik ? kartiHizala : undefined}
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
          {gorunenOturum?.isOpen &&
            setlerYuklendi &&
            (oturumBos ? (
              <Pressable
                onPress={() => iptalMutasyonu.mutate(gorunenOturum.id)}
                disabled={iptalMutasyonu.isPending}
                className={`min-h-11 flex-row items-center gap-1 rounded-lg px-2 ${iptalMutasyonu.isPending ? 'opacity-60' : ''}`}
              >
                <X color={ikonRenk.danger} size={18} />
                <Text className="text-label text-danger">Antrenmanı iptal et</Text>
              </Pressable>
            ) : (
              // #273: "Hareket ekle" artik ust baslikta sade bir metin -- "Antrenmani bitir" en sik
              // yapilan islem oldugu icin alt alandaki turuncu kutuya tasindi (AntrenmanAltAlani).
              <Pressable
                accessibilityRole="button"
                onPress={() => setHareketEkleAcik(true)}
                className="min-h-11 flex-row items-center gap-1 rounded-lg px-2"
              >
                <Plus color={ikonRenk.muted} size={18} />
                <Text className="text-label text-muted">Hareket ekle</Text>
              </Pressable>
            ))}
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
                secilenId={etkinSecim}
                onSec={kartSec}
                onSetSil={setiSilmeyeBasla}
                onHareketKaldir={hareketiKaldirmayaBasla}
                onSiraDegis={siraDegistir}
                seciliKartRef={seciliKartRef}
                onSeciliKartYerlesti={() => {
                  if (hizalanacak.current) {
                    hizalanacak.current = false;
                    kartiHizala(0);
                  }
                }}
                seciliKartAlti={
                  panelAcik && etkinSecim !== null && seciliEgzersizAdi ? (
                    <SetPaneli
                      egzersizId={etkinSecim}
                      egzersizAdi={seciliEgzersizAdi}
                      onKapat={() => setPanelAcik(false)}
                      onSetEklendi={(exerciseId) =>
                        setDinlenme(dinlenmeBaslat(Date.now(), dinlenmeSuresi(ilerleme, exerciseId)))
                      }
                    />
                  ) : undefined
                }
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
          dinlenme={dinlenme}
          onDinlenmeDegis={setDinlenme}
          egzersizler={eklenebilirEgzersizler}
          onHareketEkle={hareketEkle}
          acik={hareketEkleAcik}
          onAcikDegis={setHareketEkleAcik}
          // #273: bos oturumda (#47) hala "Hareket ekle" gosterilir -- "bitir" bos bir antrenmani
          // gecmise birakirdi. #153: bitirme burada kapanmaz, zorluk kadraninin oldugu ekrana
          // goturur -- antrenman oradan kapanir. `push` (replace degil): kullanici vazgecip geri
          // donebilmeli.
          bitirCagrisi={oturumBos ? undefined : { onBitir: () => router.push('/antrenman-bitir') }}
        />
      ) : (
        <SablonOlusturCagrisi />
      )}
    </EkranKaydirici>
  );
}
