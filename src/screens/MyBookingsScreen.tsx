import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthContext';
import { useBooking } from '../store/BookingContext';
import { colors, spacing } from '../theme';
import { formatDateLabel, formatSlot } from '../utils/date';

export function MyBookingsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { bookings, courts, cancelBooking } = useBooking();

  const mine = bookings.filter((b) => b.userId === user?.id);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.title}>Randevularım</Text>
      <Text style={styles.subtitle}>
        Hesabına bağlı rezervasyonlar. Aynı anda yalnızca 1 aktif randevu
        alabilirsin.
      </Text>

      <FlatList
        data={mine}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
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
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: spacing.md,
    color: colors.muted,
    lineHeight: 20,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  empty: {
    textAlign: 'center',
    color: colors.muted,
    marginTop: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  player: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  court: {
    color: colors.courtDeep,
    fontWeight: '600',
  },
  meta: {
    color: colors.muted,
  },
  cancel: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.booked,
  },
  cancelText: {
    color: colors.clay,
    fontWeight: '700',
  },
});
