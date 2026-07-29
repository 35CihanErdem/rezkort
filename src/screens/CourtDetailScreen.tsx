import { RouteProp, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Screen } from '../components/Screen';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { displayName, useAuth } from '../context/AuthContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useBooking } from '../store/BookingContext';
import { colors, fonts, radii, spacing } from '../theme';
import { RootStackParamList } from '../types';
import { isSlotJoinable } from '../utils/booking';
import { formatDateLabel, formatSlot, nextDays } from '../utils/date';
import { hasCoordinates, promptOpenInMaps } from '../utils/maps';
import { logAppError } from '../utils/errorLog';

export function CourtDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'CourtDetail'>>();
  const { profile } = useAuth();
  const {
    courts,
    bookSlot,
    cancelBooking,
    getBookingForSlot,
    getActiveBookingForPhone,
    getLateJoinMinutesForCourt,
    refreshAll,
  } = useBooking();
  const court = courts.find((c) => c.id === route.params.courtId);

  const days = useMemo(() => nextDays(7), []);
  const [date, setDate] = useState(days[0]);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const onPullRefresh = useCallback(async () => {
    await refreshAll();
    setNow(new Date());
  }, [refreshAll]);
  const { refreshControlProps } = usePullToRefresh(onPullRefresh);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const myBookingOnThisCourt = useMemo(() => {
    if (!court || !profile) return undefined;
    const mine = getActiveBookingForPhone(profile.phone);
    return mine?.courtId === court.id ? mine : undefined;
  }, [court, profile, getActiveBookingForPhone]);

  useEffect(() => {
    if (myBookingOnThisCourt) setDate(myBookingOnThisCourt.date);
  }, [myBookingOnThisCourt?.id]);

  if (!court) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <Text style={styles.missing}>Kort bulunamadı.</Text>
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <Text style={styles.missing}>Rezervasyon için giriş yap.</Text>
      </Screen>
    );
  }

  const currentUser = profile;
  const selectedCourt = court;
  const playerName = displayName(currentUser);
  const activeBooking = getActiveBookingForPhone(currentUser.phone);
  const activeCourt = activeBooking
    ? courts.find((c) => c.id === activeBooking.courtId)
    : undefined;

  const hours = Array.from(
    { length: selectedCourt.closeHour - selectedCourt.openHour },
    (_, i) => selectedCourt.openHour + i,
  );
  const joinMinutes = getLateJoinMinutesForCourt(selectedCourt.id);

  async function onBook() {
    if (selectedHour == null) {
      Alert.alert('Saat seç', 'Önce boş bir saat seç.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await bookSlot({
        courtId: selectedCourt.id,
        date,
        hour: selectedHour,
        userId: currentUser.id,
        phone: currentUser.phone,
        playerName,
      });

      if (!result.ok) {
        Alert.alert('Rezervasyon yapılamadı', result.reason);
        return;
      }

      Alert.alert(
        'Rezervasyon alındı',
        `${formatDateLabel(date)} · ${formatSlot(selectedHour)}`,
      );
      setSelectedHour(null);
    } catch (error) {
      logAppError({
        source: 'booking',
        message: 'Rezervasyon beklenmeyen hata',
        error,
        context: {
          courtId: selectedCourt.id,
          date,
          hour: selectedHour,
        },
      });
      Alert.alert(
        'Rezervasyon yapılamadı',
        'Beklenmeyen bir hata oluştu. Tekrar dene.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function onCancelActive() {
    if (!activeBooking) return;
    Alert.alert(
      'İptal et',
      `${activeCourt?.name ?? 'Rezervasyon'} · ${formatDateLabel(activeBooking.date)} · ${formatSlot(activeBooking.startHour)}\n\nİptal etmek istiyor musun?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal et',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const result = await cancelBooking(activeBooking.id);
              if (!result.ok) {
                Alert.alert('İptal edilemedi', result.reason);
                return;
              }
              Alert.alert('İptal edildi', 'Rezervasyonun iptal edildi.');
            } catch {
              Alert.alert('İptal edilemedi', 'Beklenmeyen bir hata oluştu.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  }

  const busy = submitting || cancelling;

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <LoadingOverlay
        visible={busy}
        label={cancelling ? 'İptal ediliyor...' : 'Rezervasyon kaydediliyor...'}
      />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl {...refreshControlProps} />}
      >
        <Text style={styles.district}>{selectedCourt.district}</Text>
        <Text style={styles.title}>{selectedCourt.name}</Text>
        <Text style={styles.address}>{selectedCourt.address}</Text>
        {hasCoordinates({
          latitude: selectedCourt.latitude ?? undefined,
          longitude: selectedCourt.longitude ?? undefined,
          label: selectedCourt.name,
        }) ? (
          <Pressable
            onPress={() =>
              promptOpenInMaps({
                latitude: selectedCourt.latitude!,
                longitude: selectedCourt.longitude!,
                label: selectedCourt.name,
                address: selectedCourt.address,
              })
            }
            style={styles.directionsBtn}
          >
            <Text style={styles.directionsText}>🗺 Yol tarifi</Text>
          </Pressable>
        ) : null}

        {activeBooking ? (
          <View style={styles.warn}>
            <Text style={styles.warnText}>
              Aktif rezervasyonun var:
              {'\n'}
              {activeCourt?.name ?? 'Kort'} · {formatDateLabel(activeBooking.date)}{' '}
              · {formatSlot(activeBooking.startHour)}
            </Text>
            <Pressable
              onPress={onCancelActive}
              disabled={cancelling}
              style={({ pressed }) => [
                styles.cancelBtn,
                (pressed || cancelling) && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.cancelBtnText}>Bu randevuyu iptal et</Text>
            </Pressable>
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
          Yeşil boş · Turuncu dolu (isim) · Gri süre doldu · Mavi seçili
          {'\n'}
          Geç giriş toleransı: {joinMinutes} dk (bitiş uzamaz)
        </Text>
        <View style={styles.grid}>
          {hours.map((hour) => {
            const booking = getBookingForSlot(selectedCourt.id, date, hour);
            const taken = Boolean(booking);
            const mine =
              booking?.userId === currentUser.id && booking?.status === 'active';
            const joinable = isSlotJoinable(
              date,
              hour,
              hour + 1,
              joinMinutes,
              now,
            );
            const expired = !taken && !joinable;
            const selected = selectedHour === hour;

            return (
              <Pressable
                key={hour}
                disabled={taken || expired || Boolean(activeBooking)}
                onPress={() => setSelectedHour(hour)}
                style={[
                  styles.slot,
                  taken && styles.slotTaken,
                  expired && styles.slotExpired,
                  mine && styles.slotMine,
                  selected && styles.slotSelected,
                ]}
              >
                <Text
                  style={[
                    styles.slotHour,
                    taken && styles.slotHourTaken,
                    expired && styles.slotHourExpired,
                    mine && styles.slotHourMine,
                    selected && styles.slotHourSelected,
                  ]}
                >
                  {formatSlot(hour)}
                </Text>
                <Text
                  style={[
                    styles.slotMeta,
                    taken && styles.slotHourTaken,
                    expired && styles.slotHourExpired,
                    mine && styles.slotHourMine,
                    selected && styles.slotHourSelected,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {mine
                    ? 'Senin'
                    : taken
                      ? booking?.playerName || 'Dolu'
                      : expired
                        ? 'Süre doldu'
                        : 'Boş'}
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
              ? 'Önce aktif randevuyu iptal et'
              : 'Saati rezerve et'}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  missing: {
    marginTop: spacing.xl,
    textAlign: 'center',
    fontFamily: fonts.body,
    color: colors.muted,
  },
  district: {
    fontFamily: fonts.bodyBold,
    color: colors.court,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    marginTop: 4,
    fontFamily: fonts.bodyBold,
    fontSize: 24,
    color: colors.ink,
  },
  address: {
    marginTop: 6,
    fontFamily: fonts.body,
    color: colors.muted,
    lineHeight: 20,
  },
  directionsBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  directionsText: {
    fontFamily: fonts.bodyBold,
    color: colors.courtDeep,
    fontSize: 13,
  },
  warn: {
    marginTop: spacing.md,
    backgroundColor: colors.claySoft,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 10,
  },
  warnText: {
    fontFamily: fonts.bodyMedium,
    color: colors.clay,
    lineHeight: 20,
  },
  cancelBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.clay,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontFamily: fonts.bodyBold,
    color: colors.white,
    fontSize: 13,
  },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
  },
  legend: {
    fontFamily: fonts.body,
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
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dayChipActive: {
    backgroundColor: colors.courtDeep,
    borderColor: colors.courtDeep,
  },
  dayText: {
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
  },
  dayTextActive: {
    color: colors.white,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slot: {
    width: '48%',
    backgroundColor: colors.available,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#B7E0C8',
  },
  slotTaken: {
    backgroundColor: colors.booked,
    borderColor: '#E5C4B5',
  },
  slotExpired: {
    backgroundColor: '#E8ECE9',
    borderColor: colors.line,
    opacity: 0.75,
  },
  slotMine: {
    backgroundColor: colors.mine,
    borderColor: '#7EB6E8',
  },
  slotSelected: {
    backgroundColor: colors.mine,
    borderColor: '#7EB6E8',
  },
  slotHour: {
    fontFamily: fonts.bodyBold,
    color: colors.courtDeep,
    fontSize: 14,
  },
  slotMeta: {
    marginTop: 4,
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 12,
  },
  slotHourTaken: {
    color: colors.clay,
  },
  slotHourExpired: {
    color: colors.muted,
  },
  slotHourMine: {
    color: '#1A4F7A',
  },
  slotHourSelected: {
    color: '#1A4F7A',
  },
  accountLine: {
    fontFamily: fonts.body,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  cta: {
    marginTop: spacing.sm,
    backgroundColor: colors.courtDeep,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaDisabled: {
    backgroundColor: colors.muted,
  },
  ctaText: {
    fontFamily: fonts.bodyBold,
    color: colors.white,
    fontSize: 16,
  },
});
