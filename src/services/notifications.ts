/**
 * Local reminder notifications.
 *
 * This app schedules local, time-of-day reminders only. It does not use remote
 * push, does not know whether a medication was taken, and never reports
 * adherence from notification delivery.
 */
import { Platform, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import type { MedicationReminderRow } from '../db/sqlite';

export const REMINDER_CHANNEL_ID = 'otwo-medication-reminders';
export const REMINDER_IDENTIFIER_PREFIX = 'otwo-reminder-';
export const REMINDER_DATA_TYPE = 'medication-reminder';

export type NotificationPermissionState =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'unsupported';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export function notificationsSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function ensureReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Medication & routine reminders',
    description: 'Local time-of-day reminders configured in OTwo.',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
    enableVibrate: false,
    showBadge: false,
  });
}

export async function getNotificationPermission(): Promise<NotificationPermissionState> {
  if (!notificationsSupported()) return 'unsupported';
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (permission.granted) return 'granted';
    if (permission.status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'unsupported';
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!notificationsSupported()) return 'unsupported';
  try {
    // Android 13+ requires the channel to exist before the runtime prompt.
    await ensureReminderChannel();
    const permission = await Notifications.requestPermissionsAsync();
    if (permission.granted) return 'granted';
    return permission.status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'unsupported';
  }
}

export function parseReminderTime(time: string): { hour: number; minute: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export async function cancelReminderNotifications(): Promise<void> {
  if (!notificationsSupported()) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter(
          (request) =>
            request.identifier.startsWith(REMINDER_IDENTIFIER_PREFIX) ||
            request.content.data?.type === REMINDER_DATA_TYPE
        )
        .map((request) =>
          Notifications.cancelScheduledNotificationAsync(request.identifier).catch(
            () => undefined
          )
        )
    );
  } catch {
    // Cancellation is best-effort; a permission change can make the native
    // query unavailable. The next successful sync still replaces schedules by
    // identifier.
  }
}

/**
 * Replace all OTwo reminder schedules with the currently active reminder rows.
 * Returns the number of reminders scheduled. Requires notification permission.
 */
export async function syncReminderNotifications(
  reminders: MedicationReminderRow[]
): Promise<number> {
  if (!notificationsSupported()) return 0;

  const permission = await getNotificationPermission();
  if (permission !== 'granted') return 0;

  await ensureReminderChannel();
  await cancelReminderNotifications();

  let scheduledCount = 0;
  for (const reminder of reminders) {
    if (reminder.is_active !== 1) continue;
    const time = parseReminderTime(reminder.time);
    if (!time) continue;

    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_IDENTIFIER_PREFIX}${reminder.id}`,
        content: {
          title: 'Medication & routine reminder',
          body: `${reminder.label} — reminder only. Follow your prescribed plan.`,
          data: { type: REMINDER_DATA_TYPE, reminderId: reminder.id },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: time.hour,
          minute: time.minute,
          channelId: REMINDER_CHANNEL_ID,
        },
      });
      scheduledCount += 1;
    } catch {
      // Keep scheduling the remaining reminders. The returned count remains
      // truthful about what actually succeeded.
    }
  }
  return scheduledCount;
}

export async function openNotificationSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    // The platform may not expose a settings deep link.
  }
}
