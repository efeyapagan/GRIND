import { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, ClipboardList, Plus, Trash2, X } from 'lucide-react-native';
import {
  useCreateTemplate,
  useDeleteTemplate,
  useExercises,
  useUpdateTemplate,
  type Egzersiz,
  type Sablon,
  type SablonGirdisi,
} from '@grind/shared/api/queries';
import { apiHatasiniAyir } from '@grind/shared/lib/apiErrors';
import { adaGoreSirala } from '@grind/shared/lib/egzersizler';
import { VARSAYILAN_DINLENME_SN } from '@grind/shared/lib/dinlenme';
import { VARSAYILAN_HEDEF_SET, type SablonTaslakHareketi } from '@grind/shared/lib/sablonTaslagi';
import Alan from '../ui/Alan';
import BirincilDugme from '../ui/BirincilDugme';
import Hap from '../ui/Hap';
import HataKutusu from '../ui/HataKutusu';
import IkincilDugme from '../ui/IkincilDugme';
import IkonDugmesi from '../ui/IkonDugmesi';
import HareketSecici from '../ui/HareketSecici';
import SecimKutusu from '../ui/SecimKutusu';
import { ikonRenk } from '../ui/renkler';

const DINLENME_SECENEKLERI = [
  { deger: 0, etiket: 'Yok' },
  { deger: 30, etiket: '30 sn' },
  { deger: 60, etiket: '60 sn' },
  { deger: 90, etiket: '90 sn' },
  { deger: 120, etiket: '2 dk' },
  { deger: 180, etiket: '3 dk' },
  { deger: 240, etiket: '4 dk' },
  { deger: 300, etiket: '5 dk' },
];

interface Satir {
  anahtar: number;
  exerciseId: number;
  exerciseName: string;
  isArchived: boolean;
  plannedSets: string;
  restSeconds: number;
}

interface Props {
  sablon: Sablon | null;
  donusYolu: string;
  /** #209/#186: antrenmandan gelen yeni sablonun baslangic satirlari; `sablon` doluysa yok sayilir. */
  baslangicHareketleri?: SablonTaslakHareketi[];
}

/**
 * web/src/pages/SablonDuzenlePage.tsx'teki `SablonFormu` ile ayni (spec Karar 3). Basili-tutup-
 * surukleme (dnd-kit, web'e ozgu) BILEREK atlandi -- web'de ZATEN erisilebilirlik icin var olan
 * yukari/asagi dugmeleri (`tasi`) burada TEK reorder yoludur, ikinci sinif bir alternatif degil.
 */
