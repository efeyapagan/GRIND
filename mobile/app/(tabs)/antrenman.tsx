import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Keyboard } from 'react-native';
import EkranKaydirici from '../../src/ui/EkranKaydirici';
import { useQueryClient } from '@tanstack/react-query';
import { CircleCheck, X } from 'lucide-react-native';
import {
  hareketiKaldir,
  setDegistiTazele,
  setiSil,
  useAddSessionExercise,
  useDeleteSession,
  useExercises,
  useFinishSession,
  useOpenSession,
  useSessionSets,
  useStartSession,
  type SetKaydi,
} from '@grind/shared/api/queries';
import { formatTrTime } from '@grind/shared/lib/format';
import { adaGoreSirala } from '@grind/shared/lib/egzersizler';
import { GERI_AL_MS, useGecikmeliSilme } from '@grind/shared/lib/gecikmeliSilme';
import { varsayilanHareket } from '@grind/shared/lib/ilerleme';
import { usePageTitle } from '@grind/shared/pageTitle';
import SetList from '../../src/components/SetList';
import AddSetForm from '../../src/components/AddSetForm';
import HareketGecmisi from '../../src/components/HareketGecmisi';
import HareketKartlari from '../../src/components/HareketKartlari';
import ZorlukSecici from '../../src/components/ZorlukSecici';
import SablonlaBasla from '../../src/components/SablonlaBasla';
import SablonOlusturCagrisi from '../../src/components/SablonOlusturCagrisi';
import GeriAlSeridi from '../../src/ui/GeriAlSeridi';
import TurEtiketi from '../../src/ui/TurEtiketi';
import { ikonRenk } from '../../src/ui/renkler';

const SABLON_UYGULANMADI = 'Bugün zaten açık bir antrenmanın var; şablon uygulanmadı.';

interface BekleyenHareket {
  sessionId: number;
  exerciseId: number;
}

/** web/src/pages/AntrenmanPage.tsx ile ayni (issue #119/#120). */
export default function AntrenmanScreen() {
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
  const bitirMutasyonu = useFinishSession();
  const baslatMutasyonu = useStartSession();
  const iptalMutasyonu = useDeleteSession();
  const hareketEkleMutasyonu = useAddSessionExercise();
  const [baslatmaBilgisi, setBaslatmaBilgisi] = useState<string | null>(null);
  const [panelAcik, setPanelAcik] = useState(false);
  const [zorlukSoruluyor, setZorlukSoruluyor] = useState(false);

  const kaydiriciRef = useRef<ScrollView>(null);
  useEffect(() => {
    // BILINEN ACIK SORUN (simulator dokunma testinde bulundu): AddSetForm ekranin en altina
    // yaslaniyor (mt-auto); klavye acilinca KeyboardAvoidingView icerigi kucultur ama otomatik
    // kaydirmiyor, "Set ekle" dugmesi klavyenin arkasinda kalabiliyor. Bu scrollToEnd denemesi
    // sorunu TAM cozmedi (simulatorde dogrulanmadi) -- gercek cozum icin ayri bir issue acilmali.
    const gizlenince = Keyboard.addListener('keyboardDidShow', () => {
      kaydiriciRef.current?.scrollToEnd({ animated: true });
    });
    return () => gizlenince.remove();
  }, []);

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
    }
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
    <EkranKaydirici ref={kaydiriciRef} contentContainerClassName="flex-grow gap-5 px-4 pt-2 pb-4">
      <View className="flex-col gap-1">
        <View className="flex-row items-center justify-end gap-2">
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
            ) : zorlukSoruluyor ? (
              <ZorlukSecici
                bekliyor={bitirMutasyonu.isPending}
                onSec={(zorluk) => bitirMutasyonu.mutate({ sessionId: gorunenOturum.id, zorluk })}
              />
            ) : (
              <Pressable
                onPress={() => setZorlukSoruluyor(true)}
                className="min-h-11 flex-row items-center gap-1 rounded-lg px-2"
              >
                <CircleCheck color={ikonRenk.muted} size={18} />
                <Text className="text-label text-muted">Antrenmanı bitir</Text>
              </Pressable>
            ))}
        </View>
        {gorunenOturum && (
          <View className="mt-2 flex-row flex-wrap items-center gap-2">
            {gorunenOturum.isOpen && (
              <View className="flex-row items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-1">
                <View className="size-2 rounded-full bg-muted" />
                <Text className="text-label text-fg">Devam ediyor</Text>
              </View>
            )}
            {gorunenOturum.templateName && <TurEtiketi>{gorunenOturum.templateName}</TurEtiketi>}
            <Text className="text-label text-muted">Başlangıç {formatTrTime(gorunenOturum.startedAt)}</Text>
          </View>
        )}
        {bitirMutasyonu.isError && (
          <Text accessibilityRole="alert" className="text-label text-danger">
            Antrenman bitirilemedi. Lütfen tekrar deneyin.
          </Text>
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
        <SablonlaBasla onBasla={sablonlaBasla} bekliyor={baslatMutasyonu.isPending} />
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
        <AddSetForm
          egzersizId={etkinSecim}
          onEgzersizSec={secimYap}
          acik={panelAcik}
          onAcikDegis={setPanelAcik}
          hareketEkleme={{ egzersizler: eklenebilirEgzersizler, onEkle: hareketEkle }}
        />
      ) : (
        <SablonOlusturCagrisi />
      )}
    </EkranKaydirici>
  );
}
