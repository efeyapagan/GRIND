import { useState } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Brain, ChevronDown, ChevronRight, Lightbulb, Sparkles, Trash2, TriangleAlert, Trophy } from 'lucide-react-native';
import { useDil, type Dil } from '@grind/shared/i18n';
import {
  useDeleteInsight,
  useGenerateInsight,
  useInfiniteInsights,
  useInsightGenerationState,
  yorumMetni,
  type Yorum,
} from '@grind/shared/api/queries';
import { ApiError } from '@grind/shared/api/problem';
import { apiHatasiniAyir } from '@grind/shared/lib/apiErrors';
import { formatSaat, formatTarih } from '@grind/shared/lib/format';
import { yorumuCozumle, type YorumIcerigi } from '@grind/shared/lib/yorumIcerigi';
import { usePageTitle } from '@grind/shared/pageTitle';
import BirincilDugme from '../../src/ui/BirincilDugme';
import IkincilDugme from '../../src/ui/IkincilDugme';
import CamIkonDugmesi from '../../src/ui/CamIkonDugmesi';
import IkonKapsulu from '../../src/ui/IkonKapsulu';
import CamKart from '../../src/ui/CamKart';
import BosDurum from '../../src/ui/BosDurum';
import HataKutusu from '../../src/ui/HataKutusu';
import GrindyMaskot from '../../src/ui/GrindyMaskot';
import { useIkonRenk } from '../../src/ui/renkler';
import { useAltMenuPayi } from '../../src/ui/KabukTabBar';
import CevrimdisiKapisi from '../../src/baglanti/CevrimdisiKapisi';
import { useYorumDili } from '../../src/ui/YorumDiliContext';

/**
 * web/src/pages/InsightsPage.tsx ile ayni (issue #76; GRINDY adi ve maskotu #239). Sayfalama Onceki/Sonraki dugmeleri
 * yerine SONSUZ KAYDIRMA'dir (issue #147, Gecmis'in #142'siyle ayni desen): `FlatList`in
 * `onEndReached`i listenin sonuna gelinince bir sonraki 25'lik sayfayi ceker.
 */
/** #174: cevrimdisiyken bu bolum onbellekten gosterilmez -- icerik baglanmaz, uyari cizilir. */
export default function InsightsScreen() {
  const { t } = useTranslation();
  usePageTitle(t('yorumlar.basligiKisa'));
  return (
    <CevrimdisiKapisi>
      <InsightsIcerigi />
    </CevrimdisiKapisi>
  );
}

