import { useMemo, useState } from 'react';
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
import { Booking } from '../types';
import { isBookingActive, isBookingPast } from '../utils/booking';
import { formatDateLabel, formatSlot } from '../utils/date';

type Tab = 'active' | 'past';

export function MyBookingsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { bookings, courts, cancelBooking } = useBooking();
  const [tab, setTab] = useState<Tab>('active');

  const mine = useMemo(
    () => bookings.filter((b) => b.userId === user?.id),
    [bookings, user?.id],
  );

  const active = useMemo(
    () =>
      mine
        .filter((b) => isBookingActive(b))
        .sort((a, b) =>
          a.date === b.date
            ? a.startHour - b.startHour
            : a.date.localeCompare(b.date),
        ),
    [mine],
  );

  const past = useMemo(
    () =>
      mine
        .filter((b) => isBookingPast(b))
        .sort((a, b) =>
          a.date === b.date
            ? b.startHour - a.startHour
            : b.date.localeCompare(a.date),
        ),
    [mine],
  );

  const stats = useMemo(() => {
    const byCourt = new Map<string, number>();
    const byDistrict = new Map<string, number>();

    for (const b of past) {
      const court = courts.find((c) => c.id === b.courtId);
      const courtName = court?.name ?? 'Silinmiş kort';
      const district = court?.district ?? 'Bilinmiyor';
      byCourt.set(courtName, (byCourt.get(courtName) ?? 0) + 1);
      byDistrict.set(district, (byDistrict.get(district) ?? 0) + 1);
    }

    const topCourts = Array.from(byCourt.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const topDistricts = Array.from(byDistrict.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      totalPlays: past.length,
      uniqueCourts: byCourt.size,
      topCourts,
      topDistricts,
    };
  }, [past, courts]);

  const list = tab === 'active' ? active : past;

  function renderItem({ item }: { item: Booking }) {
    const court = courts.find((c) => c.id === item.courtId);
    const isPast = tab === 'past';

    return (
      <View style={[styles.card, isPast && styles.cardPast]}>
        {isPast ? (
          <Text style={styles.pastBadge}>Geçmiş · oynandı</Text>
        ) : (
          <Text style={styles.activeBadge}>Aktif</Text>
        )}
        <Text style={[styles.court, isPast && styles.textMuted]}>
          {court?.name ?? 'Silinmiş kort'}
        </Text>
        {court?.district ? (
          <Text style={styles.district}>{court.district}</Text>
        ) : null}
        <Text style={[styles.meta, isPast && styles.textMuted]}>
          {formatDateLabel(item.date)} · {formatSlot(item.startHour)}
        </Text>
        {!isPast ? (
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
        ) : null}
      </View>
    );
  }

  return (
    <Screen>
      <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.brand}>Randevular</Text>
        <Text style={styles.subtitle}>
          Aktif randevun ve geçmiş maçların. Aynı anda 1 aktif rezervasyon.
        </Text>

        <View style={styles.stats}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.totalPlays}</Text>
            <Text style={styles.statLabel}>Toplam maç</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.uniqueCourts}</Text>
            <Text style={styles.statLabel}>Farklı kort</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{active.length}</Text>
            <Text style={styles.statLabel}>Aktif</Text>
          </View>
        </View>

        {stats.topDistricts.length > 0 ? (
          <View style={styles.whereBox}>
            <Text style={styles.whereTitle}>Nerede oynadın?</Text>
            {stats.topDistricts.map(([name, count]) => (
              <Text key={name} style={styles.whereLine}>
                {name} · {count} kez
              </Text>
            ))}
            {stats.topCourts.length > 0 ? (
              <>
                <Text style={[styles.whereTitle, { marginTop: spacing.sm }]}>
                  En çok kort
                </Text>
                {stats.topCourts.map(([name, count]) => (
                  <Text key={name} style={styles.whereLine}>
                    {name} · {count} kez
                  </Text>
                ))}
              </>
            ) : null}
          </View>
        ) : null}

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setTab('active')}
            style={[styles.tab, tab === 'active' && styles.tabActive]}
          >
            <Text
              style={[styles.tabText, tab === 'active' && styles.tabTextActive]}
            >
              Aktif ({active.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('past')}
            style={[styles.tab, tab === 'past' && styles.tabActive]}
          >
            <Text
              style={[styles.tabText, tab === 'past' && styles.tabTextActive]}
            >
              Geçmiş ({past.length})
            </Text>
          </Pressable>
        </View>

        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => (
            <View style={{ height: spacing.sm }} />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {tab === 'active'
                ? 'Aktif randevun yok.'
                : 'Henüz geçmiş maç yok. Saat geçince burada görünür.'}
            </Text>
          }
          renderItem={renderItem}
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
  stats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statNum: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.courtDeep,
    lineHeight: 30,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  whereBox: {
    backgroundColor: colors.available,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#B7E0C8',
  },
  whereTitle: {
    fontFamily: fonts.bodyBold,
    color: colors.courtDeep,
    fontSize: 13,
    marginBottom: 4,
  },
  whereLine: {
    fontFamily: fonts.body,
    color: colors.ink,
    fontSize: 13,
    lineHeight: 20,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.courtDeep,
    borderColor: colors.courtDeep,
  },
  tabText: {
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.white,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  empty: {
    textAlign: 'center',
    fontFamily: fonts.body,
    color: colors.muted,
    marginTop: spacing.lg,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  cardPast: {
    opacity: 0.72,
    backgroundColor: '#F2F5F3',
  },
  activeBadge: {
    alignSelf: 'flex-start',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.courtDeep,
    backgroundColor: colors.available,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 2,
  },
  pastBadge: {
    alignSelf: 'flex-start',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.muted,
    backgroundColor: colors.line,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 2,
  },
  court: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
  },
  district: {
    fontFamily: fonts.bodyMedium,
    color: colors.court,
    fontSize: 13,
  },
  meta: {
    fontFamily: fonts.body,
    color: colors.muted,
  },
  textMuted: {
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
