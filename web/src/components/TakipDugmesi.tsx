import { useTranslation } from 'react-i18next';
import { takipDugmesi } from '@grind/shared/lib/takip';
import { useTakipEt, type TakipIliskisi } from '../api/queries';

const BOYUT = { normal: 'h-10 flex-1 px-3', kucuk: 'h-9 shrink-0 px-3' } as const;

/**
 * Iliskiye gore Takip et / Geri takip et / Takibi birak (#284). Takip etmek birincil eylemdir (accent
 * dolgu), birakmak ikincil. Sonuc sunucudan tazelenir (`useTakipEt`); dugme kendi iliskisini tahmin etmez.
 */
export default function TakipDugmesi({
  kullaniciAdi,
  iliski,
  boyut = 'normal',
}: {
  kullaniciAdi: string;
  iliski: TakipIliskisi;
  boyut?: keyof typeof BOYUT;
}) {
  const { t } = useTranslation();
  const takip = useTakipEt();
  const dugme = takipDugmesi(iliski);
  if (!dugme) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        disabled={takip.isPending}
        onClick={() => takip.mutate({ kullaniciAdi, takipEt: dugme.takipEt })}
        className={`flex items-center justify-center rounded-xl text-label disabled:opacity-60 ${BOYUT[boyut]} ${
          dugme.takipEt ? 'bg-accent font-bold text-on-accent' : 'bg-surface-3 text-fg'
        }`}
      >
        {t(dugme.etiketAnahtari)}
      </button>
      {takip.isError && (
        <p role="alert" className="text-label-xs text-danger">
          {t('takip.islemYapilamadi')}
        </p>
      )}
    </>
  );
}
