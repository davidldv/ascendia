import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Platform } from 'react-native';

import { apiFetch, isApiError } from '@/lib/api';
import {
  type AscendiaNotificationTemplates,
  setAscendiaDailyNotificationsEnabled,
} from '@/lib/notifications';
import { clearSupabaseAuthStorage, supabase } from '@/lib/supabase';
import { getArchetypeById } from '@/constants/archetypes';
import type { MissionStatus, MissionType } from '@/types/domain';

const NOTIFICATIONS_ENABLED_KEY = 'ascendia.notifications.enabled';

export type Profile = {
  userId: string;
  email: string | null;
  timezone: string;
  archetypeId: string | null;
  currentStreak: number;
  longestStreak: number;
  level: number;
  successfulDays: number;
  totalMissionsCompleted: number;
  lastSuccessDate: string | null;
};

export type ApiMission = {
  id: string;
  dateKey: string;
  type: MissionType;
  targetValue: number;
  status: MissionStatus;
};

type ProgressDay = { dateKey: string; total: number; completed: number };

type AppState = {
  session: Session | null;
  profile: Profile | null;
  todayDateKey: string | null;
  missionsToday: ApiMission[];
  last7Days: ProgressDay[];
  notificationsEnabled: boolean;
  loading: boolean;
  error: string | null;
};

type AppStateApi = {
  state: AppState;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  startEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refresh: () => Promise<void>;
  setTimezoneIfNeeded: () => Promise<void>;
  setArchetype: (archetypeId: string) => Promise<void>;
  completeMission: (missionId: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  getMissionById: (missionId: string) => ApiMission | null;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
};

const Ctx = createContext<AppStateApi | null>(null);

function isInvalidRefreshTokenError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.toLowerCase().includes('invalid refresh token');
}

function mapProfileRow(user: { id: string; email: string | null }, row: any): Profile {
  return {
    userId: user.id,
    email: user.email,
    timezone: row.timezone ?? 'UTC',
    archetypeId: row.archetype_id ?? null,
    currentStreak: row.current_streak ?? 0,
    longestStreak: row.longest_streak ?? 0,
    level: row.level ?? 1,
    successfulDays: row.successful_days ?? 0,
    totalMissionsCompleted: row.total_missions_completed ?? 0,
    lastSuccessDate: row.last_success_date ?? null,
  };
}

