import { Platform } from 'react-native';

const CHANNEL_ID = 'daily-missions';
const SOURCE = 'ascendia';

let handlerInitialized = false;

export type AscendiaNotificationTemplates = {
  missionAssigned?: string;
  eveningReminder?: string;
  midnightFailure?: string;
};

const DEFAULT_TEMPLATES: Required<AscendiaNotificationTemplates> = {
  missionAssigned: 'Open Ascendia. Your missions are waiting.',
  eveningReminder: 'If today’s missions aren’t done yet, finish them now.',
  midnightFailure: 'Day closes now. Incomplete missions count as failure.',
};

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
  templates?: AscendiaNotificationTemplates;
  todayDateKey?: string | null;
  todayComplete?: boolean;
  horizonDays?: number;
}) {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  // TypeScript doesn't reliably narrow captured variables inside nested functions.
  const NotificationsApi: NotificationsModule = Notifications;

  await ensureNotificationHandlerInitialized(NotificationsApi);
  await ensureAndroidChannel(NotificationsApi);

  const granted = await requestNotificationsPermissionIfNeeded();
  if (!granted) return;

  const {
    morningHour = 8,
    morningMinute = 0,
    eveningHour = 20,
    eveningMinute = 0,
    failureHour = 0,
    failureMinute = 5,
    templates,
    todayDateKey,
    todayComplete,
    horizonDays = 7,
  } = params ?? {};

  const copy = {
    missionAssigned: templates?.missionAssigned ?? DEFAULT_TEMPLATES.missionAssigned,
    eveningReminder: templates?.eveningReminder ?? DEFAULT_TEMPLATES.eveningReminder,
    midnightFailure: templates?.midnightFailure ?? DEFAULT_TEMPLATES.midnightFailure,
  };

  // Prevent duplicates: cancel only Ascendia reminders then re-schedule.
  await cancelAscendiaScheduledNotifications();

  await NotificationsApi.scheduleNotificationAsync({
    content: {
      title: 'Ascendia — missions assigned',
      body: copy.missionAssigned,
      sound: false,
      data: { source: SOURCE, kind: 'morning' },
    },
    trigger: {
      type: NotificationsApi.SchedulableTriggerInputTypes.DAILY,
      hour: morningHour,
      minute: morningMinute,
      channelId: CHANNEL_ID,
    },
  });

  function parseDateKeyLocal(key: string): { year: number; month: number; day: number } | null {
    const m = /^\d{4}-\d{2}-\d{2}$/.exec(key);
    if (!m) return null;
    const [y, mo, d] = key.split('-').map((x) => Number(x));
    if (!y || !mo || !d) return null;
    return { year: y, month: mo, day: d };
  }

  function formatDateKeyLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function addDaysLocal(dateKey: string, days: number): string {
    const parsed = parseDateKeyLocal(dateKey);
    if (!parsed) return dateKey;
    const base = new Date(parsed.year, parsed.month - 1, parsed.day);
    base.setDate(base.getDate() + days);
    return formatDateKeyLocal(base);
  }

  async function scheduleOneOff(params: {
    dateKey: string;
    kind: 'evening' | 'midnight';
    title: string;
    body: string;
    hour: number;
    minute: number;
  }) {
    const parsed = parseDateKeyLocal(params.dateKey);
    if (!parsed) return;

    const when = new Date(parsed.year, parsed.month - 1, parsed.day, params.hour, params.minute, 0);
    if (when.getTime() <= Date.now() + 30_000) return;

    const trigger = {
      date: when,
      // We schedule one-off reminders so we can cancel them when the user finishes the day.
      // Calendar triggers are supported on iOS/Android; for other platforms we already early-return.
    } as const;

    await NotificationsApi.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        sound: false,
        data: { source: SOURCE, kind: params.kind, dateKey: params.dateKey },
      },
      // @ts-expect-error expo-notifications typing variance across SDKs
      trigger,
    });
  }

  const baseKey = typeof todayDateKey === 'string' && todayDateKey ? todayDateKey : null;
  if (baseKey) {
    for (let i = 0; i < Math.max(1, horizonDays); i += 1) {
      const dateKey = addDaysLocal(baseKey, i);
      const skipToday = i === 0 && todayComplete === true;
      if (skipToday) continue;

      await scheduleOneOff({
        dateKey,
        kind: 'evening',
        title: 'Ascendia — reminder',
        body: copy.eveningReminder,
        hour: eveningHour,
        minute: eveningMinute,
      });

      await scheduleOneOff({
        dateKey,
        kind: 'midnight',
        title: 'Ascendia — day closes',
        body: copy.midnightFailure,
        hour: failureHour,
        minute: failureMinute,
      });
    }
  }
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

export async function setAscendiaDailyNotificationsEnabled(
  enabled: boolean,
  params?: {
    templates?: AscendiaNotificationTemplates;
    todayDateKey?: string | null;
    todayComplete?: boolean;
    horizonDays?: number;
  }
): Promise<void> {
  if (!enabled) {
    await cancelAscendiaScheduledNotifications();
    return;
  }
  await scheduleDailyLocalNotifications({
    templates: params?.templates,
    todayDateKey: params?.todayDateKey,
    todayComplete: params?.todayComplete,
    horizonDays: params?.horizonDays,
  });
}
