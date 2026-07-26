import { RouteProp, useRoute } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { displayName, useAuth } from '../store/AuthContext';
import { useBooking } from '../store/BookingContext';
import { colors, spacing } from '../theme';
import { RootStackParamList } from '../types';
import {
  formatDateLabel,
  formatSlot,
  nextDays,
} from '../utils/date';

export function CourtDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'CourtDetail'>>();
  const { user } = useAuth();
  const { courts, bookSlot, getBookingForSlot, getActiveBookingForPhone } =
    useBooking();
  const court = courts.find((c) => c.id === route.params.courtId);

  const days = useMemo(() => nextDays(7), []);
  const [date, setDate] = useState(days[0]);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!court) {
    return (
      <View style={styles.screen}>
        <Text style={styles.missing}>Kort bulunamadı.</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.screen}>
        <Text style={styles.missing}>Rezervasyon için giriş yap.</Text>
      </View>
    );
  }

  const currentUser = user;
  const selectedCourt = court;
  const playerName = displayName(currentUser);
  const activeBooking = getActiveBookingForPhone(currentUser.phone);

  const hours = Array.from(
    { length: selectedCourt.closeHour - selectedCourt.openHour },
    (_, i) => selectedCourt.openHour + i,
  );

  async function onBook() {
    if (selectedHour == null) {
      Alert.alert('Saat seç', 'Önce boş bir saat seç.');
      return;
    }

    setSubmitting(true);
    const result = await bookSlot({
      courtId: selectedCourt.id,
      date,
      hour: selectedHour,
      userId: currentUser.id,
      phone: currentUser.phone,
      playerName,
    });
    setSubmitting(false);

    if (!result.ok) {
      Alert.alert('Rezervasyon yapılamadı', result.reason);
      return;
    }

    Alert.alert(
      'Rezervasyon alındı',
      `${formatDateLabel(date)} · ${formatSlot(selectedHour)}`,
    );
    setSelectedHour(null);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.district}>{selectedCourt.district}</Text>
      <Text style={styles.title}>{selectedCourt.name}</Text>
      <Text style={styles.address}>{selectedCourt.address}</Text>

      {activeBooking ? (
        <View style={styles.warn}>
          <Text style={styles.warnText}>
            Bu telefonda zaten 1 aktif rezervasyonun var. Yeni randevu için önce
            mevcut olanı iptal et veya saati gelsin.
          </Text>
        </View>
      ) : null}

      <Text style={styles.section}>Gün seç</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayRow}
      >
        {days.map((d) => {
          const active = d === date;
          return (
            <Pressable
              key={d}
              onPress={() => {
                setDate(d);
                setSelectedHour(null);
              }}
              style={[styles.dayChip, active && styles.dayChipActive]}
            >
              <Text style={[styles.dayText, active && styles.dayTextActive]}>
                {formatDateLabel(d)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.section}>Saatler</Text>
      <Text style={styles.legend}>
        Yeşil boş · Turuncu dolu · Mavi seçili
      </Text>
      <View style={styles.grid}>
        {hours.map((hour) => {
          const booking = getBookingForSlot(selectedCourt.id, date, hour);
          const taken = Boolean(booking);
          const selected = selectedHour === hour;

          return (
            <Pressable
              key={hour}
              disabled={taken || Boolean(activeBooking)}
              onPress={() => setSelectedHour(hour)}
              style={[
                styles.slot,
                taken && styles.slotTaken,
                selected && styles.slotSelected,
              ]}
            >
              <Text
                style={[
                  styles.slotHour,
                  taken && styles.slotHourTaken,
                  selected && styles.slotHourSelected,
                ]}
              >
                {formatSlot(hour)}
              </Text>
              <Text
                style={[
                  styles.slotMeta,
                  taken && styles.slotHourTaken,
                  selected && styles.slotHourSelected,
                ]}
              >
                {taken ? booking?.playerName : 'Boş'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>Rezervasyon</Text>
      <Text style={styles.accountLine}>
        {playerName} · {currentUser.username}
      </Text>
      <Pressable
        onPress={onBook}
        disabled={submitting || Boolean(activeBooking)}
        style={({ pressed }) => [
          styles.cta,
          (pressed || submitting || activeBooking) && { opacity: 0.85 },
          activeBooking && styles.ctaDisabled,
        ]}
      >
        <Text style={styles.ctaText}>
          {activeBooking
            ? 'Aktif rezervasyonun var'
            : submitting
              ? 'Kaydediliyor...'
              : 'Saati rezerve et'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  missing: {
    marginTop: spacing.xl,
    textAlign: 'center',
    color: colors.muted,
  },
  district: {
    color: colors.court,
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
  },
  address: {
    marginTop: 6,
    color: colors.muted,
    lineHeight: 20,
  },
  warn: {
    marginTop: spacing.md,
    backgroundColor: colors.booked,
    borderRadius: 12,
    padding: spacing.md,
  },
  warnText: {
    color: colors.clay,
    lineHeight: 20,
    fontWeight: '600',
  },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  legend: {
    color: colors.muted,
    marginBottom: spacing.sm,
    fontSize: 13,
  },
  dayRow: {
    gap: 8,
  },
  dayChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dayChipActive: {
    backgroundColor: colors.courtDeep,
    borderColor: colors.courtDeep,
  },
  dayText: {
    color: colors.ink,
    fontWeight: '600',
  },
  dayTextActive: {
    color: '#fff',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slot: {
    width: '48%',
    backgroundColor: colors.available,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#B7E0C8',
  },
  slotTaken: {
    backgroundColor: colors.booked,
    borderColor: '#E5C4B5',
  },
  slotSelected: {
    backgroundColor: colors.mine,
    borderColor: '#7EB6E8',
  },
  slotHour: {
    fontWeight: '700',
    color: colors.courtDeep,
    fontSize: 14,
  },
  slotMeta: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
  },
  slotHourTaken: {
    color: colors.clay,
  },
  slotHourSelected: {
    color: '#1A4F7A',
  },
  accountLine: {
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  cta: {
    marginTop: spacing.sm,
    backgroundColor: colors.court,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaDisabled: {
    backgroundColor: colors.muted,
  },
  ctaText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
