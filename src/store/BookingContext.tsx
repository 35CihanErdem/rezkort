import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Booking, Court } from '../types';
import { isBookingActive } from '../utils/booking';
import { toDateKey } from '../utils/date';

const DEFAULT_LATE_JOIN_MINUTES = 30;

type BookingContextValue = {
  ready: boolean;
  courts: Court[];
  bookings: Booking[];
  refreshCourts: () => Promise<void>;
  getLateJoinMinutesForCourt: (courtId: string) => number;
  addCourt: (input: {
    name: string;
    district: string;
    address: string;
    openHour: number;
    closeHour: number;
  }) => Promise<void>;
  bookSlot: (input: {
    courtId: string;
    date: string;
    hour: number;
    userId: string;
    phone: string;
    playerName: string;
  }) => Promise<{ ok: true } | { ok: false; reason: string }>;
  cancelBooking: (
    bookingId: string,
  ) => Promise<{ ok: true } | { ok: false; reason: string }>;
  getBookingForSlot: (
    courtId: string,
    date: string,
    hour: number,
  ) => Booking | undefined;
  getActiveBookingForPhone: (phone: string) => Booking | undefined;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [ready, setReady] = useState(false);
  const [courts, setCourts] = useState<Court[]>([]);
  const [slotReservations, setSlotReservations] = useState<Booking[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [joinRulesByMunicipality, setJoinRulesByMunicipality] = useState<
    Record<string, number>
  >({});

  const mapCourt = useCallback((row: any): Court => {
    const facility = row.facilities ?? {};
    const municipality = facility.municipalities ?? {};
    return {
      id: row.id,
      facilityId: row.facility_id,
      municipalityId: facility.municipality_id ?? municipality.id,
      name: row.name,
      district: facility.district ?? '',
      address: facility.address ?? '',
      municipalityName: municipality.name ?? '',
      surfaceType: row.surface_type,
      hasLights: row.has_lights,
      status: row.status,
      openHour: row.open_hour,
      closeHour: row.close_hour,
    };
  }, []);

  const mapBooking = useCallback((row: any): Booking => {
    const profile = row.profiles ?? {};
    const firstName = profile.first_name ?? '';
    const lastName = profile.last_name ?? '';
    const playerName = `${firstName} ${lastName}`.trim() || 'Oyuncu';
    return {
      id: row.id,
      courtId: row.court_id,
      date: row.date,
      startHour: row.start_hour,
      endHour: row.end_hour,
      status: row.status,
      reservationSource: row.reservation_source ?? 'mobile',
      checkedIn: Boolean(row.checked_in),
      userId: row.user_id,
      phone: row.phone,
      playerName,
      notes: row.notes,
      cancelledAt: row.cancelled_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }, []);

  const loadCoreData = useCallback(async () => {
    const [
      { data: courtRows, error: courtError },
      { data: slotRows, error: slotError },
      { data: ruleRows, error: ruleError },
    ] = await Promise.all([
      supabase
        .from('courts')
        .select(
          'id,facility_id,name,surface_type,has_lights,status,open_hour,close_hour,facilities!inner(district,address,municipality_id,municipalities!inner(id,name))',
        )
        .eq('status', 'active')
        .order('name', { ascending: true }),
      supabase
        .from('reservations')
        .select(
          'id,court_id,user_id,phone,date,start_hour,end_hour,status,reservation_source,checked_in,notes,cancelled_at,completed_at,created_at,updated_at,profiles(first_name,last_name)',
        )
        .in('status', ['active', 'cancelled_late'])
        .gte('date', toDateKey(new Date()))
        .order('date', { ascending: true }),
      supabase
        .from('reservation_rules')
        .select('municipality_id,late_join_minutes'),
    ]);

    if (courtError) throw courtError;
    setCourts((courtRows ?? []).map(mapCourt));

    if (slotError) throw slotError;
    setSlotReservations((slotRows ?? []).map(mapBooking));

    if (!ruleError && ruleRows) {
      const next: Record<string, number> = {};
      for (const row of ruleRows as {
        municipality_id: string;
        late_join_minutes: number | null;
      }[]) {
        next[row.municipality_id] = row.late_join_minutes ?? DEFAULT_LATE_JOIN_MINUTES;
      }
      setJoinRulesByMunicipality(next);
    }
  }, [mapBooking, mapCourt]);

  const loadUserBookings = useCallback(async () => {
    if (!profile) {
      setBookings([]);
      return;
    }
    const { data, error } = await supabase
      .from('reservations')
      .select(
        'id,court_id,user_id,phone,date,start_hour,end_hour,status,reservation_source,checked_in,notes,cancelled_at,completed_at,created_at,updated_at,profiles(first_name,last_name)',
      )
      .eq('user_id', profile.id)
      .order('date', { ascending: false })
      .order('start_hour', { ascending: false });

    if (error) throw error;
    setBookings((data ?? []).map(mapBooking));
  }, [mapBooking, profile]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await loadCoreData();
        await loadUserBookings();
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadCoreData, loadUserBookings]);

  const getBookingForSlot = useCallback(
    (courtId: string, date: string, hour: number) =>
      slotReservations.find(
        (b) => b.courtId === courtId && b.date === date && b.startHour === hour,
      ),
    [slotReservations],
  );

  const getActiveBookingForPhone = useCallback(
    (phone: string) => bookings.find((b) => b.phone === phone && isBookingActive(b)),
    [bookings],
  );

  const addCourt = useCallback(
    async (input: {
      name: string;
      district: string;
      address: string;
      openHour: number;
      closeHour: number;
    }) => {
      // Admin ekrani district'e gore facility secmedigi icin en yakin facility'ye ekliyoruz.
      const facility =
        courts.find((c) => c.district === input.district)?.facilityId ??
        courts[0]?.facilityId;

      if (!facility) {
        throw new Error('Önce bir tesis/facility kaydı olmalı.');
      }

      const { error } = await supabase.from('courts').insert({
        facility_id: facility,
        name: input.name,
        surface_type: 'hard',
        has_lights: false,
        reservation_duration: 60,
        description: input.address,
        status: 'active',
        open_hour: input.openHour,
        close_hour: input.closeHour,
      });
      if (error) throw error;
      await loadCoreData();
    },
    [courts, loadCoreData],
  );

  const bookSlot = useCallback(
    async (input: {
      courtId: string;
      date: string;
      hour: number;
      userId: string;
      phone: string;
      playerName: string;
    }) => {
      const name = input.playerName.trim();
      if (!name) {
        return { ok: false as const, reason: 'İsim gerekli.' };
      }
      if (!input.userId || !input.phone) {
        return { ok: false as const, reason: 'Giriş yapman gerekli.' };
      }

      const { error } = await supabase.rpc('book_reservation', {
        p_court_id: input.courtId,
        p_date: input.date,
        p_start_hour: input.hour,
        p_end_hour: input.hour + 1,
        p_source: 'mobile',
        p_notes: `Oyuncu: ${name}`,
      });
      if (error) {
        const code = error.message;
        const messageMap: Record<string, string> = {
          ACTIVE_RESERVATION_LIMIT_REACHED:
            'Aktif rezervasyon limitine ulaştın.',
          SLOT_ALREADY_BOOKED: 'Bu saat dolu.',
          TOO_FAR_IN_FUTURE: 'Bu tarih için erken rezervasyon yapılamaz.',
          PAST_SLOT_NOT_ALLOWED: 'Bu saatin süresi doldu.',
          LATE_JOIN_WINDOW_CLOSED:
            'Geç giriş toleransı doldu. Bu saate artık rezervasyon alınamaz.',
          OUTSIDE_WORKING_HOURS: 'Kort çalışma saatleri dışında.',
        };
        return {
          ok: false as const,
          reason: messageMap[code] ?? 'Rezervasyon oluşturulamadı.',
        };
      }

      await Promise.all([loadCoreData(), loadUserBookings()]);
      return { ok: true as const };
    },
    [loadCoreData, loadUserBookings],
  );

  const cancelBooking = useCallback(
    async (bookingId: string) => {
      const { error } = await supabase.rpc('cancel_reservation', {
        p_reservation_id: bookingId,
        p_reason: 'Kullanıcı iptali',
      });
      if (error) {
        const code = error.message;
        const messageMap: Record<string, string> = {
          AUTH_REQUIRED: 'Giriş yapman gerekli.',
          RESERVATION_NOT_FOUND_OR_NOT_ACTIVE:
            'Rezervasyon bulunamadı veya zaten iptal.',
        };
        return {
          ok: false as const,
          reason: messageMap[code] ?? 'İptal edilemedi.',
        };
      }
      await Promise.all([loadCoreData(), loadUserBookings()]);
      return { ok: true as const };
    },
    [loadCoreData, loadUserBookings],
  );

  const getLateJoinMinutesForCourt = useCallback(
    (courtId: string): number => {
      const court = courts.find((c) => c.id === courtId);
      if (!court?.municipalityId) return DEFAULT_LATE_JOIN_MINUTES;
      return (
        joinRulesByMunicipality[court.municipalityId] ??
        DEFAULT_LATE_JOIN_MINUTES
      );
    },
    [courts, joinRulesByMunicipality],
  );

  const value = useMemo(
    () => ({
      ready,
      courts,
      bookings,
      refreshCourts: loadCoreData,
      getLateJoinMinutesForCourt,
      addCourt,
      bookSlot,
      cancelBooking,
      getBookingForSlot,
      getActiveBookingForPhone,
    }),
    [
      ready,
      courts,
      bookings,
      loadCoreData,
      getLateJoinMinutesForCourt,
      addCourt,
      bookSlot,
      cancelBooking,
      getBookingForSlot,
      getActiveBookingForPhone,
    ],
  );

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error('useBooking BookingProvider içinde kullanılmalı');
  }
  return ctx;
}
