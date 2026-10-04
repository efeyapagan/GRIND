import { useCallback, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  oturumBittiTazele,
  useOpenSession,
  useTemplate,
  type Zorluk,
} from '@grind/shared/api/queries';
import {
  oturumdanSablonHareketleri,
  sablondaOlmayanHareketVarMi,
  type SablonTaslakHareketi,
} from '@grind/shared/lib/sablonTaslagi';
import { usePageTitle } from '@grind/shared/pageTitle';
import { useRestTimer } from '@grind/shared/restTimer';
import { duraklat, surdur } from '@grind/shared/lib/dinlenme';
import EkranKaydirici from '../../src/ui/EkranKaydirici';
import BirincilDugme from '../../src/ui/BirincilDugme';
import ZorlukKadrani from '../../src/components/ZorlukKadrani';
import { useKuyrukluFinishSession } from '../../src/kuyruk/kuyrukluMutasyonlar';
import { useCevrimdisi } from '../../src/baglanti/BaglantiSaglayici';
import PaylasimPenceresi from '../../src/components/PaylasimPenceresi';

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
 *
 * Aynı soru ŞABLONLA başlamış antrenmanda da sorulur, ama yalnızca liste o şablondan SAPMIŞSA:
 * şablonda olmayan bir hareket eklendiyse (`sablondaOlmayanHareketVarMi`) artık yeni bir şablon
 * adayıdır. Sapma yoksa sorulmaz -- liste zaten var olan şablonun aynısıdır.
 */
