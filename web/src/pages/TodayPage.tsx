import { useMemo, useState } from 'react';
import { CircleCheck, Dumbbell } from 'lucide-react';
import { useExercises, useFinishSession, useOpenSession, useSessionSets, useStartSession } from '../api/queries';
import { formatTrTime } from '../lib/format';
import { adaGoreSirala } from '../lib/egzersizler';
import { varsayilanHareket } from '../lib/ilerleme';
import SetList from '../components/SetList';
import AddSetForm from '../components/AddSetForm';
import HareketGecmisi from '../components/HareketGecmisi';
import HareketKartlari from '../components/HareketKartlari';
import SablonlaBasla from '../components/SablonlaBasla';
import BosDurum from '../ui/BosDurum';
import TurEtiketi from '../ui/TurEtiketi';

const SABLON_UYGULANMADI = 'Bugün zaten açık bir antrenmanın var; şablon uygulanmadı.';

/**
 * "Bugun" ekrani. Acik oturum varsa baslangic saati (TR), sablonluysa sablon adi ve hareket kartlari,
 * degilse gruplu set listesi; yoksa bos durum + "Sablonla basla". Set ekleme paneli HER DURUMDA
 * render edilir: ilk set sunucu tarafinda sablonsuz oturumu kendiliginden acar.
 *
 * DIKKAT (review bulgusu): oturum ve set sorgularinin HATA durumu bos durumdan AYRI ve ONCELIKLI.
 *
 * Secim (spec Karar 5) burada TEK durumdur; kartlar ve panel paylasir. YENI bir sablonlu oturum
 * gorununce (id, varsayilanin en son uygulandigi oturumdan FARKLIYSA) secim o oturumun varsayilanina
 * SIFIRLANIR -- aksi halde onceki oturumdan kalma bir secim (orn. Bench Press) yeni sablonda hic
 * olmayabilir (review bulgusu I1). Ayni oturum icinde ise hareket tamamlaninca secim kendiliginden
 * sonrakine ATLAMAZ; sablonsuz bir oturum (bos durumdan ilk set ile acilan) secimi SIFIRLAMAZ --
 * kullanicinin panelde yaptigi secim korunur. Render sirasinda kosullu set (efekt yok).
 *
 * Alt alan (AddSetForm) artik `fixed` DEGIL, kendi akis icinde `sticky` (review bulgusu I1 --
 * `fixed` icerigin altini sabit bir yukseklikte ortuyordu, dinlenme sayaci acikken bu yukseklik
 * degistigi icin liste kismen ortuluyordu). Kok `div`e minimum yukseklik verilir ki icerik kisa
 * olsa bile alt alan `mt-auto` ile en alta itilsin ve sekme cubugunun hemen ustunde kalsin.
 */
