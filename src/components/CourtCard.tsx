import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Court } from '../types';
import { colors, fonts, radii, spacing } from '../theme';
import { hasCoordinates, promptOpenInMaps } from '../utils/maps';

type Props = {
  court: Court;
  onPress: () => void;
};

export function CourtCard({ court, onPress }: Props) {
  const canNavigate = hasCoordinates({
    latitude: court.latitude ?? undefined,
    longitude: court.longitude ?? undefined,
    label: court.name,
  });

  return (
    <View style={styles.card}>
      <View style={styles.stripe} />
      <View style={styles.body}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.badgeText}>{court.district}</Text>
          <Text style={styles.title}>{court.name}</Text>
          <Text style={styles.meta}>{court.address}</Text>
          <Text style={styles.hours}>
            {String(court.openHour).padStart(2, '0')}:00 –{' '}
            {String(court.closeHour).padStart(2, '0')}:00
          </Text>
        </Pressable>
        {canNavigate ? (
          <Pressable
            onPress={() =>
              promptOpenInMaps({
                latitude: court.latitude!,
                longitude: court.longitude!,
                label: court.name,
                address: court.address,
              })
            }
            hitSlop={8}
            style={styles.mapBtn}
          >
            <Text style={styles.mapBtnText}>Yol tarifi</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  pressed: {
    opacity: 0.92,
  },
  stripe: {
    width: 6,
    backgroundColor: colors.court,
  },
  body: {
    flex: 1,
    padding: spacing.md,
    gap: 4,
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    color: colors.courtDeep,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    fontSize: 17,
  },
  meta: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  hours: {
    marginTop: 4,
    fontFamily: fonts.bodyMedium,
    color: colors.court,
    fontSize: 13,
  },
  mapBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  mapBtnText: {
    fontFamily: fonts.bodyBold,
    color: colors.courtDeep,
    fontSize: 12,
  },
});
