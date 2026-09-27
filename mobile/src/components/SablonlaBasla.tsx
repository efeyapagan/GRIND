import { useState } from 'react';
import { View, Text, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link, useRouter } from 'expo-router';
import { Pencil, Trash2 } from 'lucide-react-native';
import { useTemplates, useDeleteTemplate, type Sablon } from '@grind/shared/api/queries';
import { sablonOzeti } from '@grind/shared/lib/sablonOzeti';
import CizgiliBaslik from '../ui/CizgiliBaslik';
import SablonVitrinKarti from '../ui/SablonVitrinKarti';
import Modal from '../ui/Modal';
import IkincilDugme from '../ui/IkincilDugme';
import { useIkonRenk } from '../ui/renkler';

interface Props {
  onBasla: (templateId: number) => void;
  bekliyor: boolean;
}

const KART_ARALIGI = 12;
const EN_GENIS_KART = 300;
/** Kart ekranin bu kadarini kaplar; saginda bir sonrakinin ucu gorunur ki kaydirilabildigi belli olsun. */
const KART_ORANI = 0.72;

/**
 * Web donduruldugu icin (#326) artik yalnizca mobil: web/src/components/SablonlaBasla.tsx eski
 * halinde kaldi.
 *
 * #439: sablonlar yana kayan, bir karta oturan cam kartlardir. Yatay kaydirma liste gezintisine
 * gittigi icin #435'in sola itme kisayolu ve #344'un surukleyerek siralamasi buradan kalkti:
 * duzenle/sil karta basili tutunca acilan menude, siralama "Tümünü gör" (`/templates`) ekraninda.
 * Kartlar sunucunun sirasiyla gelir, orada degisen sira burada kendiliginden gorunur.
 */
export default function SablonlaBasla({ onBasla, bekliyor }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const ikonRenk = useIkonRenk();
  const { width: ekranGenisligi } = useWindowDimensions();
  const { data: sablonlar, isLoading, isError } = useTemplates();
  const silme = useDeleteTemplate();
  const [menudeki, setMenudeki] = useState<Sablon | null>(null);
  const [silOnayi, setSilOnayi] = useState(false);

  const kartGenisligi = Math.min(Math.round(ekranGenisligi * KART_ORANI), EN_GENIS_KART);

  function menuyuKapat() {
    setMenudeki(null);
    setSilOnayi(false);
  }

  function duzenle(id: number) {
    menuyuKapat();
    router.push(`/templates/${id}`);
  }

  function sil(id: number) {
    silme.mutate(id);
    menuyuKapat();
  }

  return (
    <View className="flex-col gap-5">
      <CizgiliBaslik>{t('sablonlar.antrenmanaBasla')}</CizgiliBaslik>

      <View className="flex-col gap-3">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-heading text-fg">{t('sablonlar.sablonlarim')}</Text>
          {sablonlar && sablonlar.length > 0 && (
            // RN'de Text rengi miras ALINMAZ: `Link`e verilen renk metne gecmez, metin ayri bir Text.
            <Link href="/templates" className="min-h-11 justify-center">
              <Text className="text-label text-accent-soft">{t('sablonlar.tumunuGor')}</Text>
            </Link>
          )}
        </View>

        {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}
        {isError && (
          <Text accessibilityRole="alert" className="text-body text-danger">
            {t('sablonlar.hata')}
          </Text>
        )}
        {sablonlar && sablonlar.length === 0 && <Text className="text-body text-muted">{t('sablonlar.hicSablonYok')}</Text>}

        {sablonlar && sablonlar.length > 0 && (
          // Kartlar ekran kenarina kadar kayar: ebeveynin 16'lik yan boslugu burada geri alinip
          // icerige verilir.
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={kartGenisligi + KART_ARALIGI}
            decelerationRate="fast"
            className="-mx-4"
            contentContainerClassName="px-4"
            contentContainerStyle={{ gap: KART_ARALIGI }}
          >
            {sablonlar.map((sablon) => (
              <SablonVitrinKarti
                key={sablon.id}
                ad={sablon.name}
                ozet={sablonOzeti(sablon)}
                hareketSayisi={sablon.exercises.length}
                genislik={kartGenisligi}
                onBasla={() => onBasla(sablon.id)}
                onMenu={() => setMenudeki(sablon)}
                disabled={bekliyor}
              />
            ))}
          </ScrollView>
        )}
      </View>

      <Modal acik={menudeki !== null} onKapat={menuyuKapat} baslik={menudeki?.name ?? ''}>
        {menudeki &&
          (silOnayi ? (
            <>
              <Text className="text-body text-fg">{t('sablonlar.silOnayMesaji')}</Text>
              <View className="flex-row gap-2">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => sil(menudeki.id)}
                  className="h-12 flex-1 items-center justify-center rounded-xl bg-danger-bg"
                >
                  <Text className="text-label text-on-danger-bg">{t('ortak.evetSil')}</Text>
                </Pressable>
                <View className="flex-1">
                  <IkincilDugme onPress={() => setSilOnayi(false)}>{t('ortak.vazgec')}</IkincilDugme>
                </View>
              </View>
            </>
          ) : (
            <>
              <IkincilDugme onPress={() => duzenle(menudeki.id)}>
                <Pencil color={ikonRenk.fg} size={18} />
                <Text className="text-label text-fg">{t('sablonlar.duzenleBaslik')}</Text>
              </IkincilDugme>
              <IkincilDugme onPress={() => setSilOnayi(true)}>
                <Trash2 color={ikonRenk.danger} size={18} />
                <Text className="text-label text-danger">{t('sablonlar.sil')}</Text>
              </IkincilDugme>
            </>
          ))}
      </Modal>
    </View>
  );
}
