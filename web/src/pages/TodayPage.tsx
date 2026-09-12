import { useOpenSession, useSessionSets, useFinishSession } from '../api/queries';
import { formatTrTime } from '../lib/format';
import SetList from '../components/SetList';
import AddSetForm from '../components/AddSetForm';

/**
 * "Bugun" ekrani -- dilimin kalbi. Acik oturum varsa baslangic saati (TR) ve setleri gosterir;
 * yoksa (404 -> null, spec) bos durum metni. Set ekleme formu HER DURUMDA render edilir: bos
 * durumun birincil eylemi dogrudan set eklemektir, ilk set sunucu tarafinda oturumu kendiliginden
 * acar (spec) -- ayri bir "oturum baslat" dugmesi yok.
 *
 * DOM sirasi bilerek setler -> form: spec, birincil eylemin (set ekleme) bas parmakla erisilebilir
 * alt bolgede olmasini istiyor; bu CSS'siz, sadece DOM sirasiyla saglaniyor (gorsel tasarim yok).
 */
export default function TodayPage() {
  const { data: oturum, isLoading: oturumYukleniyor } = useOpenSession();
  const { data: setler } = useSessionSets(oturum?.id ?? null);
  const bitirMutasyonu = useFinishSession();

  return (
    <div>
      <h1>Bugün</h1>

      {oturumYukleniyor && <p>Yükleniyor...</p>}

      {!oturumYukleniyor && oturum && (
        <section>
          <p>Başlangıç: {formatTrTime(oturum.startedAt)}</p>
          <SetList sets={setler ?? []} />
          {oturum.isOpen && (
            <button
              type="button"
              onClick={() => bitirMutasyonu.mutate(oturum.id)}
              disabled={bitirMutasyonu.isPending}
            >
              Antrenmanı bitir
            </button>
          )}
        </section>
      )}

      {!oturumYukleniyor && !oturum && <p>Bugün henüz antrenman yok.</p>}

      <AddSetForm />
    </div>
  );
}
