import type { FastifyInstance } from "fastify";

import { requireUser } from "./auth";
import { getEnv } from "./env";
import { generateDailyMissions } from "./mission-engine";
import { createAdminSupabaseClient } from "./supabase";
import { dateKeyInTimeZone, diffDays } from "./time";

const ALLOWED_ARCHETYPES = new Set([
  "shadow-ascendant",
  "iron-sentinel",
  "flame-vanguard",
]);

type ProfileRow = {
  user_id: string;
  email: string | null;
  timezone: string;
  archetype_id: string | null;
  current_streak: number;
  longest_streak: number;
  level: number;
  successful_days: number;
  total_missions_completed: number;
  last_success_date: string | null;
  created_at: string;
  updated_at: string;
};

type MissionRow = {
  id: string;
  user_id: string;
  date_key: string;
  type: string;
  target_value: number;
  status: "pending" | "completed" | "failed" | "skipped";
  created_at: string;
  completed_at: string | null;
};

function isSchemaMissingError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    // PostgREST error code surfaced via supabase-js
    (err as any).code === "PGRST205"
  );
}

function schemaNotInitializedError() {
  const err = new Error(
    "Database schema not initialized. Apply apps/api/db/schema.sql in the Supabase SQL editor, then restart the API.",
  );
  // @ts-expect-error fastify statusCode
  err.statusCode = 503;
  return err;
}

async function upsertProfile(params: {
  user: { id: string; email: string | null };
  timezone?: string;
  archetypeId?: string;
}): Promise<ProfileRow> {
  const supabase = createAdminSupabaseClient();

  const update: Partial<ProfileRow> & Pick<ProfileRow, "user_id"> = {
    user_id: params.user.id,
    email: params.user.email,
  };

  if (params.timezone) update.timezone = params.timezone;
  if (params.archetypeId) update.archetype_id = params.archetypeId;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(update, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error || !data) {
    if (isSchemaMissingError(error)) throw schemaNotInitializedError();
    throw error ?? new Error("Failed to load profile");
  }
  return data as ProfileRow;
}

async function getTodayMissions(params: {
  userId: string;
  dateKey: string;
  difficultyMultiplier: number;
}): Promise<MissionRow[]> {
  const supabase = createAdminSupabaseClient();

  const existing = await supabase
    .from("missions")
    .select("*")
    .eq("user_id", params.userId)
    .eq("date_key", params.dateKey)
    .order("created_at", { ascending: true });

  if (existing.error) {
    if (isSchemaMissingError(existing.error)) throw schemaNotInitializedError();
    throw existing.error;
  }

  if (existing.data && existing.data.length > 0) {
    return existing.data as MissionRow[];
  }

  const generated = generateDailyMissions({
    dateKey: params.dateKey,
    difficultyMultiplier: params.difficultyMultiplier,
  });

  const toInsert = generated.map((m) => ({
    user_id: params.userId,
    date_key: params.dateKey,
    type: m.type,
    target_value: m.targetValue,
    status: "pending" as const,
  }));

  const inserted = await supabase
    .from("missions")
    .upsert(toInsert, { onConflict: "user_id,date_key,type" })
    .select("*")
    .eq("user_id", params.userId)
    .eq("date_key", params.dateKey)
    .order("created_at", { ascending: true });

  if (inserted.error) {
    if (isSchemaMissingError(inserted.error)) throw schemaNotInitializedError();
    throw inserted.error;
  }
  return (inserted.data ?? []) as MissionRow[];
}

