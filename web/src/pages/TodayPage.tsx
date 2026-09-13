import { CircleCheck, Dumbbell } from 'lucide-react';
import { useOpenSession, useSessionSets, useFinishSession } from '../api/queries';
import { formatTrTime } from '../lib/format';
import SetList from '../components/SetList';
import AddSetForm from '../components/AddSetForm';
import BosDurum from '../ui/BosDurum';

/**
 * "Bugun" ekrani -- dilimin kalbi. Acik oturum varsa baslangic saati (TR) ve setleri gosterir;
 * yoksa (404 -> null, spec) bos durum. Set ekleme paneli HER DURUMDA render edilir: ilk set
 * sunucu tarafinda oturumu kendiliginden acar -- ayri bir "oturum baslat" dugmesi yok.
 *
 * DIKKAT (review bulgusu): oturum ve set sorgularinin HATA durumu bos durumdan AYRI ve ONCELIKLI
 * gosterilir -- bir sunucu kesintisini "bugun henuz antrenman yok" ile karistirmak, gercekte var
 * olan bir oturumu gizler.
 *
 * "Antrenmani bitir" basliktadir, "Set ekle"den uzakta (spec): yanlislikla basilirsa sonraki set
 * ayni gun yeni bir antrenman acar. Basarisiz olursa hata gosterilir (spec davranis 4).
 *
 * `pb-72` (18rem): sabit set ekle paneli (~240 px) listenin son satirini ortmesin; sekme cubugunun
 * boslugunu ise kabuk (`App`) zaten verir.
 */
export default function TodayPage() {
  const { data: oturum, isLoading: oturumYukleniyor, isError: oturumHataliMi } = useOpenSession();
  const gorunenOturum = !oturumYukleniyor && !oturumHataliMi ? (oturum ?? null) : null;
  const {
    data: setler,
    isLoading: setlerYukleniyor,
    isError: setlerHataliMi,
  } = useSessionSets(oturum?.id ?? null);
  const bitirMutasyonu = useFinishSession();

  return (
    <div className="flex flex-col gap-5 pt-2 pb-72">
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
          <div className="flex items-center gap-2">
            {gorunenOturum.isOpen && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-1 text-label">
                <span aria-hidden className="size-2 rounded-full bg-muted motion-safe:animate-pulse" />
                Devam ediyor
              </span>
            )}
            <span className="text-label text-muted">Başlangıç {formatTrTime(gorunenOturum.startedAt)}</span>
          </div>
        )}
        {bitirMutasyonu.isError && (
          <p role="alert" className="text-label text-danger">
            Antrenman bitirilemedi. Lütfen tekrar deneyin.
          </p>
        )}
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
          {!setlerYukleniyor && !setlerHataliMi && <SetList sets={setler ?? []} />}
        </>
      )}

      {!oturumYukleniyor && !oturumHataliMi && !oturum && (
        <BosDurum
          ikon={Dumbbell}
          baslik="Bugün henüz antrenman yok"
          aciklama="İlk seti ekleyerek antrenmanı başlatın."
        />
      )}

      <AddSetForm />
    </div>
  );
}
