import type { Session } from "@supabase/supabase-js";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { MissionStatus, MissionType } from "@/types/domain";

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
  refresh: () => Promise<void>;
  setTimezoneIfNeeded: () => Promise<void>;
  setArchetype: (archetypeId: string) => Promise<void>;
  completeMission: (missionId: string) => Promise<void>;
  getMissionById: (missionId: string) => ApiMission | null;
};

const Ctx = createContext<AppStateApi | null>(null);

function mapProfileRow(
  user: { id: string; email: string | null },
  row: any,
): Profile {
  return {
    userId: user.id,
    email: user.email,
    timezone: row.timezone ?? "UTC",
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setSession(data.session ?? null);
      })
      .catch((e) => {
        if (mounted) setError(String(e));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
      },
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!session) return;
    setError(null);
    setLoading(true);
    try {
      const me = await apiFetch<{
        user: { id: string; email: string | null };
        profile: any;
      }>(session, "/v1/me");
      setProfile(mapProfileRow(me.user, me.profile));

      const today = await apiFetch<{
        dateKey: string;
        missions: any[];
        profile: any;
      }>(session, "/v1/missions/today");
      setTodayDateKey(today.dateKey);
      setMissionsToday((today.missions ?? []).map(mapMissionRow));
      setProfile((prev) => {
        if (!prev) return mapProfileRow(me.user, today.profile);
        return mapProfileRow(me.user, today.profile);
      });

      const progress = await apiFetch<{ days: ProgressDay[]; profile: any }>(
        session,
        "/v1/progress/last7",
      );
      setLast7Days(progress.days ?? []);
      setProfile((prev) => {
        if (!prev) return prev;
        return mapProfileRow(
          { id: prev.userId, email: prev.email },
          progress.profile,
        );
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [session]);

  const setTimezoneIfNeeded = useCallback(async () => {
    if (!session || !profile) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || tz === profile.timezone) return;
    try {
      await apiFetch<{ profile: any }>(session, "/v1/me", {
        method: "PATCH",
        body: JSON.stringify({ timezone: tz }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [session, profile, refresh]);

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

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      throw error;
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoading(false);
      throw error;
    }
    setLoading(false);
  }, []);

  const startEmailOtp = useCallback(async (email: string) => {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });
    if (error) {
      setLoading(false);
      throw error;
    }
    setLoading(false);
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, code: string) => {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (error) {
      setLoading(false);
      throw error;
    }
    setLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    await supabase.auth.signOut();
  }, []);

  const setArchetype = useCallback(
    async (archetypeId: string) => {
      if (!session) return;
      setError(null);
      setLoading(true);
      try {
        await apiFetch<{ profile: any }>(session, "/v1/me", {
          method: "PATCH",
          body: JSON.stringify({ archetypeId }),
        });
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [session, refresh],
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
          { method: "POST" },
        );
        setMissionsToday((res.missions ?? []).map(mapMissionRow));
        if (profile) {
          setProfile(
            mapProfileRow(
              { id: profile.userId, email: profile.email },
              res.profile,
            ),
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [session, profile],
  );

  const getMissionById = useCallback(
    (missionId: string) =>
      missionsToday.find((m) => m.id === missionId) ?? null,
    [missionsToday],
  );

  const state = useMemo<AppState>(
    () => ({
      session,
      profile,
      todayDateKey,
      missionsToday,
      last7Days,
      loading,
      error,
    }),
    [session, profile, todayDateKey, missionsToday, last7Days, loading, error],
  );

  const api = useMemo<AppStateApi>(
    () => ({
      state,
      signUp,
      signIn,
      startEmailOtp,
      verifyEmailOtp,
      signOut,
      refresh,
      setTimezoneIfNeeded,
      setArchetype,
      completeMission,
      getMissionById,
    }),
    [
      state,
      signUp,
      signIn,
      startEmailOtp,
      verifyEmailOtp,
      signOut,
      refresh,
      setTimezoneIfNeeded,
      setArchetype,
      completeMission,
      getMissionById,
    ],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAppState(): AppStateApi {
  const value = useContext(Ctx);
  if (!value)
    throw new Error("useAppState must be used within AppStateProvider");
  return value;
}