export default function SablonFormu({ sablon, donusYolu, baslangicHareketleri }: Props) {
  const router = useRouter();
  const { data: egzersizler } = useExercises();
  const olusturMutasyonu = useCreateTemplate();
  const guncelleMutasyonu = useUpdateTemplate();
  const silMutasyonu = useDeleteTemplate();

  const siraliEgzersizler = adaGoreSirala(egzersizler ?? []);

  const [ad, setAd] = useState(sablon?.name ?? '');
  const [satirlar, setSatirlar] = useState<Satir[]>(() => {
    // Antrenmandan gelen taslakta arsiv bilgisi yok; arsivli hareketi kaydederken sunucu reddeder.
    const baslangic: (SablonTaslakHareketi & { isArchived?: boolean })[] = sablon?.exercises ?? baslangicHareketleri ?? [];
    return baslangic.map((hareket, sira) => ({
      anahtar: sira,
      exerciseId: hareket.exerciseId,
      exerciseName: hareket.exerciseName,
      isArchived: hareket.isArchived ?? false,
      plannedSets: String(hareket.plannedSets),
      restSeconds: hareket.restSeconds,
    }));
  });
  const siradakiAnahtar = useRef(satirlar.length);

  const [adHatasi, setAdHatasi] = useState<string | null>(null);
  const [setHatalari, setSetHatalari] = useState<Record<number, string>>({});
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [silmeOnayi, setSilmeOnayi] = useState(false);
  const [silmeHatasi, setSilmeHatasi] = useState<string | null>(null);

  const secilenIdler = new Set(satirlar.map((satir) => satir.exerciseId));
  const eklenebilirEgzersiz = siraliEgzersizler.find((eg) => !secilenIdler.has(eg.id));

  function hareketEkle() {
    if (!eklenebilirEgzersiz) {
      return;
    }
    const anahtar = siradakiAnahtar.current;
    siradakiAnahtar.current += 1;
    setSatirlar((onceki) => [
      ...onceki,
      {
        anahtar,
        exerciseId: eklenebilirEgzersiz.id,
        exerciseName: eklenebilirEgzersiz.name,
        isArchived: false,
        plannedSets: String(VARSAYILAN_HEDEF_SET),
        restSeconds: VARSAYILAN_DINLENME_SN,
      },
    ]);
  }

  function satiriGuncelle(anahtar: number, degisiklik: Partial<Satir>) {
    setSatirlar((onceki) => onceki.map((satir) => (satir.anahtar === anahtar ? { ...satir, ...degisiklik } : satir)));
  }

  function egzersizSec(anahtar: number, exerciseId: number) {
    const egzersiz = siraliEgzersizler.find((eg) => eg.id === exerciseId);
    if (egzersiz) {
      satiriGuncelle(anahtar, { exerciseId: egzersiz.id, exerciseName: egzersiz.name, isArchived: false });
    }
  }

  function tasi(sira: number, yon: -1 | 1) {
    setSatirlar((onceki) => {
      const hedef = sira + yon;
      if (hedef < 0 || hedef >= onceki.length) {
        return onceki;
      }
      const yeni = [...onceki];
      [yeni[sira], yeni[hedef]] = [yeni[hedef], yeni[sira]];
      return yeni;
    });
  }

  function dogrula(): boolean {
    const kirpilmisAd = ad.trim();
    const yeniAdHatasi =
      kirpilmisAd.length < 2 || kirpilmisAd.length > 100 ? 'Şablon adı 2-100 karakter olmalı.' : null;
    const yeniSetHatalari: Record<number, string> = {};
    for (const satir of satirlar) {
      const metin = satir.plannedSets.trim();
      const sayi = Number(metin);
      if (metin === '' || !Number.isInteger(sayi) || sayi < 1 || sayi > 50) {
        yeniSetHatalari[satir.anahtar] = 'Hedef set 1-50 arasında olmalı.';
      }
    }
    setAdHatasi(yeniAdHatasi);
    setSetHatalari(yeniSetHatalari);
    return yeniAdHatasi === null && Object.keys(yeniSetHatalari).length === 0;
  }

  async function kaydet() {
    setGenelHata(null);
    if (!dogrula()) {
      return;
    }

    const girdi: SablonGirdisi = {
      name: ad.trim(),
      exercises: satirlar.map((satir) => ({
        exerciseId: satir.exerciseId,
        plannedSets: Number(satir.plannedSets.trim()),
        restSeconds: satir.restSeconds,
      })),
    };

    try {
      if (sablon) {
        await guncelleMutasyonu.mutateAsync({ id: sablon.id, girdi });
      } else {
        await olusturMutasyonu.mutateAsync(girdi);
      }
      router.replace(donusYolu as never);
    } catch (hata) {
      const sonuc = apiHatasiniAyir(hata, ['name']);
      setAdHatasi(sonuc.alanHatalari.name ?? null);
      setGenelHata(sonuc.genelHata);
    }
  }

  async function sil() {
    if (!sablon) {
      return;
    }
    setSilmeHatasi(null);
    try {
      await silMutasyonu.mutateAsync(sablon.id);
      router.replace('/templates');
    } catch (hata) {
      setSilmeHatasi(apiHatasiniAyir(hata, []).genelHata);
      setSilmeOnayi(false);
    }
  }

  const kaydediliyor = olusturMutasyonu.isPending || guncelleMutasyonu.isPending;

  return (
    <View className="flex-col gap-5">
      {genelHata && <HataKutusu baslik="Şablon kaydedilemedi" mesaj={genelHata} />}

      <Alan
        id="sablon-adi"
        etiket="Şablon adı"
        ikon={ClipboardList}
        placeholder="Push Day"
        value={ad}
        onChangeText={setAd}
        hata={adHatasi ?? undefined}
      />

      <View className="flex-col gap-3">
        <Text className="text-heading text-fg">Hareketler</Text>
        {satirlar.length === 0 && <Text className="text-body text-muted">Henüz hareket yok.</Text>}
        <View className="flex-col gap-3">
          {satirlar.map((satir, sira) => (
            <HareketSatiri
              key={satir.anahtar}
              satir={satir}
              sira={sira + 1}
              sonMu={sira === satirlar.length - 1}
              egzersizler={siraliEgzersizler}
              baskaSatirdaSecilenler={
                new Set(satirlar.filter((diger) => diger.anahtar !== satir.anahtar).map((diger) => diger.exerciseId))
              }
              setHatasi={setHatalari[satir.anahtar]}
              onEgzersiz={(exerciseId) => egzersizSec(satir.anahtar, exerciseId)}
              onHedefSet={(deger) => satiriGuncelle(satir.anahtar, { plannedSets: deger })}
              onDinlenme={(saniye) => satiriGuncelle(satir.anahtar, { restSeconds: saniye })}
              onYukari={() => tasi(sira, -1)}
              onAsagi={() => tasi(sira, 1)}
              onKaldir={() => setSatirlar((onceki) => onceki.filter((diger) => diger.anahtar !== satir.anahtar))}
            />
          ))}
        </View>
        <IkincilDugme onPress={hareketEkle} disabled={!eklenebilirEgzersiz}>
          <Plus color={ikonRenk.fg} size={18} />
          <Text className="text-label text-fg">Hareket ekle</Text>
        </IkincilDugme>
      </View>

      <BirincilDugme yukseklik="normal" disabled={kaydediliyor} onPress={kaydet}>
        Kaydet
      </BirincilDugme>

      {sablon && (
        <View className="flex-col gap-3 border-t border-surface-3 pt-5">
          {silmeHatasi && (
            <Text accessibilityRole="alert" className="text-label text-danger">
              {silmeHatasi}
            </Text>
          )}
          {silmeOnayi ? (
            <View className="flex-col gap-3 rounded-xl bg-surface-2 p-4">
              <Text className="text-body text-fg">
                Silmek istediğine emin misin? Bu şablonla yapılmış geçmiş antrenmanlar silinmez.
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={sil}
                  disabled={silMutasyonu.isPending}
                  className={`h-12 flex-1 items-center justify-center rounded-xl bg-danger-bg ${silMutasyonu.isPending ? 'opacity-60' : ''}`}
                >
                  <Text className="text-label text-on-danger-bg">Evet, sil</Text>
                </Pressable>
                <View className="flex-1">
                  <IkincilDugme onPress={() => setSilmeOnayi(false)}>Vazgeç</IkincilDugme>
                </View>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setSilmeOnayi(true)} className="h-12 flex-row items-center justify-center gap-2 rounded-xl">
              <Trash2 color={ikonRenk.danger} size={18} />
              <Text className="text-label text-danger">Şablonu sil</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

interface HareketSatiriProps {
  satir: Satir;
  sira: number;
  sonMu: boolean;
  egzersizler: Egzersiz[];
  baskaSatirdaSecilenler: Set<number>;
  setHatasi?: string;
  onEgzersiz: (exerciseId: number) => void;
  onHedefSet: (deger: string) => void;
  onDinlenme: (saniye: number) => void;
  onYukari: () => void;
  onAsagi: () => void;
  onKaldir: () => void;
}

function HareketSatiri({
  satir,
  sira,
  sonMu,
  egzersizler,
  baskaSatirdaSecilenler,
  setHatasi,
  onEgzersiz,
  onHedefSet,
  onDinlenme,
  onYukari,
  onAsagi,
  onKaldir,
}: HareketSatiriProps) {
  const onEk = `${sira}. hareket`;
  const dinlenmeSecenekleri = DINLENME_SECENEKLERI.some((secenek) => secenek.deger === satir.restSeconds)
    ? DINLENME_SECENEKLERI
    : [...DINLENME_SECENEKLERI, { deger: satir.restSeconds, etiket: `${satir.restSeconds} sn` }].sort(
        (a, b) => a.deger - b.deger,
      );

  return (
    <View className="flex-col gap-3 rounded-xl bg-surface-2 p-4">
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <View className="size-8 shrink-0 items-center justify-center rounded-lg bg-surface-3">
            <Text className="text-label text-fg">{sira}</Text>
          </View>
          {satir.isArchived && <Hap>Artık kullanılmıyor</Hap>}
        </View>
        <View className="shrink-0 flex-row items-center gap-1">
          <IkonDugmesi etiket={`${onEk}: yukarı taşı`} onPress={onYukari} disabled={sira === 1}>
            <ChevronUp color={ikonRenk.muted} size={20} />
          </IkonDugmesi>
          <IkonDugmesi etiket={`${onEk}: aşağı taşı`} onPress={onAsagi} disabled={sonMu}>
            <ChevronDown color={ikonRenk.muted} size={20} />
          </IkonDugmesi>
          <IkonDugmesi etiket={`${onEk}: kaldır`} onPress={onKaldir}>
            <X color={ikonRenk.muted} size={20} />
          </IkonDugmesi>
        </View>
      </View>

      <View className="flex-col gap-1">
        <Text className="text-label text-muted">Egzersiz</Text>
        <HareketSecici
          id={`hareket-${satir.anahtar}-egzersiz`}
          egzersizler={egzersizler}
          secilenId={satir.exerciseId}
          secilenAd={satir.exerciseName}
          devreDisiIdler={baskaSatirdaSecilenler}
          onSec={onEgzersiz}
        />
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 flex-col gap-1">
          <Text className="text-label text-muted">Hedef set</Text>
          <TextInput
            inputMode="numeric"
            keyboardType="number-pad"
            value={satir.plannedSets}
            onChangeText={onHedefSet}
            className="h-12 w-full rounded-lg bg-inset px-4 text-body-lg text-fg"
          />
          {setHatasi && (
            <Text accessibilityRole="alert" className="text-label text-danger">
              {setHatasi}
            </Text>
          )}
        </View>
        <View className="flex-1 flex-col gap-1">
          <Text className="text-label text-muted">Dinlenme</Text>
          <SecimKutusu
            baslik="Dinlenme"
            secenekler={dinlenmeSecenekleri}
            deger={satir.restSeconds}
            onDegistir={onDinlenme}
          />
        </View>
      </View>
    </View>
  );
}
