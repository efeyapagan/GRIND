import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CircleCheck, ClipboardList, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
} from '../api/queries';
import { formatSaat } from '../lib/format';
import { adaGoreSirala } from '../lib/egzersizler';
import { GERI_AL_MS, useGecikmeliSilme } from '../lib/gecikmeliSilme';
import { varsayilanHareket } from '../lib/ilerleme';
import { oturumdanSablonHareketleri } from '../lib/sablonTaslagi';
import SetList from '../components/SetList';
import AddSetForm from '../components/AddSetForm';
import HareketGecmisi from '../components/HareketGecmisi';
import HareketKartlari from '../components/HareketKartlari';
import SablonlaBasla from '../components/SablonlaBasla';
import SablonOlusturCagrisi from '../components/SablonOlusturCagrisi';
import GeriAlSeridi from '../ui/GeriAlSeridi';
import IkincilDugme from '../ui/IkincilDugme';
import TurEtiketi from '../ui/TurEtiketi';
import { usePageTitle } from '../ui/PageTitleContext';

/** Geri alma penceresinde bekleyen hareket kaldirma (#60): hangi antrenmandan hangi hareket. */
interface BekleyenHareket {
  sessionId: number;
  exerciseId: number;
}

/**
 * Antrenman baslatma/devam ekrani (issue #119/#120): alt menudeki buyuk "+" dugmesiyle acilir.
 * Acik oturum varsa baslangic saati (TR), sablon adi ve hareket kartlari; hareket listesi bos eski
 * bir oturumda gruplu set listesi; oturum yoksa "Sablonla basla" (#81, #87 -- Takvim burada DEGIL,
 * Ana Sayfa'da: iki ekran ayri kayguya sahip, biri antrenmanin kendisi, digeri genel bakis). Alt
 * alan oturum durumuna gore degisir: acik antrenmanda AddSetForm ("Hareket ekle", #62), YOKKEN
 * SablonOlusturCagrisi ("+ Sablon olustur", #61).
 *
 * #186: #61'in "her antrenman bir sablonla baslar" karari geri alinmadi, TAMAMLANDI -- "Sablonla
 * basla" birincil yol olarak kalir, altinda ikincil "Bos antrenman baslat" durur (`POST /api/sessions
 * { templateId: null }`); hareketler acik antrenmanda "Hareket ekle" ile eklenir. POST /api/sets'in
 * oturumu kendiliginden acmasi hala KULLANILMAZ: set, antrenmana girilmeden eklenmez.
 *
 * #209: hareketi olan acik antrenmanda "Sablon olarak kaydet", listeyi (set girilmemis olsa da)
 * onceden doldurulmus sablon formuna tasir; kaydedince antrenmana donulur.
 *
 * DIKKAT (review bulgusu): oturum ve set sorgularinin HATA durumu bos durumdan AYRI ve ONCELIKLI.
 *
 * Secim (spec Karar 5) burada TEK durumdur; kartlar ve panel paylasir. YENI bir sablonlu oturum
 * gorununce (id, varsayilanin en son uygulandigi oturumdan FARKLIYSA) secim o oturumun varsayilanina
 * SIFIRLANIR -- aksi halde onceki oturumdan kalma bir secim (orn. Bench Press) yeni sablonda hic
 * olmayabilir (review bulgusu I1). Ayni oturum icinde ise hareket tamamlaninca secim kendiliginden
 * sonrakine ATLAMAZ. Render sirasinda kosullu set (efekt yok).
 *
 * Set silme (#57) ve hareket kaldirma (#60) geri alinabilir ve GECIKMELIDIR (`lib/gecikmeliSilme`).
 * Ekranda TEK geri alma seridi olur: biri baslayinca digerinin bekleyeni hemen tamamlanir.
 *
 * Alt alan (AddSetForm) artik `fixed` DEGIL, kendi akis icinde `sticky` (review bulgusu I1 --
 * `fixed` icerigin altini sabit bir yukseklikte ortuyordu, dinlenme sayaci acikken bu yukseklik
 * degistigi icin liste kismen ortuluyordu). Kok `div`e minimum yukseklik verilir ki icerik kisa
 * olsa bile alt alan `mt-auto` ile en alta itilsin ve sekme cubugunun hemen ustunde kalsin.
 */
