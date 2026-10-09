import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  useBildirimKategorileri,
  useBildirimKategorisiAyarla,
  type BildirimKategorisi,
} from '@grind/shared/api/queries';
import { usePageTitle } from '@grind/shared/pageTitle';
import { useCevrimiciEylem } from '../../../src/baglanti/useCevrimiciEylem';
import AnahtarSatiri from '../../../src/ui/AnahtarSatiri';
import CamKart from '../../../src/ui/CamKart';
import EkranKaydirici from '../../../src/ui/EkranKaydirici';

/**
 * Ekranda cizilen kategoriler. Sunucudaki `Interactions` / `Reminders` / `System` BILEREK yok (kullanici
 * karari, #410): bugun o kategorilerde bildirim turu uretilmiyor, hicbir sey yapmayan anahtar yaniltici olurdu.
 * Ilk turleri gelince buraya eklenir.
 */
const KATEGORILER: readonly { kategori: BildirimKategorisi; anahtar: 'takipVeArkadaslik' | 'rekorlar' | 'haftalikHedefler' }[] = [
  { kategori: 'FollowsAndFriends', anahtar: 'takipVeArkadaslik' },
  { kategori: 'Records', anahtar: 'rekorlar' },
  { kategori: 'WeeklyGoals', anahtar: 'haftalikHedefler' },
];

/**
 * #410: Hesap ayarlari -> Bildirim ayarlari. Her kategori bir anahtar; kapatilan kategorinin bildirimleri
 * listede gorunmez ve zilde sayilmaz (sunucu suzer). Tercih hesaba baglidir. Cevrimdisi degistirilemez.
 */
export default function BildirimAyarlariScreen() {
  const { t } = useTranslation();
  usePageTitle(t('profil.bildirimAyarlari'));
  const { data: kapalilar, isError } = useBildirimKategorileri();
  const ayarla = useBildirimKategorisiAyarla();
  const cevrimici = useCevrimiciEylem();

  return (
    <EkranKaydirici contentContainerClassName="gap-4 px-4 pt-2 pb-4">
      {isError && !kapalilar && (
        <Text accessibilityRole="alert" className="text-body text-danger">
          {t('bildirimAyarlari.alinamadi')}
        </Text>
      )}
      {kapalilar && (
        <CamKart className="flex-col gap-4 p-4">
          {KATEGORILER.map(({ kategori, anahtar }) => (
            <AnahtarSatiri
              key={kategori}
              etiket={t(`bildirimAyarlari.${anahtar}`)}
              aciklama={t(`bildirimAyarlari.${anahtar}Aciklama`)}
              hata={ayarla.isError && ayarla.variables?.category === kategori ? t('bildirimAyarlari.kaydedilemedi') : null}
              deger={!kapalilar.includes(kategori)}
              onDegistir={cevrimici((enabled: boolean) => ayarla.mutate({ category: kategori, enabled }))}
            />
          ))}
        </CamKart>
      )}
    </EkranKaydirici>
  );
}
