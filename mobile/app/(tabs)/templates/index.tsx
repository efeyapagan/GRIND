import { Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link, useRouter } from 'expo-router';
import { ClipboardList, Plus } from 'lucide-react-native';
import { useTemplates, useSablonlariSirala } from '@grind/shared/api/queries';
import { usePageTitle } from '@grind/shared/pageTitle';
import BosDurum from '../../../src/ui/BosDurum';
import BirincilDugme from '../../../src/ui/BirincilDugme';
import SablonKarti from '../../../src/ui/SablonKarti';
import SurukleSiraliListe from '../../../src/ui/SurukleSiraliListe';
import { useIkonRenk } from '../../../src/ui/renkler';
import { useAltMenuPayi } from '../../../src/ui/KabukTabBar';

/**
 * web/src/pages/SablonlarPage.tsx ile ayni (spec Karar 3).
 *
 * #439: #344'un basili tutup surukleyerek siralamasi antrenman ekranindan buraya tasindi (orada
 * kartlar yana kayiyor). Sira SUNUCUDA durur -- antrenman ekranindaki kartlar ayni sirayla gelir.
 */
export default function SablonlarScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const ikonRenk = useIkonRenk();
  const altMenuPayi = useAltMenuPayi();
  usePageTitle(t('sablonlar.baslik'));
  const { data: sablonlar, isLoading, isError } = useTemplates();
  const siralama = useSablonlariSirala();

  return (
    <ScrollView contentContainerClassName="gap-5 px-4 pt-2" contentContainerStyle={{ paddingBottom: altMenuPayi }}>
      {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}

      {isError && (
        <Text accessibilityRole="alert" className="text-body text-danger">
          {t('sablonlar.hataYenile')}
        </Text>
      )}

      {sablonlar && sablonlar.length === 0 && (
        <BosDurum
          ikon={ClipboardList}
          baslik={t('sablonlar.hicSablonYokBaslik')}
          aciklama={t('sablonlar.hicSablonYokAciklama')}
        />
      )}

      {sablonlar && sablonlar.length > 0 && (
        <SurukleSiraliListe
          ogeler={sablonlar}
          anahtar={(sablon) => sablon.id}
          onSirala={(yeniSira) => siralama.mutate(yeniSira.map((sablon) => sablon.id))}
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
  );
}
