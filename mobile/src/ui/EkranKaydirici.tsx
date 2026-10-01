import { createContext, forwardRef, useContext, useRef } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { useAltMenuPayi } from './KabukTabBar';
import { useKlavyeYuksekligi } from './useKlavyeYuksekligi';

/**
 * #559 (kullanici karari): bazi icerikler (ornegin HareketSecici'nin asagi acilan oneri listesi)
 * odaklanan TextInput'un KENDISI degil, onun ALTINA mutlak konumlu cizilen bir kardes -- native
 * `automaticallyAdjustKeyboardInsets` yalnizca TextInput'un kendi cercevesini bilir, bu kardesi
 * HIC gormez. Bu baglam, derin bir torunun "beni su kadar asagi kaydir" diyebilmesini saglar;
 * `EkranKaydirici` DISINDA kullanilirsa (ornegin birim testinde) varsayilan deger sessizce hicbir
 * sey yapmaz.
 */
export const EkranKaydiriciBaglami = createContext<{ asagiKaydir: (miktar: number) => void }>({
  asagiKaydir: () => {},
});

/** `EkranKaydiriciBaglami`yi kullanmanin kisa yolu. */
export function useEkranKaydiriciBaglami() {
  return useContext(EkranKaydiriciBaglami);
}

/**
 * Metin alani + en altta gonder dugmesi olan HER ekranin ortak sarmalayicisi (Faz 3 sonrasi
 * simulator dokunma testinde bulundu): sarmalayici olmadan klavye acilinca `mt-auto` ile en alta
 * yaslanan bir form (antrenmanin alt alani, SablonFormu'ndaki Kaydet, vb.) klavyenin ARKASINA kayiyor --
 * gercek bir dokunusla ulasilamaz hale geliyordu. `keyboardShouldPersistTaps="handled"` olmadan
 * da klavye acikken disaridaki ilk dokunus (orn. "Kaydet") sadece klavyeyi kapatiyordu, dugmeye
 * ULASMIYORDU.
 *
 * `KeyboardAvoidingView` BILEREK KULLANILMAZ (issue #145'te bulundu): otomatik "padding"
 * davranisi kendi cercevesini (frame) olcerek gereken bosluk miktarini hesaplar, ama bu ekran
 * bir tab navigator'in icinde oldugu icin bu olcum guvenilmez cikiyordu -- klavye ~300pt
 * olmasina ragmen yalnizca ~100pt (tab bar'in kendi yuksekligine yakin bir deger, tesadufi
 * degil) bosluk aciliyordu, simulator testinde dogrulandi. Bunun yerine klavyenin GERCEK
 * yuksekligi event payload'undan (`endCoordinates.height`) dogrudan okunup ScrollView'in alt
 * dolgusuna (padding) uygulanir -- bu, herhangi bir cerceve olcumune bagli degildir ve HER ZAMAN
 * dogru sayiyi verir.
 *
 * #559 (kullanici bildirdi): varsayilan davranis ("formu listenin sonunda olan ekranlar icin")
 * daha once elle `scrollToEnd` cagirarak her zaman icerigin EN SONUNA kayiyordu -- sablon formunda
 * birden fazla hareket satiri varken ORTADAKI bir satirin "hedef set" alanina dokununca bu, o
 * alani klavyenin UZERINE getirmiyordu (sona kaydirmak, odaklanan alani gorunumden CIKARABILIYORDU).
 * Cozum `scrollToEnd`in yerini `automaticallyAdjustKeyboardInsets` almasidir (iOS 15+,
 * `UIScrollView.keyboardLayoutGuide` ile calisir): ScrollView ODAKLANAN alani -- kac tane input
 * olursa olsun -- otomatik olarak klavyenin ustunde tutar, ayri bir `scrollToEnd`/olcum gerekmez.
 * BU, `KeyboardAvoidingView`in reddedilme sebebiyle (#145, bkz. yukarisi) AYNI SORUNU YASAMAZ:
 * `KeyboardAvoidingView`in "padding" davranisi KENDI cercevesini JS tarafinda (`UIManager.measure`)
 * olcuyordu ve tab navigator icinde bu olcum guvenilmezdi; `automaticallyAdjustKeyboardInsets` ise
 * JS'den hic olcum yapmaz, dogrudan UIKit'in kendi klavye-cakisma geometrisini kullanir.
 *
 * Yalnizca `onKlavyeAcildi` VERILMEMISSE acilir: `onKlavyeAcildi` veren tek ekran (antrenman.tsx)
 * yuzer bir set panelini BU ScrollView'in DISINDA (kardes, mutlak konumlu) tutuyor ve klavye o
 * panelden acildiginda bu listenin KAYMAMASINI istiyor (`kaydirmaYok`) -- ama
 * `automaticallyAdjustKeyboardInsets` ScrollView'in kendi cercevesiyle klavyenin cakismasina
 * bakar, odaklanan alan bu ScrollView'in icinde mi diye AYIRT ETMEZ; acik kalsaydi o ekranda
 * istenmeyen bir kaymaya geri donulurdu. `onKlavyeAcildi` olan tek yerde eski elle `paddingBottom`
 * + `scrollToEnd` (cagirani ne isterse) davranisi AYNEN kalir.
 */
