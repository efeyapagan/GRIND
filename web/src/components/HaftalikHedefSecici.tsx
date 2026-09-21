import { useTranslation } from 'react-i18next';
import { useGuncelTakvimOzeti, useSetWeeklyTarget } from '../api/queries';
import SecimKutusu from '../ui/SecimKutusu';

const HEDEF_GUNLERI = [1, 2, 3, 4, 5, 6, 7];

/**
 * Haftalik antrenman hedefi (#97; #117'de Bugun'den Profil'e tasindi). Secim hemen kaydedilir; gorunen
 * deger sunucunun takvim yanitindan gelir (istemci kendi kopyasini tutmaz), kayit sonrasi takvim
 * tazelenince guncellenir. Deger gelene kadar secici kapali durur.
 */
export default function HaftalikHedefSecici() {
  const { t } = useTranslation();
  const { data: ozet, isError } = useGuncelTakvimOzeti();
  const hedefAyarla = useSetWeeklyTarget();
  const hedef = ozet?.weeklyTargetDays ?? null;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="haftalik-hedef" className="text-label text-muted">
        {t('profil.haftalikHedef')}
      </label>
      <SecimKutusu
        id="haftalik-hedef"
        value={hedef === null ? '' : String(hedef)}
        disabled={!ozet || hedefAyarla.isPending}
        onChange={(olay) => hedefAyarla.mutate(olay.target.value === '' ? null : Number(olay.target.value))}
      >
        <option value="">{t('profil.hedefYok')}</option>
        {HEDEF_GUNLERI.map((gun) => (
          <option key={gun} value={gun}>
            {t('profil.haftadaGun', { count: gun })}
          </option>
        ))}
      </SecimKutusu>
      {isError && (
        <p role="alert" className="text-label text-danger">
          {t('profil.hedefAlinamadi')}
        </p>
      )}
      {hedefAyarla.isError && (
        <p role="alert" className="text-label text-danger">
          {t('profil.hedefKaydedilemedi')}
        </p>
      )}
    </div>
  );
}
