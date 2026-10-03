import { useState } from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { Plus, Scale } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useDil } from "@grind/shared/i18n";
import {
  useAddMeasurement,
  useDeleteMeasurement,
  useInfiniteMeasurements,
  useUpdateMeasurement,
  type Olcu,
} from "@grind/shared/api/queries";
import { apiHatasiniAyir } from "@grind/shared/lib/apiErrors";
import {
  ayniTrGunuMu,
  formatSaat,
  formatTarih,
} from "@grind/shared/lib/format";
import { usePageTitle } from "@grind/shared/pageTitle";
import Modal from "../../../src/ui/Modal";
import SayiAlani from "../../../src/ui/SayiAlani";
import BirincilDugme from "../../../src/ui/BirincilDugme";
import IkincilDugme from "../../../src/ui/IkincilDugme";
import BosDurum from "../../../src/ui/BosDurum";
import CamKart from "../../../src/ui/CamKart";
import HataKutusu from "../../../src/ui/HataKutusu";
import { useIkonRenk } from '../../../src/ui/renkler';
import OlcuMenusu from "../../../src/components/OlcuMenusu";
import CevrimdisiKapisi from "../../../src/baglanti/CevrimdisiKapisi";
import { useAltMenuPayi } from "../../../src/ui/KabukTabBar";

const BILINEN_ALANLAR = [
  "weight",
  "heightCm",
  "bodyFatPercent",
  "waistCm",
  "hipCm",
] as const;

interface OlcumGovdesi {
  weight: number;
  heightCm: number;
  bodyFatPercent?: number;
  waistCm?: number;
  hipCm?: number;
}

/**
 * web/src/pages/MeasurementsPage.tsx ile ayni (issue #119, kullanici karariyla revize).
 * Sayfalama Onceki/Sonraki dugmeleri yerine SONSUZ KAYDIRMA'dir (issue #147, Gecmis'in #142'siyle
 * ayni desen): `FlatList`in `onEndReached`i listenin sonuna gelinince bir sonraki 25'lik sayfayi
 * ceker.
 *
 * #293: Profil'in kendi sekmelerinde ust basliktaki metin tamamen kalkti -- `usePageTitle('')`
 * onceki basligi temizler.
 *
 * #260: ayni gun icin FARKLI degerli ikinci bir olcum girilmeye calisilinca (ayni pencere icinde)
 * bir soru gosterilir -- web/src/pages/MeasurementsPage.tsx'teki ayni gerekce (bkz. oradaki uzun
 * yorum). TAM AYNI boy+kiloyla ikinci giris (issue #119) bu sorunun DISINDA kalir, sunucu hala sert
 * 409 doner.
 */
/** #174: cevrimdisiyken bu bolum onbellekten gosterilmez -- icerik baglanmaz, uyari cizilir. */
export default function MeasurementsScreen() {
  usePageTitle("");
  return (
    <CevrimdisiKapisi>
      <MeasurementsIcerigi />
    </CevrimdisiKapisi>
  );
}

