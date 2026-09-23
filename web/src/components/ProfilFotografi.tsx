import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { kimlikliKaynak } from '../api/client';
import { avatarYolu, queryKeys, type Profil } from '../api/queries';
import { useDil } from '@grind/shared/i18n';
import { basHarf } from '../lib/profilFotografi';

const BOYUT = { orta: 'size-20 text-title', buyuk: 'size-24 text-title' } as const;

/**
 * Yuvarlak profil fotoğrafı (#283); yoksa görünen ismin (yoksa kullanıcı adının) baş harfi.
 * Fotoğraf ucu kimlik ister (#280), `<img src>` yetki başlığı gönderemez: resim kimlikli bir
 * istekle çekilip data URL'e çevrilir. Anahtarda sürüm var -- yeni fotoğraf yeni kayıt olur.
 */
export default function ProfilFotografi({ profil, boyut }: { profil: Profil; boyut: keyof typeof BOYUT }) {
  const { t } = useTranslation();
  const dil = useDil();
  const surum = profil.hasAvatar ? profil.avatarVersion : null;
  const { data: adres } = useQuery({
    queryKey: queryKeys.avatar(profil.username, surum ?? 0),
    enabled: surum !== null,
    staleTime: Infinity,
    queryFn: () => fotografiDataUrlOlarakAl(profil.username, surum!),
  });

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-3 text-fg ${BOYUT[boyut]}`}
    >
      {surum !== null && adres ? (
        <img src={adres} alt={t('ortak.profilFotografi')} className="size-full object-cover" />
      ) : (
        <span aria-hidden>{basHarf(profil.displayName ?? profil.username, dil)}</span>
      )}
    </div>
  );
}

async function fotografiDataUrlOlarakAl(kullaniciAdi: string, surum: number): Promise<string> {
  const { uri, headers } = kimlikliKaynak(avatarYolu(kullaniciAdi, surum));
  const yanit = await fetch(uri, { headers });
  if (!yanit.ok) {
    throw new Error(`Profil fotografi alinamadi (${yanit.status}).`);
  }
  const blob = await yanit.blob();
  return new Promise((coz, reddet) => {
    const okuyucu = new FileReader();
    okuyucu.onload = () => coz(okuyucu.result as string);
    okuyucu.onerror = () => reddet(okuyucu.error);
    okuyucu.readAsDataURL(blob);
  });
}
