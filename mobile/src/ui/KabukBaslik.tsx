import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { Bell, ChevronLeft, Menu, Search } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useOkunmamisBildirimSayisi, useOpenSession } from '@grind/shared/api/queries';
import { useHeaderTitle } from '@grind/shared/pageTitle';
import { altEkranMi, geriHedefi, profilAnaEkraniMi, sabitGeriHedefi } from '@grind/shared/lib/geriKaydirma';
import { DinlenmeGostergesi } from '../components/DinlenmeKabugu';
import DonemSecici from '../components/DonemSecici';
import YorumDiliSecici from '../components/YorumDiliSecici';
import BarSagUcu from './BarSagUcu';
import CizgiliBaslik from './CizgiliBaslik';
import GrindyMaskot from './GrindyMaskot';
import { ANTRENMAN_BARI_YUKSEKLIGI } from './olculer';
import { useIkonRenk } from './renkler';

/**
 * App.tsx'teki `<header>`in RN karsiligi: solda o an aktif ekranin basligi, sagda "GRIND".
 * Baslik `usePageTitle` ile PageTitleProvider'a bildirilir (@grind/shared/pageTitle) -- her
 * ekran kendi govdesinde ayrica bir baslik yazmaz (web ile ayni tek dogruluk kaynagi).
 *
 * Issue #255: kaydirmaya (#232, `_layout.tsx`daki `GeriKaydirilabilirIcerik`) EK, tutarli bir
 * geri dugmesi -- kok sekmeler ve Profil'in kendi alt sekmeleri DISINDAKI her ekranda (`altEkranMi`).
 * Daha once her alt ekran kendi ad-hoc "ChevronLeft + metin" baglantisini tekrarliyordu.
 *
 * #293 (devami): Profil'in kok ekranlarinda (Gecmis/Rekorlar/Olculer) bu bar TAMAMEN kalkar --
 * `profilAnaEkraniMi` -- yerine yalnizca arama + hesap ayarlari kisayollarini tasiyan ince, kisa bir
 * satir gelir; fotograf ve isim (ProfilBasligi) boylece guvenli alanin hemen altindan baslar.
 *
 * #324: Ana sayfada sagdaki "GRIND" yazisinin yerini bildirim (zil) ve GRINDY kisayollari alir;
 * diger ekranlarda bar degismez.
 *
 * #325: zilde okunmamis sayisi rozeti; sayi yalnizca ana sayfada istenir.
 *
 * #480: "GRIND" yazisinin durdugu her yerde, ACIK ANTRENMAN varken yerini gecen sure alir
 * (`BarSagUcu`) -- kullanici baska bir ekrana gectiginde antrenmaninin surdugunu gorur.
 *
 * #420: tum arkadaslar ekraninda "GRIND"in yerini donem secici (takvim tusu) alir -- #199'un
 * bayragiyla ayni desen.
 *
 * #487: antrenman barinin basligi oturuma gore degisir ("Antrenmana basla" -> "Antrenman") ve
 * barin yuksekligi artik ACIK bir sabittir (`ANTRENMAN_BARI_YUKSEKLIGI`) -- dinlenme sayacinin
 * genis paneli ayni sabitle cizilir ve bari TAM kapatir.
 */
