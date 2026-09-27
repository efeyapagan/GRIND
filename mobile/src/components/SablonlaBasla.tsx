import { useRef, useState } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link, useRouter } from 'expo-router';
import { useTemplates, useDeleteTemplate, useSablonlariSirala, type Sablon } from '@grind/shared/api/queries';
import { sablonOzeti } from '@grind/shared/lib/sablonOzeti';
import CizgiliBaslik from '../ui/CizgiliBaslik';
import SablonVitrinKarti from '../ui/SablonVitrinKarti';
import SablonMenusu, { type Kutu } from './SablonMenusu';
import SablonKaruseli from './SablonKaruseli';

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
 * gittigi icin #435'in sola itme kisayolu buradan kalkti: duzenle/sil karta basili tutunca acilan
 * menude; basili tutmaya devam edip yana surukleyince kart yer degistirir (`SablonKaruseli`). Sira
 * sunucuda durur, "Tümünü gör" (`/templates`) ekranindaki dikey siralamayla ayni veridir.
 *
 * Basili tutunca kart yerinden kalkip buyur (`SablonMenusu`): acilisin nereden baslayacagi icin
 * kartin ekrandaki yeri olculur; olcum gelmezse menu yine acilir, onizleme ortadan belirir.
 */
export default function SablonlaBasla({ onBasla, bekliyor }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { width: ekranGenisligi } = useWindowDimensions();
  const { data: sablonlar, isLoading, isError } = useTemplates();
  const silme = useDeleteTemplate();
  const siralama = useSablonlariSirala();
  const kartlar = useRef(new Map<number, View | null>());
  const [menu, setMenu] = useState<{ sablon: Sablon; kaynak: Kutu | null } | null>(null);

  const kartGenisligi = Math.min(Math.round(ekranGenisligi * KART_ORANI), EN_GENIS_KART);

  function menuyuAc(sablon: Sablon) {
    setMenu({ sablon, kaynak: null });
    kartlar.current.get(sablon.id)?.measureInWindow((x, y, genislik) => {
      setMenu((acik) => (acik?.sablon.id === sablon.id ? { ...acik, kaynak: { x, y, genislik } } : acik));
    });
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
          <SablonKaruseli
            sablonlar={sablonlar}
            kartGenisligi={kartGenisligi}
            aralik={KART_ARALIGI}
            onBasla={(sablon) => onBasla(sablon.id)}
            onMenuAc={menuyuAc}
            onMenuKapat={() => setMenu(null)}
            onSirala={(yeniSira) => siralama.mutate(yeniSira.map((sablon) => sablon.id))}
            kartCiz={(sablon, dokunus) => (
              <SablonVitrinKarti
                ref={(kart) => {
                  kartlar.current.set(sablon.id, kart);
                }}
                ad={sablon.name}
                ozet={sablonOzeti(sablon)}
                hareketSayisi={sablon.exercises.length}
                genislik={kartGenisligi}
                onBasla={dokunus}
                onMenu={() => menuyuAc(sablon)}
                disabled={bekliyor}
                gizli={menu?.sablon.id === sablon.id}
              />
            )}
          />
        )}
      </View>

      {menu && (
        <SablonMenusu
          sablon={menu.sablon}
          ozet={sablonOzeti(menu.sablon)}
          kartGenisligi={kartGenisligi}
          kaynak={menu.kaynak}
          onKapat={() => setMenu(null)}
          onDuzenle={() => {
            setMenu(null);
            router.push(`/templates/${menu.sablon.id}`);
          }}
          onSil={() => {
            silme.mutate(menu.sablon.id);
            setMenu(null);
          }}
        />
      )}
    </View>
  );
}
