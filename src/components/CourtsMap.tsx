import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { Court } from '../types';
import { colors, fonts, radii, spacing } from '../theme';
import { hasCoordinates, promptOpenInMaps } from '../utils/maps';

type Props = {
  courts: Court[];
  height?: number;
};

const IZMIR_FALLBACK: Region = {
  latitude: 38.4237,
  longitude: 27.1428,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

export function CourtsMap({ courts, height = 220 }: Props) {
  const points = useMemo(
    () =>
      courts.filter((c) =>
        hasCoordinates({
          latitude: c.latitude ?? undefined,
          longitude: c.longitude ?? undefined,
          label: c.name,
        }),
      ),
    [courts],
  );

  const initialRegion = useMemo((): Region => {
    if (points.length === 0) return IZMIR_FALLBACK;
    const lats = points.map((p) => p.latitude!);
    const lngs = points.map((p) => p.longitude!);
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
  }, [points]);

  if (points.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>
          Harita için konum verisi yok. 0015 migration’ını çalıştır.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {points.map((court) => (
          <Marker
            key={court.id}
            coordinate={{
              latitude: court.latitude!,
              longitude: court.longitude!,
            }}
            title={court.name}
            description={`${court.district} · Yol tarifi için dokun`}
            pinColor={colors.courtDeep}
            onPress={() => {
              promptOpenInMaps({
                latitude: court.latitude!,
                longitude: court.longitude!,
                label: court.name,
                address: court.address,
              });
            }}
          />
        ))}
      </MapView>
      <View style={styles.hint}>
        <Text style={styles.hintText}>Pin’e dokun → harita uygulaması seç</Text>
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
