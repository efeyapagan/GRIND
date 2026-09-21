import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useDil, type Dil } from '@grind/shared/i18n';
import {
  useCalendar,
  useGunGecmisi,
  type GecmisOturum,
  type TakvimGunu,
} from '@grind/shared/api/queries';
import { formatAralik, trBugundenOnce } from '@grind/shared/lib/format';
import {
  ayBasligi,
  ayinGunu,
  ayIzgarasi,
  gorunumAraligi,
  gunBasligi,
  haftaGunleri,
  kaydir,
  setKademesi,
  type SetKademesi,
  type TakvimGorunumu,
} from '@grind/shared/lib/takvim';
import IkonDugmesi from '../ui/IkonDugmesi';
import SekmeDugmesi from '../ui/SekmeDugmesi';
import { ikonRenk } from '../ui/renkler';

const GORUNUMLER: { anahtar: TakvimGorunumu; etiket: string; bosMetin: string }[] = [
  { anahtar: 'ay', etiket: 'Aylık', bosMetin: 'Bu ay antrenman yok.' },
  { anahtar: 'hafta', etiket: 'Haftalık', bosMetin: 'Bu hafta antrenman yok.' },
];

const GUN_KISALTMALARI = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

const KADEME_SINIFI: Record<SetKademesi, string> = {
  0: 'bg-surface-2',
  1: 'bg-accent/20',
  2: 'bg-accent/40',
  3: 'bg-accent/60',
  4: 'bg-accent',
};

const KADEME_YAZI: Record<SetKademesi, string> = {
  0: 'text-muted',
  1: 'text-fg',
  2: 'text-fg',
  3: 'text-fg',
  4: 'text-on-accent',
};

function gunOzeti(
  gun: string,
  kayit: TakvimGunu | undefined,
  oturumlar: GecmisOturum[] | undefined,
  gecmisHatali: boolean,
  dil: Dil,
): string {
  if (!kayit) {
    return `${gunBasligi(gun, dil)} · antrenman yok`;
  }
  const setliOturumlar = (oturumlar ?? [])
    .filter((oturum) => oturum.setCount > 0)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  let sablonlar: string;
  if (gecmisHatali || (oturumlar && setliOturumlar.length === 0)) {
    sablonlar = `${kayit.sessionCount} antrenman`;
  } else if (!oturumlar) {
    sablonlar = '…';
  } else {
    sablonlar = setliOturumlar.map((oturum) => oturum.templateName ?? 'Şablonsuz').join(', ');
  }
  return `${gunBasligi(gun, dil)} · ${sablonlar} · ${kayit.setCount} set`;
}

interface Props {
  bugun?: string;
}

/**
 * Ana Sayfa'daki Takvim (#81, #119/#120 ile buraya tasindi): Aylik/Haftalik izgara. CSS Grid'in
 * RN karsiligi yok -- `ayIzgarasi`/`haftaGunleri` zaten HAFTA SATIRLARI dondurdugu icin izgara
 * duz `flex-row` satirlariyla kurulur (web'deki `grid-cols-7` yerine).
 */