export default function AntrenmanBitirScreen() {
  const { t } = useTranslation();
  usePageTitle(t('antrenman.nasilGecti'));
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: oturum, isLoading, isError } = useOpenSession();
  // #174 dilim 2: cevrimdisi bitirme kuyruga girer; antrenman gecmiste hemen gorunur.
  const bitirMutasyonu = useKuyrukluFinishSession();
  const cevrimdisi = useCevrimdisi();
  const [zorluk, setZorluk] = useState<Zorluk>(VARSAYILAN_ZORLUK);
  // Kadran cevrilirken ekran kaymaz: iOS ScrollView jesti aksi halde dikey hareketi calar (#182).
  const [kadranCevriliyor, setKadranCevriliyor] = useState(false);
  // `sapma`: soru şablonla başlamış ama değişmiş bir antrenmandan mı geliyor (açıklama metni değişir).
  const [kaydetSorusu, setKaydetSorusu] = useState<{ hareketler: SablonTaslakHareketi[]; sapma: boolean } | null>(
    null,
  );
  // #433: biten antrenmanin paylasim karti. Bitirme YANITINDAN gelir -- sure sunucunun hesabi.
  const [paylasim, setPaylasim] = useState<{
    templateName: string | null;
    setCount: number;
    durationSeconds: number;
  } | null>(null);
  const [dinlenme, setDinlenme] = useRestTimer();
  // Temizleyici kapanisinin BAYAT bir sayac gormemesi icin: odak birakilirken gecerli deger.
  const dinlenmeRef = useRef(dinlenme);
  dinlenmeRef.current = dinlenme;

  /**
   * #477: bu ekranda dinlenme sayaci DURAKLAR ve gorunmez. Kullanici zorlugu secerken dinlenmesi
   * tukenmemeli; "Devam et" ile antrenmana donulunce sayac KALDIGI YERDEN surer.
   *
   * Duraklatma/surdurme odaga baglidir (ekranin monte olmasina degil): geri tusu, "Devam et" ve
   * sekme degistirme ayni yoldan gecer. `duraklat`/`surdur` idempotent, iki kez odaklanmak zarar
   * vermez.
   */
  useFocusEffect(
    useCallback(() => {
      setDinlenme(dinlenmeRef.current ? duraklat(dinlenmeRef.current, Date.now()) : null);
      return () => {
        setDinlenme(dinlenmeRef.current ? surdur(dinlenmeRef.current, Date.now()) : null);
      };
    }, [setDinlenme]),
  );
  // Paylasim penceresi kapanınca gidilecek yer (şablon sorusu ya da ana sayfa).
  const [sonrakiAdim, setSonrakiAdim] = useState<{ hareketler: SablonTaslakHareketi[]; sapma: boolean } | null>(
    null,
  );
  // Sapma karşılaştırması için oturumun şablonu; `templateId` null iken sorgu çalışmaz.
  const { data: sablon } = useTemplate(oturum?.templateId ?? null);

  if (kaydetSorusu) {
    return (
      <EkranKaydirici contentContainerClassName="flex-grow gap-6 px-4 pt-6 pb-4">
        <View className="flex-1 items-center justify-center gap-2">
          <Text className="text-center text-heading text-fg">{t('antrenman.sablonSorusu')}</Text>
          <Text className="text-center text-body text-muted">
            {t(kaydetSorusu.sapma ? 'antrenman.sablonSorusuSapmaAciklama' : 'antrenman.sablonSorusuAciklama')}
          </Text>
        </View>
        <View className="w-full gap-2">
          {/* replace: geri tuşu kapanmış antrenmanın bitirme ekranına dönmesin. */}
          <BirincilDugme
            yukseklik="buyuk"
            onPress={() =>
              router.replace({
                pathname: '/templates/new',
                params: { donus: '/', hareketler: JSON.stringify(kaydetSorusu.hareketler) },
              })
            }
          >
            {t('antrenman.sablonOlarakKaydet')}
          </BirincilDugme>
          {/* "Şimdi değil" kart/düğme DEĞİL: "Atla"/"Devam et" ile aynı sessiz metin eylemi. */}
          <View className="items-center">
            <MetinEylemi etiket={t('antrenman.simdiDegil')} disabled={false} onPress={() => router.replace('/')} />
          </View>
        </View>
      </EkranKaydirici>
    );
  }

  /**
   * #487 (kullanici bildirdi: "puanlayip kaydettikten sonra siyah ekranda kaldi, sadece ust baslik
   * vardi"). Antrenman kapandigi an ASAGIDAKI iki kural da dogru gorunur ve pencereyi YUTAR:
   * `isSuccess` bos doner, "oturum yok" antrenman ekranina yonlendirir. Pencere aciksa ekran
   * YALNIZCA onu cizer; kapaninca `paylasimiKapat` sirayi (sablon sorusu / ana sayfa) devreder.
   */
  if (paylasim) {
    return (
      <PaylasimPenceresi
        templateName={paylasim.templateName}
        setCount={paylasim.setCount}
        durationSeconds={paylasim.durationSeconds}
        acik
        onKapat={paylasimiKapat}
      />
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 px-4 pt-2">
        <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>
      </View>
    );
  }

  // #363: antrenmanı bu ekran az önce kapattı ve açık oturum önbelleği boşaldı; ekran ana sayfaya
  // geçerken bir kez daha çizilebilir. Bu "kapatılacak antrenman yok" değil -- aşağıdaki yönlendirme
  // ana sayfaya geçişi ezerdi.
  if (bitirMutasyonu.isSuccess) {
    return null;
  }

  // Kapatılacak antrenman yok (doğrudan açıldı ya da başka bir yerde kapandı): boş bir kadran
  // göstermek yerine antrenman ekranına dönülür.
  if (isError || !oturum) {
    return <Redirect href="/antrenman" />;
  }

  /**
   * Bitirdikten sonra "şablon olarak kaydedilsin mi?" sorulacak mı? Liste bitirmeden ÖNCE okunur:
   * oturum kapanınca açık oturum sorgusu boşalır. Şablon henüz yüklenmediyse (ya da alınamadıysa)
   * SORULMAZ -- bitirmeyi bir sorgu için bekletmek, kaçırılan bir sorudan daha kötüdür.
   */
  function kaydetTaslagi(): { hareketler: SablonTaslakHareketi[]; sapma: boolean } | null {
    if (oturum!.progress.length === 0) {
      return null;
    }
    if (oturum!.templateId === null) {
      return { hareketler: oturumdanSablonHareketleri(oturum!.progress), sapma: false };
    }
    if (!sablon || !sablondaOlmayanHareketVarMi(oturum!.progress, sablon.exercises)) {
      return null;
    }
    return { hareketler: oturumdanSablonHareketleri(oturum!.progress), sapma: true };
  }

  function bitir(secilen: Zorluk | null) {
    const taslak = kaydetTaslagi();
    const setSayisi = (oturum?.progress ?? []).reduce((toplam, hareket) => toplam + hareket.completedSets, 0);

    bitirMutasyonu.mutate(
      { sessionId: oturum!.id, zorluk: secilen },
      {
        onSuccess: (biten) => {
          // #433: seti ve suresi olan bir antrenman paylasilabilir; once kart sunulur, sonra
          // sablon sorusu / ana sayfa. Suresiz ya da setsiz antrenmanin karti anlamsizdir.
          // #174 (kullanici karari): paylasim penceresi internet yokken hic acilmaz; sablon sorusu cevrimdisi
          // de gelir (dilim 3: sablon cihazda olusur, kuyrukla gider).
          if (!cevrimdisi && biten.durationSeconds !== null && setSayisi > 0) {
            setPaylasim({
              templateName: oturum?.templateName ?? null,
              setCount: setSayisi,
              durationSeconds: biten.durationSeconds,
            });
          } else if (taslak) {
            setKaydetSorusu(taslak);
          } else {
            router.replace('/');
          }
          setSonrakiAdim(taslak);
          // #363: ana sayfa biten antrenmanı "devam ediyor" diye bir an bile çizmesin.
          oturumBittiTazele(queryClient);
        },
      },
    );
  }

  /** Paylasim penceresi kapaninca kalinan yerden devam edilir. */
  function paylasimiKapat() {
    setPaylasim(null);
    if (sonrakiAdim) {
      setKaydetSorusu(sonrakiAdim);
    } else {
      router.replace('/');
    }
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

      <View className="w-full items-center gap-2">
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
