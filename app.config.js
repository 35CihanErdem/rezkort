require('dotenv').config();

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'RezKort',
  slug: 'rezkort',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  plugins: ['expo-font'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.rezkort.app',
  },
  android: {
    package: 'com.rezkort.app',
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
    emailjs: {
      serviceId: process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID ?? '',
      templateId: process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID ?? '',
      publicKey: process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY ?? '',
      privateKey: process.env.EXPO_PUBLIC_EMAILJS_PRIVATE_KEY ?? '',
    },
  },
};