function MeasurementsIcerigi() {
  const { t } = useTranslation();
  const dil = useDil();
  const ikonRenk = useIkonRenk();
  const altMenuPayi = useAltMenuPayi();
  usePageTitle("");
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteMeasurements();
  const ekleMutasyonu = useAddMeasurement();
  const guncelleMutasyonu = useUpdateMeasurement();
  const silMutasyonu = useDeleteMeasurement();

  const [modalAcik, setModalAcik] = useState(false);
  const [kilo, setKilo] = useState("");
  const [boy, setBoy] = useState("");
  const [yagOrani, setYagOrani] = useState("");
  const [belCevresi, setBelCevresi] = useState("");
  const [kalcaCevresi, setKalcaCevresi] = useState("");
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});
  const [menuOlcu, setMenuOlcu] = useState<Olcu | null>(null);
  const [duzenlenenId, setDuzenlenenId] = useState<number | null>(null);
  const [cakisma, setCakisma] = useState<{
    govde: OlcumGovdesi;
    hedefId: number;
  } | null>(null);
  const [cakismaHata, setCakismaHata] = useState<string | null>(null);

  function formuSifirla() {
    setKilo("");
    setBoy("");
    setYagOrani("");
    setBelCevresi("");
    setKalcaCevresi("");
    setGenelHata(null);
    setAlanHatalari({});
    setCakisma(null);
    setCakismaHata(null);
    setDuzenlenenId(null);
  }

  function penceresiniAc() {
    formuSifirla();
    setModalAcik(true);
  }

  /** #623: menuden Duzenle -- form olcunun mevcut degerleriyle acilir. */
  function duzenlemeyiAc(olcu: Olcu) {
    formuSifirla();
    const metin = (deger: number | null) =>
      deger === null ? "" : String(deger);
    setKilo(metin(olcu.weight));
    setBoy(metin(olcu.heightCm));
    setYagOrani(metin(olcu.bodyFatPercent));
    setBelCevresi(metin(olcu.waistCm));
    setKalcaCevresi(metin(olcu.hipCm));
    setDuzenlenenId(olcu.id);
    setMenuOlcu(null);
    setModalAcik(true);
  }

  function sayiyaCevir(deger: string): number | undefined {
    return deger.trim() === "" ? undefined : Number(deger.replace(",", "."));
  }

  function gonder() {
    setGenelHata(null);
    setAlanHatalari({});

    const govde = {
      weight: sayiyaCevir(kilo),
      heightCm: sayiyaCevir(boy),
      bodyFatPercent: sayiyaCevir(yagOrani),
      waistCm: sayiyaCevir(belCevresi),
      hipCm: sayiyaCevir(kalcaCevresi),
    };

    const hatalar: Record<string, string> = {};
    if (govde.weight === undefined) hatalar.weight = "Kilo gerekli.";
    if (govde.heightCm === undefined) hatalar.heightCm = "Boy gerekli.";
    if (Object.keys(hatalar).length > 0) {
      setAlanHatalari(hatalar);
      return;
    }

    const doluGovde: OlcumGovdesi = {
      ...govde,
      weight: govde.weight!,
      heightCm: govde.heightCm!,
    };

    // #623: duzenlemede cakisma sorusu yok -- ayni kayit PATCH ile guncellenir.
    if (duzenlenenId !== null) {
      guncelleMutasyonu.mutate(
        { id: duzenlenenId, ...doluGovde },
        {
          onSuccess: () => {
            formuSifirla();
            setModalAcik(false);
          },
          onError: (hata) => {
            const ayrilmis = apiHatasiniAyir(hata, BILINEN_ALANLAR);
            setGenelHata(ayrilmis.genelHata);
            setAlanHatalari(ayrilmis.alanHatalari);
          },
        },
      );
      return;
    }

    // #260: bugunun (TR gunu) olculeri arasinda TAM AYNI boy+kiloyla bir kayit varsa (issue #119)
    // soru sorulmaz -- dogrudan gonderilir, sunucu hala sert 409 doner (davranis degismedi).
    const suAn = new Date().toISOString();
    const bugununOlculeri = tumOlculer.filter((olcu) =>
      ayniTrGunuMu(olcu.recordedAt, suAn),
    );
    const tamAyniVarMi = bugununOlculeri.some(
      (olcu) =>
        olcu.weight === doluGovde.weight &&
        olcu.heightCm === doluGovde.heightCm,
    );
    if (bugununOlculeri.length > 0 && !tamAyniVarMi) {
      // Liste yeniden eskiye sirali -- ilk oge gunun EN SON olcumu.
      setCakisma({ govde: doluGovde, hedefId: bugununOlculeri[0].id });
      return;
    }

    ekleMutasyonu.mutate(doluGovde, {
      onSuccess: () => {
        formuSifirla();
        setModalAcik(false);
      },
      onError: (hata) => {
        const ayrilmis = apiHatasiniAyir(hata, BILINEN_ALANLAR);
        setGenelHata(ayrilmis.genelHata);
        setAlanHatalari(ayrilmis.alanHatalari);
      },
    });
  }

  function yerineKaydet() {
    if (!cakisma) {
      return;
    }
    setCakismaHata(null);
    guncelleMutasyonu.mutate(
      { id: cakisma.hedefId, ...cakisma.govde },
      {
        onSuccess: () => {
          formuSifirla();
          setModalAcik(false);
        },
        onError: (hata) => setCakismaHata(apiHatasiniAyir(hata, []).genelHata),
      },
    );
  }

  function ekstraOlcumEkle() {
    if (!cakisma) {
      return;
    }
    setCakismaHata(null);
    ekleMutasyonu.mutate(cakisma.govde, {
      onSuccess: () => {
        formuSifirla();
        setModalAcik(false);
      },
      onError: (hata) => setCakismaHata(apiHatasiniAyir(hata, []).genelHata),
    });
  }

  const tumOlculer = data?.pages.flatMap((sayfa) => sayfa.items) ?? [];

  return (
    <>
      <FlatList
        testID="olcu-liste"
        data={tumOlculer}
        keyExtractor={(olcu) => String(olcu.id)}
        renderItem={({ item }) => (
          <OlcuKarti olcu={item} onMenu={() => setMenuOlcu(item)} />
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerClassName="px-4 pt-2"
        contentContainerStyle={{ paddingBottom: altMenuPayi }}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        }}
        ListHeaderComponent={
          <View className="mb-5 flex-col gap-5">
            <BirincilDugme onPress={penceresiniAc} yukseklik="normal">
              <Plus color={ikonRenk.onAccent} size={20} />
              <Text className="text-body-lg font-bold text-on-accent">
                {t("olcumler.yeniOlcumEkle")}
              </Text>
            </BirincilDugme>

            <Modal
              acik={modalAcik}
              onKapat={() => setModalAcik(false)}
              baslik={t(
                cakisma
                  ? "olcumler.cakismaBaslik"
                  : duzenlenenId !== null
                    ? "olcumler.olcuyuDuzenle"
                    : "olcumler.yeniOlcum",
              )}
            >
              {cakisma ? (
                // #260: ayni gun icin farkli degerli ikinci olcum -- form BILEREK arkada kalir
                // (deger kaybolmaz), "Vazgeç" yalnizca bu soruyu kapatir, pencereyi degil.
                <View className="flex-col gap-3">
                  {cakismaHata && (
                    <HataKutusu
                      baslik={t("olcumler.kaydedilemedi")}
                      mesaj={cakismaHata}
                    />
                  )}
                  <BirincilDugme
                    yukseklik="normal"
                    onPress={yerineKaydet}
                    disabled={
                      guncelleMutasyonu.isPending || ekleMutasyonu.isPending
                    }
                  >
                    {t("olcumler.cakismaYerineKaydet")}
                  </BirincilDugme>
                  <IkincilDugme
                    onPress={ekstraOlcumEkle}
                    disabled={
                      guncelleMutasyonu.isPending || ekleMutasyonu.isPending
                    }
                  >
                    {t("olcumler.cakismaEkstraOlcum")}
                  </IkincilDugme>
                  <IkincilDugme onPress={() => setCakisma(null)}>
                    {t("ortak.vazgec")}
                  </IkincilDugme>
                </View>
              ) : (
                <View className="flex-col gap-4">
                  <View className="flex-row flex-wrap gap-2">
                    <View style={{ width: "48%" }}>
                      <SayiAlani
                        id="olcu-boy"
                        etiket={t("olcumler.boy")}
                        birim="cm"
                        inputMode="decimal"
                        placeholder="—"
                        value={boy}
                        onChange={setBoy}
                        hata={alanHatalari.heightCm}
                      />
                    </View>
                    <View style={{ width: "48%" }}>
                      <SayiAlani
                        id="olcu-kilo"
                        etiket={t("olcumler.kilo")}
                        birim="kg"
                        inputMode="decimal"
                        placeholder="—"
                        value={kilo}
                        onChange={setKilo}
                        hata={alanHatalari.weight}
                      />
                    </View>
                    <View style={{ width: "48%" }}>
                      <SayiAlani
                        id="olcu-yag-orani"
                        etiket={t("olcumler.yagOrani")}
                        birim="%"
                        inputMode="decimal"
                        placeholder="—"
                        value={yagOrani}
                        onChange={setYagOrani}
                        hata={alanHatalari.bodyFatPercent}
                      />
                    </View>
                    <View style={{ width: "48%" }}>
                      <SayiAlani
                        id="olcu-bel-cevresi"
                        etiket={t("olcumler.belCevresi")}
                        birim="cm"
                        inputMode="decimal"
                        placeholder="—"
                        value={belCevresi}
                        onChange={setBelCevresi}
                        hata={alanHatalari.waistCm}
                      />
                    </View>
                    <View style={{ width: "48%" }}>
                      <SayiAlani
                        id="olcu-kalca-cevresi"
                        etiket={t("olcumler.kalcaCevresi")}
                        birim="cm"
                        inputMode="decimal"
                        placeholder="—"
                        value={kalcaCevresi}
                        onChange={setKalcaCevresi}
                        hata={alanHatalari.hipCm}
                      />
                    </View>
                  </View>
                  <Text className="text-label text-muted">
                    {t("olcumler.zorunluAciklama")}
                  </Text>
                  {genelHata && (
                    <HataKutusu
                      baslik={t("olcumler.kaydedilemedi")}
                      mesaj={genelHata}
                    />
                  )}
                  <BirincilDugme
                    yukseklik="normal"
                    disabled={
                      ekleMutasyonu.isPending || guncelleMutasyonu.isPending
                    }
                    onPress={gonder}
                  >
                    {t("ortak.kaydet")}
                  </BirincilDugme>
                </View>
              )}
            </Modal>

            {isLoading && (
              <Text className="text-body text-muted">
                {t("ortak.yukleniyor")}
              </Text>
            )}

            {isError && (
              <Text accessibilityRole="alert" className="text-body text-danger">
                {t("olcumler.hata")}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          !isLoading && !isError && data ? (
            <BosDurum
              ikon={Scale}
              baslik={t("olcumler.bosBaslik")}
              aciklama={t("olcumler.bosAciklama")}
            />
          ) : null
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <Text className="text-body text-muted">
              {t("ortak.yukleniyor")}
            </Text>
          ) : null
        }
      />
      {menuOlcu && (
        <OlcuMenusu
          ozet={`${formatTarih(menuOlcu.recordedAt, dil)} ${formatSaat(menuOlcu.recordedAt)} · ${olcuMetni(menuOlcu, t)}`}
          onKapat={() => setMenuOlcu(null)}
          onDuzenle={() => duzenlemeyiAc(menuOlcu)}
          onSil={() => {
            silMutasyonu.mutate(menuOlcu.id);
            setMenuOlcu(null);
          }}
        />
      )}
    </>
  );
}

