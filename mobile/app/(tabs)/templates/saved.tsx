import { ScrollView, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useDeleteTemplate, useSablonuSabitle, useTemplates, type Sablon } from '@grind/shared/api/queries';
import { usePageTitle } from '@grind/shared/pageTitle';
import { sablonlariAyir } from '@grind/shared/lib/kaydedilenSablonlar';
import { sablonOzeti } from '@grind/shared/lib/sablonOzeti';
import KaydedilenSablonKaruseli from '../../../src/components/KaydedilenSablonKaruseli';
import SablonMenusu from '../../../src/components/SablonMenusu';
import { useSablonMenusu } from '../../../src/components/useSablonMenusu';
import { KART_ARALIGI, useVitrinKartGenisligi } from '../../../src/ui/SablonVitrinKarti';
import { useCevrimiciEylem } from '../../../src/baglanti/useCevrimiciEylem';
import { useAltMenuPayi } from '../../../src/ui/KabukTabBar';

/**
 * #538: baskasindan kaydedilen sablonlarin yonetim ekrani -- antrenman sekmesindeki "Kaydedilenler"
 * basligindaki "Duzenle" buraya gelir. "Sablonlarim"daki gibi yana kayan kartlar; surukleme tutamagi
 * yerine sabitleme dugmesi (sabitlenen sablon her iki listede de basta durur). Silme kartta gorunur bir
 * ikonla DEGIL, basili tutunca acilan menuden (kullanici karari). Karta dokunmak, Sablonlarim'daki gibi
 * sablonun duzenleme formunu acar.
 */
export default function KaydedilenSablonlarScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const altMenuPayi = useAltMenuPayi();
  usePageTitle(t('sablonlar.kaydedilenlerEkranBasligi'));
  const kartGenisligi = useVitrinKartGenisligi();
  const { data: sablonlar, isLoading, isError } = useTemplates();
  const silme = useDeleteTemplate();
  const sabitleme = useSablonuSabitle();
  // #174: sablon duzenleme, silme ve sabitleme cevrimdisi calismaz, uyari cikar.
  const cevrimici = useCevrimiciEylem();
  const { menu, menuyuAc, menuyuKapat, kartRef } = useSablonMenusu();

  const { kaydedilen } = sablonlariAyir(sablonlar ?? []);

  return (
    <ScrollView contentContainerClassName="gap-5 px-4 pt-2" contentContainerStyle={{ paddingBottom: altMenuPayi }}>
      {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}
      {isError && !sablonlar && (
        <Text accessibilityRole="alert" className="text-body text-danger">
          {t('sablonlar.hataYenile')}
        </Text>
      )}
      {sablonlar && kaydedilen.length === 0 && <Text className="text-body text-muted">{t('sablonlar.kaydedilenlerYok')}</Text>}

      {kaydedilen.length > 0 && (
        <KaydedilenSablonKaruseli
          sablonlar={kaydedilen}
          kartGenisligi={kartGenisligi}
          aralik={KART_ARALIGI}
          onKart={cevrimici((sablon: Sablon) => router.push(`/templates/${sablon.id}`))}
          onMenu={menuyuAc}
          kartRef={kartRef}
          disabled={false}
          onSabitle={cevrimici((sablon: Sablon) => sabitleme.mutate({ id: sablon.id, isPinned: !sablon.isPinned }))}
        />
      )}

      {menu && (
        <SablonMenusu
          sablon={menu.sablon}
          ozet={sablonOzeti(menu.sablon)}
          kartGenisligi={kartGenisligi}
          kaynak={menu.kaynak}
          onKapat={menuyuKapat}
          onDuzenle={cevrimici(() => {
            menuyuKapat();
            router.push(`/templates/${menu.sablon.id}`);
          })}
          onSil={cevrimici(() => {
            silme.mutate(menu.sablon.id);
            menuyuKapat();
          })}
        />
      )}
    </ScrollView>
  );
}
