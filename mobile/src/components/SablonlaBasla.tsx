import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link, useRouter } from 'expo-router';
import { useTemplates, useDeleteTemplate, useSablonlariSirala } from '@grind/shared/api/queries';
import { sablonOzeti } from '@grind/shared/lib/sablonOzeti';
import { sablonlariAyir } from '@grind/shared/lib/kaydedilenSablonlar';
import SablonVitrinKarti, { KART_ARALIGI, useVitrinKartGenisligi } from '../ui/SablonVitrinKarti';
import SablonMenusu from './SablonMenusu';
import SablonKaruseli from './SablonKaruseli';
import KaydedilenSablonKaruseli from './KaydedilenSablonKaruseli';
import { useSablonMenusu } from './useSablonMenusu';

interface Props {
  onBasla: (templateId: number) => void;
  bekliyor: boolean;
}

/**
 * Web donduruldugu icin (#326) artik yalnizca mobil: web/src/components/SablonlaBasla.tsx eski
 * halinde kaldi.
 *
 * #439: sablonlar yana kayan, bir karta oturan cam kartlardir. Yatay kaydirma liste gezintisine
 * gittigi icin #435'in sola itme kisayolu buradan kalkti: duzenle/sil karta basili tutunca acilan
 * menude; basili tutmaya devam edip yana surukleyince kart yer degistirir (`SablonKaruseli`). Sira
 * sunucuda durur, "Tümünü gör" (`/templates`) ekranindaki dikey siralamayla ayni veridir.
 *
 * #538: kaydedilenler de yana kayan, yarim yukseklikte kartlardir; "Duzenle"leri kendi ekranlarina
 * (`/templates/saved`) gider, sira sabitleme + son kullanimdir (`sablonlariAyir`).
 *
 * Basili tutunca kart yerinden kalkip buyur (`SablonMenusu`): acilisin nereden baslayacagi icin
 * kartin ekrandaki yeri olculur; olcum gelmezse menu yine acilir, onizleme ortadan belirir.
 */
export default function SablonlaBasla({ onBasla, bekliyor }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const kartGenisligi = useVitrinKartGenisligi();
  const { data: sablonlar, isLoading, isError } = useTemplates();
  const silme = useDeleteTemplate();
  const siralama = useSablonlariSirala();
  const { menu, menuyuAc, menuyuKapat, kartRef } = useSablonMenusu();

  const { kendi: kendiSablonlari, kaydedilen: kaydedilenSablonlar } = sablonlariAyir(sablonlar ?? []);

  return (
    <View className="flex-col gap-5">
      <View className="flex-col gap-3">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-heading text-fg">{t('sablonlar.sablonlarim')}</Text>
          {kendiSablonlari.length > 0 && (
            // RN'de Text rengi miras ALINMAZ: `Link`e verilen renk metne gecmez, metin ayri bir Text.
            <Link href="/templates" className="min-h-11 justify-center">
              <Text className="text-label text-accent-soft">{t('sablonlar.duzenleListe')}</Text>
            </Link>
          )}
        </View>

        {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}
        {isError && (
          <Text accessibilityRole="alert" className="text-body text-danger">
            {t('sablonlar.hata')}
          </Text>
        )}
        {sablonlar && kendiSablonlari.length === 0 && <Text className="text-body text-muted">{t('sablonlar.hicSablonYok')}</Text>}

        {kendiSablonlari.length > 0 && (
          <SablonKaruseli
            sablonlar={kendiSablonlari}
            kartGenisligi={kartGenisligi}
            aralik={KART_ARALIGI}
            onBasla={(sablon) => onBasla(sablon.id)}
            onMenuAc={menuyuAc}
            onMenuKapat={menuyuKapat}
            onSirala={(yeniSira) =>
              // #467: backend `ReorderAsync` kullanicinin TUM sablonlarinin (kendi + kaydedilen) id
              // kumesini birebir bekler; yalnizca karuseldeki kendi sablonlari gonderilirse 400 doner.
              siralama.mutate([
                ...yeniSira.map((sablon) => sablon.id),
                ...kaydedilenSablonlar.map((sablon) => sablon.id),
              ])
            }
            kartCiz={(sablon, dokunus, figurCanli) => (
              <SablonVitrinKarti
                ref={kartRef(sablon.id)}
                ad={sablon.name}
                ozet={sablonOzeti(sablon)}
                hareketSayisi={sablon.exercises.length}
                genislik={kartGenisligi}
                onBasla={dokunus}
                onMenu={() => menuyuAc(sablon)}
                disabled={bekliyor}
                gizli={menu?.sablon.id === sablon.id}
                lastUsedAt={sablon.lastUsedAt}
                figurCanli={figurCanli}
              />
            )}
          />
        )}
      </View>

      {kaydedilenSablonlar.length > 0 && (
        <View className="flex-col gap-3">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-heading text-fg">{t('sablonlar.kaydedilenlerBasligi')}</Text>
            <Link href="/templates/saved" className="min-h-11 justify-center">
              <Text className="text-label text-accent-soft">{t('sablonlar.duzenleListe')}</Text>
            </Link>
          </View>
          <KaydedilenSablonKaruseli
            sablonlar={kaydedilenSablonlar}
            kartGenisligi={kartGenisligi}
            aralik={KART_ARALIGI}
            onKart={(sablon) => onBasla(sablon.id)}
            onMenu={menuyuAc}
            kartRef={kartRef}
            disabled={bekliyor}
          />
        </View>
      )}

      {menu && (
        <SablonMenusu
          sablon={menu.sablon}
          ozet={sablonOzeti(menu.sablon)}
          kartGenisligi={kartGenisligi}
          kaynak={menu.kaynak}
          onKapat={menuyuKapat}
          onDuzenle={() => {
            menuyuKapat();
            router.push(`/templates/${menu.sablon.id}`);
          }}
          onSil={() => {
            silme.mutate(menu.sablon.id);
            menuyuKapat();
          }}
        />
      )}
    </View>
  );
}
