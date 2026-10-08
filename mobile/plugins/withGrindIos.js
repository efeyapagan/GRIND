const { withAppDelegate, withEntitlementsPlist, withInfoPlist } = require('expo/config-plugins');

/**
 * #414: kendi iOS build'imizin (Dynamic Island icin Expo Go yetmiyor) iki proje duzeltmesi. `ios/` klasoru
 * uretilir ve repoda durmaz; duzeltmeler burada yasar ki her `expo prebuild` ayni sonucu versin.
 *
 * 1. iOS 27, scene yasam dongusunu benimsemeyen uygulamayi acilista durdurur (siyah ekran). Expo bunun icin
 *    `ExpoAppSceneDelegate`i sunar ama proje sablonu henuz onu baglamiyor: Info.plist'e sahne tanimi eklenir,
 *    AppDelegate pencereyi kendisi kurmayi birakir. Sablon bunu kendisi yapmaya baslayinca bu kisim silinir --
 *    asagidaki kontroller o gun prebuild'i ACIK bir hatayla durdurur.
 * 2. `expo-widgets`, ayar ne olursa olsun push yetkisi (`aps-environment`) ekler. Push kullanmiyoruz ve ucretsiz
 *    Apple hesabi bu yetkiyle imzalamayi reddeder.
 *
 * Bu plugin `plugins` dizisinde `expo-widgets`ten ONCE yazilir: mod'lar ters sirada kosar, yetki ancak boyle
 * `expo-widgets` ekledikten SONRA silinir.
 */
const PENCERE_KURULUMU = /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n\s*withModuleName: "main",\n\s*in: window,\n\s*launchOptions: launchOptions\)\n#endif\n/;
const SINIF = 'class AppDelegate: ExpoAppDelegate {';

function withSahne(config) {
  config = withInfoPlist(config, (mod) => {
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          { UISceneConfigurationName: 'Default', UISceneDelegateClassName: 'EXExpoAppSceneDelegate' },
        ],
      },
    };
    return mod;
  });

  return withAppDelegate(config, (mod) => {
    const kaynak = mod.modResults.contents;
    if (kaynak.includes('ExpoReactNativeFactoryProvider')) {
      throw new Error('withGrindIos: sablon artik scene yasam dongusunu kendisi kuruyor; bu duzeltmeyi kaldir.');
    }
    if (!kaynak.includes(SINIF) || !PENCERE_KURULUMU.test(kaynak)) {
      throw new Error('withGrindIos: AppDelegate sablonu degismis; scene duzeltmesi uygulanamadi.');
    }
    mod.modResults.contents = kaynak
      .replace(SINIF, 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {')
      .replace(PENCERE_KURULUMU, '    // Pencereyi ExpoAppSceneDelegate kurar (iOS 27; bkz. plugins/withGrindIos.js).\n');
    return mod;
  });
}

function withPushsuzYetki(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });
}

module.exports = (config) => withPushsuzYetki(withSahne(config));
