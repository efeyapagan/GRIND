import { useTranslation } from 'react-i18next';
import { saatDakika } from '../lib/format';

/**
 * Gecmis kartindaki antrenman suresi (#246): kartin diger metrikleri gibi buyuk rakam + kucuk birim.
 * Bir saatin altinda yalnizca dakika ("58 dk"), ustunde "1 sa 12 dk". Sure sunucudan gelir.
 */
export default function AntrenmanSuresi({ saniye }: { saniye: number }) {
  const { t } = useTranslation();
  const { saat, dakika } = saatDakika(saniye);

  return (
    <span className="flex items-baseline gap-1">
      {saat > 0 && (
        <>
          <span className="text-metric tabular-nums">{saat}</span>{' '}
          <span className="text-label-xs text-muted uppercase">{t('gecmis.saatBirimi')}</span>{' '}
        </>
      )}
      <span className="text-metric tabular-nums">{dakika}</span>{' '}
      <span className="text-label-xs text-muted uppercase">{t('gecmis.dakikaBirimi')}</span>
    </span>
  );
}
