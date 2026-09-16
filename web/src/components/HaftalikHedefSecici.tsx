import { useGuncelTakvimOzeti, useSetWeeklyTarget } from '../api/queries';
import SecimKutusu from '../ui/SecimKutusu';

const HEDEF_GUNLERI = [1, 2, 3, 4, 5, 6, 7];

/**
 * Haftalik antrenman hedefi (#97; #117'de Bugun'den Profil'e tasindi). Secim hemen kaydedilir; gorunen
 * deger sunucunun takvim yanitindan gelir (istemci kendi kopyasini tutmaz), kayit sonrasi takvim
 * tazelenince guncellenir. Deger gelene kadar secici kapali durur.
 */
export default function HaftalikHedefSecici() {
  const { data: ozet, isError } = useGuncelTakvimOzeti();
  const hedefAyarla = useSetWeeklyTarget();
  const hedef = ozet?.weeklyTargetDays ?? null;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="haftalik-hedef" className="text-label text-muted">
        Haftalık hedef
      </label>
      <SecimKutusu
        id="haftalik-hedef"
        value={hedef === null ? '' : String(hedef)}
        disabled={!ozet || hedefAyarla.isPending}
        onChange={(olay) => hedefAyarla.mutate(olay.target.value === '' ? null : Number(olay.target.value))}
      >
        <option value="">Hedef yok</option>
        {HEDEF_GUNLERI.map((gun) => (
          <option key={gun} value={gun}>
            {`Haftada ${gun} gün`}
          </option>
        ))}
      </SecimKutusu>
      {isError && (
        <p role="alert" className="text-label text-danger">
          Hedef alınamadı.
        </p>
      )}
      {hedefAyarla.isError && (
        <p role="alert" className="text-label text-danger">
          Hedef kaydedilemedi.
        </p>
      )}
    </div>
  );
}
