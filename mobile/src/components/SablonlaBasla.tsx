import { View, Text } from 'react-native';
import { Link } from 'expo-router';
import { useTemplates, useSablonlariSirala } from '@grind/shared/api/queries';
import SablonKarti from '../ui/SablonKarti';
import SurukleSiraliListe from '../ui/SurukleSiraliListe';

interface Props {
  onBasla: (templateId: number) => void;
  bekliyor: boolean;
}

/**
 * Web donduruldugu icin (#326) artik yalnizca mobil: web/src/components/SablonlaBasla.tsx eski
 * halinde kaldi.
 *
 * #344: kartlar basili tutulup surukleyerek siralanabilir. Sira SUNUCUDA durur
 * (`useSablonlariSirala`) -- cihazda tutulsa telefon degisince kaybolurdu. "Şablonları yönet"
 * ekrani ayni listeyi ayni ucdan okudugu icin sirayi kendiliginden yansitir.
 */
export default function SablonlaBasla({ onBasla, bekliyor }: Props) {
  const { data: sablonlar, isLoading, isError } = useTemplates();
  const siralama = useSablonlariSirala();

  return (
    <View className="flex-col gap-3">
      <Text className="text-heading text-fg">Şablonla başla</Text>

      {isLoading && <Text className="text-body text-muted">Yükleniyor...</Text>}
      {isError && (
        <Text accessibilityRole="alert" className="text-body text-danger">
          Şablonlar alınamadı.
        </Text>
      )}

      {sablonlar && sablonlar.length === 0 && <Text className="text-body text-muted">Henüz şablon yok.</Text>}

      {sablonlar && sablonlar.length > 0 && (
        <>
          <SurukleSiraliListe
            ogeler={sablonlar}
            anahtar={(sablon) => sablon.id}
            onSirala={(yeniSira) => siralama.mutate(yeniSira.map((sablon) => sablon.id))}
            satirCiz={(sablon, suruklenen) => (
              <SablonKarti
                ad={sablon.name}
                hareketSayisi={sablon.exercises.length}
                onPress={() => onBasla(sablon.id)}
                disabled={bekliyor}
                kaldirilmis={suruklenen}
              />
            )}
          />
          {/* `Link`in kendisine renk class'i vermek metne gecmez (RN'de Text renk MIRAS ALMAZ,
              digger `Link` kullanimlarindaki gibi metin AYRI bir `Text`te olmali) -- yoksa
              stilsiz metin RN varsayilani olan SIYAH renderlanir (kullanici bulgusu). */}
          <Link href="/templates" className="min-h-11 justify-center">
            <Text className="text-label text-muted underline">Şablonları yönet</Text>
          </Link>
        </>
      )}
    </View>
  );
}
