require('dotenv').config();

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'REZCOURT',
  slug: 'rezkort',
  version: '1.0.2',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'rezkort',
  userInterfaceStyle: 'light',
  plugins: ['expo-font'],
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
    versionCode: 7,
    edgeToEdgeEnabled: true,
    adaptiveIcon: {
      backgroundColor: '#145C39',
      foregroundImage: './assets/android-icon-foreground.png',
    },
    predictiveBackGestureEnabled: false,
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
      },
    },
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'rezkort',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    eas: {
      projectId: 'ac3e545d-82d0-40b7-957b-71128f9d6060',
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
    useNativeMaps: Boolean(process.env.GOOGLE_MAPS_API_KEY),
  },
};