export async function registerRoutes(app: FastifyInstance) {
  const env = getEnv();

  function badRequest(message: string) {
    const err = new Error(message);
    // @ts-expect-error fastify statusCode
    err.statusCode = 400;
    return err;
  }

  function notFound(message: string) {
    const err = new Error(message);
    // @ts-expect-error fastify statusCode
    err.statusCode = 404;
    return err;
  }

  app.get("/v1/me", async (req) => {
    const user = await requireUser(req);
    const profile = await upsertProfile({ user });
    return { user, profile };
  });

  app.patch("/v1/me", async (req) => {
    const user = await requireUser(req);
    const body = (req.body ?? {}) as {
      timezone?: string;
      archetypeId?: string;
    };

    let archetypeId = body.archetypeId;
    if (typeof archetypeId !== "undefined") {
      if (archetypeId === null) archetypeId = undefined;
      if (archetypeId && !ALLOWED_ARCHETYPES.has(archetypeId)) {
        throw badRequest("Unknown archetypeId");
      }
    }

    const timezone =
      typeof body.timezone === "string" ? body.timezone : undefined;

    const profile = await upsertProfile({ user, timezone, archetypeId });
    return { profile };
  });

  app.get("/v1/missions/today", async (req) => {
    const user = await requireUser(req);
    const profile = await upsertProfile({ user });

    const dateKey = dateKeyInTimeZone(new Date(), profile.timezone);
    const difficultyMultiplier =
      profile.archetype_id === "shadow-ascendant"
        ? 1.2
        : profile.archetype_id === "flame-vanguard"
          ? 1.1
          : 1.0;

    const missions = await getTodayMissions({
      userId: user.id,
      dateKey,
      difficultyMultiplier,
    });

    return { dateKey, missions, profile };
  });

  app.post("/v1/missions/:missionId/complete", async (req) => {
    const user = await requireUser(req);
    const missionId = (req.params as { missionId: string }).missionId;

    const supabase = createAdminSupabaseClient();

    const current = await supabase
      .from("missions")
      .select("*")
      .eq("id", missionId)
      .eq("user_id", user.id)
      .single();

    if (current.error && isSchemaMissingError(current.error)) {
      throw schemaNotInitializedError();
    }
    if (current.error || !current.data) {
      throw notFound("Mission not found");
    }

    const mission = current.data as MissionRow;
    if (mission.status !== "completed") {
      const updated = await supabase
        .from("missions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", missionId)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (updated.error) {
        if (isSchemaMissingError(updated.error))
          throw schemaNotInitializedError();
        throw updated.error;
      }

      // Increment total missions completed (server-authoritative).
      const currentProfile = await upsertProfile({ user });
      const inc = await supabase
        .from("profiles")
        .update({
          total_missions_completed: currentProfile.total_missions_completed + 1,
        })
        .eq("user_id", user.id);

      if (inc.error) {
        if (isSchemaMissingError(inc.error)) throw schemaNotInitializedError();
        throw inc.error;
      }
    }

    // Fetch current profile and today's missions.
    let profile = await upsertProfile({ user });
    const dateKey = mission.date_key;

    const missions = await supabase
      .from("missions")
      .select("*")
      .eq("user_id", user.id)
      .eq("date_key", dateKey)
      .order("created_at", { ascending: true });

    if (missions.error) {
      if (isSchemaMissingError(missions.error))
        throw schemaNotInitializedError();
      throw missions.error;
    }

    const missionRows = (missions.data ?? []) as MissionRow[];
    const allComplete =
      missionRows.length > 0 &&
      missionRows.every((m) => m.status === "completed");

    if (allComplete) {
      const last = profile.last_success_date;
      if (last !== dateKey) {
        const dayDiff = last ? diffDays(dateKey, last) : null;
        const nextStreak = dayDiff === 1 ? profile.current_streak + 1 : 1;
        const nextLongest = Math.max(profile.longest_streak, nextStreak);
        const nextSuccessfulDays = profile.successful_days + 1;
        const nextLevel =
          1 + Math.floor(nextSuccessfulDays / env.LEVEL_UP_EVERY_DAYS);

        const profUpdate = await supabase
          .from("profiles")
          .update({
            current_streak: nextStreak,
            longest_streak: nextLongest,
            successful_days: nextSuccessfulDays,
            level: nextLevel,
            last_success_date: dateKey,
          })
          .eq("user_id", user.id)
          .select("*")
          .single();

        if (profUpdate.error || !profUpdate.data)
          throw isSchemaMissingError(profUpdate.error)
            ? schemaNotInitializedError()
            : (profUpdate.error ?? new Error("Failed to update profile"));
        profile = profUpdate.data as ProfileRow;

        const up = await supabase.from("progress_log").upsert(
          {
            user_id: user.id,
            date_key: dateKey,
            completed_missions: missionRows.length,
            failed: false,
          },
          { onConflict: "user_id,date_key" },
        );

        if (up.error) {
          if (isSchemaMissingError(up.error)) throw schemaNotInitializedError();
          throw up.error;
        }
      }
    }

    return { profile, missions: missionRows };
  });

  app.get("/v1/progress/last7", async (req) => {
    const user = await requireUser(req);
    const profile = await upsertProfile({ user });

    const supabase = createAdminSupabaseClient();

    // last 7 dates based on user timezone
    const todayKey = dateKeyInTimeZone(new Date(), profile.timezone);
    const today = new Date(`${todayKey}T00:00:00Z`);
    const dateKeys = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      return d.toISOString().slice(0, 10);
    });

    const { data, error } = await supabase
      .from("missions")
      .select("date_key,status")
      .eq("user_id", user.id)
      .in("date_key", dateKeys);

    if (error) {
      if (isSchemaMissingError(error)) throw schemaNotInitializedError();
      throw error;
    }

    const byDate: Record<string, { total: number; completed: number }> = {};
    for (const k of dateKeys) byDate[k] = { total: 0, completed: 0 };

    for (const row of data ?? []) {
      const k = String((row as any).date_key);
      if (!byDate[k]) byDate[k] = { total: 0, completed: 0 };
      byDate[k].total += 1;
      if ((row as any).status === "completed") byDate[k].completed += 1;
    }

    const days = dateKeys.map((k) => ({ dateKey: k, ...byDate[k] }));

    return {
      profile,
      days,
      totals: {
        totalMissionsCompleted: profile.total_missions_completed,
        currentStreak: profile.current_streak,
        longestStreak: profile.longest_streak,
        level: profile.level,
      },
    };
  });
}
