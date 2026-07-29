import { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { WebView } from 'react-native-webview';
import { Court } from '../types';
import { colors, fonts, radii, spacing } from '../theme';
import { hasCoordinates, promptOpenInMaps } from '../utils/maps';

type Props = {
  courts: Court[];
  height?: number;
  fill?: boolean;
};

type MapPoint = {
  id: string;
  name: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
};

const IZMIR_FALLBACK: Region = {
  latitude: 38.4237,
  longitude: 27.1428,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

function uniqueFacilityPoints(courts: Court[]): MapPoint[] {
  const byFacility = new Map<string, MapPoint>();
  for (const c of courts) {
    if (
      !hasCoordinates({
        latitude: c.latitude ?? undefined,
        longitude: c.longitude ?? undefined,
        label: c.name,
      })
    ) {
      continue;
    }
    const key = `${c.latitude!.toFixed(5)},${c.longitude!.toFixed(5)}`;
    if (!byFacility.has(key)) {
      byFacility.set(key, {
        id: c.id,
        name: c.name.replace(/\s+Kort\s+\d+$/i, '').trim() || c.name,
        district: c.district,
        address: c.address,
        latitude: c.latitude!,
        longitude: c.longitude!,
      });
    }
  }
  return Array.from(byFacility.values());
}

function buildMapHtml(points: MapPoint[]): string {
  const payload = JSON.stringify(points);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; height: 100%; width: 100%; background: #e8f0e9; touch-action: none; }
    .leaflet-container { background: #e8f0e9; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const points = ${payload};
    const map = L.map('map', {
      zoomControl: true,
      attributionControl: true,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const bounds = [];
    points.forEach((p) => {
      const marker = L.marker([p.latitude, p.longitude]).addTo(map);
      marker.bindTooltip(p.name, { direction: 'top', offset: [0, -12] });
      marker.on('click', () => {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(p));
      });
      bounds.push([p.latitude, p.longitude]);
    });

    if (bounds.length === 1) map.setView(bounds[0], 14);
    else if (bounds.length > 1) map.fitBounds(bounds, { padding: [36, 36] });
    else map.setView([38.4237, 27.1428], 11);

    // Parent scroll'un jestürü çalmasını azalt
    document.addEventListener('touchmove', function (e) {
      e.stopPropagation();
    }, { passive: false });
  </script>
</body>
</html>`;
}

function regionForPoints(points: MapPoint[]): Region {
  if (points.length === 0) return IZMIR_FALLBACK;
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.06, (maxLat - minLat) * 1.6 || 0.08),
    longitudeDelta: Math.max(0.06, (maxLng - minLng) * 1.6 || 0.08),
  };
}

function OsmMap({
  points,
  style,
}: {
  points: MapPoint[];
  style: object;
}) {
  const html = useMemo(() => buildMapHtml(points), [points]);
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={style}
      onMessage={(event) => {
        try {
          const point = JSON.parse(event.nativeEvent.data) as MapPoint;
          promptOpenInMaps({
            latitude: point.latitude,
            longitude: point.longitude,
            label: point.name,
            address: point.address,
          });
        } catch {
          // ignore
        }
      }}
      javaScriptEnabled
      domStorageEnabled
      nestedScrollEnabled
      setSupportMultipleWindows={false}
      mixedContentMode="compatibility"
      overScrollMode="never"
      scrollEnabled={false}
      bounces={false}
    />
  );
}

function NativeMap({
  points,
  style,
}: {
  points: MapPoint[];
  style: object;
}) {
  const initialRegion = useMemo(() => regionForPoints(points), [points]);
  return (
    <MapView
      style={style}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={initialRegion}
      showsUserLocation={false}
      showsCompass={false}
      toolbarEnabled={false}
      moveOnMarkerPress={false}
      pitchEnabled
      rotateEnabled
      scrollEnabled
      zoomEnabled
    >
      {points.map((point) => (
        <Marker
          key={point.id}
          coordinate={{
            latitude: point.latitude,
            longitude: point.longitude,
          }}
          title={point.name}
          description={`${point.district} · Yol tarifi için dokun`}
          pinColor={colors.courtDeep}
          onPress={() => {
            promptOpenInMaps({
              latitude: point.latitude,
              longitude: point.longitude,
              label: point.name,
              address: point.address,
            });
          }}
        />
      ))}
    </MapView>
  );
}

export function CourtsMap({ courts, height = 220, fill = false }: Props) {
  const points = useMemo(() => uniqueFacilityPoints(courts), [courts]);
  const useNativeMaps = Boolean(
    Constants.expoConfig?.extra?.useNativeMaps,
  );

  if (points.length === 0) {
    return (
      <View style={[styles.empty, fill ? styles.fill : { height }]}>
        <Text style={styles.emptyText}>
          Harita için konum verisi yok. Koordinat migration’larını çalıştır.
        </Text>
      </View>
    );
  }

  const boxStyle = fill
    ? [styles.wrap, styles.fill]
    : [styles.wrap, { height }];

  return (
    <View style={boxStyle} collapsable={false}>
      {useNativeMaps ? (
        <NativeMap points={points} style={StyleSheet.absoluteFill} />
      ) : (
        <OsmMap points={points} style={styles.web} />
      )}
      <View style={styles.hint} pointerEvents="none">
        <Text style={styles.hintText}>Pin’e dokun → yol tarifi</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  fill: {
    flex: 1,
  },
  web: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  empty: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  emptyText: {
    fontFamily: fonts.body,
    color: colors.muted,
    textAlign: 'center',
    fontSize: 13,
  },
  hint: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(15, 92, 56, 0.88)',
    borderRadius: radii.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  hintText: {
    fontFamily: fonts.bodyMedium,
    color: colors.white,
    fontSize: 12,
    textAlign: 'center',
  },
});
