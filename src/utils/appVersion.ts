import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** UI’da görünen sürüm — APK değişince buradan anlaşılır */
export function getAppVersionLabel(): string {
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const build =
    Platform.OS === 'android'
      ? String(
          Constants.expoConfig?.android?.versionCode ??
            Constants.nativeBuildVersion ??
            '',
        )
      : String(
          Constants.expoConfig?.ios?.buildNumber ??
            Constants.nativeBuildVersion ??
            '',
        );

  return build
    ? `REZCOURT v${version} · build ${build}`
    : `REZCOURT v${version}`;
}
