import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../components/Screen';
import { useAuth } from '../store/AuthContext';
import { useBooking } from '../store/BookingContext';
import { colors, fonts, radii, spacing } from '../theme';
import { formatDateLabel, formatSlot } from '../utils/date';

export function MyBookingsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { bookings, courts, cancelBooking } = useBooking();

  const mine = bookings.filter((b) => b.userId === user?.id);

  return (
    <Screen>
      <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.brand}>Randevular</Text>
        <Text style={styles.subtitle}>
          Aynı anda yalnızca 1 aktif randevu alabilirsin.
        </Text>

        <FlatList
          data={mine}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => (
            <View style={{ height: spacing.sm }} />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>Henüz rezervasyonun yok.</Text>
          }
          renderItem={({ item }) => {
            const court = courts.find((c) => c.id === item.courtId);
            return (
              <View style={styles.card}>
                <Text style={styles.player}>{item.playerName}</Text>
                <Text style={styles.court}>
                  {court?.name ?? 'Silinmiş kort'}
                </Text>
                <Text style={styles.meta}>
                  {formatDateLabel(item.date)} · {formatSlot(item.hour)}
                </Text>
                <Pressable
                  onPress={() =>
                    Alert.alert(
                      'İptal et',
                      'Bu rezervasyonu iptal etmek istiyor musun?',
                      [
                        { text: 'Vazgeç', style: 'cancel' },
                        {
                          text: 'İptal et',
                          style: 'destructive',
                          onPress: () => cancelBooking(item.id),
                        },
                      ],
                    )
                  }
                  style={styles.cancel}
                >
                  <Text style={styles.cancelText}>İptal et</Text>
                </Pressable>
              </View>
            );
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 44,
    color: colors.courtDeep,
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: 2,
    marginBottom: spacing.md,
    fontFamily: fonts.body,
    color: colors.muted,
    lineHeight: 20,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  empty: {
    textAlign: 'center',
    fontFamily: fonts.body,
    color: colors.muted,
    marginTop: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  player: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.ink,
  },
  court: {
    fontFamily: fonts.bodyMedium,
    color: colors.courtDeep,
  },
  meta: {
    fontFamily: fonts.body,
    color: colors.muted,
  },
  cancel: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.claySoft,
  },
  cancelText: {
    fontFamily: fonts.bodyBold,
    color: colors.clay,
  },
});