interface Props extends ScrollViewProps {
  /**
   * #274/#559: VERILMEZSE varsayilan davranis devreye girer -- `automaticallyAdjustKeyboardInsets`
   * odaklanan alani otomatik klavyenin ustunde tutar, elle bir sey yapmaya gerek yoktur. Formu
   * listenin DISINDA olan ekran (antrenman: yuzer set paneli, #354) bunun yerine KENDI davranisini
   * verir (`kaydirmaYok` gibi) -- bu durumda native klavye-kaydirmasi KAPANIR (bkz. yukaridaki not),
   * eski elle `paddingBottom` buyutme davranisi gecerli olur; ayni gecikmeli tick'te, klavye
   * yuksekligiyle cagrilir.
   */
  onKlavyeAcildi?: (klavyeYuksekligi: number) => void;
}

const EkranKaydirici = forwardRef<ScrollView, Props>(function EkranKaydirici(
  { contentContainerClassName, children, onKlavyeAcildi, ...props },
  disariAcilanRef,
) {
  const icRef = useRef<ScrollView>(null);
  // `scrollTo` MUTLAK bir y degeri ister; "su kadar asagi kaydir" icin guncel kaydirma
  // konumunu `onScroll`dan takip ederiz (#559).
  const kaydirmaKonumu = useRef(0);
  const altMenuPayi = useAltMenuPayi();
  // #559: onKlavyeAcildi YOKSA varsayilan davranis -- native klavye-kaydirmasi acik, elle
  // scrollToEnd/dolgu buyutme gereksiz.
  const varsayilanDavranis = onKlavyeAcildi === undefined;
  const klavyeYuksekligi = useKlavyeYuksekligi(onKlavyeAcildi);

  function asagiKaydir(miktar: number) {
    const yeni = Math.max(0, kaydirmaKonumu.current + miktar);
    icRef.current?.scrollTo({ y: yeni, animated: true });
  }

  return (
    <EkranKaydiriciBaglami.Provider value={{ asagiKaydir }}>
      <ScrollView
        ref={(instance) => {
          icRef.current = instance;
          if (typeof disariAcilanRef === 'function') {
            disariAcilanRef(instance);
          } else if (disariAcilanRef) {
            disariAcilanRef.current = instance;
          }
        }}
        contentContainerClassName={contentContainerClassName}
        // Alt menu icerigin ustunde yuzer (#338); varsayilan davraniste klavyenin alani native
        // tarafindan ayrilir, burada yalnizca menu payi yeter -- ikisini de eklemek cift bosluk
        // birakirdi. `onKlavyeAcildi` override ederse eski davranis (ikisinden buyugu) aynen kalir.
        contentContainerStyle={{
          paddingBottom: varsayilanDavranis ? altMenuPayi : Math.max(klavyeYuksekligi, altMenuPayi),
        }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={varsayilanDavranis}
        scrollEventThrottle={16}
        onScroll={(olay) => {
          kaydirmaKonumu.current = olay.nativeEvent.contentOffset.y;
        }}
        {...props}
      >
        {children}
      </ScrollView>
    </EkranKaydiriciBaglami.Provider>
  );
});

export default EkranKaydirici;
