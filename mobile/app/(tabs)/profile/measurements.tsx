import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Plus, Scale, Trash2 } from 'lucide-react-native';
import { useAddMeasurement, useDeleteMeasurement, useMeasurements, type Olcu } from '@grind/shared/api/queries';
import { apiHatasiniAyir } from '@grind/shared/lib/apiErrors';
import { formatTrDate, formatTrTime } from '@grind/shared/lib/format';
import { usePageTitle } from '@grind/shared/pageTitle';
import Modal from '../../../src/ui/Modal';
import SayiAlani from '../../../src/ui/SayiAlani';
import BirincilDugme from '../../../src/ui/BirincilDugme';
import IkincilDugme from '../../../src/ui/IkincilDugme';
import IkonDugmesi from '../../../src/ui/IkonDugmesi';
import BosDurum from '../../../src/ui/BosDurum';
import HataKutusu from '../../../src/ui/HataKutusu';
import { ikonRenk } from '../../../src/ui/renkler';

const BILINEN_ALANLAR = ['weight', 'heightCm', 'bodyFatPercent', 'waistCm', 'hipCm'] as const;

/** web/src/pages/MeasurementsPage.tsx ile ayni (issue #119, kullanici karariyla revize). */
export default function MeasurementsScreen() {
  usePageTitle('Ölçüler');
  const [sayfa, setSayfa] = useState(1);
  const { data, isLoading, isError } = useMeasurements(sayfa);
  const ekleMutasyonu = useAddMeasurement();
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

  function formuSifirla() {
    setKilo('');
    setBoy('');
    setYagOrani('');
    setBelCevresi('');
    setKalcaCevresi('');
    setGenelHata(null);
    setAlanHatalari({});
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

    ekleMutasyonu.mutate({ ...govde, weight: govde.weight!, heightCm: govde.heightCm! }, {
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

  return (
    <ScrollView contentContainerClassName="gap-5 px-4 pt-2 pb-4">
      <BirincilDugme onPress={penceresiniAc} yukseklik="normal">
        <Plus color={ikonRenk.onAccent} size={20} />
        <Text className="text-body-lg font-bold text-on-accent">Yeni ölçüm ekle</Text>
      </BirincilDugme>

      <Modal acik={modalAcik} onKapat={() => setModalAcik(false)} baslik="Yeni ölçüm">
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
      </Modal>

      {isLoading && <Text className="text-body text-muted">Yükleniyor...</Text>}

      {isError && (
        <Text accessibilityRole="alert" className="text-body text-danger">
          Ölçüler alınamadı. Lütfen sayfayı yenileyin.
        </Text>
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <BosDurum ikon={Scale} baslik="Henüz ölçü yok" aciklama="Yukarıdan ilk ölçünü ekle." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <View className="flex-col gap-3">
            {data.items.map((olcu) => (
              <OlcuKarti
                key={olcu.id}
                olcu={olcu}
                onayAcik={silinecekId === olcu.id}
                onSilmeyeBasla={() => setSilinecekId(olcu.id)}
                onVazgec={() => setSilinecekId(null)}
                onSil={() => {
                  silMutasyonu.mutate(olcu.id);
                  setSilinecekId(null);
                }}
              />
            ))}
          </View>
          {data.totalPages > 1 && (
            <View className="flex-row items-center justify-between gap-4">
              <Pressable
                onPress={() => setSayfa((s) => s - 1)}
                disabled={data.page <= 1}
                className={`h-13 flex-1 items-center justify-center rounded-xl bg-surface-2 ${data.page <= 1 ? 'opacity-60' : ''}`}
              >
                <Text className="text-label text-fg uppercase">Önceki</Text>
              </Pressable>
              <Text className="text-label text-fg">
                Sayfa {data.page} / {data.totalPages}
              </Text>
              <Pressable
                onPress={() => setSayfa((s) => s + 1)}
                disabled={data.page >= data.totalPages}
                className={`h-13 flex-1 items-center justify-center rounded-xl bg-surface-2 ${data.page >= data.totalPages ? 'opacity-60' : ''}`}
              >
                <Text className="text-label text-fg uppercase">Sonraki</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </ScrollView>
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
          {formatTrDate(olcu.recordedAt)} {formatTrTime(olcu.recordedAt)}
        </Text>
        <Text className="text-body text-fg">{olcuMetni(olcu)}</Text>
      </View>
      <IkonDugmesi etiket="Ölçüyü sil" onPress={onSilmeyeBasla}>
        <Trash2 color={ikonRenk.muted} size={18} />
      </IkonDugmesi>
    </View>
  );
}
