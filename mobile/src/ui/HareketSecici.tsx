import { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { Check, Search, X } from 'lucide-react-native';
import type { Egzersiz, EgzersizKategorisi } from '@grind/shared/api/queries';
import { useTranslation } from 'react-i18next';
import { egzersizAra, egzersizOner } from '@grind/shared/lib/egzersizler';
import { ikonRenk } from './renkler';

const KATEGORI_HAPLARI: { deger: EgzersizKategorisi | null; etiket: string }[] = [
  { deger: null, etiket: 'Tümü' },
  { deger: 'Push', etiket: 'Push' },
  { deger: 'Pull', etiket: 'Pull' },
  { deger: 'Legs', etiket: 'Legs' },
  { deger: 'Other', etiket: 'Diğer' },
];

interface Props {
  id: string;
  egzersizler: readonly Egzersiz[];
  secilenId: number;
  secilenAd: string;
  devreDisiIdler?: ReadonlySet<number>;
  onSec: (exerciseId: number) => void;
  otomatikOdak?: boolean;
  listeYukari?: boolean;
  /**
   * Verilirse alanin SAG icinde bir kapatma dugmesi cizilir. Yukari acilan liste alanin ustundeki
   * her seyi (panel basligi dahil) ortuyor; kapatma dugmesi bu yuzden basliga degil, listenin ASLA
   * ortemedigi tek yere -- alanin kendi satirina -- konur.
   */
  onKapat?: () => void;
}

/**
 * Hareketi YAZARAK arayip secme (issue #48). Web'in odak/kaybi (focus/blur) tabanli acilir-listesiyle
 * AYNI fikir; klavye ok tuslariyla gezinme (masaustune ozgu) BILEREK atlandi -- dokunmatik cihazda
 * karsiligi yok, liste zaten dokunarak secilir.
 */
export default function HareketSecici({
  id,
  egzersizler,
  secilenId,
  secilenAd,
  devreDisiIdler,
  onSec,
  otomatikOdak = false,
  listeYukari = false,
  onKapat,
}: Props) {
  const { t } = useTranslation();
  const [acik, setAcik] = useState(false);
  const [sorgu, setSorgu] = useState('');
  const [kategori, setKategori] = useState<EgzersizKategorisi | null>(null);
  const alanRef = useRef<TextInput>(null);
  const devreDisi = devreDisiIdler ?? new Set<number>();

  const eslesenler = acik ? egzersizAra(egzersizler, sorgu, kategori) : [];
  // Eslesme yoksa yazim hatasi olabilir: benzeyenler "Bunu mu demek istediniz?" altinda sunulur (#231).
  const oneriler = acik && eslesenler.length === 0 ? egzersizOner(egzersizler, sorgu, kategori) : [];
  const sonuclar = eslesenler.length > 0 ? eslesenler : oneriler;

  function ac() {
    setSorgu('');
    setAcik(true);
  }

  function kapat() {
    setAcik(false);
    setSorgu('');
    setKategori(null);
  }

  function sec(egzersiz: Egzersiz) {
    if (devreDisi.has(egzersiz.id)) {
      return;
    }
    onSec(egzersiz.id);
    kapat();
    alanRef.current?.blur();
  }

  return (
    <View className="relative">
      <View className="relative flex-row items-center">
        <View className="pointer-events-none absolute left-3 z-10">
          <Search color={ikonRenk.muted} size={18} />
        </View>
        <TextInput
          ref={alanRef}
          nativeID={id}
          testID={id}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={otomatikOdak}
          value={acik ? sorgu : secilenAd}
          placeholder={acik ? secilenAd : undefined}
          placeholderTextColor={ikonRenk.muted}
          onFocus={ac}
          // Disariya (bu bilesenin DISINDA herhangi bir yere) dokununca acilir-liste kapanir --
          // kullanici kullanici isteği: "hareket ekle"den cikacak baska bir yol yoktu. Ic
          // dokunuslar (kategori haplari, sonuc satirlari) `stickyHeaderIndices` + tek
          // `ScrollView`in `keyboardShouldPersistTaps="handled"`i sayesinde bu blur'u TETIKLEMEZ.
          onBlur={kapat}
          onChangeText={(metin) => {
            setSorgu(metin);
            setAcik(true);
          }}
          className={`h-12 w-full rounded-lg bg-inset pl-10 text-body-lg text-fg focus:bg-surface-3 ${
            onKapat ? 'pr-12' : 'pr-4'
          }`}
        />
        {onKapat && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('antrenman.hareketEklemeyiKapat')}
            onPress={onKapat}
            className="absolute right-1 z-10 size-10 items-center justify-center rounded-lg"
          >
            <X color={ikonRenk.muted} size={20} />
          </Pressable>
        )}
      </View>

      {acik && (
        <View
          // `mb-4`: yukari acilan liste, arama kutusunu saran KARTIN (p-3 = 12px dolgu) da ustunden
          // baslasin -- 4px'lik pay iki karti gorsel olarak ayirir (kullanici karari).
          className={`absolute inset-x-0 z-30 rounded-lg bg-surface-3 ${listeYukari ? 'bottom-full mb-4' : 'top-full mt-1'}`}
        >
          <ScrollView keyboardShouldPersistTaps="handled" stickyHeaderIndices={[0]} className="max-h-64">
            <View className="flex-row flex-wrap gap-1 rounded-t-lg border-b border-surface-4 bg-surface-3 p-1">
              {KATEGORI_HAPLARI.map(({ deger, etiket }) => (
                <Pressable
                  key={etiket}
                  accessibilityState={{ selected: kategori === deger }}
                  onPress={() => setKategori(deger)}
                  className={`min-h-11 items-center justify-center rounded-full px-3 ${kategori === deger ? 'bg-surface-4' : ''}`}
                >
                  <Text className={`text-label ${kategori === deger ? 'text-fg' : 'text-muted'}`}>{etiket}</Text>
                </Pressable>
              ))}
            </View>
            {oneriler.length > 0 && (
              <Text className="px-4 pt-2 pb-1 text-label text-muted">{t('antrenman.oneriBaslik')}</Text>
            )}
            {sonuclar.map((egzersiz) => {
              const secili = egzersiz.id === secilenId;
              const kapali = devreDisi.has(egzersiz.id);
              return (
                <Pressable
                  key={egzersiz.id}
                  disabled={kapali}
                  onPress={() => sec(egzersiz)}
                  className="min-h-11 flex-row items-center justify-between gap-2 px-4"
                >
                  <Text className={`text-body ${kapali ? 'text-muted opacity-50' : 'text-fg'}`}>{egzersiz.name}</Text>
                  {secili && <Check color={ikonRenk.accent} size={18} />}
                </Pressable>
              );
            })}
            {sonuclar.length === 0 && (
              <Text className="px-4 py-3 text-body text-muted">Eşleşen hareket yok.</Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