export default function KabukBaslik() {
  const ikonRenk = useIkonRenk();
  const baslik = useHeaderTitle();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const anaSayfa = pathname === '/';
  const yorumlarEkrani = pathname === '/insights';
  const arkadaslarEkrani = pathname === '/arkadaslar';
  const { data: okunmamis = 0 } = useOkunmamisBildirimSayisi(anaSayfa);
  const { data: acikOturum } = useOpenSession();

  function geriGit() {
    // #499: bazi ekranlarin geri hedefi SABITTIR (ör. "Sablon olustur" -> "Antrenmana basla");
    // gecmise bakmak nereden girildigine gore farkli yerlere dusuruyordu.
    const sabit = sabitGeriHedefi(pathname);
    if (sabit) {
      router.replace(sabit as never);
      return;
    }
    const hedef = geriHedefi(pathname, router.canGoBack());
    if (hedef === 'geri') {
      router.back();
    } else if (hedef === 'anaSayfa') {
      router.replace('/');
    }
  }

  // #466 (kullanici karari): antrenman ekraninin KENDI ust bari var -- sayfa basligi yerine alti
  // cizili "Antrenmana basla", saginda "GRIND". Icerikle birlikte kaymaz, tepede sabit durur.
  // Geri tusu yok: bu bir sekme koku. Ayni sekmenin alt ekranlarinda (sablonlar, antrenman-bitir)
  // normal bar ve geri tusu durur.
  if (pathname === '/antrenman') {
    return (
      <View style={{ paddingTop: insets.top }} className="bg-bg">
        <View
          testID="antrenman-bari"
          style={{ height: ANTRENMAN_BARI_YUKSEKLIGI }}
          className="relative flex-row items-center justify-between gap-3 px-4"
        >
          {/* #487: antrenman surerken "Antrenmana basla" yaniltiyordu. Cizginin genisligi
              `CizgiliBaslik` icinde basligin kendi olcusunden geldigi icin metin kisalinca cizgi
              de kendiliginden kisalir -- burada bir genislik verilmez. */}
          {/* #499: baslik EKRANIN bildirdigi baslitir (`usePageTitle`) -- #494'un "Antrenmana basla"
              gorunumunde ekran antrenman ACIKKEN de o basligi bildirir; oturuma bakan eski ternary
              orada "Antrenman" yaziyordu. Baslik henuz bildirilmemisken (ilk cizim) oturuma gore
              makul bir deger kullanilir, bar bir an bos kalmasin. */}
          <CizgiliBaslik>
            {baslik || (acikOturum?.isOpen ? t('kabuk.antrenman') : t('sablonlar.antrenmanaBasla'))}
          </CizgiliBaslik>
          <BarSagUcu />
          <DinlenmeGostergesi />
        </View>
      </View>
    );
  }

  if (profilAnaEkraniMi(pathname)) {
    return (
      <View style={{ paddingTop: insets.top }} className="bg-bg">
        <View className="relative h-10 flex-row items-center justify-end gap-3 px-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('takip.kullaniciAra')}
            onPress={() => router.push('/profile/search')}
            className="size-8 shrink-0 items-center justify-center"
          >
            <Search color={ikonRenk.fg} size={20} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('ortak.hesapAyarlari')}
            onPress={() => router.push('/profile/account')}
            className="size-8 shrink-0 items-center justify-center"
          >
            <Menu color={ikonRenk.fg} size={22} />
          </Pressable>
          {/* EN SON cocuk: ust uste binen kardeslerin (baslik, ikonlar) USTUNDE kalsin -- yoksa
              baslik yazisi gostergenin uzerine cizilir ve dokunusu yakalayabilir. */}
          <DinlenmeGostergesi />
        </View>
      </View>
    );
  }

  return (
    <View style={{ paddingTop: insets.top }} className="bg-bg">
      <View className="relative h-16 flex-row items-center gap-2 px-4">
        {altEkranMi(pathname) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('kabuk.geri')}
            onPress={geriGit}
            className="-ml-2 size-11 shrink-0 items-center justify-center"
          >
            <ChevronLeft color={ikonRenk.fg} size={22} />
          </Pressable>
        )}
        <Text numberOfLines={1} className="flex-1 text-heading text-fg">
          {baslik}
        </Text>
        {anaSayfa ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                okunmamis > 0
                  ? t('bildirimler.zilEtiketi', { count: okunmamis })
                  : t('ortak.bildirimler')
              }
              onPress={() => router.push('/bildirimler')}
              className="size-10 shrink-0 items-center justify-center"
            >
              <Bell color={ikonRenk.fg} size={22} />
              {okunmamis > 0 && (
                <View
                  testID="zil-rozeti"
                  importantForAccessibility="no-hide-descendants"
                  accessibilityElementsHidden
                  className="absolute right-0.5 top-0.5 min-w-4 items-center justify-center rounded-full bg-accent px-1"
                >
                  <Text className="text-label text-on-accent">
                    {okunmamis > 9 ? '9+' : okunmamis}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('kabuk.grindyyeGit')}
              onPress={() => router.push('/insights')}
              className="size-10 shrink-0 items-center justify-center"
            >
              <GrindyMaskot boyut={28} dekoratif />
            </Pressable>
          </>
        ) : yorumlarEkrani ? (
          // #199: GRINDY ekraninda "GRIND" yazisinin yerini yorum dilinin bayragi alir.
          <YorumDiliSecici />
        ) : arkadaslarEkrani ? (
          // #420: tum arkadaslar ekraninda en sagda donem secici (takvim tusu); solda geri tusu.
          <DonemSecici />
        ) : (
          <BarSagUcu />
        )}
        {/* EN SON cocuk: ust uste binen kardeslerin (baslik, GRIND) USTUNDE kalsin -- yoksa baslik
            yazisi gostergenin uzerine cizilir ve dokunusu yakalayabilir. */}
        <DinlenmeGostergesi />
      </View>
    </View>
  );
}