export default function AntrenmanPage() {
  const { t } = useTranslation();
  const { data: oturum, isLoading: oturumYukleniyor, isError: oturumHataliMi } = useOpenSession();
  const gorunenOturum = !oturumYukleniyor && !oturumHataliMi ? (oturum ?? null) : null;
  // Sayfa iki farkli isi gorur: baslatma (sablon sec) ve devam eden bir antrenman -- baslik hangisi
  // oldugunu yansitir (issue #119/#120).
  usePageTitle(gorunenOturum ? t('antrenman.baslik') : t('kabuk.antrenmanBaslat'));
  const {
    data: setler,
    isLoading: setlerYukleniyor,
    isError: setlerHataliMi,
  } = useSessionSets(oturum?.id ?? null);
  // Issue #47: "iptal et" YALNIZCA setlerin gercekten yuklendigi ve BOS oldugu bilindiginde cikar.
  // `isLoading` tek basina yetmez: sorgu `enabled: sessionId !== null` oldugu icin oturum yokken
  // de false doner ama veri yoktur -- belirleyici olan `setler`in kendisidir.
  const setlerYuklendi = !setlerYukleniyor && !setlerHataliMi && setler !== undefined;
  const oturumBos = setlerYuklendi && setler.length === 0;
  const { data: egzersizler } = useExercises();
  const navigate = useNavigate();
  const baslatMutasyonu = useStartSession();
  const iptalMutasyonu = useDeleteSession();
  const hareketEkleMutasyonu = useAddSessionExercise();
  const siraMutasyonu = useReorderSessionExercises();
  const [baslatmaBilgisi, setBaslatmaBilgisi] = useState<string | null>(null);
  const [panelAcik, setPanelAcik] = useState(false);

  // Issue #57: set silme. Bekleyen set listeden hemen gizlenir; "1 / 3 set" ilerlemesi ve "bitir / iptal
  // et" karari sunucu verisinden gelmeye devam eder -- istemci sunucunun sayimini tekrarlamaz.
  const queryClient = useQueryClient();
  const setSilmeyiTamamla = useCallback(
    (kayit: SetKaydi) => {
      void setiSil(kayit.id).then(
        () => setDegistiTazele(queryClient, kayit),
        // Gecikmis silme basarisiz olursa gosterilecek bir yer yok (serit kalkti). Set sunucu verisinden
        // geldigi icin listede geri gorunur -- sessiz bir veri kaybi olusmaz.
        () => undefined,
      );
    },
    [queryClient],
  );
  const setSilme = useGecikmeliSilme(setSilmeyiTamamla);

  // Issue #60: hareket kaldirma. Bekleyen hareketin karti ve setleri hemen gizlenir. Bekleyen oge
  // antrenman id'sini de tasir ki tamamlayici kararli kalsin (bkz. useGecikmeliSilme).
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

  // F1 (review bulgusu): `progress` arsivlenmis bir hareketi icerebilir ama GET /api/exercises
  // onu DONDURMEZ -- varsayilan (ya da bir kart dokunusu) boyle bir id'ye SAPLANIRSA panel gecersiz
  // bir harekete kalir. Bu yuzden secilebilirlik SADECE yuklenmis egzersiz listesine gore belirlenir.
  const secilebilirIdler = useMemo(() => new Set((egzersizler ?? []).map((eg) => eg.id)), [egzersizler]);
  // Egzersiz listesi henuz yuklenmediyse dogrulanamayan bir varsayilan SAPLANMAZ.
  const sablonVarsayilani = egzersizler ? varsayilanHareket(gorunenIlerleme, secilebilirIdler) : null;
  const [secim, setSecim] = useState<number | null>(null);
  // Hareket listesi olan oturumun kimligi degisince (yeni bir sablonla baslatilinca) secim o oturumun
  // varsayilanina sifirlanir (I1).
  const sablonluOturumId = gorunenOturum && ilerleme.length > 0 ? gorunenOturum.id : null;
  const [varsayilanUygulananOturum, setVarsayilanUygulananOturum] = useState<number | null>(null);
  if (egzersizler && sablonluOturumId !== null && sablonluOturumId !== varsayilanUygulananOturum) {
    setVarsayilanUygulananOturum(sablonluOturumId);
    setSecim(sablonVarsayilani);
  }
  const etkinSecim = secim ?? sablonVarsayilani ?? adaGoreSirala(egzersizler ?? [])[0]?.id ?? null;
  const seciliEgzersizAdi = egzersizler?.find((eg) => eg.id === etkinSecim)?.name ?? null;

  // #62: "Hareket ekle" seçicisi yalnizca antrenmanda OLMAYAN hareketleri listeler. Kaldirilmayi bekleyen
  // hareket de listede sayilir: DELETE gitmeden yeniden eklemek sunucuda 409 olurdu.
  const antrenmandakiIdler = new Set(ilerleme.map((hareket) => hareket.exerciseId));
  const eklenebilirEgzersizler = adaGoreSirala(egzersizler ?? []).filter((eg) => !antrenmandakiIdler.has(eg.id));

  // Bir kart (ya da panel <select>'i) arsivlenmis/listede olmayan bir hareketi secmeye calisirsa
  // yoksayilir (F1) -- gecerli tek secim kaynagi yuklenmis egzersiz listesidir.
  function secimYap(exerciseId: number): boolean {
    if (!secilebilirIdler.has(exerciseId)) {
      return false;
    }
    setSecim(exerciseId);
    return true;
  }

  // Dilim 3 spec Karar 6: hareket kartina dokunmak hareketi secer VE set panelini acar.
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
      // Eklenen kart secili gelir; set eklemek icin ona dokunmak yeter.
      { onSuccess: () => setSecim(exerciseId) },
    );
  }

  // #229: kaldirilmayi bekleyen hareket sunucuda hala listede -- sona eklenir ki liste birebir eslessin
  // (DELETE henuz gitmedi; geri alinirsa kart sonda doner).
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
    // Kaldirilan hareket secili kalmasin: panel kapanir, secim kalan kartlarin varsayilanina duser.
    if (etkinSecim === exerciseId) {
      setSecim(null);
      setPanelAcik(false);
    }
  }

  function sablonOlarakKaydet() {
    navigate('/templates/new', { state: { donus: '/antrenman', hareketler: oturumdanSablonHareketleri(gorunenIlerleme) } });
  }

  function sablonlaBasla(templateId: number) {
    setBaslatmaBilgisi(null);
    baslatMutasyonu.mutate(templateId, {
      onSuccess: (acilan) => {
        // request() durum kodunu vermez; anlam "sablon uygulanmadi" oldugu icin donen oturumun
        // sablonuna bakilir (plan: spec Karar 4'ten bilincli sapma).
        if (acilan.templateId !== templateId) {
          setBaslatmaBilgisi(t('antrenman.sablonUygulanmadi'));
        }
      },
    });
  }

  return (
    // 8rem = ust baslik + alt sekme cubugu yuksekligi (App.tsx'teki iki h-16); min-height sayesinde
    // icerik kisa olsa da bu kok en az bastan-nav'a kadarki alani kaplar, boylece asagidaki AddSetForm
    // (`mt-auto` + `sticky`) her zaman sekme cubugunun hemen ustunde kalir (review bulgusu I1).
    <div className="flex min-h-[calc(100dvh-8rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] flex-col gap-5 pt-2">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          {/* "Devam ediyor" rozeti "Antrenmani bitir" ile AYNI satirda (issue #151). */}
          {gorunenOturum?.isOpen && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-1 text-label">
              <span aria-hidden className="size-2 rounded-full bg-success motion-safe:animate-pulse" />
              {t('antrenman.devamEdiyor')}
            </span>
          )}
          {/* Issue #47: set GIRILMEMIS acik oturumda "bitir" degil "iptal et" gosterilir -- yanlislikla
              dokunulan bir sablon kartinin geri alinmasi budur. "Bitir" bu durumda gecmise BOS bir
              antrenman birakirdi (sorunun ta kendisi). Set girilince iptal kaybolur, "bitir" doner:
              artik silinecek gercek veri var. Set durumu HENUZ BILINMIYORKEN (yukleniyor/hata) ikisi
              de gosterilmez -- yanlis dugmeyi gosterip sonra degistirmek, kullanicinin o kisa anda
              yanlis olana dokunmasina yol acar. */}
          {gorunenOturum?.isOpen &&
            setlerYuklendi &&
            (oturumBos ? (
              <button
                type="button"
                onClick={() => iptalMutasyonu.mutate(gorunenOturum.id)}
                disabled={iptalMutasyonu.isPending}
                className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-label text-danger disabled:opacity-60"
              >
                <X aria-hidden size={18} />
                {t('antrenman.iptalEt')}
              </button>
            ) : (
              // #182: oturumu burada KAPATMAZ -- zorluk kadraninin oldugu bitirme sayfasina goturur
              // (zorluk yalnizca bitirirken alinir, sunucuda sonradan degistiren bir uc yok).
              <button
                type="button"
                onClick={() => navigate('/antrenman/bitir')}
                className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-label text-muted disabled:opacity-60"
              >
                <CircleCheck aria-hidden size={18} />
                {t('antrenman.bitir')}
              </button>
            ))}
        </div>
        {gorunenOturum && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <div>{gorunenOturum.templateName && <TurEtiketi>{gorunenOturum.templateName}</TurEtiketi>}</div>
            <span className="text-label text-muted">
              {t('antrenman.baslangic', { saat: formatSaat(gorunenOturum.startedAt) })}
            </span>
          </div>
        )}
        {/* #209: bos listeden sablon olmaz -- eylem yalnizca hareket varken gorunur. */}
        {gorunenOturum && gorunenIlerleme.length > 0 && (
          <button
            type="button"
            onClick={sablonOlarakKaydet}
            className="-ml-2 flex min-h-11 w-fit items-center gap-1 rounded-lg px-2 text-label text-muted"
          >
            <ClipboardList aria-hidden size={18} />
            {t('antrenman.sablonOlarakKaydet')}
          </button>
        )}
        {baslatMutasyonu.isError && (
          <p role="alert" className="text-label text-danger">
            {t('antrenman.baslatilamadi')}
          </p>
        )}
        {iptalMutasyonu.isError && (
          <p role="alert" className="text-label text-danger">
            {t('antrenman.iptalEdilemedi')}
          </p>
        )}
        {siraMutasyonu.isError && (
          <p role="alert" className="text-label text-danger">
            {t('antrenman.siraKaydedilemedi')}
          </p>
        )}
        {hareketEkleMutasyonu.isError && (
          <p role="alert" className="text-label text-danger">
            {t('antrenman.hareketEklenemedi')}
          </p>
        )}
        {/* F2 (review bulgusu): canli bolge HER ZAMAN monte edilir -- metniyle BIRLIKTE eklenirse
            bazi ekran okuyucular sonradan gelen bir canli bolgeyi atlar. Bos oldugunda gorsel olarak
            bos kalir. */}
        <p role="status" className="text-label text-muted">
          {baslatmaBilgisi}
        </p>
      </header>

      {oturumYukleniyor && <p className="text-body text-muted">{t('ortak.yukleniyor')}</p>}

      {oturumHataliMi && (
        <p role="alert" className="text-body text-danger">
          {t('antrenman.oturumAlinamadi')}
        </p>
      )}

      {gorunenOturum && (
        <>
          {setlerYukleniyor && <p className="text-body text-muted">{t('ortak.yukleniyor')}</p>}
          {setlerHataliMi && (
            <p role="alert" className="text-body text-danger">
              {t('antrenman.setlerAlinamadi')}
            </p>
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
              />
            ) : (
              <>
                {/* Hareket listesi bos eski bir oturumda (#60/#62 migration'indan once acilmis) panelde
                    secili hareketin gecmisi, set listesinin USTUNDE (Karar 9). `key`: hareket degisince
                    gecmis yeniden kapali baslar (#50). */}
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
          <IkincilDugme onClick={() => baslatMutasyonu.mutate(null)} disabled={baslatMutasyonu.isPending}>
            {t('antrenman.bosBaslat')}
          </IkincilDugme>
        </>
      )}

      {setSilme.bekleyen && (
        <GeriAlSeridi
          // `key`: ard arda iki silmede serit YENIDEN monte olsun, pencere bastan baslasin.
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
    </div>
  );
}
