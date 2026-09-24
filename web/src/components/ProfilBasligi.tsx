import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FotografSahibi, KullaniciProfili, TakipListesiTuru } from '../api/queries';
import ProfilFotografi from './ProfilFotografi';

interface Props {
  kisi: FotografSahibi & { age: number | null };
  /** Sunucudan; gelene kadar `–`. */
  sayaclar: KullaniciProfili | undefined;
  /** `@kullanıcı adı` satırının sonu: kendi profilinde arama ikonu, arkadaşta "Arkadaş" göstergesi. */
  adYani?: ReactNode;
  /** İsim satırının sonu -- yalnızca kendi profilinde düzenleme kalemi (issue #293). */
  duzenle?: ReactNode;
  /** En alttaki düğme satırı: başkasında takip düğmesi. Kendi profilinde YOK (düzenle kaleme,
   * hesap ayarları ust kabuktaki kısayola taşındı, issue #293). */
  children?: ReactNode;
}

const SAYACLAR = [
  { liste: 'friends', alan: 'friendCount', etiketAnahtari: 'profil.arkadaslar' },
  { liste: 'followers', alan: 'followerCount', etiketAnahtari: 'profil.takipciler' },
  { liste: 'following', alan: 'followingCount', etiketAnahtari: 'profil.takipEdilenler' },
] as const satisfies readonly { liste: TakipListesiTuru; alan: keyof KullaniciProfili; etiketAnahtari: string }[];

/**
 * Instagram tarzı profil başlığı (#283, düzeni #293'te değişti): solda fotoğraf, yanında görünen
 * isim + yaş (+ kalem), altında `@kullanıcı adı` (+ arama/arkadaş göstergesi), altında üç sayaç.
 * Görünen isim yoksa üst satır kullanıcı adına düşer. #284: aynı bileşen kendi profilinde ve
 * başkasınınkinde (DRY) -- veri ve ek öğeler çağırandan gelir. Sayılar ve yaş sunucudan gelir,
 * istemcide hesaplanmaz; sayaçlar ilgili takip listesini açar.
 *
 * #293 (devami): isim ve kullanıcı adı satırları BİLEREK ayrı, sıkı bir alt grupta (`gap-1`) --
 * birbirine yakın durmaları istendi. Sayaç satırı bu ikiliden daha uzakta (`gap-4`) durur, ust
 * kabuktaki bar kalkinca (App.tsx, profilAnaEkraniMi) `pt-2` artik "yarim satir" bosluğun kendisi.
 */
export default function ProfilBasligi({ kisi, sayaclar, adYani, duzenle, children }: Props) {
  const { t } = useTranslation();
  const kullaniciYolu = `/u/${encodeURIComponent(kisi.username)}`;

  return (
    <section className="flex flex-col gap-3 pt-2">
      <div className="flex items-center gap-4">
        <ProfilFotografi profil={kisi} boyut="orta" />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="min-w-0 truncate text-heading">{kisi.displayName || kisi.username}</h2>
              {kisi.age !== null && (
                <span className="shrink-0 text-body text-muted">{t('profil.yas', { count: kisi.age })}</span>
              )}
              {duzenle}
            </div>
            <div className="flex items-center gap-2">
              <span className="min-w-0 truncate text-body text-muted">@{kisi.username}</span>
              {adYani}
            </div>
          </div>
          <ul aria-label={t('profil.sayaclar')} className="flex gap-4">
            {SAYACLAR.map(({ liste, alan, etiketAnahtari }) => (
              <li key={liste}>
                <Link to={`${kullaniciYolu}/${liste}`} className="flex flex-col">
                  <span className="text-body-lg font-bold text-fg">{sayaclar?.[alan] ?? '–'}</span>
                  <span className="text-label text-muted">{t(etiketAnahtari)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </section>
  );
}
