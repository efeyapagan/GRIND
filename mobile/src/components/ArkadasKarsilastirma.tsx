import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useArkadasHaftasi } from '@grind/shared/api/queries';
import { arkadaslariSirala } from '@grind/shared/lib/arkadasSiralamasi';
import ArkadasSatiri from './ArkadasSatiri';

/** Ana ekranda gosterilen satir sayisi; gerisi "Tümünü gör" ekraninda (#418, kullanici karari). */
export const ANA_EKRAN_SATIRI = 5;

/**
 * Ana ekrandaki arkadas karsilastirmasi (#418): arkadaslar haftalik hedeflerine ulasma oranina
 * gore yukaridan asagiya. Sira `arkadaslariSirala` ile hesaplanir (ortak pakette, testli);
 * sunucu siralamaz.
 *
 * `Gizli` gizlilik seviyesindeki arkadas yanitta hic gelmez (sunucu kapisi) -- burada ayrica
 * filtre yok, tek dogruluk kaynagi orada.
 */
export default function ArkadasKarsilastirma() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading, isError } = useArkadasHaftasi();

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

  const sirali = arkadaslariSirala(data ?? []);

  return (
    <View className="flex-col gap-3 rounded-xl bg-surface-1 p-4">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-heading text-fg">{t('arkadaslar.baslik')}</Text>
        {sirali.length > ANA_EKRAN_SATIRI && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/arkadaslar')}
            className="min-h-11 justify-center"
          >
            <Text className="text-label text-muted underline">{t('arkadaslar.tumunuGor')}</Text>
          </Pressable>
        )}
      </View>

      {sirali.length === 0 ? (
        <View className="flex-col gap-1">
          <Text className="text-body text-fg">{t('arkadaslar.bosBaslik')}</Text>
          <Text className="text-label text-muted">{t('arkadaslar.bosAciklama')}</Text>
        </View>
      ) : (
        <View className="flex-col gap-2">
          {sirali.slice(0, ANA_EKRAN_SATIRI).map((arkadas, sira) => (
            <ArkadasSatiri key={arkadas.username} arkadas={arkadas} lider={sira === 0} />
          ))}
        </View>
      )}
    </View>
  );
}
