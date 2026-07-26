import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Court } from '../types';
import { colors, fonts, radii, spacing } from '../theme';

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
      <View style={styles.stripe} />
      <View style={styles.body}>
        <Text style={styles.badgeText}>{court.district}</Text>
        <Text style={styles.title}>{court.name}</Text>
        <Text style={styles.meta}>{court.address}</Text>
        <Text style={styles.hours}>
          {String(court.openHour).padStart(2, '0')}:00 –{' '}
          {String(court.closeHour).padStart(2, '0')}:00
        </Text>
      </View>
    </Pressable>
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
    transform: [{ scale: 0.985 }],
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
});
