import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link, useRouter } from 'expo-router';
import { ClipboardList, Plus } from 'lucide-react-native';
import { useTemplates, type Sablon } from '@grind/shared/api/queries';
import { usePageTitle } from '@grind/shared/pageTitle';
import { sablonlariAyir } from '@grind/shared/lib/kaydedilenSablonlar';
import DevamEdenAntrenman from '../../../src/components/DevamEdenAntrenman';
import BosDurum from '../../../src/ui/BosDurum';
import BirincilDugme from '../../../src/ui/BirincilDugme';
import SablonKarti from '../../../src/ui/SablonKarti';
import SurukleSiraliListe from '../../../src/ui/SurukleSiraliListe';
import { useIkonRenk } from '../../../src/ui/renkler';
import { useKuyrukluSablonlariSirala } from '../../../src/kuyruk/kuyrukluMutasyonlar';
import { useAltMenuPayi } from '../../../src/ui/KabukTabBar';

/**
 * web/src/pages/SablonlarPage.tsx ile ayni (spec Karar 3).
 *
 * #439: #344'un basili tutup surukleyerek siralamasi antrenman ekranindan buraya tasindi (orada
 * kartlar yana kayiyor). Sira SUNUCUDA durur -- antrenman ekranindaki kartlar ayni sirayla gelir.
 *
 * #480: acik antrenman varken ust barin HEMEN ALTINDA, kaydirilabilir alanin DISINDA ana sayfadaki
 * kartin aynisi durur -- antrenman surerken buraya gelen kullanici antrenmaninin kaybolmadigini
 * gorur ve tek dokunusla geri doner. Liste kaydirildikca kacmamasi icin ScrollView'in disinda.
 */
export default function SablonlarScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const ikonRenk = useIkonRenk();
  const altMenuPayi = useAltMenuPayi();
  usePageTitle(t('sablonlar.baslik'));
  const { data: sablonlar, isLoading, isError } = useTemplates();
  // #174 dilim 3: siralama ve duzenleme cevrimdisi de calisir (kuyruga yazilir).
  const siralama = useKuyrukluSablonlariSirala();
  // #538: kaydedilenlerin kendi ekrani var (`/templates/saved`); burada yalnizca kendi sablonlarin.
  const { kendi, kaydedilen } = sablonlariAyir(sablonlar ?? []);

  return (
    <View className="flex-1">
      <DevamEdenAntrenman className="mx-4 mt-2" />
      <ScrollView contentContainerClassName="gap-5 px-4 pt-2" contentContainerStyle={{ paddingBottom: altMenuPayi }}>
        {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}

        {isError && !sablonlar && (
          <Text accessibilityRole="alert" className="text-body text-danger">
            {t('sablonlar.hataYenile')}
          </Text>
        )}

        {sablonlar && kendi.length === 0 && (
          <BosDurum
            ikon={ClipboardList}
            baslik={t('sablonlar.hicSablonYokBaslik')}
            aciklama={t('sablonlar.hicSablonYokAciklama')}
          />
        )}

        {kendi.length > 0 && (
          <SurukleSiraliListe
            ogeler={kendi}
            anahtar={(sablon) => sablon.id}
            onSirala={(yeniSira: Sablon[]) =>
              // Sunucu TUM id kumesini bekler (#467): kaydedilenler kendi ekraninda, siraya sona eklenir.
              siralama.mutate([...yeniSira.map((sablon) => sablon.id), ...kaydedilen.map((sablon) => sablon.id)])
            }
            satirCiz={(sablon, suruklenen) => (
              <SablonKarti
                ad={sablon.name}
                hareketSayisi={sablon.exercises.length}
                onPress={() => router.push(`/templates/${sablon.id}`)}
                kaldirilmis={suruklenen}
              />
            )}
          />
        )}

        <Link href="/templates/new" asChild>
          <BirincilDugme yukseklik="normal">
            <Plus color={ikonRenk.onAccent} size={20} />
            <Text className="text-body-lg font-bold text-on-accent">{t('sablonlar.yeniSablon')}</Text>
          </BirincilDugme>
        </Link>
      </ScrollView>
    </View>
  );
}
