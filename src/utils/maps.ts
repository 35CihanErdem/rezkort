import { Linking, Platform } from 'react-native';

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

/** Konumu sistem harita intent’iyle açar (Android uygulama seçicisini OS gösterir). */
export function promptOpenInMaps(point: MapPoint): void {
  const { latitude, longitude, label } = point;
  const q = encodeURIComponent(label);

  const url =
    Platform.OS === 'android'
      ? `geo:${latitude},${longitude}?q=${latitude},${longitude}(${q})`
      : Platform.OS === 'ios'
        ? `http://maps.apple.com/?ll=${latitude},${longitude}&q=${q}`
        : `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  void Linking.openURL(url).catch(() => {
    void Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    );
  });
}
