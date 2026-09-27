import { useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link, useRouter } from 'expo-router';
import { useTemplates, useSablonlariSirala, useDeleteTemplate } from '@grind/shared/api/queries';
import SablonKarti from '../ui/SablonKarti';
import SurukleSiraliListe from '../ui/SurukleSiraliListe';
import KaydirilabilirSatir, { type KaydirilabilirSatirRef } from '../ui/KaydirilabilirSatir';
import IkincilDugme from '../ui/IkincilDugme';

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
 *
 * #435: kart sagdan sola itilince altindan "sil" ve "duzenle" kisayollari cikar. Silme geri
 * alinamaz oldugu icin kisayol dogrudan silmez -- kart, GecmisKarti'ndaki gibi YERINDE onay sorar.
 */
export default function SablonlaBasla({ onBasla, bekliyor }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: sablonlar, isLoading, isError } = useTemplates();
  const siralama = useSablonlariSirala();
  const silme = useDeleteTemplate();
  const kaydirmalar = useRef(new Map<number, KaydirilabilirSatirRef | null>());
  const [acikId, setAcikId] = useState<number | null>(null);
  const [onayId, setOnayId] = useState<number | null>(null);

  // Kisayollar acikken dokunus antrenmani baslatmaz: kullanici karta degil, acik kisayolu
  // kapatmaya dokunuyor. Kartin kendi `Pressable`i icteki oldugu icin bu karari BURADA vermek
  // gerekiyor -- KaydirilabilirSatir'in disttaki dokunusu bu durumda hic tetiklenmez.
  function kartaDokunuldu(id: number) {
    if (acikId === id) {
      kaydirmalar.current.get(id)?.kapat();
      return;
    }
    onBasla(id);
  }

  function onayiAc(id: number) {
    kaydirmalar.current.get(id)?.kapat();
    setAcikId(null);
    setOnayId(id);
  }

  function sil(id: number) {
    silme.mutate(id);
    setOnayId(null);
  }

  return (
    <View className="flex-col gap-3">
      <Text className="text-heading text-fg">{t('sablonlar.baslaBasligi')}</Text>

      {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}
      {isError && (
        <Text accessibilityRole="alert" className="text-body text-danger">
          {t('sablonlar.hata')}
        </Text>
      )}

      {sablonlar && sablonlar.length === 0 && <Text className="text-body text-muted">{t('sablonlar.hicSablonYok')}</Text>}

      {sablonlar && sablonlar.length > 0 && (
        <>
          <SurukleSiraliListe
            ogeler={sablonlar}
            anahtar={(sablon) => sablon.id}
            onSirala={(yeniSira) => siralama.mutate(yeniSira.map((sablon) => sablon.id))}
            satirCiz={(sablon, suruklenen) =>
              onayId === sablon.id ? (
                <View className="flex-col gap-3 overflow-hidden rounded-xl bg-surface-2 p-4">
                  <Text className="text-body-lg font-semibold text-fg">{sablon.name}</Text>
                  <Text className="text-body text-fg">{t('sablonlar.silOnayMesaji')}</Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => sil(sablon.id)}
                      className="h-12 flex-1 items-center justify-center rounded-xl bg-danger-bg"
                    >
                      <Text className="text-label text-on-danger-bg">{t('ortak.evetSil')}</Text>
                    </Pressable>
                    <View className="flex-1">
                      <IkincilDugme onPress={() => setOnayId(null)}>{t('ortak.vazgec')}</IkincilDugme>
                    </View>
                  </View>
                </View>
              ) : (
                <KaydirilabilirSatir
                  ref={(kaydirma) => {
                    kaydirmalar.current.set(sablon.id, kaydirma);
                  }}
                  onSil={() => onayiAc(sablon.id)}
                  onDuzenle={() => router.push(`/templates/${sablon.id}`)}
                  kaydirmaEtiketi={t('sablonlar.kaydirmaKisayolu', { ad: sablon.name })}
                  onAcikDegisti={(acik) => setAcikId(acik ? sablon.id : null)}
                >
                  <SablonKarti
                    ad={sablon.name}
                    hareketSayisi={sablon.exercises.length}
                    onPress={() => kartaDokunuldu(sablon.id)}
                    disabled={bekliyor}
                    kaldirilmis={suruklenen}
                  />
                </KaydirilabilirSatir>
              )
            }
          />
          {/* `Link`in kendisine renk class'i vermek metne gecmez (RN'de Text renk MIRAS ALMAZ,
              digger `Link` kullanimlarindaki gibi metin AYRI bir `Text`te olmali) -- yoksa
              stilsiz metin RN varsayilani olan SIYAH renderlanir (kullanici bulgusu). */}
          <Link href="/templates" className="min-h-11 justify-center">
            <Text className="text-label text-muted underline">{t('sablonlar.yonet')}</Text>
          </Link>
        </>
      )}
    </View>
  );
}
