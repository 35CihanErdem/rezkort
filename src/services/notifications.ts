import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import type { Booking, Court } from '../types';
import { isBookingActive } from '../utils/booking';

const CHANNEL_ID = 'rezcourt-bookings';
const REMINDER_PREFIX = 'booking-reminder-';
const CONFIRM_PREFIX = 'booking-confirm-';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function reminderId(bookingId: string) {
  return `${REMINDER_PREFIX}${bookingId}`;
}

function confirmId(bookingId: string) {
  return `${CONFIRM_PREFIX}${bookingId}`;
}

/** Türkiye yaz saati yok — UTC+3 sabit */
export function reservationStartDate(date: string, startHour: number): Date {
  const hh = String(startHour).padStart(2, '0');
  return new Date(`${date}T${hh}:00:00+03:00`);
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Randevu bildirimleri',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#145C39',
    sound: 'default',
  });
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function registerPushToken(userId: string): Promise<string | null> {
  try {
    if (!Device.isDevice && Platform.OS !== 'android') {
      return null;
    }

    const granted = await ensureNotificationPermissions();
    if (!granted) return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) return null;

    const push = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = push.data;
    if (!token) return null;

    const platform =
      Platform.OS === 'android' || Platform.OS === 'ios' || Platform.OS === 'web'
        ? Platform.OS
        : 'unknown';

    await supabase.rpc('upsert_push_token', {
      p_token: token,
      p_platform: platform,
      p_device_id: Device.modelName ?? null,
    });

    return token;
  } catch (e) {
    // FCM credential yoksa APK'da remote token alınamayabilir; local hatırlatma yine çalışır
    console.warn('registerPushToken:', e);
    return null;
  }
}

export async function cancelBookingNotifications(bookingId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderId(bookingId));
  } catch {
    // yoksa sessiz geç
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(confirmId(bookingId));
  } catch {
    //
  }
}

export async function notifyBookingConfirmed(input: {
  bookingId: string;
  courtName: string;
  date: string;
  startHour: number;
}) {
  const granted = await ensureNotificationPermissions();
  if (!granted) return;

  const timeLabel = `${String(input.startHour).padStart(2, '0')}:00`;
  await Notifications.scheduleNotificationAsync({
    identifier: confirmId(input.bookingId),
    content: {
      title: 'Rezervasyon onaylandı',
      body: `${input.courtName} · ${input.date} ${timeLabel}`,
      data: { type: 'booking_confirmed', bookingId: input.bookingId },
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null),
    },
    trigger: null,
  });
}

export async function scheduleBookingReminder(input: {
  bookingId: string;
  courtName: string;
  date: string;
  startHour: number;
}) {
  const granted = await ensureNotificationPermissions();
  if (!granted) return;

  const start = reservationStartDate(input.date, input.startHour);
  const remindAt = new Date(start.getTime() - 60 * 60 * 1000);
  if (remindAt.getTime() <= Date.now() + 30_000) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(
    reminderId(input.bookingId),
  ).catch(() => undefined);

  const timeLabel = `${String(input.startHour).padStart(2, '0')}:00`;
  await Notifications.scheduleNotificationAsync({
    identifier: reminderId(input.bookingId),
    content: {
      title: 'Randevuna 1 saat kaldı',
      body: `${input.courtName} · ${timeLabel}’te kortta ol`,
      data: { type: 'booking_reminder', bookingId: input.bookingId },
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: remindAt,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null),
    },
  });
}

/** Aktif rezervasyonlar için hatırlatmaları yeniden kur (açılış / yenileme) */
export async function syncBookingReminders(
  bookings: Booking[],
  courts: Court[],
) {
  const granted = await ensureNotificationPermissions();
  if (!granted) return;

  const courtName = (id: string) =>
    courts.find((c) => c.id === id)?.name ?? 'Kort';

  const active = bookings.filter((b) => isBookingActive(b));
  const activeIds = new Set(active.map((b) => b.id));

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    const id = n.identifier;
    if (!id.startsWith(REMINDER_PREFIX)) continue;
    const bookingId = id.slice(REMINDER_PREFIX.length);
    if (!activeIds.has(bookingId)) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(
        () => undefined,
      );
    }
  }

  await Promise.all(
    active.map((b) =>
      scheduleBookingReminder({
        bookingId: b.id,
        courtName: courtName(b.courtId),
        date: b.date,
        startHour: b.startHour,
      }),
    ),
  );
}
