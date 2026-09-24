import { useTranslation } from 'react-i18next';
import { useProfilim, useSetPrivacyLevel, type GizlilikSeviyesi } from '../api/queries';
import SecimKutusu from '../ui/SecimKutusu';

const SEVIYELER: readonly GizlilikSeviyesi[] = ['Acik', 'Kisitli', 'Gizli'];

const ETIKET_ANAHTARI = {
  Acik: 'profil.gizlilikAcik',
  Kisitli: 'profil.gizlilikKisitli',
  Gizli: 'profil.gizlilikGizli',
} as const satisfies Record<GizlilikSeviyesi, string>;

const ACIKLAMA_ANAHTARI = {
  Acik: 'profil.gizlilikAcikAciklama',
  Kisitli: 'profil.gizlilikKisitliAciklama',
  Gizli: 'profil.gizlilikGizliAciklama',
} as const satisfies Record<GizlilikSeviyesi, string>;

/**
 * Antrenman geçmişi ve rekorların başkalarına görünürlüğü (#294). Seçim hemen kaydedilir; görünen
 * değer sunucunun profil yanıtından gelir (istemci kendi kopyasını tutmaz). Değer gelene kadar
 * seçici kapalı durur.
 */
export default function GizlilikSeviyesiSecici() {
  const { t } = useTranslation();
  const { data: profil, isError } = useProfilim();
  const seviyeAyarla = useSetPrivacyLevel();
  const seviye = profil?.privacyLevel ?? null;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="gizlilik-seviyesi" className="text-label text-muted">
        {t('profil.gizlilikSeviyesi')}
      </label>
      <SecimKutusu
        id="gizlilik-seviyesi"
        value={seviye ?? ''}
        disabled={!profil || seviyeAyarla.isPending}
        onChange={(olay) => seviyeAyarla.mutate(olay.target.value as GizlilikSeviyesi)}
      >
        {SEVIYELER.map((s) => (
          <option key={s} value={s}>
            {t(ETIKET_ANAHTARI[s])}
          </option>
        ))}
      </SecimKutusu>
      {seviye && <p className="text-label text-muted">{t(ACIKLAMA_ANAHTARI[seviye])}</p>}
      {isError && (
        <p role="alert" className="text-label text-danger">
          {t('profil.gizlilikAlinamadi')}
        </p>
      )}
      {seviyeAyarla.isError && (
        <p role="alert" className="text-label text-danger">
          {t('profil.gizlilikKaydedilemedi')}
        </p>
      )}
    </div>
  );
}
