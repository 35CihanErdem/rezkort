import { Alert, Linking, Platform } from 'react-native';

export type MapPoint = {
  latitude: number;
  longitude: number;
  label: string;
  address?: string;
};

export function hasCoordinates(
  point: Partial<MapPoint> | null | undefined,
): point is MapPoint {
  return (
    typeof point?.latitude === 'number' &&
    typeof point?.longitude === 'number' &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude)
  );
}

async function openUrl(url: string): Promise<boolean> {
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/** Harita uygulaması seçtirip konumu açar */
export function promptOpenInMaps(point: MapPoint): void {
  const { latitude, longitude, label } = point;
  const q = encodeURIComponent(label);
  const googleWeb = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  const googleApp = Platform.select({
    ios: `comgooglemaps://?q=${latitude},${longitude}&center=${latitude},${longitude}`,
    android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${q})`,
    default: googleWeb,
  })!;
  const appleMaps = `http://maps.apple.com/?ll=${latitude},${longitude}&q=${q}`;
  const yandex = `yandexmaps://maps.yandex.ru/?pt=${longitude},${latitude}&z=16&l=map`;

  const buttons: {
    text: string;
    onPress?: () => void;
    style?: 'cancel' | 'destructive' | 'default';
  }[] = [];

  if (Platform.OS === 'ios') {
    buttons.push({
      text: 'Apple Haritalar',
      onPress: () => {
        void openUrl(appleMaps);
      },
    });
  }

  buttons.push({
    text: 'Google Maps',
    onPress: () => {
      void (async () => {
        const ok = await openUrl(googleApp);
        if (!ok) await openUrl(googleWeb);
      })();
    },
  });

  buttons.push({
    text: 'Yandex Maps',
    onPress: () => {
      void (async () => {
        const ok = await openUrl(yandex);
        if (!ok) {
          await openUrl(
            `https://yandex.com.tr/maps/?ll=${longitude},${latitude}&z=16&pt=${longitude},${latitude}`,
          );
        }
      })();
    },
  });

  buttons.push({
    text: 'Tarayıcıda aç',
    onPress: () => {
      void openUrl(googleWeb);
    },
  });

  buttons.push({ text: 'Vazgeç', style: 'cancel' });

  Alert.alert(
    'Haritada aç',
    `${label}\nNerede açmak istersin?`,
    buttons,
  );
}