/** Sadece DOLU olan olculeri virgulle ayirarak yazar -- web/MeasurementsPage.tsx ile ayni. */
function olcuMetni(olcu: Olcu, t: TFunction): string {
  const parcalar: string[] = [];
  if (olcu.weight !== null) parcalar.push(`${olcu.weight} kg`);
  if (olcu.heightCm !== null)
    parcalar.push(t("olcumler.boyDegeri", { cm: olcu.heightCm }));
  if (olcu.bodyFatPercent !== null)
    parcalar.push(t("olcumler.yagDegeri", { yuzde: olcu.bodyFatPercent }));
  if (olcu.waistCm !== null)
    parcalar.push(t("olcumler.belDegeri", { cm: olcu.waistCm }));
  if (olcu.hipCm !== null)
    parcalar.push(t("olcumler.kalcaDegeri", { cm: olcu.hipCm }));
  return parcalar.join(", ");
}

interface OlcuKartiProps {
  olcu: Olcu;
  onMenu: () => void;
}

/** #623: silme/duzenleme kartta gorunur bir ikonla degil, basili tutunca acilan menuden (`OlcuMenusu`). */
function OlcuKarti({ olcu, onMenu }: OlcuKartiProps) {
  const { t } = useTranslation();
  const dil = useDil();

  return (
    // #591: cam kart (spec Karar 9).
    <Pressable
      accessibilityHint={t("olcumler.olcuIpucu")}
      accessibilityActions={[{ name: "longpress" }]}
      onAccessibilityAction={(olay) =>
        olay.nativeEvent.actionName === "longpress" && onMenu()
      }
      onLongPress={onMenu}
    >
      <CamKart className="flex-col gap-1 p-4">
        <Text className="text-label text-muted">
          {formatTarih(olcu.recordedAt, dil)} {formatSaat(olcu.recordedAt)}
        </Text>
        <Text className="text-body text-fg">{olcuMetni(olcu, t)}</Text>
      </CamKart>
    </Pressable>
  );
}
