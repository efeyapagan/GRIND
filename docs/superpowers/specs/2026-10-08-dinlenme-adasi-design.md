# Dinlenme sayacı — Dynamic Island (#414)

Tarih: 2026-10-08. Kapsam: yalnızca `mobile/`, iOS. Bu belge dilim 1'i (ada) anlatır; sesli bildirim ve
Android aynı issue'nun sonraki dilimleridir.

## Sorun

Dinlenme sayacı arka planda doğru sayıyor (bitiş anı mutlak zaman) ama kullanıcı başka bir uygulamadayken
kalan süreyi de bittiğini de göremiyor.

## Kararlar

1. **Push yok, sunucu yok (kullanıcı kararı).** Ada, uygulamanın başlattığı yerel bir Live Activity'dir.
   Uygulama arka planda uyurken adayı güncelleyemez; bu yüzden değişen her şeyi SİSTEM çizer:
   - kalan süre: `Text timerInterval` (biçim `d:ss` — saf saniye sistemde yok, kullanıcı kabul etti);
   - bitiş: `staleDate` = bitiş anı; `isStale` olunca süre kalkar, yalnızca saat ikonu kalır. Sistem bu
     yeniden çizimi bitişten birkaç saniye sonra yapar; o arada `0:00` görünür.
2. **Yerleşim.** Kompakt: solda saat ikonu, sağda süre. Müzik çalarken ada ikiye bölünür ve sayaç küçük
   daireye (`minimal`) düşer: dolan halka + ortasında süre. Çubuk yok (sığmıyor), zıplama yok (sistem
   adadaki animasyonu kısıtlıyor). Geri sayan metin kendisine verilen tüm genişliği kaplar — genişliği
   `frame` ile sabitlenir, yoksa ada ekranı boydan boya kaplar.
3. **Yaşam döngüsü** (`useDinlenmeAdasi`): sayaç sürerken açık, süre değişince güncellenir; sayaç temizlenince
   ya da duraklatılınca kapanır. Süre dolunca KAPATILMAZ (ikon kalsın); sayaç temizlenince kapanır.
4. **Arka planda dolan sayaç bekler.** `DinlenmeKabugu`'ndaki "antrenman ekranındayken dolduysa 7 sn sonra
   kalkar" kuralı uygulama arka plandayken geçerli değildir: kullanıcı işareti görmemiştir. İşaret (ve ada)
   uygulamaya dönülünce kalkar.
5. **Expo Go bozulmaz.** `expo-widgets` Expo Go'da yok; ada modülü şartlı yüklenir
   (`Constants.executionEnvironment`), Expo Go'da ve Android'de sayaç adasız çalışır. Günlük geliştirme
   Expo Go ile sürer; ada yalnızca kendi build'imizde görünür.

## Dilim 2 — sesli bildirim

Ada sessizdir; müzik dinlerken ekrana bakmayan kullanıcı bitişi kaçırır. Çözüm push DEĞİL, telefonun kendi
kurduğu yerel bildirimdir (`mobile/src/bildirim/dinlenmeSesi.ts`, `expo-notifications`):

- **Yalnızca ses.** Bildirim başlık/metin taşımaz ve izin yalnızca ses için istenir (`allowAlert: false`):
  ekranda bildirim kutusu çıkmaz. Titreşimi iOS, sesle birlikte telefonun kendi ayarına göre verir.
- **Opsiyonel, varsayılan KAPALI (kullanıcı kararı).** Hesap ayarları → "Sesli bildirim". Tercih cihazda
  durur (`grind.dinlenmeSesi`); bildirim izni yalnızca özelliği açana sorulur. İzin verilmezse tercih kapalı
  kalır ve izni telefon ayarlarından açmak gerektiği yazılır.
- **Sayaçla birlikte yaşar.** Sayaç başlayınca bitiş anına kurulur; süre değişince taşınır; sayaç
  temizlenince, duraklatılınca ya da dolunca iptal edilir.
- **Uygulama açıkken susar** (`setNotificationHandler`): bugünkü uygulama içi bip çalar ve bu tercihten
  bağımsızdır.
- **Ses dosyası.** Kendi build'imizde uygulamanın zil sesi (`assets/sounds/dinlenme-bitti.wav`,
  expo-notifications `sounds`); Expo Go'da sistemin varsayılan bildirim sesi.
- `expo-notifications` da push yetkisi ekler; `withGrindIos` onu da siler (bu yüzden `plugins` dizisinde
  ikisinden de ÖNCE durur).
- Şimdilik yalnızca iOS; Android'in üst panel sayacı dilim 3.

## Kendi iOS build'imiz

`mobile/ios/` üretilir ve repoda durmaz (`.gitignore`). Kurulum:

```bash
cd mobile
# Ucretsiz Apple hesabinda kimlik hesaba ozgu olmali; mobile/.env.local (repoya girmez):
#   GRIND_IOS_BUNDLE_ID=com.<ad>.grind
#   GRIND_APPLE_TEAM_ID=<Xcode > Settings > Accounts'taki takim kimligi>
npx expo prebuild -p ios
npx expo run:ios            # simulator
npx expo run:ios --device   # telefon (kablo, Gelistirici Modu acik)
```

`expo prebuild` `package.json`'daki `ios`/`android` script'lerini `expo run:*`'a çevirir; bu değişiklik
commit edilmez (Expo Go akışı `expo start` ile sürer).

`plugins/withGrindIos.js` iki proje düzeltmesi yapar:
- **iOS 27 açılışı.** iOS 27, scene yaşam döngüsünü benimsemeyen uygulamayı açılışta durdurur (siyah ekran).
  Expo bunun için `ExpoAppSceneDelegate`'i sunuyor ama proje şablonu (57.0.29 dahil) henüz bağlamıyor; plugin
  bağlar. Şablon kendisi bağlamaya başlayınca plugin prebuild'i açık bir hatayla durdurur — o gün bu kısım silinir.
- **Push yetkisi.** `expo-widgets` ayar ne olursa olsun `aps-environment` ekler; ücretsiz hesap bu yetkiyle
  imzalamayı reddeder. Plugin siler. Bu yüzden `plugins` dizisinde `expo-widgets`'ten ÖNCE yazılır (mod'lar
  ters sırada koşar).

Bilinenler:
- Ücretsiz hesap ada uzantısına ve ortak alana (App Group) izin veriyor; kurulum 7 gün geçerli.
- İlk cihaz derlemesinde anahtar zinciri onayı Xcode'dan verilir (Run → "Her Zaman İzin Ver"); sonrası komut
  satırından çalışır.
- Geliştirme sürümü kodu Mac'ten Wi‑Fi ile çeker ve Mac'in adresi derleme anında içine yazılır. Cihazların
  birbirini görmediği ağlarda (ör. eduroam) Mac telefonun kişisel erişim noktasına bağlanır ve yeniden derlenir.

## Doğrulama durumu

Simülatörde (iPhone 17 Pro, iOS 26.5) görüldü: kompakt görünüm, geri sayım, bitişte ikonun kalması, uygulamaya
dönünce kapanma, Expo Go'da uygulamanın açılması. Dilim 2: tercih açılınca izin sorusu, bitiş anında yerel bildirimin tetiklenmesi (sistem kaydı) ve ekranda kutu çıkmaması görüldü; zilin SESİ simülatörden dinlenemedi.
**Görülmedi:** müzikle küçük daire, kilit ekranı görünümü,
iOS 27'li telefonda açılış (düzeltme çökme kaydına göre yazıldı).
