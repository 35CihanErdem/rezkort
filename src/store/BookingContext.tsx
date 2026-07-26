import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { SEED_COURTS } from '../data/seed';
import { Booking, Court } from '../types';
import { createId, toDateKey } from '../utils/date';

const COURTS_KEY = 'tenis.courts.v1';
const BOOKINGS_KEY = 'tenis.bookings.v2';

function isBookingActive(booking: Booking, now = new Date()): boolean {
  const [y, m, d] = booking.date.split('-').map(Number);
  const end = new Date(y, m - 1, d, booking.hour + 1, 0, 0, 0);
  return end.getTime() > now.getTime();
}

type BookingContextValue = {
  ready: boolean;
  courts: Court[];
  bookings: Booking[];
  addCourt: (input: Omit<Court, 'id'>) => Promise<void>;
  bookSlot: (input: {
    courtId: string;
    date: string;
    hour: number;
    userId: string;
    phone: string;
    playerName: string;
  }) => Promise<{ ok: true } | { ok: false; reason: string }>;
  cancelBooking: (bookingId: string) => Promise<void>;
  getBookingForSlot: (
    courtId: string,
    date: string,
    hour: number,
  ) => Booking | undefined;
  getActiveBookingForPhone: (phone: string) => Booking | undefined;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [courts, setCourts] = useState<Court[]>(SEED_COURTS);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [courtsRaw, bookingsRaw] = await Promise.all([
          AsyncStorage.getItem(COURTS_KEY),
          AsyncStorage.getItem(BOOKINGS_KEY),
        ]);

        if (cancelled) return;

        if (courtsRaw) {
          setCourts(JSON.parse(courtsRaw) as Court[]);
        } else {
          await AsyncStorage.setItem(COURTS_KEY, JSON.stringify(SEED_COURTS));
        }

        if (bookingsRaw) {
          setBookings(JSON.parse(bookingsRaw) as Booking[]);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistCourts = useCallback(async (next: Court[]) => {
    setCourts(next);
    await AsyncStorage.setItem(COURTS_KEY, JSON.stringify(next));
  }, []);

  const persistBookings = useCallback(async (next: Booking[]) => {
    setBookings(next);
    await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(next));
  }, []);

  const getBookingForSlot = useCallback(
    (courtId: string, date: string, hour: number) =>
      bookings.find(
        (b) => b.courtId === courtId && b.date === date && b.hour === hour,
      ),
    [bookings],
  );

  const getActiveBookingForPhone = useCallback(
    (phone: string) => bookings.find((b) => b.phone === phone && isBookingActive(b)),
    [bookings],
  );

  const addCourt = useCallback(
    async (input: Omit<Court, 'id'>) => {
      const court: Court = { ...input, id: createId('court') };
      await persistCourts([...courts, court]);
    },
    [courts, persistCourts],
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

      const existing = getActiveBookingForPhone(input.phone);
      if (existing) {
        return {
          ok: false as const,
          reason:
            'Bu telefonla zaten 1 aktif rezervasyonun var. Önce onu iptal et veya saati gelsin.',
        };
      }

      const taken = bookings.some(
        (b) =>
          b.courtId === input.courtId &&
          b.date === input.date &&
          b.hour === input.hour,
      );
      if (taken) {
        return { ok: false as const, reason: 'Bu saat dolu.' };
      }

      // Geçmiş saate rezervasyon yok
      const today = toDateKey(new Date());
      const nowHour = new Date().getHours();
      if (
        input.date < today ||
        (input.date === today && input.hour <= nowHour)
      ) {
        return { ok: false as const, reason: 'Geçmiş bir saat seçilemez.' };
      }

      const booking: Booking = {
        id: createId('booking'),
        courtId: input.courtId,
        date: input.date,
        hour: input.hour,
        userId: input.userId,
        phone: input.phone,
        playerName: name,
        createdAt: new Date().toISOString(),
      };

      await persistBookings([booking, ...bookings]);
      return { ok: true as const };
    },
    [bookings, persistBookings, getActiveBookingForPhone],
  );

  const cancelBooking = useCallback(
    async (bookingId: string) => {
      await persistBookings(bookings.filter((b) => b.id !== bookingId));
    },
    [bookings, persistBookings],
  );

  const value = useMemo(
    () => ({
      ready,
      courts,
      bookings,
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
