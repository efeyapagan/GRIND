import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { useKullaniciProfili, useProfilim } from '../api/queries';
import HataKutusu from '../ui/HataKutusu';
import ProfilFotografi from './ProfilFotografi';

const DUGMELER = [
  { to: '/profile/edit', etiketAnahtari: 'ortak.profiliDuzenle' },
  { to: '/profile/account', etiketAnahtari: 'ortak.hesapAyarlari' },
] as const;

/**
 * Instagram tarzı profil başlığı (#283): solda fotoğraf, yanında kullanıcı adı ve üç sayaç, altında
 * görünen isim + yaş, en altta iki düğme. Sayılar ve yaş sunucudan gelir (#280/#281), istemcide
 * hesaplanmaz. Sayaçlara dokunmak (listeler) ayrı bir issue -- şimdilik düz metin.
 */
export default function ProfilBasligi() {
  const { t } = useTranslation();
  const { username } = useAuth();
  const profil = useProfilim();
  const sayaclar = useKullaniciProfili(username);

  if (profil.isError) {
    return <HataKutusu baslik={t('profil.guncellenemedi')} mesaj={t('profil.profilAlinamadi')} />;
  }
  if (!profil.data) {
    return <div className="min-h-40" />;
  }

  const sayacListesi = [
    { sayi: sayaclar.data?.friendCount, etiket: t('profil.arkadaslar') },
    { sayi: sayaclar.data?.followerCount, etiket: t('profil.takipciler') },
    { sayi: sayaclar.data?.followingCount, etiket: t('profil.takipEdilenler') },
  ];

  return (
    <section className="flex flex-col gap-3 pt-2">
      <div className="flex items-center gap-4">
        <ProfilFotografi profil={profil.data} boyut="orta" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 className="truncate text-heading">{profil.data.username}</h2>
          <ul aria-label={t('profil.sayaclar')} className="flex gap-4">
            {sayacListesi.map(({ sayi, etiket }) => (
              <li key={etiket} className="flex flex-col">
                <span className="text-body-lg font-bold text-fg">{sayi ?? '–'}</span>
                <span className="text-label text-muted">{etiket}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {(profil.data.displayName || profil.data.age !== null) && (
        <div className="flex flex-col">
          {profil.data.displayName && <span className="text-body-lg text-fg">{profil.data.displayName}</span>}
          {profil.data.age !== null && (
            <span className="text-body text-muted">{t('profil.yas', { count: profil.data.age })}</span>
          )}
        </div>
      )}
      <div className="flex gap-2">
        {DUGMELER.map(({ to, etiketAnahtari }) => (
          <Link
            key={to}
            to={to}
            className="flex h-10 flex-1 items-center justify-center rounded-xl bg-surface-3 px-3 text-label text-fg"
          >
            {t(etiketAnahtari)}
          </Link>
        ))}
      </div>
    </section>
  );
}