function InsightsIcerigi() {
  const ikonRenk = useIkonRenk();
  const altMenuPayi = useAltMenuPayi();
  const { t } = useTranslation();
  usePageTitle(t('yorumlar.basligiKisa'));
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteInsights();
  const uretMutasyonu = useGenerateInsight();
  // Issue #148: web ile ayni -- "uretiliyor mu" bilgisi ekranin mutation'indan DEGIL, sekme
  // degisse de yasayan MutationCache'ten okunur.
  const { uretiliyor, iptalEt: uretimiIptalEt } = useInsightGenerationState();
  const silMutasyonu = useDeleteInsight();

  const [durum, setDurum] = useState<'bos' | 'iptal-edildi' | 'bilgi' | 'hata'>('bos');
  const [bilgiMesaji, setBilgiMesaji] = useState<string | null>(null);
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [silinecekId, setSilinecekId] = useState<number | null>(null);

  function yorumIste() {
    setDurum('bos');
    setGenelHata(null);
    const controller = new AbortController();

    uretMutasyonu.mutate(controller, {
      onError: (hata) => {
        if (controller.signal.aborted) {
          return;
        }
        if (hata instanceof ApiError && (hata.status === 503 || hata.status === 429)) {
          setBilgiMesaji(hata.detail);
          setDurum('bilgi');
          return;
        }
        setGenelHata(apiHatasiniAyir(hata, []).genelHata);
        setDurum('hata');
      },
    });
  }

  function iptalEt() {
    uretimiIptalEt();
    setDurum('iptal-edildi');
  }

  const tumYorumlar = data?.pages.flatMap((sayfa) => sayfa.items) ?? [];

  /**
   * #149: ayni anda TEK kutu acik. `undefined` = kullanici henuz secim yapmadi, en yeni yorum
   * acilir (liste sunucudan yeniden eskiye gelir, istemci ayrica siralamaz). `null` = kullanici
   * acik olani kapatti; "hepsi kapali" da gecerli bir durumdur ve en yeniye geri donmemeli.
   */
  const [secilen, setSecilen] = useState<number | null | undefined>(undefined);
  const acikId = secilen === undefined ? (tumYorumlar[0]?.id ?? null) : secilen;

  return (
    <FlatList
      testID="yorum-liste"
      data={tumYorumlar}
      keyExtractor={(yorum) => String(yorum.id)}
      renderItem={({ item }) => (
        <YorumKarti
          yorum={item}
          acik={acikId === item.id}
          onAcKapat={() => setSecilen(acikId === item.id ? null : item.id)}
          onayAcik={silinecekId === item.id}
          onSilmeyeBasla={() => setSilinecekId(item.id)}
          onVazgec={() => setSilinecekId(null)}
          onSil={() => {
            silMutasyonu.mutate(item.id);
            setSilinecekId(null);
          }}
        />
      )}
      ItemSeparatorComponent={() => <View className="h-3" />}
      contentContainerClassName="px-4 pt-2"
      contentContainerStyle={{ paddingBottom: altMenuPayi }}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      }}
      ListHeaderComponent={
        <View className="mb-5 flex-col gap-5">
          <View className="flex-row items-center gap-4">
            <GrindyMaskot />
            <Text className="flex-1 text-body text-muted">{t('yorumlar.aciklama')}</Text>
          </View>

          {/* #454 (kullanici istegi): yorum Ingilizcede daha iyi calisiyor. */}
          <Text testID="yorumlar-ingilizce-notu" className="text-label text-muted">
            {t('yorumlar.ingilizceNotu')}
          </Text>

          <CamKart testID="yorum-iste-karti" className="flex-col gap-3 p-4">
            {!uretiliyor && (
              <BirincilDugme yukseklik="normal" onPress={yorumIste}>
                <Sparkles color={ikonRenk.onAccent} size={20} />
                <Text className="text-body-lg font-bold text-on-accent">{t('yorumlar.yorumIste')}</Text>
              </BirincilDugme>
            )}

            {uretiliyor && (
              <View className="flex-col gap-3">
                <Text className="text-body text-muted">{t('yorumlar.hazirlaniyor')}</Text>
                <IkincilDugme onPress={iptalEt}>{t('ortak.vazgec')}</IkincilDugme>
              </View>
            )}

            {durum === 'iptal-edildi' && (
              <Text className="text-label text-muted">{t('yorumlar.iptalEdildi')}</Text>
            )}

            {durum === 'bilgi' && bilgiMesaji && (
              <Text className="text-label text-muted">{bilgiMesaji}</Text>
            )}

            {durum === 'hata' && genelHata && <HataKutusu baslik={t('yorumlar.alinamadi')} mesaj={genelHata} />}
          </CamKart>

          {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}

          {isError && (
            <Text accessibilityRole="alert" className="text-body text-danger">
              {t('yorumlar.hata')}
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        !isLoading && !isError && data ? (
          <BosDurum ikon={Brain} baslik={t('yorumlar.bosBaslik')} aciklama={t('yorumlar.bosAciklama')} />
        ) : null
      }
      ListFooterComponent={
        isFetchingNextPage ? <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text> : null
      }
    />
  );
}

interface YorumKartiProps {
  yorum: Yorum;
  acik: boolean;
  onAcKapat: () => void;
  onayAcik: boolean;
  onSilmeyeBasla: () => void;
  onVazgec: () => void;
  onSil: () => void;
}

