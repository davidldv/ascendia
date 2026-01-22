import { Platform } from 'react-native';

const CHANNEL_ID = 'daily-missions';
const SOURCE = 'ascendia';

let handlerInitialized = false;

type NotificationsModule = typeof import('expo-notifications');
let notificationsPromise: Promise<NotificationsModule> | null = null;

function isWebServer() {
  return Platform.OS === 'web' && typeof window === 'undefined';
}

async function getNotifications(): Promise<NotificationsModule | null> {
  // Local notifications are mobile-only for now. Web/SSR causes crashes in expo-notifications
  // due to localStorage assumptions in the module.
  if (Platform.OS === 'web' || isWebServer()) return null;
  notificationsPromise ??= import('expo-notifications');
  return notificationsPromise;
}

async function ensureNotificationHandlerInitialized(Notifications: NotificationsModule) {
  if (handlerInitialized) return;
  handlerInitialized = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(Notifications: NotificationsModule) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily missions',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: '#37E7FF',
  });
}

export async function requestNotificationsPermissionIfNeeded(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;

  await ensureNotificationHandlerInitialized(Notifications);

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;

  const next = await Notifications.requestPermissionsAsync();
  return next.status === 'granted';
}

export async function scheduleDailyLocalNotifications(params?: {
  morningHour?: number;
  morningMinute?: number;
  eveningHour?: number;
  eveningMinute?: number;
  failureHour?: number;
  failureMinute?: number;
}) {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  await ensureNotificationHandlerInitialized(Notifications);
  await ensureAndroidChannel(Notifications);

  const granted = await requestNotificationsPermissionIfNeeded();
  if (!granted) return;

  const {
    morningHour = 8,
    morningMinute = 0,
    eveningHour = 20,
    eveningMinute = 0,
    failureHour = 0,
    failureMinute = 5,
  } = params ?? {};

  // Prevent duplicates: cancel only Ascendia reminders then re-schedule.
  await cancelAscendiaScheduledNotifications();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Ascendia — missions assigned',
      body: 'Open Ascendia. Your missions are waiting.',
      sound: false,
      data: { source: SOURCE, kind: 'morning' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: morningHour,
      minute: morningMinute,
      channelId: CHANNEL_ID,
    },
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Ascendia — reminder',
      body: 'If today’s missions aren’t done yet, finish them now.',
      sound: false,
      data: { source: SOURCE, kind: 'evening' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: eveningHour,
      minute: eveningMinute,
      channelId: CHANNEL_ID,
    },
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Ascendia — day closes',
      body: 'Day closes now. Incomplete missions count as failure.',
      sound: false,
      data: { source: SOURCE, kind: 'midnight' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: failureHour,
      minute: failureMinute,
      channelId: CHANNEL_ID,
    },
  });
}

export async function cancelAscendiaScheduledNotifications(): Promise<void> {
  try {
    const Notifications = await getNotifications();
    if (!Notifications) return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const ours = scheduled.filter((n) => {
      const data = n?.content?.data as Record<string, unknown> | undefined;
      return data?.source === SOURCE;
    });

    await Promise.all(
      ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    // Best-effort. Scheduling is non-critical.
  }
}

export async function setAscendiaDailyNotificationsEnabled(enabled: boolean): Promise<void> {
  if (!enabled) {
    await cancelAscendiaScheduledNotifications();
    return;
  }
  await scheduleDailyLocalNotifications();
}
