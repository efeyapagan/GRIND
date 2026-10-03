import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Search } from 'lucide-react-native';
import type { Egzersiz, EgzersizKategorisi } from '@grind/shared/api/queries';
import { egzersizAra, egzersizOner } from '@grind/shared/lib/egzersizler';
import Modal from './Modal';
import KategoriHaplari from './KategoriHaplari';
import { useIkonRenk } from './renkler';

interface Props {
  egzersizler: readonly Egzersiz[];
  /** `null` = "tum hareketler" secili (yalnizca `tumEtiketi` verildiyse anlamli). */
  secilenId: number | null;
  /** Basliktaki ad; secim yokken `tumEtiketi`. */
  secilenAd: string;
  onSec: (exerciseId: number | null) => void;
  /** Verilirse listenin basinda bu etiketle bir "tum hareketler" satiri cizilir; secilince `onSec(null)`. */
  tumEtiketi?: string;
}

/**
 * #586: Ilerleme kartlarinin basligindaki hareket secimi. Kart basligi (ad + ok) dokununca bir PENCERE
 * acar -- kartin altina acilan liste (`HareketSecici`) ekranin sonundaki kartta kaydirma alaninin disina
 * tasip dokunulamaz kaliyordu. Arama ve kategori haplari `HareketSecici` ile ayni kuraldan gecer.
 */
export default function HareketSecimKutusu({ egzersizler, secilenId, secilenAd, onSec, tumEtiketi }: Props) {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const [acik, setAcik] = useState(false);
  const [sorgu, setSorgu] = useState('');
  const [kategori, setKategori] = useState<EgzersizKategorisi | null>(null);

  const eslesenler = acik ? egzersizAra(egzersizler, sorgu, kategori) : [];
  // Eslesme yoksa yazim hatasi olabilir: benzeyenler "Bunu mu demek istediniz?" altinda sunulur (#231).
  const oneriler = acik && eslesenler.length === 0 ? egzersizOner(egzersizler, sorgu, kategori) : [];
  const sonuclar = eslesenler.length > 0 ? eslesenler : oneriler;

  function kapat() {
    setAcik(false);
    setSorgu('');
    setKategori(null);
  }

  function sec(exerciseId: number | null) {
    onSec(exerciseId);
    kapat();
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('ilerleme.hareketDegistir')}: ${secilenAd}`}
        onPress={() => setAcik(true)}
        className="min-h-11 flex-row items-center justify-between gap-2"
      >
        <Text numberOfLines={1} className="flex-1 text-heading text-fg">
          {secilenAd}
        </Text>
        <ChevronDown color={ikonRenk.muted} size={18} />
      </Pressable>

      <Modal acik={acik} onKapat={kapat} baslik={t('ilerleme.hareketSec')}>
        <View className="relative flex-row items-center">
          <View className="pointer-events-none absolute left-3 z-10">
            <Search color={ikonRenk.muted} size={18} />
          </View>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            value={sorgu}
            placeholder={t('antrenman.hareketAra')}
            placeholderTextColor={ikonRenk.muted}
            onChangeText={setSorgu}
            className="h-12 w-full rounded-lg bg-inset pl-10 pr-4 text-body-lg text-fg focus:bg-surface-3"
          />
        </View>
        <KategoriHaplari secili={kategori} onSec={setKategori} />
        <View className="flex-col">
          {tumEtiketi !== undefined && sorgu === '' && kategori === null && (
            <SecimSatiri ad={tumEtiketi} secili={secilenId === null} onPress={() => sec(null)} />
          )}
          {oneriler.length > 0 && (
            <Text className="px-2 pt-2 pb-1 text-label text-muted">{t('antrenman.oneriBaslik')}</Text>
          )}
          {sonuclar.map((egzersiz) => (
            <SecimSatiri
              key={egzersiz.id}
              ad={egzersiz.name}
              secili={egzersiz.id === secilenId}
              onPress={() => sec(egzersiz.id)}
            />
          ))}
          {sonuclar.length === 0 && <Text className="px-2 py-3 text-body text-muted">{t('antrenman.eslesenYok')}</Text>}
        </View>
      </Modal>
    </>
  );
}

function SecimSatiri({ ad, secili, onPress }: { ad: string; secili: boolean; onPress: () => void }) {
  const ikonRenk = useIkonRenk();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: secili }}
      onPress={onPress}
      className="min-h-11 flex-row items-center justify-between gap-2 rounded-lg px-2"
    >
      <Text numberOfLines={1} className="min-w-0 flex-1 text-body text-fg">
        {ad}
      </Text>
      {secili && <Check color={ikonRenk.accent} size={18} />}
    </Pressable>
  );
}