function YorumKarti({ yorum, acik, onAcKapat, onayAcik, onSilmeyeBasla, onVazgec, onSil }: YorumKartiProps) {
  const ikonRenk = useIkonRenk();
  const { t } = useTranslation();
  const dil = useDil();
  const { yorumDili, hazir } = useYorumDili();
  if (onayAcik) {
    return (
      <CamKart testID={`yorum-silme-karti-${yorum.id}`} className="flex-col gap-3 p-4">
        <Text className="text-body text-fg">{t('yorumlar.silmeOnayi')}</Text>
        <View className="flex-row gap-2">
          <Pressable onPress={onSil} className="h-12 flex-1 items-center justify-center rounded-xl bg-danger-bg">
            <Text className="text-label text-on-danger-bg">{t('ortak.evetSil')}</Text>
          </Pressable>
          <View className="flex-1">
            <IkincilDugme onPress={onVazgec}>{t('ortak.vazgec')}</IkincilDugme>
          </View>
        </View>
      </CamKart>
    );
  }

  return (
    <CamKart testID={`yorum-karti-${yorum.id}`} className="flex-col gap-2 p-4">
      {/* #149: baslik satirinin tamami ac/kapat dugmesidir. Kapaliyken kartin tasidigi tek bilgi
          tarihtir; silme yalnizca ACIK kartta durur -- kapali satiri iki eylemli yapmak
          "dokununca acilir" beklentisini bozardi. */}
      <View className="flex-row items-center justify-between gap-2">
        <Pressable
          testID={`yorum-basligi-${yorum.id}`}
          accessibilityRole="button"
          accessibilityState={{ expanded: acik }}
          onPress={onAcKapat}
          className="min-h-11 flex-1 flex-row items-center gap-2"
        >
          {acik ? (
            <ChevronDown color={ikonRenk.muted} size={18} />
          ) : (
            <ChevronRight color={ikonRenk.muted} size={18} />
          )}
          <Text className="text-label text-muted">
            {formatTarih(yorum.createdAt, dil)} {formatSaat(yorum.createdAt)}
          </Text>
        </Pressable>
        {acik && (
          <CamIkonDugmesi etiket={t('yorumlar.yorumuSil')} onPress={onSilmeyeBasla}>
            <Trash2 color={ikonRenk.muted} size={18} />
          </CamIkonDugmesi>
        )}
      </View>
      {/* #463: tercih cozulmeden cizmeyiz -- yoksa ilk kare arayuz diliyle cizilip degisiyor. */}
      {acik && hazir && (
        <YorumGovdesi icerik={yorumuCozumle(yorumMetni(yorum, yorumDili))} yorumDili={yorumDili} />
      )}
    </CamKart>
  );
}

/**
 * Yorumun govdesi (#454). Yapisal yanit ozet + uc gruba ayrilir; cozumlenemeyen her sey (eski
 * markdown kayitlar, bozuk JSON) DUZ METIN olarak cizilir -- yorum asla kaybolmaz.
 *
 * #543 (kullanici bildirdi): bolum basliklari ("İyi gidenler"/"Dikkat"/"Öneriler") ve "okunamadi"
 * yer tutucusu yorumun bir PARCASI sayilir ve YORUM dilini izlemeli -- arayuz dilini DEGIL. Once
 * `useTranslation()`in global `t`'si kullaniliyordu: arayuz Ingilizce, yorum Turkce secilince govde
 * (AI'nin urettigi) dogru dilde geliyor ama basliklar Ingilizce kaliyordu. `i18n.getFixedT(yorumDili)`
 * iki dilin de kaynagi zaten bellekte oldugu icin (bkz. i18n.ts) ek bir sey gerektirmez.
 */
function YorumGovdesi({ icerik, yorumDili }: { icerik: YorumIcerigi; yorumDili: Dil }) {
  const { i18n } = useTranslation();
  const t = i18n.getFixedT(yorumDili);
  const ikonRenk = useIkonRenk();

  if (icerik.bicim === 'duz') {
    return <Text className="text-body text-fg">{icerik.metin}</Text>;
  }

  // Parantez yigini gostermeyiz (#463): ham metin sonucta duruyor ama ekrana dokulmez.
  if (icerik.bicim === 'okunamadi') {
    return (
      <Text accessibilityRole="alert" className="text-body text-muted">
        {t('yorumlar.okunamadi')}
      </Text>
    );
  }

  return (
    <View className="flex-col gap-4">
      {icerik.ozet !== '' && <Text className="text-body text-fg">{icerik.ozet}</Text>}

      <MaddeGrubu
        baslik={t('yorumlar.basarilar')}
        maddeler={icerik.basarilar}
        ikon={<Trophy color={ikonRenk.success} size={16} />}
      />
      <MaddeGrubu
        baslik={t('yorumlar.uyarilar')}
        maddeler={icerik.uyarilar}
        ikon={<TriangleAlert color={ikonRenk.danger} size={16} />}
      />
      <MaddeGrubu
        baslik={t('yorumlar.tavsiyeler')}
        maddeler={icerik.tavsiyeler}
        ikon={<Lightbulb color={ikonRenk.accent} size={16} />}
      />
    </View>
  );
}

/** Bos grup HIC cizilmez: bos bir baslik "burada bir sey eksik" izlenimi birakir. */
function MaddeGrubu({ baslik, maddeler, ikon }: { baslik: string; maddeler: string[]; ikon: React.ReactNode }) {
  if (maddeler.length === 0) {
    return null;
  }

  return (
    <View className="flex-col gap-2">
      <Text className="text-label-xs text-muted uppercase">{baslik}</Text>
      {maddeler.map((madde) => (
        <View key={madde} className="flex-row items-start gap-2">
          <IkonKapsulu boyut={28}>{ikon}</IkonKapsulu>
          <Text className="flex-1 text-body text-fg">{madde}</Text>
        </View>
      ))}
    </View>
  );
}