export default function Takvim({ bugun = trBugundenOnce(0) }: Props) {
  const dil = useDil();
  const [gorunum, setGorunum] = useState<TakvimGorunumu>('ay');
  const [gosterilen, setGosterilen] = useState(bugun);
  const [secili, setSecili] = useState<string | null>(null);
  const { from, to } = gorunumAraligi(gorunum, gosterilen);
  const { data: ozet, isLoading, isError, isPlaceholderData } = useCalendar(from, to);

  const gunler = new Map((ozet?.days ?? []).map((kayit) => [kayit.date, kayit]));
  const seciliKayit = secili ? gunler.get(secili) : undefined;
  const { data: gunOturumlari, isError: gunGecmisiHatali } = useGunGecmisi(seciliKayit ? secili : null);
  const satirlar = gorunum === 'ay' ? ayIzgarasi(gosterilen) : [haftaGunleri(gosterilen)];
  const sonrakiKapali = gorunumAraligi(gorunum, kaydir(gorunum, gosterilen, 1)).from > bugun;
  const donemBasligi =
    gorunum === 'ay' ? ayBasligi(gosterilen, dil) : formatAralik(`${from}T12:00:00Z`, `${to}T12:00:00Z`, dil);
  const bosMetin = GORUNUMLER.find((aday) => aday.anahtar === gorunum)?.bosMetin;

  function gorunumSec(yeni: TakvimGorunumu) {
    setGorunum(yeni);
    setGosterilen(bugun);
    setSecili(null);
  }

  function gezin(yon: -1 | 1) {
    setGosterilen(kaydir(gorunum, gosterilen, yon));
    setSecili(null);
  }

  return (
    <View className="flex flex-col gap-3">
      <View className="flex-row border-b border-surface-3">
        {GORUNUMLER.map((aday) => (
          <SekmeDugmesi key={aday.anahtar} secili={aday.anahtar === gorunum} onPress={() => gorunumSec(aday.anahtar)}>
            {aday.etiket}
          </SekmeDugmesi>
        ))}
      </View>

      <View className="flex flex-col gap-3">
        <View className="flex-row items-center justify-between gap-2">
          <IkonDugmesi etiket="Önceki" onPress={() => gezin(-1)}>
            <ChevronLeft color={ikonRenk.muted} size={20} />
          </IkonDugmesi>
          <Text className="text-body-lg text-fg">{donemBasligi}</Text>
          <IkonDugmesi etiket="Sonraki" onPress={() => gezin(1)} disabled={sonrakiKapali}>
            <ChevronRight color={ikonRenk.muted} size={20} />
          </IkonDugmesi>
        </View>

        <View className="mx-auto w-full max-w-64 flex-col gap-1">
          <View className="flex-row gap-1">
            {GUN_KISALTMALARI.map((kisaltma) => (
              <Text key={kisaltma} className="flex-1 text-center text-label-xs text-muted uppercase">
                {kisaltma}
              </Text>
            ))}
          </View>
          {satirlar.map((hafta, haftaSira) => (
            <View key={haftaSira} className="flex-row gap-1">
              {hafta.map((gun, sira) => {
                if (gun === null) {
                  return <View key={`bos-${sira}`} className="flex-1 aspect-square" />;
                }
                const kayit = gunler.get(gun);
                const seciliMi = gun === secili;
                const kademe = setKademesi(kayit?.setCount ?? 0);
                const vurguSinifi = seciliMi
                  ? 'ring-2 ring-fg'
                  : gun === bugun
                    ? 'ring-1 ring-muted'
                    : '';
                return (
                  <Pressable
                    key={gun}
                    accessibilityRole="button"
                    accessibilityLabel={`${gunBasligi(gun, dil)}: ${kayit ? `${kayit.setCount} set` : 'antrenman yok'}`}
                    accessibilityState={{ selected: seciliMi }}
                    onPress={() => setSecili(gun)}
                    className={`aspect-square flex-1 items-center justify-center rounded-md ${KADEME_SINIFI[kademe]} ${vurguSinifi}`}
                  >
                    <Text className={`text-label ${KADEME_YAZI[kademe]}`}>{ayinGunu(gun)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <Text className="min-h-5 text-body text-muted">
          {secili ? gunOzeti(secili, seciliKayit, gunOturumlari, gunGecmisiHatali, dil) : ''}
        </Text>

        {isLoading && <Text className="text-body text-muted">Yükleniyor...</Text>}
        {isError && (
          <Text accessibilityRole="alert" className="text-body text-danger">
            Takvim alınamadı.
          </Text>
        )}
        {ozet && !isPlaceholderData && ozet.days.length === 0 && (
          <Text className="text-body text-muted">{bosMetin}</Text>
        )}

        {ozet && (
          <View className="flex-row flex-wrap gap-x-6 gap-y-3">
            <OzetDegeri etiket="Seri" deger={`${ozet.currentWeekStreak} hafta`} />
            <OzetDegeri etiket="Antrenman günü" deger={`${ozet.trainedDayCount} gün`} />
            {ozet.weeklyTargetDays !== null && (
              <>
                <OzetDegeri etiket="Bu hafta" deger={`${ozet.thisWeekTrainedDays} / ${ozet.weeklyTargetDays} gün`} />
                <OzetDegeri etiket="Hedef serisi" deger={`${ozet.currentTargetStreak ?? 0} hafta`} />
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function OzetDegeri({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <View className="flex flex-col gap-1">
      <Text className="text-label text-muted">{etiket}</Text>
      <Text className="text-body-lg text-fg">{deger}</Text>
    </View>
  );
}
