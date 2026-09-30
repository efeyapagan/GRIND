import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useDil } from '@grind/shared/i18n';
import type { HaftalikIstatistik } from '@grind/shared/api/queries';
import { formatAralik } from '@grind/shared/lib/format';
import { kasGrubuSatirlari } from '@grind/shared/lib/haftalikIlerleme';
import CamKart from '../ui/CamKart';
import { useIkonRenk } from '../ui/renkler';

/** "YYYY-MM-DD" + n gun, ayni bicimde (UTC ogleni: saat dilimi gunu kaydirmasin). */
function gunEkle(iso: string, gun: number): string {
  const tarih = new Date(`${iso}T12:00:00Z`);
  tarih.setUTCDate(tarih.getUTCDate() + gun);
  return tarih.toISOString().slice(0, 10);
}

/**
 * #184: secili haftanin kas grubuna gore set dagilimi (spec Karar 4). Varsayilan bu hafta (sunucunun son
 * satiri); oklarla ilk haftaya kadar geri gidilir. Cubuk uzunlugu o haftanin en yuksek grubuna oranli,
 * yaninda onceki haftaya fark (esitse yazilmaz). Setsiz haftada tek aciklama.
 */
export default function KasGrubuKarti({ haftalar }: { haftalar: readonly HaftalikIstatistik[] }) {
  const { t } = useTranslation();
  const dil = useDil();
  const ikonRenk = useIkonRenk();
  const sonSira = haftalar.length - 1;
  const [sira, setSira] = useState(sonSira);
  const hafta = haftalar[sira];
  const satirlar = kasGrubuSatirlari(haftalar, sira);
  const enCok = Math.max(...satirlar.map((s) => s.set));
  const baslik =
    sira === sonSira
      ? t('ilerleme.buHafta')
      : formatAralik(`${hafta.weekStart}T12:00:00Z`, `${gunEkle(hafta.weekStart, 6)}T12:00:00Z`, dil);

  return (
    <CamKart className="flex-col gap-3 p-4">
      <Text className="text-label text-muted uppercase">{t('ilerleme.kasGrubuBaslik')}</Text>
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ilerleme.oncekiHafta')}
          accessibilityState={{ disabled: sira === 0 }}
          disabled={sira === 0}
          onPress={() => setSira(sira - 1)}
          className={`size-11 items-center justify-center ${sira === 0 ? 'opacity-40' : ''}`}
        >
          <ChevronLeft color={ikonRenk.fg} size={20} />
        </Pressable>
        <Text className="text-body text-fg">{baslik}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ilerleme.sonrakiHafta')}
          accessibilityState={{ disabled: sira === sonSira }}
          disabled={sira === sonSira}
          onPress={() => setSira(sira + 1)}
          className={`size-11 items-center justify-center ${sira === sonSira ? 'opacity-40' : ''}`}
        >
          <ChevronRight color={ikonRenk.fg} size={20} />
        </Pressable>
      </View>
      {enCok === 0 ? (
        <Text className="text-body text-muted">{t('ilerleme.haftadaAntrenmanYok')}</Text>
      ) : (
        satirlar.map(({ kategori, set, fark }) => (
          <View
            key={kategori}
            accessible
            accessibilityLabel={t('ilerleme.kasGrubuSatiri', { grup: t(`antrenman.kategori.${kategori}`), count: set })}
            className="flex-row items-center gap-3"
          >
            <Text className="w-14 text-label text-muted">{t(`antrenman.kategori.${kategori}`)}</Text>
            <View className="h-3 flex-1 overflow-hidden rounded-full bg-surface-3">
              <View className="h-full rounded-full bg-accent" style={{ width: `${(set / enCok) * 100}%` }} />
            </View>
            <Text className="w-8 text-right text-body text-fg">{set}</Text>
            <Text className="w-8 text-right text-label-xs text-muted">
              {fark === null || fark === 0 ? '' : fark > 0 ? `+${fark}` : `−${Math.abs(fark)}`}
            </Text>
          </View>
        ))
      )}
    </CamKart>
  );
}
