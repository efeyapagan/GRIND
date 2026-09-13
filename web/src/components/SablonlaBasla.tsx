import { Link } from 'react-router-dom';
import { useTemplates } from '../api/queries';
import SablonKarti from '../ui/SablonKarti';

interface Props {
  onBasla: (templateId: number) => void;
  bekliyor: boolean;
}

/**
 * Bugun'un bos durumundaki "Sablonla basla" bolumu (spec Karar 2 ve 4). Baslatma mutasyonu ve
 * "sablon uygulanmadi" bilgisi TodayPage'dedir: oturum acilinca bu bolum kaybolur, bilgi kaybolmamali.
 */
export default function SablonlaBasla({ onBasla, bekliyor }: Props) {
  const { data: sablonlar, isLoading, isError } = useTemplates();

  return (
    <section aria-labelledby="sablonla-basla-basligi" className="flex flex-col gap-3">
      <h2 id="sablonla-basla-basligi" className="text-heading">
        Şablonla başla
      </h2>

      {isLoading && <p className="text-body text-muted">Yükleniyor...</p>}
      {isError && (
        <p role="alert" className="text-body text-danger">
          Şablonlar alınamadı.
        </p>
      )}

      {sablonlar && sablonlar.length === 0 && (
        <p className="text-body text-muted">
          Henüz şablon yok.{' '}
          <Link to="/templates/new" className="text-fg underline">
            Şablon oluştur
          </Link>
        </p>
      )}

      {sablonlar && sablonlar.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {sablonlar.map((sablon) => (
              <li key={sablon.id}>
                <SablonKarti
                  ad={sablon.name}
                  hareketSayisi={sablon.exercises.length}
                  onClick={() => onBasla(sablon.id)}
                  disabled={bekliyor}
                />
              </li>
            ))}
          </ul>
          <Link to="/templates" className="flex min-h-11 w-fit items-center text-label text-muted underline">
            Şablonları yönet
          </Link>
        </>
      )}
    </section>
  );
}
