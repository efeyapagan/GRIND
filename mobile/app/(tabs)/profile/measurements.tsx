import { useState } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { Plus, Scale, Trash2 } from 'lucide-react-native';
import { useDil } from '@grind/shared/i18n';
import {
  useAddMeasurement,
  useDeleteMeasurement,
  useInfiniteMeasurements,
  useUpdateMeasurement,
  type Olcu,
} from '@grind/shared/api/queries';
import { apiHatasiniAyir } from '@grind/shared/lib/apiErrors';
import { ayniTrGunuMu, formatSaat, formatTarih } from '@grind/shared/lib/format';
import { usePageTitle } from '@grind/shared/pageTitle';
import Modal from '../../../src/ui/Modal';
import SayiAlani from '../../../src/ui/SayiAlani';
import BirincilDugme from '../../../src/ui/BirincilDugme';
import IkincilDugme from '../../../src/ui/IkincilDugme';
import IkonDugmesi from '../../../src/ui/IkonDugmesi';
import BosDurum from '../../../src/ui/BosDurum';
import HataKutusu from '../../../src/ui/HataKutusu';
import { useIkonRenk } from '../../../src/ui/renkler';
import { useAltMenuPayi } from '../../../src/ui/KabukTabBar';

const BILINEN_ALANLAR = ['weight', 'heightCm', 'bodyFatPercent', 'waistCm', 'hipCm'] as const;

interface OlcumGovdesi {
  weight: number;
  heightCm: number;
  bodyFatPercent?: number;
  waistCm?: number;
  hipCm?: number;
}

/**
 * web/src/pages/MeasurementsPage.tsx ile ayni (issue #119, kullanici karariyla revize).
 * Sayfalama Onceki/Sonraki dugmeleri yerine SONSUZ KAYDIRMA'dir (issue #147, Gecmis'in #142'siyle
 * ayni desen): `FlatList`in `onEndReached`i listenin sonuna gelinince bir sonraki 25'lik sayfayi
 * ceker.
 *
 * #293: Profil'in kendi sekmelerinde ust basliktaki metin tamamen kalkti -- `usePageTitle('')`
 * onceki basligi temizler.
 *
 * #260: ayni gun icin FARKLI degerli ikinci bir olcum girilmeye calisilinca (ayni pencere icinde)
 * bir soru gosterilir -- web/src/pages/MeasurementsPage.tsx'teki ayni gerekce (bkz. oradaki uzun
 * yorum). TAM AYNI boy+kiloyla ikinci giris (issue #119) bu sorunun DISINDA kalir, sunucu hala sert
 * 409 doner.
 */
