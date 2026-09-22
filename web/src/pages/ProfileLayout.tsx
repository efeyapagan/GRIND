import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Parilti from '../ui/Parilti';

const SEKMELER = [
  { to: 'account', etiketAnahtari: 'kabuk.sekmeHesap' },
  { to: 'history', etiketAnahtari: 'kabuk.sekmeGecmis' },
  { to: 'measurements', etiketAnahtari: 'kabuk.sekmeOlcumler' },
  { to: 'records', etiketAnahtari: 'kabuk.sekmeRekorlar' },
] as const;

/**
 * Profil sayfasının sekme çubuğu (issue #119): Hesap (kullanıcı adı/şifre), Geçmiş (alt menüden
 * buraya taşındı, issue #120), Ölçüler ve Rekorlar rota-tabanlı sekmelerdir -- her biri kendi
 * `usePageTitle`'ını bildirir, burada ayrıca bir başlık YAZILMAZ. Sıra kullanıcı kararı: issue
 * #179'da Hesap ile Rekorlar yer değiştirdi. Varsayılan sekme ise Rekorlar OLARAK KALDI
 * (`routes.tsx`) -- en sık bakılan sekme o; bu değişiklik yalnızca görsel konumla ilgili.
 * Rota-tabanlı olduğu için ARIA `tab`/
 * `tablist` rolü BİLEREK kullanılmaz (o rol tek sayfalık bir panel değişimini ifade eder; burada
 * her sekme gerçek bir URL'e sahip ayrı bir sayfadır) -- alt menünün kendisiyle (`App.tsx`) aynı
 * düz `nav` deseni.
 */
export default function ProfileLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label={t('kabuk.profilSekmeleri')} className="flex border-b border-surface-3">
        {SEKMELER.map(({ to, etiketAnahtari }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative flex min-h-11 flex-1 items-center justify-center border-b-2 px-2 text-center text-label ${
                isActive ? 'border-accent-fg text-fg' : 'border-transparent text-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <Parilti bicim="alt" />}
                <span className="relative">{t(etiketAnahtari)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
