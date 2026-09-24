import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { KullaniciOzeti } from '../api/queries';
import Rozet from '../ui/Rozet';
import ProfilFotografi from './ProfilFotografi';
import TakipDugmesi from './TakipDugmesi';

/**
 * Takip listelerinde ve aramada bir kisi (#284): fotograf, kullanici adi, gorunen isim ve iliskiye gore
 * dugme. Arkadasa dugme yerine gosterge -- arkadaslik listede tek dokunusla bozulmasin, birakmak profilden.
 */
export default function KullaniciSatiri({ kisi }: { kisi: KullaniciOzeti }) {
  const { t } = useTranslation();

  return (
    <li aria-label={kisi.username} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
      <Link to={`/u/${encodeURIComponent(kisi.username)}`} className="flex min-w-0 flex-1 items-center gap-3">
        <ProfilFotografi profil={kisi} boyut="kucuk" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-label text-fg">{kisi.username}</span>
          {kisi.displayName && <span className="truncate text-body text-muted">{kisi.displayName}</span>}
        </span>
      </Link>
      {kisi.relation === 'Friends' ? (
        <Rozet ton="acik">{t('takip.arkadas')}</Rozet>
      ) : (
        <TakipDugmesi kullaniciAdi={kisi.username} iliski={kisi.relation} boyut="kucuk" />
      )}
    </li>
  );
}