export default function MeasurementsScreen() {
  const ikonRenk = useIkonRenk();
  const altMenuPayi = useAltMenuPayi();
  usePageTitle('');
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteMeasurements();
  const ekleMutasyonu = useAddMeasurement();
  const guncelleMutasyonu = useUpdateMeasurement();
  const silMutasyonu = useDeleteMeasurement();

  const [modalAcik, setModalAcik] = useState(false);
  const [kilo, setKilo] = useState('');
  const [boy, setBoy] = useState('');
  const [yagOrani, setYagOrani] = useState('');
  const [belCevresi, setBelCevresi] = useState('');
  const [kalcaCevresi, setKalcaCevresi] = useState('');
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});
  const [silinecekId, setSilinecekId] = useState<number | null>(null);
  const [cakisma, setCakisma] = useState<{ govde: OlcumGovdesi; hedefId: number } | null>(null);
  const [cakismaHata, setCakismaHata] = useState<string | null>(null);

  function formuSifirla() {
    setKilo('');
    setBoy('');
    setYagOrani('');
    setBelCevresi('');
    setKalcaCevresi('');
    setGenelHata(null);
    setAlanHatalari({});
    setCakisma(null);
    setCakismaHata(null);
  }

  function penceresiniAc() {
    formuSifirla();
    setModalAcik(true);
  }

  function sayiyaCevir(deger: string): number | undefined {
    return deger.trim() === '' ? undefined : Number(deger.replace(',', '.'));
  }

  function gonder() {
    setGenelHata(null);
    setAlanHatalari({});

    const govde = {
      weight: sayiyaCevir(kilo),
      heightCm: sayiyaCevir(boy),
      bodyFatPercent: sayiyaCevir(yagOrani),
      waistCm: sayiyaCevir(belCevresi),
      hipCm: sayiyaCevir(kalcaCevresi),
    };

    const hatalar: Record<string, string> = {};
    if (govde.weight === undefined) hatalar.weight = 'Kilo gerekli.';
    if (govde.heightCm === undefined) hatalar.heightCm = 'Boy gerekli.';
    if (Object.keys(hatalar).length > 0) {
      setAlanHatalari(hatalar);
      return;
    }

    const doluGovde: OlcumGovdesi = {
      ...govde,
      weight: govde.weight!,
      heightCm: govde.heightCm!,
    };

    // #260: bugunun (TR gunu) olculeri arasinda TAM AYNI boy+kiloyla bir kayit varsa (issue #119)
    // soru sorulmaz -- dogrudan gonderilir, sunucu hala sert 409 doner (davranis degismedi).
    const suAn = new Date().toISOString();
    const bugununOlculeri = tumOlculer.filter((olcu) => ayniTrGunuMu(olcu.recordedAt, suAn));
    const tamAyniVarMi = bugununOlculeri.some(
      (olcu) => olcu.weight === doluGovde.weight && olcu.heightCm === doluGovde.heightCm,
    );
    if (bugununOlculeri.length > 0 && !tamAyniVarMi) {
      // Liste yeniden eskiye sirali -- ilk oge gunun EN SON olcumu.
      setCakisma({ govde: doluGovde, hedefId: bugununOlculeri[0].id });
      return;
    }

    ekleMutasyonu.mutate(doluGovde, {
      onSuccess: () => {
        formuSifirla();
        setModalAcik(false);
      },
      onError: (hata) => {
        const ayrilmis = apiHatasiniAyir(hata, BILINEN_ALANLAR);
        setGenelHata(ayrilmis.genelHata);
        setAlanHatalari(ayrilmis.alanHatalari);
      },
    });
  }

  function yerineKaydet() {
    if (!cakisma) {
      return;
    }
    setCakismaHata(null);
    guncelleMutasyonu.mutate(
      { id: cakisma.hedefId, ...cakisma.govde },
      {
        onSuccess: () => {
          formuSifirla();
          setModalAcik(false);
        },
        onError: (hata) => setCakismaHata(apiHatasiniAyir(hata, []).genelHata),
      },
    );
  }

  function ekstraOlcumEkle() {
    if (!cakisma) {
      return;
    }
    setCakismaHata(null);
    ekleMutasyonu.mutate(cakisma.govde, {
      onSuccess: () => {
        formuSifirla();
        setModalAcik(false);
      },
      onError: (hata) => setCakismaHata(apiHatasiniAyir(hata, []).genelHata),
    });
  }

  const tumOlculer = data?.pages.flatMap((sayfa) => sayfa.items) ?? [];

  return (
    <FlatList
      testID="olcu-liste"
      data={tumOlculer}
      keyExtractor={(olcu) => String(olcu.id)}
      renderItem={({ item }) => (
        <OlcuKarti
          olcu={item}
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
          <BirincilDugme onPress={penceresiniAc} yukseklik="normal">
            <Plus color={ikonRenk.onAccent} size={20} />
            <Text className="text-body-lg font-bold text-on-accent">Yeni ölçüm ekle</Text>
          </BirincilDugme>

          <Modal
            acik={modalAcik}
            onKapat={() => setModalAcik(false)}
            baslik={cakisma ? 'Bugün için başka bir ölçüm girdiniz.' : 'Yeni ölçüm'}
          >
            {cakisma ? (
              // #260: ayni gun icin farkli degerli ikinci olcum -- form BILEREK arkada kalir
              // (deger kaybolmaz), "Vazgeç" yalnizca bu soruyu kapatir, pencereyi degil.
              <View className="flex-col gap-3">
                {cakismaHata && <HataKutusu baslik="Ölçü kaydedilemedi" mesaj={cakismaHata} />}
                <BirincilDugme
                  yukseklik="normal"
                  onPress={yerineKaydet}
                  disabled={guncelleMutasyonu.isPending || ekleMutasyonu.isPending}
                >
                  Ölçümü değiştir
                </BirincilDugme>
                <IkincilDugme onPress={ekstraOlcumEkle} disabled={guncelleMutasyonu.isPending || ekleMutasyonu.isPending}>
                  Ekstra ölçüm
                </IkincilDugme>
                <IkincilDugme onPress={() => setCakisma(null)}>Vazgeç</IkincilDugme>
              </View>
            ) : (
              <View className="flex-col gap-4">
                <View className="flex-row flex-wrap gap-2">
                  <View style={{ width: '48%' }}>
                    <SayiAlani
                      id="olcu-boy"
                      etiket="Boy"
                      birim="cm"
                      inputMode="decimal"
                      placeholder="—"
                      value={boy}
                      onChange={setBoy}
                      hata={alanHatalari.heightCm}
                    />
                  </View>
                  <View style={{ width: '48%' }}>
                    <SayiAlani
                      id="olcu-kilo"
                      etiket="Kilo"
                      birim="kg"
                      inputMode="decimal"
                      placeholder="—"
                      value={kilo}
                      onChange={setKilo}
                      hata={alanHatalari.weight}
                    />
                  </View>
                  <View style={{ width: '48%' }}>
                    <SayiAlani
                      id="olcu-yag-orani"
                      etiket="Yağ oranı"
                      birim="%"
                      inputMode="decimal"
                      placeholder="—"
                      value={yagOrani}
                      onChange={setYagOrani}
                      hata={alanHatalari.bodyFatPercent}
                    />
                  </View>
                  <View style={{ width: '48%' }}>
                    <SayiAlani
                      id="olcu-bel-cevresi"
                      etiket="Bel çevresi"
                      birim="cm"
                      inputMode="decimal"
                      placeholder="—"
                      value={belCevresi}
                      onChange={setBelCevresi}
                      hata={alanHatalari.waistCm}
                    />
                  </View>
                  <View style={{ width: '48%' }}>
                    <SayiAlani
                      id="olcu-kalca-cevresi"
                      etiket="Kalça çevresi"
                      birim="cm"
                      inputMode="decimal"
                      placeholder="—"
                      value={kalcaCevresi}
                      onChange={setKalcaCevresi}
                      hata={alanHatalari.hipCm}
                    />
                  </View>
                </View>
                <Text className="text-label text-muted">Boy ve kilo zorunlu; diğerleri opsiyonel.</Text>
                {genelHata && <HataKutusu baslik="Ölçü kaydedilemedi" mesaj={genelHata} />}
                <BirincilDugme yukseklik="normal" disabled={ekleMutasyonu.isPending} onPress={gonder}>
                  Kaydet
                </BirincilDugme>
              </View>
            )}
          </Modal>

          {isLoading && <Text className="text-body text-muted">Yükleniyor...</Text>}

          {isError && (
            <Text accessibilityRole="alert" className="text-body text-danger">
              Ölçüler alınamadı. Lütfen sayfayı yenileyin.
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        !isLoading && !isError && data ? (
          <BosDurum ikon={Scale} baslik="Henüz ölçü yok" aciklama="Yukarıdan ilk ölçünü ekle." />
        ) : null
      }
      ListFooterComponent={
        isFetchingNextPage ? <Text className="text-body text-muted">Yükleniyor...</Text> : null
      }
    />
  );
}

function olcuMetni(olcu: Olcu): string {
  const parcalar: string[] = [];
  if (olcu.weight !== null) parcalar.push(`${olcu.weight} kg`);
  if (olcu.heightCm !== null) parcalar.push(`${olcu.heightCm} cm boy`);
  if (olcu.bodyFatPercent !== null) parcalar.push(`%${olcu.bodyFatPercent} yağ`);
  if (olcu.waistCm !== null) parcalar.push(`${olcu.waistCm} cm bel`);
  if (olcu.hipCm !== null) parcalar.push(`${olcu.hipCm} cm kalça`);
  return parcalar.join(', ');
}

interface OlcuKartiProps {
  olcu: Olcu;
  onayAcik: boolean;
  onSilmeyeBasla: () => void;
  onVazgec: () => void;
  onSil: () => void;
}

function OlcuKarti({ olcu, onayAcik, onSilmeyeBasla, onVazgec, onSil }: OlcuKartiProps) {
  const ikonRenk = useIkonRenk();
  const dil = useDil();
  if (onayAcik) {
    return (
      <View className="flex-col gap-3 rounded-xl bg-surface-2 p-4">
        <Text className="text-body text-fg">Bu ölçü kalıcı olarak silinecek.</Text>
        <View className="flex-row gap-2">
          <Pressable onPress={onSil} className="h-12 flex-1 items-center justify-center rounded-xl bg-danger-bg">
            <Text className="text-label text-on-danger-bg">Evet, sil</Text>
          </Pressable>
          <View className="flex-1">
            <IkincilDugme onPress={onVazgec}>Vazgeç</IkincilDugme>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-row items-center justify-between gap-2 rounded-xl bg-surface-2 p-4">
      <View className="flex-col gap-1">
        <Text className="text-label text-muted">
          {formatTarih(olcu.recordedAt, dil)} {formatSaat(olcu.recordedAt)}
        </Text>
        <Text className="text-body text-fg">{olcuMetni(olcu)}</Text>
      </View>
      <IkonDugmesi etiket="Ölçüyü sil" onPress={onSilmeyeBasla}>
        <Trash2 color={ikonRenk.muted} size={18} />
      </IkonDugmesi>
    </View>
  );
}
