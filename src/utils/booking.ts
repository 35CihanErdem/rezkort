import { Booking } from '../types';

function slotEnd(booking: Booking): Date {
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