function mapMissionRow(row: any): ApiMission {
  return {
    id: String(row.id),
    dateKey: String(row.date_key),
    type: row.type as MissionType,
    targetValue: Number(row.target_value),
    status: row.status as MissionStatus,
  };
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [todayDateKey, setTodayDateKey] = useState<string | null>(null);
  const [missionsToday, setMissionsToday] = useState<ApiMission[]>([]);
  const [last7Days, setLast7Days] = useState<ProgressDay[]>([]);
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(true);
  const [archetypeTemplates, setArchetypeTemplates] = useState<
    AscendiaNotificationTemplates | undefined
  >(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
        if (!mounted) return;
        if (raw === null) {
          // Default ON.
          setNotificationsEnabledState(true);
          await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, '1');
          return;
        }
        setNotificationsEnabledState(raw === '1');
      } catch {
        // Default ON if storage fails.
        if (mounted) setNotificationsEnabledState(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // When the backend rejects our session, Supabase may keep emitting auth events
  // from a stale in-memory/persisted session. This prevents auth loops that can
  // disable the OTP input by constantly toggling `loading`.
  const ignoreAuthEventsRef = useRef(false);

  const beginAuthFlow = useCallback(() => {
    ignoreAuthEventsRef.current = false;
  }, []);

  const forceSignOut = useCallback(async () => {
    ignoreAuthEventsRef.current = true;
    try {
      // Ensure persisted session is cleared even if signOut request fails.
      await clearSupabaseAuthStorage();
    } catch {
      // ignore
    }
    try {
      // Best-effort: attempt Supabase signOut as well.
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // ignore
    }
    setSession(null);
    setProfile(null);
    setTodayDateKey(null);
    setMissionsToday([]);
    setLast7Days([]);
    setError(null);
  }, []);

  const maybeHandleUnauthorized = useCallback(
    async (e: unknown): Promise<boolean> => {
      if (isApiError(e) && e.status === 401) {
        await forceSignOut();
        return true;
      }
      return false;
    },
    [forceSignOut]
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          if (isInvalidRefreshTokenError(error)) {
            await forceSignOut();
            return;
          }
          if (mounted) setError(error.message);
        } else {
          if (mounted) setSession(data.session ?? null);
        }
      } catch (e) {
        if (isInvalidRefreshTokenError(e)) {
          await forceSignOut();
          return;
        }
        if (mounted) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (ignoreAuthEventsRef.current) {
        // Keep the app in a logged-out state until the user explicitly starts auth.
        if (!nextSession) setSession(null);
        return;
      }
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [forceSignOut]);

  const refresh = useCallback(async () => {
    if (!session) return;
    setError(null);
    setLoading(true);
    try {
      const me = await apiFetch<{
        user: { id: string; email: string | null };
        profile: any;
      }>(session, '/v1/me');
      setProfile(mapProfileRow(me.user, me.profile));

      const today = await apiFetch<{
        dateKey: string;
        missions: any[];
        profile: any;
      }>(session, '/v1/missions/today');
      setTodayDateKey(today.dateKey);
      setMissionsToday((today.missions ?? []).map(mapMissionRow));
      setProfile((prev) => {
        if (!prev) return mapProfileRow(me.user, today.profile);
        return mapProfileRow(me.user, today.profile);
      });

      const progress = await apiFetch<{ days: ProgressDay[]; profile: any }>(
        session,
        '/v1/progress/last7'
      );
      setLast7Days(progress.days ?? []);
      setProfile((prev) => {
        if (!prev) return prev;
        return mapProfileRow({ id: prev.userId, email: prev.email }, progress.profile);
      });
    } catch (e) {
      if (await maybeHandleUnauthorized(e)) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [session, maybeHandleUnauthorized]);

  const setTimezoneIfNeeded = useCallback(async () => {
    if (!session || !profile) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || tz === profile.timezone) return;
    try {
      await apiFetch<{ profile: any }>(session, '/v1/me', {
        method: 'PATCH',
        body: JSON.stringify({ timezone: tz }),
      });
      await refresh();
    } catch (e) {
      if (await maybeHandleUnauthorized(e)) return;
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [session, profile, refresh, maybeHandleUnauthorized]);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setTodayDateKey(null);
      setMissionsToday([]);
      setLast7Days([]);
      return;
    }
    void refresh();
  }, [session, refresh]);

  useEffect(() => {
    // Fetch templates once per archetype (server is source-of-truth), fall back to
    // bundled constants if the table/column isn't available.
    if (!session) {
      setArchetypeTemplates(undefined);
      return;
    }
    if (!profile?.archetypeId) {
      setArchetypeTemplates(undefined);
      return;
    }

    let cancelled = false;
    const fallback = getArchetypeById(profile.archetypeId)?.messageTemplates;

    (async () => {
      try {
        const res = await apiFetch<{ archetypes: any[] }>(session, '/v1/archetypes');
        const match = Array.isArray(res.archetypes)
          ? res.archetypes.find((a) => a?.id === profile.archetypeId)
          : null;

        const mt = match?.messageTemplates ?? match?.message_templates;
        const next: AscendiaNotificationTemplates | undefined =
          mt && typeof mt === 'object'
            ? {
                missionAssigned:
                  typeof (mt as any).missionAssigned === 'string'
                    ? (mt as any).missionAssigned
                    : undefined,
                eveningReminder:
                  typeof (mt as any).eveningReminder === 'string'
                    ? (mt as any).eveningReminder
                    : undefined,
                midnightFailure:
                  typeof (mt as any).midnightFailure === 'string'
                    ? (mt as any).midnightFailure
                    : undefined,
              }
            : fallback;

        if (!cancelled) setArchetypeTemplates(next ?? fallback);
      } catch {
        if (!cancelled) setArchetypeTemplates(fallback);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, profile?.archetypeId]);

  useEffect(() => {
    // Schedule daily local notifications once the user is signed in and has
    // selected a mentor (so onboarding is done). Time is automatic via timezone.
    if (!session) return;
    if (!profile?.archetypeId) return;
    const allComplete =
      missionsToday.length > 0 && missionsToday.every((m) => m.status === 'completed');

    const templates = archetypeTemplates ?? getArchetypeById(profile.archetypeId)?.messageTemplates;

    void setAscendiaDailyNotificationsEnabled(notificationsEnabled, {
      templates,
      todayDateKey,
      todayComplete: allComplete,
      horizonDays: 7,
    });
  }, [session, profile?.archetypeId, notificationsEnabled, missionsToday, todayDateKey, archetypeTemplates]);

  const setNotificationsEnabled = useCallback(
    async (enabled: boolean) => {
      setNotificationsEnabledState(enabled);
      try {
        await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? '1' : '0');
      } catch {
        // ignore
      }
      // If user disables, cancel immediately; if enables, schedule.
      if (session && profile?.archetypeId) {
        const allComplete =
          missionsToday.length > 0 && missionsToday.every((m) => m.status === 'completed');
        const templates =
          archetypeTemplates ?? getArchetypeById(profile.archetypeId)?.messageTemplates;

        await setAscendiaDailyNotificationsEnabled(enabled, {
          templates,
          todayDateKey,
          todayComplete: allComplete,
          horizonDays: 7,
        });
      }
    },
    [session, profile?.archetypeId, missionsToday, todayDateKey, archetypeTemplates]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      beginAuthFlow();
      setError(null);
      setLoading(true);
      try {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(error.message);
          throw error;
        }
      } finally {
        setLoading(false);
      }
    },
    [beginAuthFlow]
  );

  const signInWithGoogle = useCallback(async () => {
    beginAuthFlow();
    setError(null);
    setLoading(true);
    try {
      const appOwnership = Constants.appOwnership;
      const isExpoGo = appOwnership === 'expo';

      // In Expo Go, custom schemes like `ascendia://` won't be handled, so we must use
      // the Expo Auth Proxy redirect URI (https://auth.expo.io/@user/slug).
      const owner = Constants.expoConfig?.owner;
      const slug = Constants.expoConfig?.slug;
      const proxyRedirectTo =
        owner && slug ? `https://auth.expo.io/@${owner}/${slug}/auth/callback` : null;

      const redirectTo =
        isExpoGo && proxyRedirectTo ? proxyRedirectTo : Linking.createURL('auth/callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) {
        setError(error.message);
        throw error;
      }
      const authUrl = data?.url;
      if (!authUrl) {
        const err = new Error('Missing OAuth URL from Supabase.');
        setError(err.message);
        throw err;
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.assign(authUrl);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);
      if (result.type !== 'success' || !result.url) return;

      const parsed = Linking.parse(result.url);
      const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null;
      if (!code) {
        // Some configurations return implicit-flow tokens in the URL hash instead of a code.
        // Example: http://localhost:8081/auth/callback#access_token=...&refresh_token=...
        const hash = result.url.includes('#') ? result.url.split('#')[1] : '';
        if (hash) {
          const hashParams = new URLSearchParams(hash);
          const access_token = hashParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token');
          if (access_token && refresh_token) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (setSessionError) {
              setError(setSessionError.message);
              throw setSessionError;
            }
          }
        }
        return;
      }

      // Expo Go will not open our in-app callback screen via a custom scheme, so exchange here.
      // In dev/prod builds this is also safe; exchangeCodeForSession is idempotent for a given code.
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        setError(exchangeError.message);
        throw exchangeError;
      }
    } finally {
      setLoading(false);
    }
  }, [beginAuthFlow]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      beginAuthFlow();
      setError(null);
      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
          throw error;
        }
      } finally {
        setLoading(false);
      }
    },
    [beginAuthFlow]
  );

  const startEmailOtp = useCallback(
    async (email: string) => {
      beginAuthFlow();
      setError(null);
      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
          },
        });
        if (error) {
          setError(error.message);
          throw error;
        }
      } finally {
        setLoading(false);
      }
    },
    [beginAuthFlow]
  );

  const verifyEmailOtp = useCallback(
    async (email: string, code: string) => {
      beginAuthFlow();
      setError(null);
      setLoading(true);
      try {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token: code,
          type: 'email',
        });
        if (error) {
          setError(error.message);
          throw error;
        }
      } finally {
        setLoading(false);
      }
    },
    [beginAuthFlow]
  );

  const signOut = useCallback(async () => {
    setError(null);
    await forceSignOut();
  }, [forceSignOut]);

  const deleteAccount = useCallback(async () => {
    if (!session) return;
    setError(null);
    setLoading(true);
    try {
      await apiFetch<{ ok: true }>(session, '/v1/me', { method: 'DELETE' });
      await setAscendiaDailyNotificationsEnabled(false);
      await forceSignOut();
    } catch (e) {
      if (await maybeHandleUnauthorized(e)) return;
      setError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, [session, maybeHandleUnauthorized, forceSignOut]);

  const setArchetype = useCallback(
    async (archetypeId: string) => {
      if (!session) return;
      setError(null);
      setLoading(true);
      try {
        await apiFetch<{ profile: any }>(session, '/v1/me', {
          method: 'PATCH',
          body: JSON.stringify({ archetypeId }),
        });
        await refresh();
      } catch (e) {
        if (await maybeHandleUnauthorized(e)) return;
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [session, refresh, maybeHandleUnauthorized]
  );

  const completeMission = useCallback(
    async (missionId: string) => {
      if (!session) return;
      setError(null);
      setLoading(true);
      try {
        const res = await apiFetch<{ profile: any; missions: any[] }>(
          session,
          `/v1/missions/${encodeURIComponent(missionId)}/complete`,
          { method: 'POST' }
        );
        setMissionsToday((res.missions ?? []).map(mapMissionRow));
        if (profile) {
          setProfile(mapProfileRow({ id: profile.userId, email: profile.email }, res.profile));
        }
      } catch (e) {
        if (await maybeHandleUnauthorized(e)) return;
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [session, profile, maybeHandleUnauthorized]
  );

  const getMissionById = useCallback(
    (missionId: string) => missionsToday.find((m) => m.id === missionId) ?? null,
    [missionsToday]
  );

  const state = useMemo<AppState>(
    () => ({
      session,
      profile,
      todayDateKey,
      missionsToday,
      last7Days,
      notificationsEnabled,
      loading,
      error,
    }),
    [session, profile, todayDateKey, missionsToday, last7Days, notificationsEnabled, loading, error]
  );

  const api = useMemo<AppStateApi>(
    () => ({
      state,
      signUp,
      signIn,
      signInWithGoogle,
      startEmailOtp,
      verifyEmailOtp,
      signOut,
      deleteAccount,
      refresh,
      setTimezoneIfNeeded,
      setArchetype,
      completeMission,
      getMissionById,
      setNotificationsEnabled,
    }),
    [
      state,
      signUp,
      signIn,
      signInWithGoogle,
      startEmailOtp,
      verifyEmailOtp,
      signOut,
      deleteAccount,
      refresh,
      setTimezoneIfNeeded,
      setArchetype,
      completeMission,
      getMissionById,
      setNotificationsEnabled,
    ]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAppState(): AppStateApi {
  const value = useContext(Ctx);
  if (!value) throw new Error('useAppState must be used within AppStateProvider');
  return value;
}
