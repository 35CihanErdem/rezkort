require('dotenv').config();

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'RezKort',
  slug: 'rezkort',
  version: '1.0.1',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  plugins: ['expo-font'],
  // OTA kapalı: APK kendi içindeki bundle ile açılır (Failed to download remote update olmaz)
  updates: {
    enabled: false,
    checkAutomatically: 'NEVER',
    fallbackToCacheTimeout: 0,
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.rezkort.app',
  },
  android: {
    package: 'com.rezkort.app',
    versionCode: 2,
    adaptiveIcon: {
      backgroundColor: '#145C39',
      foregroundImage: './assets/android-icon-foreground.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    eas: {
      projectId: 'ac3e545d-82d0-40b7-957b-71128f9d6060',
    },
    emailjs: {
      serviceId: process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID ?? '',
      templateId: process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID ?? '',
      publicKey: process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY ?? '',
      privateKey: process.env.EXPO_PUBLIC_EMAILJS_PRIVATE_KEY ?? '',
    },
  },
};
