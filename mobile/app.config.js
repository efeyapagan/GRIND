/**
 * #414: kendi iOS build'imiz icin kisiye gore degisen ayarlar. Ucretsiz Apple hesabinda uygulama kimligi
 * hesaba ozgu olmak zorunda (ayni kimligi iki kisi kaydedemez); kimlik ve takim repoya yazilmaz, ortamdan
 * okunur (`mobile/.env.local`, bkz. docs/ios-build.md). Expo Go bunlari kullanmaz.
 */
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    bundleIdentifier: process.env.GRIND_IOS_BUNDLE_ID ?? 'com.grind.mobile',
    ...(process.env.GRIND_APPLE_TEAM_ID ? { appleTeamId: process.env.GRIND_APPLE_TEAM_ID } : {}),
  },
});
