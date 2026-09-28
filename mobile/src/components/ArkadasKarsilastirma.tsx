import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useArkadasDonemi } from '@grind/shared/api/queries';
import { arkadaslariSirala, liderKullaniciAdi } from '@grind/shared/lib/arkadasSiralamasi';
import { gorunumAraligi } from '@grind/shared/lib/takvim';
import { useTakvimDonemi } from '../ui/TakvimDonemiContext';
import ArkadasSatiri from './ArkadasSatiri';

/**
 * Ana ekranda gosterilen satir sayisi; gerisi "Tum arkadaslari gor" ekraninda. #418'de 5'ti, #420'de
 * 7, #518'de 6 oldu (kullanici karari).
 */
export const ANA_EKRAN_SATIRI = 6;

/**
 * Ana ekrandaki arkadas karsilastirmasi (#418): sira `arkadaslariSirala` ile hesaplanir (ortak
 * pakette, testli); sunucu siralamaz.
 *
 * #420: donem hemen ustundeki TAKVIMDEN gelir (`useTakvimDonemi`) -- takvim gecen haftaya kayinca
 * liste gecen haftaya, aya cevrilince aya gore siralanir; aylikta hedef x4.
 *
 * `Gizli` gizlilik seviyesindeki arkadas yanitta hic gelmez (sunucu kapisi) -- burada ayrica
 * filtre yok, tek dogruluk kaynagi orada.
 */
export default function ArkadasKarsilastirma() {
  const { t } = useTranslation();
  const router = useRouter();
  const { gorunum, gosterilen } = useTakvimDonemi();
  const { from, to } = gorunumAraligi(gorunum, gosterilen);
  const { data, isLoading, isError } = useArkadasDonemi(from, to);

  if (isLoading) {
    return null;
  }

  if (isError) {
    return (
      <View className="flex-col gap-2 rounded-xl bg-surface-1 p-4">
        <Text className="text-heading text-fg">{t('arkadaslar.baslik')}</Text>
        <Text accessibilityRole="alert" className="text-body text-danger">
          {t('arkadaslar.alinamadi')}
        </Text>
      </View>
    );
  }

  const sirali = arkadaslariSirala(data ?? [], gorunum);
  const lider = liderKullaniciAdi(sirali);
  const yalnizKendisi = sirali.length <= 1;

  return (
    <View className="flex-col gap-3 rounded-xl bg-surface-1 p-4">
      <Text className="text-heading text-fg">{t('arkadaslar.baslik')}</Text>

      <View className="flex-col gap-2">
        {sirali.slice(0, ANA_EKRAN_SATIRI).map((arkadas) => (
          <ArkadasSatiri
            key={arkadas.username}
            arkadas={arkadas}
            gorunum={gorunum}
            lider={arkadas.username === lider}
          />
        ))}
      </View>
      {/* #425: kendi satiri hep geldigi icin liste bos olmaz; arkadas YOKSA ipucu satiri. */}
      {yalnizKendisi && <Text className="text-label text-muted">{t('arkadaslar.arkadasYokIpucu')}</Text>}
      {/* #420 (kullanici karari): baglanti kartin ALTINDA -- listeyi okuyup bitiren goz onu orada bulur. */}
      {sirali.length > ANA_EKRAN_SATIRI && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/arkadaslar')}
          className="min-h-11 items-center justify-center"
        >
          <Text className="text-label text-muted underline">{t('arkadaslar.tumArkadaslariGor')}</Text>
        </Pressable>
      )}
    </View>
  );
}
