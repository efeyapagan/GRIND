import { useNavigate } from 'react-router-dom';
import { useOpenSession } from '@grind/shared/api/queries';
import { formatSaat } from '@grind/shared/lib/format';
import BirincilDugme from '../ui/BirincilDugme';
import TurEtiketi from '../ui/TurEtiketi';

/**
 * mobile/src/components/DevamEdenAntrenman.tsx ile ayni (issue #175).
 *
 * Sekme/uygulama kapatilip acilinca kullanici Ana sayfada aciliyor ve devam eden antrenmani
 * goremiyordu -- veri sunucuda dururken onun icin antrenman "kaybolmus" oluyordu. Bu kart acik
 * oturumu gorunur kilar. Oturum yokken (ya da sorgu henuz yuklenmemisken) HIC cizilmez: antrenmansiz
 * bir gunde Ana sayfa bugunku haliyle kalir.
 */
export default function DevamEdenAntrenman() {
  const { data: oturum } = useOpenSession();
  const navigate = useNavigate();

  if (!oturum?.isOpen) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-1 text-label text-fg">
          <span className="size-2 rounded-full bg-muted" />
          Devam ediyor
        </span>
        <span className="text-label text-muted">Başlangıç {formatSaat(oturum.startedAt)}</span>
      </div>
      {oturum.templateName && (
        <div>
          <TurEtiketi>{oturum.templateName}</TurEtiketi>
        </div>
      )}
      <BirincilDugme yukseklik="normal" onClick={() => navigate('/antrenman')}>
        Devam et
      </BirincilDugme>
    </div>
  );
}
