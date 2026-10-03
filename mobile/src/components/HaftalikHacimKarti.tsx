import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import { useExercises, useWeeklyStats, type HaftalikIstatistik } from '@grind/shared/api/queries';
import { formatAralik, formatFark, formatKisaTarih, formatWeight } from '@grind/shared/lib/format';
import { hacimHaftalari, kiloluHareketler, type HacimAraligi } from '@grind/shared/lib/haftalikIlerleme';
import CamKart from '../ui/CamKart';
import CizgiGrafik from '../ui/CizgiGrafik';
import HareketSecimKutusu from '../ui/HareketSecimKutusu';

const ARALIKLAR = [
  { anahtar: '1a' as HacimAraligi, etiket: 'hareketGecmisi.aralikBirAy' },
  { anahtar: '3a' as HacimAraligi, etiket: 'hareketGecmisi.aralikUcAy' },
  { anahtar: 'tum' as HacimAraligi, etiket: 'hareketGecmisi.aralikTum' },
] as const;

/**
 * #184: tamamlanmis haftalarin toplam hacmi (spec Karar 3). Hareket grafigiyle ayni dil: ustte
 * "Su anki / Fark", altinda cizgi, en altta aralik secici. Devam eden hafta cizilmez.
 *
 * #586: acilista tum hareketlerin toplami (`haftalar`, ekranin tek istegi); basliktan kilolu bir hareket
 * secilince o hareketin haftalari ayrica istenir. Toplam hacim ekrana geri donmek icin "Tum hareketler".
 */
export default function HaftalikHacimKarti({ haftalar }: { haftalar: readonly HaftalikIstatistik[] }) {
  const { t } = useTranslation();
  const dil = useDil();
  const [aralik, setAralik] = useState<HacimAraligi>('3a');
  const [secilenId, setSecilenId] = useState<number | null>(null);
  const { data: egzersizler } = useExercises();
  const { data: hareketHaftalari } = useWeeklyStats(secilenId, secilenId !== null);
  const kilolular = kiloluHareketler(egzersizler ?? []);
  const secilenAd = kilolular.find((e) => e.id === secilenId)?.name ?? t('ilerleme.tumHareketler');
  const gosterilen = secilenId === null ? haftalar : hareketHaftalari;
  const cizilecekler = gosterilen ? hacimHaftalari(gosterilen, aralik) : [];
  const ilk = cizilecekler[0];
  const son = cizilecekler[cizilecekler.length - 1];

  return (
    // #631: yana kayan alanda kisa kart uzun kartin boyuna gerilir (`KaydirmaliKartlar`).
    <CamKart className="flex-col gap-3 p-4" disClassName="flex-1">
      <Text className="text-label text-muted uppercase">{t('ilerleme.hacimBaslik')}</Text>
      <HareketSecimKutusu
        egzersizler={kilolular}
        secilenId={secilenId}
        secilenAd={secilenAd}
        onSec={setSecilenId}
        tumEtiketi={t('ilerleme.tumHareketler')}
      />
      {!gosterilen ? (
        <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>
      ) : cizilecekler.length === 0 ? (
        <Text className="text-body text-muted">
          {t(secilenId === null ? 'ilerleme.tamamlanmisHaftaYok' : 'ilerleme.hareketteHaftaYok')}
        </Text>
      ) : (
        <>
          <View className="flex-row gap-8">
            <View className="flex-col gap-1">
              <Text className="text-label text-muted">{t('hareketGecmisi.suAnki')}</Text>
              <Text className="text-metric text-fg">{formatWeight(son.volume, dil)}</Text>
            </View>
            {cizilecekler.length > 1 && (
              <View className="flex-col gap-1">
                <Text className="text-label text-muted">{t('hareketGecmisi.fark')}</Text>
                <Text className="text-metric text-fg">{formatFark(son.volume - ilk.volume, dil)}</Text>
              </View>
            )}
          </View>
          <Text className="text-label text-muted">
            {formatAralik(`${ilk.weekStart}T12:00:00Z`, `${son.weekStart}T12:00:00Z`, dil)}
          </Text>
          <CizgiGrafik
            noktalar={cizilecekler.map((hafta) => ({
              etiket: formatKisaTarih(`${hafta.weekStart}T12:00:00Z`, dil),
              deger: hafta.volume,
            }))}
            birim="kg"
            baslik={t('hareketGecmisi.grafikBasligi', {
              ad: t('ilerleme.hacimBaslik'),
              ozet: t('ilerleme.hacimOzet'),
              count: cizilecekler.length,
            })}
          />
        </>
      )}
      <View className="flex-row gap-1 rounded-lg bg-surface-2 p-1">
        {ARALIKLAR.map((aday) => {
          const secili = aday.anahtar === aralik;
          return (
            <Pressable
              key={aday.anahtar}
              accessibilityRole="button"
              accessibilityState={{ selected: secili }}
              onPress={() => setAralik(aday.anahtar)}
              className={`min-h-11 flex-1 items-center justify-center rounded-md ${secili ? 'bg-surface-4' : ''}`}
            >
              <Text className={`text-label ${secili ? 'text-fg' : 'text-muted'}`}>{t(aday.etiket)}</Text>
            </Pressable>
          );
        })}
      </View>
    </CamKart>
  );
}
