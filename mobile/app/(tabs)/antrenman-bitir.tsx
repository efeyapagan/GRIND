import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Redirect, useRouter } from 'expo-router';
import { useFinishSession, useOpenSession, type Zorluk } from '@grind/shared/api/queries';
import { oturumdanSablonHareketleri, type SablonTaslakHareketi } from '@grind/shared/lib/sablonTaslagi';
import { usePageTitle } from '@grind/shared/pageTitle';
import EkranKaydirici from '../../src/ui/EkranKaydirici';
import BirincilDugme from '../../src/ui/BirincilDugme';
import IkincilDugme from '../../src/ui/IkincilDugme';
import ZorlukKadrani from '../../src/components/ZorlukKadrani';
import { TABBAR_HALKA_TASMASI } from '../../src/ui/KabukTabBar';

/** Kadran burada açılır: ortadaki kademe, hiç dokunmadan bitirenin göndereceği değerdir. */
const VARSAYILAN_ZORLUK: Zorluk = 'Medium';

function MetinEylemi({ etiket, disabled, onPress }: { etiket: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`min-h-11 items-center justify-center rounded-lg px-4 ${disabled ? 'opacity-60' : ''}`}
    >
      <Text className="text-label text-muted">{etiket}</Text>
    </Pressable>
  );
}

/**
 * Antrenmanı kapatan ekran (#153). "Antrenmanı bitir" artık antrenman ekranında oturumu kapatmaz,
 * buraya getirir: kullanıcı zorluğu kadranı çevirerek seçer, sonra bitirir. Zorluk YALNIZCA
 * bitirirken alınır (sunucuda sonradan değiştiren bir uç yok), bu yüzden soru bitirmenin önünde durur.
 *
 * Seçim zorunlu değil: "Atla" antrenmanı zorluksuz kapatır (sunucuda alan nullable). "Devam et" (#182)
 * ya da cihazın geri tuşuyla dönülürse oturum açık kalır — bu ekran hiçbir şeyi kendiliğinden kapatmaz.
 *
 * #186: web/src/pages/AntrenmanBitirPage.tsx ile ayni -- ŞABLONSUZ ve hareketi olan antrenman kapanınca
 * ekran "şablon olarak kaydedilsin mi?" adımına geçer. Liste bitirmeden ÖNCE alınır; bu adımdayken
 * "açık antrenman yok" yönlendirmesi çalışmaz.
 */
export default function AntrenmanBitirScreen() {
  const { t } = useTranslation();
  usePageTitle(t('antrenman.nasilGecti'));
  const router = useRouter();
  const { data: oturum, isLoading, isError } = useOpenSession();
  const bitirMutasyonu = useFinishSession();
  const [zorluk, setZorluk] = useState<Zorluk>(VARSAYILAN_ZORLUK);
  // Kadran cevrilirken ekran kaymaz: iOS ScrollView jesti aksi halde dikey hareketi calar (#182).
  const [kadranCevriliyor, setKadranCevriliyor] = useState(false);
  const [kaydetSorusu, setKaydetSorusu] = useState<SablonTaslakHareketi[] | null>(null);

  if (kaydetSorusu) {
    return (
      <EkranKaydirici contentContainerClassName="flex-grow gap-6 px-4 pt-6 pb-4">
        <View className="flex-1 items-center justify-center gap-2">
          <Text className="text-center text-heading text-fg">{t('antrenman.sablonSorusu')}</Text>
          <Text className="text-center text-body text-muted">{t('antrenman.sablonSorusuAciklama')}</Text>
        </View>
        <View className="w-full gap-2" style={{ marginBottom: TABBAR_HALKA_TASMASI }}>
          {/* replace: geri tuşu kapanmış antrenmanın bitirme ekranına dönmesin. */}
          <BirincilDugme
            yukseklik="buyuk"
            onPress={() =>
              router.replace({
                pathname: '/templates/new',
                params: { donus: '/', hareketler: JSON.stringify(kaydetSorusu) },
              })
            }
          >
            {t('antrenman.sablonOlarakKaydet')}
          </BirincilDugme>
          <IkincilDugme onPress={() => router.replace('/')}>{t('antrenman.simdiDegil')}</IkincilDugme>
        </View>
      </EkranKaydirici>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 px-4 pt-2">
        <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>
      </View>
    );
  }

  // Kapatılacak antrenman yok (doğrudan açıldı ya da başka bir yerde kapandı): boş bir kadran
  // göstermek yerine antrenman ekranına dönülür.
  if (isError || !oturum) {
    return <Redirect href="/antrenman" />;
  }

  function bitir(secilen: Zorluk | null) {
    const sablonsuzHareketler =
      oturum!.templateId === null && oturum!.progress.length > 0 ? oturumdanSablonHareketleri(oturum!.progress) : null;
    bitirMutasyonu.mutate(
      { sessionId: oturum!.id, zorluk: secilen },
      {
        onSuccess: () => {
          if (sablonsuzHareketler) {
            setKaydetSorusu(sablonsuzHareketler);
          } else {
            router.replace('/');
          }
        },
      },
    );
  }

  return (
    <EkranKaydirici
      scrollEnabled={!kadranCevriliyor}
      contentContainerClassName="flex-grow items-center gap-6 px-4 pt-6 pb-4"
    >
      <Text className="text-center text-body text-muted">
        {t('antrenman.bitirmeSorusu')}
      </Text>

      {/* Kadran, soru ile alttaki dugmeler arasindaki bosluğun ortasinda durur (#182). */}
      <View className="flex-1 items-center justify-center gap-4">
        <ZorlukKadrani deger={zorluk} onDegis={setZorluk} onSurukleme={setKadranCevriliyor} />

        {bitirMutasyonu.isError && (
          <Text accessibilityRole="alert" className="text-label text-danger">
            {t('antrenman.bitirilemedi')}
          </Text>
        )}
      </View>

      <View className="w-full items-center gap-2" style={{ marginBottom: TABBAR_HALKA_TASMASI }}>
        <BirincilDugme
          yukseklik="buyuk"
          disabled={bitirMutasyonu.isPending}
          onPress={() => bitir(zorluk)}
        >
          {t('antrenman.bitir')}
        </BirincilDugme>
        {/* #182: solda "Devam et" (bitirmeden geri doner, oturum acik kalir), sagda "Atla" (zorluksuz
            kapatir) -- ikisi de ayni sessiz metin eylemi, dugme degil. */}
        <View className="w-full flex-row items-center justify-between">
          <MetinEylemi etiket={t('ortak.devamEt')} disabled={bitirMutasyonu.isPending} onPress={() => router.back()} />
          <MetinEylemi etiket={t('ortak.atla')} disabled={bitirMutasyonu.isPending} onPress={() => bitir(null)} />
        </View>
      </View>
    </EkranKaydirici>
  );
}
