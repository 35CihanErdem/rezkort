import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Court } from '../types';
import { colors, spacing } from '../theme';

type Props = {
  court: Court;
  onPress: () => void;
};

export function CourtCard({ court, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{court.district}</Text>
      </View>
      <Text style={styles.title}>{court.name}</Text>
      <Text style={styles.meta}>{court.address}</Text>
      <Text style={styles.hours}>
        {String(court.openHour).padStart(2, '0')}:00 –{' '}
        {String(court.closeHour).padStart(2, '0')}:00
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 6,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.available,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: colors.courtDeep,
    fontWeight: '700',
    fontSize: 12,
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  hours: {
    marginTop: 4,
    color: colors.court,
    fontWeight: '600',
    fontSize: 13,
  },
});
