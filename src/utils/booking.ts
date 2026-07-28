import { Booking } from '../types';

/** Slot bitiş saati (hour+1) geçmişse pasif / geçmiş sayılır */
export function isBookingActive(booking: Booking, now = new Date()): boolean {
  const [y, m, d] = booking.date.split('-').map(Number);
  const end = new Date(y, m - 1, d, booking.hour + 1, 0, 0, 0);
  return end.getTime() > now.getTime();
}

export function isBookingPast(booking: Booking, now = new Date()): boolean {
  return !isBookingActive(booking, now);
}