export default function TodayPage() {
  const { data: oturum, isLoading: oturumYukleniyor, isError: oturumHataliMi } = useOpenSession();
  const gorunenOturum = !oturumYukleniyor && !oturumHataliMi ? (oturum ?? null) : null;
  const {
    data: setler,
    isLoading: setlerYukleniyor,
    isError: setlerHataliMi,
  } = useSessionSets(oturum?.id ?? null);
  const { data: egzersizler } = useExercises();
  const bitirMutasyonu = useFinishSession();
  const baslatMutasyonu = useStartSession();
  const [baslatmaBilgisi, setBaslatmaBilgisi] = useState<string | null>(null);
  const [panelAcik, setPanelAcik] = useState(false);

  const ilerleme = gorunenOturum?.progress ?? [];
  // F1 (review bulgusu): `progress` arsivlenmis bir hareketi icerebilir ama GET /api/exercises
  // onu DONDURMEZ -- varsayilan (ya da bir kart dokunusu) boyle bir id'ye SAPLANIRSA, AddSetForm'daki
  // kontrollu <select>de karsilik gelen bir <option> olmaz ve secim gecersiz kalir. Bu yuzden
  // secilebilirlik SADECE yuklenmis egzersiz listesine gore belirlenir.
  const secilebilirIdler = useMemo(() => new Set((egzersizler ?? []).map((eg) => eg.id)), [egzersizler]);
  // Egzersiz listesi henuz yuklenmediyse dogrulanamayan bir varsayilan SAPLANMAZ (asagidaki pinleme
  // effekti egzersizler gelene kadar bekler).
  const sablonVarsayilani = egzersizler ? varsayilanHareket(ilerleme, secilebilirIdler) : null;
  const [secim, setSecim] = useState<number | null>(null);
  // Sablonlu oturumun kimligi degisince (yeni bir sablonla baslatilinca) secim o oturumun
  // varsayilanina sifirlanir; sablonsuz bir oturum (id null gibi degil, ilerleme BOS) bu
  // sifirlamayi TETIKLEMEZ -- kullanicinin bos durumdan yaptigi panel secimi korunur (I1).
  const sablonluOturumId = gorunenOturum && ilerleme.length > 0 ? gorunenOturum.id : null;
  const [varsayilanUygulananOturum, setVarsayilanUygulananOturum] = useState<number | null>(null);
  if (egzersizler && sablonluOturumId !== null && sablonluOturumId !== varsayilanUygulananOturum) {
    setVarsayilanUygulananOturum(sablonluOturumId);
    setSecim(sablonVarsayilani);
  }
  const etkinSecim = secim ?? sablonVarsayilani ?? adaGoreSirala(egzersizler ?? [])[0]?.id ?? null;
  const seciliEgzersizAdi = egzersizler?.find((eg) => eg.id === etkinSecim)?.name ?? null;

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

  function sablonlaBasla(templateId: number) {
    setBaslatmaBilgisi(null);
    baslatMutasyonu.mutate(templateId, {
      onSuccess: (acilan) => {
        // request() durum kodunu vermez; anlam "sablon uygulanmadi" oldugu icin donen oturumun
        // sablonuna bakilir (plan: spec Karar 4'ten bilincli sapma).
        if (acilan.templateId !== templateId) {
          setBaslatmaBilgisi(SABLON_UYGULANMADI);
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
          <h1 className="text-title">Bugün</h1>
          {gorunenOturum?.isOpen && (
            <button
              type="button"
              onClick={() => bitirMutasyonu.mutate(gorunenOturum.id)}
              disabled={bitirMutasyonu.isPending}
              className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-label text-muted disabled:opacity-60"
            >
              <CircleCheck aria-hidden size={18} />
              Antrenmanı bitir
            </button>
          )}
        </div>
        {gorunenOturum && (
          <div className="flex flex-wrap items-center gap-2">
            {gorunenOturum.isOpen && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-1 text-label">
                <span aria-hidden className="size-2 rounded-full bg-muted motion-safe:animate-pulse" />
                Devam ediyor
              </span>
            )}
            {gorunenOturum.templateName && <TurEtiketi>{gorunenOturum.templateName}</TurEtiketi>}
            <span className="text-label text-muted">Başlangıç {formatTrTime(gorunenOturum.startedAt)}</span>
          </div>
        )}
        {bitirMutasyonu.isError && (
          <p role="alert" className="text-label text-danger">
            Antrenman bitirilemedi. Lütfen tekrar deneyin.
          </p>
        )}
        {baslatMutasyonu.isError && (
          <p role="alert" className="text-label text-danger">
            Antrenman başlatılamadı. Lütfen tekrar deneyin.
          </p>
        )}
        {/* F2 (review bulgusu): canli bolge HER ZAMAN monte edilir -- metniyle BIRLIKTE eklenirse
            bazi ekran okuyucular sonradan gelen bir canli bolgeyi atlar. Bos oldugunda gorsel olarak
            bos kalir. */}
        <p role="status" className="text-label text-muted">
          {baslatmaBilgisi}
        </p>
      </header>

      {oturumYukleniyor && <p className="text-body text-muted">Yükleniyor...</p>}

      {oturumHataliMi && (
        <p role="alert" className="text-body text-danger">
          Oturum bilgisi alınamadı. Lütfen sayfayı yenileyin.
        </p>
      )}

      {gorunenOturum && (
        <>
          {setlerYukleniyor && <p className="text-body text-muted">Yükleniyor...</p>}
          {setlerHataliMi && (
            <p role="alert" className="text-body text-danger">
              Setler alınamadı. Lütfen sayfayı yenileyin.
            </p>
          )}
          {!setlerYukleniyor &&
            !setlerHataliMi &&
            (ilerleme.length > 0 ? (
              <HareketKartlari
                ilerleme={ilerleme}
                setler={setler ?? []}
                secilenId={etkinSecim}
                onSec={kartSec}
              />
            ) : (
              <>
                {/* Sablonsuz antrenmanda panelde secili hareketin gecmisi, set listesinin USTUNDE (Karar 9). */}
                {etkinSecim !== null && seciliEgzersizAdi && (
                  <HareketGecmisi exerciseId={etkinSecim} exerciseName={seciliEgzersizAdi} />
                )}
                <SetList sets={setler ?? []} />
              </>
            ))}
        </>
      )}

      {!oturumYukleniyor && !oturumHataliMi && !oturum && (
        <>
          <BosDurum
            ikon={Dumbbell}
            baslik="Bugün henüz antrenman yok"
            aciklama="İlk seti ekleyerek antrenmanı başlatın."
          />
          <SablonlaBasla onBasla={sablonlaBasla} bekliyor={baslatMutasyonu.isPending} />
        </>
      )}

      <AddSetForm
        egzersizId={etkinSecim}
        onEgzersizSec={secimYap}
        acik={panelAcik}
        onAcikDegis={setPanelAcik}
      />
    </div>
  );
}
