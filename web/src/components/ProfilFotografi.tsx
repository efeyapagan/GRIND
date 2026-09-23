import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import { useProfilFotografi, type Profil } from '../api/queries';
import { basHarf } from '../lib/profilFotografi';

const BOYUT = { orta: 'size-20 text-title', buyuk: 'size-24 text-title' } as const;

/**
 * Yuvarlak profil fotoğrafı (#283); yoksa görünen ismin (yoksa kullanıcı adının) baş harfi.
 * Fotoğraf ucu kimlik ister (#280): resim `useProfilFotografi` ile kimlikli istekle çekilip data URL
 * olarak gelir (mobille aynı yol).
 */
export default function ProfilFotografi({ profil, boyut }: { profil: Profil; boyut: keyof typeof BOYUT }) {
  const { t } = useTranslation();
  const dil = useDil();
  const { data: adres } = useProfilFotografi(profil);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-3 text-fg ${BOYUT[boyut]}`}
    >
      {profil.hasAvatar && adres ? (
        <img src={adres} alt={t('ortak.profilFotografi')} className="size-full object-cover" />
      ) : (
        <span aria-hidden>{basHarf(profil.displayName ?? profil.username, dil)}</span>
      )}
    </div>
  );
}
