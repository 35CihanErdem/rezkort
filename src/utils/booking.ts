import { Booking } from '../types';

function slotEnd(booking: Pick<Booking, 'date' | 'endHour'>): Date {
  const [y, m, d] = booking.date.split('-').map(Number);
  return new Date(y, m - 1, d, booking.endHour, 0, 0, 0);
}

/** Gerçekten aktif: status=active ve saat bitmemiş */
export function isBookingActive(booking: Booking, now = new Date()): boolean {
  if (booking.status !== 'active') return false;
  return slotEnd(booking).getTime() > now.getTime();
}

/** Geçmiş / iptal / tamamlanmış */
export function isBookingPast(booking: Booking, now = new Date()): boolean {
  if (booking.status !== 'active') return true;
  return slotEnd(booking).getTime() <= now.getTime();
}

/**
 * Slot hâlâ alınabilir mi?
 * Tek kural: start + lateJoinMinutes'e kadar (dahil).
 * Örn. 20–21 + 30 → 20:30 evet, 20:31 hayır. Bitiş uzamaz.
 */
export function isSlotJoinable(
  dateKey: string,
  startHour: number,
  endHour: number,
  lateJoinMinutes: number,
  now = new Date(),
): boolean {
  const [y, m, d] = dateKey.split('-').map(Number);
  const start = new Date(y, m - 1, d, startHour, 0, 0, 0);
  const end = new Date(y, m - 1, d, endHour, 0, 0, 0);
  const latestJoin = new Date(start.getTime() + lateJoinMinutes * 60_000);

  if (now.getTime() >= end.getTime()) return false;
  if (now.getTime() > latestJoin.getTime()) return false;
  return true;
}
