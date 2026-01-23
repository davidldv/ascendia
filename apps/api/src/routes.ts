import type { FastifyInstance } from "fastify";

import {
  isValidArchetypeId,
  listArchetypes,
  resolveDifficultyMultiplier,
} from "./archetypes.js";
import { requireUser } from "./auth.js";
import { getEnv } from "./env.js";
import { generateDailyMissions } from "./mission-engine.js";
import { createAdminSupabaseClient } from "./supabase.js";
import { dateKeyInTimeZone, diffDays } from "./time.js";

export type ProfileRow = {
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
  last_reconciled_date?: string | null;
  created_at: string;
  updated_at: string;
};

export type MissionRow = {
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

function profileSupportsLastReconciledDate(profile: ProfileRow): boolean {
  // PostgREST will omit unknown columns entirely, so the property won't exist.
  return Object.prototype.hasOwnProperty.call(
    profile as any,
    "last_reconciled_date",
  );
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
  progression?: { successfulDays: number; currentStreak: number; level: number };
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
    progression: params.progression,
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

function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function ensureMissionsForDate(params: {
  userId: string;
  dateKey: string;
  difficultyMultiplier: number;
  progression?: { successfulDays: number; currentStreak: number; level: number };
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
    progression: params.progression,
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

export async function reconcilePastDays(params: {
  user: { id: string; email: string | null };
  profile: ProfileRow;
  todayKey: string;
  difficultyMultiplier: number;
  env: ReturnType<typeof getEnv>;
}): Promise<ProfileRow> {
  const supabase = createAdminSupabaseClient();
  const canPersistWatermark = profileSupportsLastReconciledDate(params.profile);

  // Reconcile up to yesterday (in the user's timezone).
  const yesterdayKey = addDays(params.todayKey, -1);
  const startFrom =
    params.profile.last_reconciled_date ?? params.profile.last_success_date;

  if (!startFrom) {
    // New profile; nothing to reconcile.
    if (!canPersistWatermark) return params.profile;

    const up = await supabase
      .from("profiles")
      .update({ last_reconciled_date: yesterdayKey })
      .eq("user_id", params.user.id)
      .select("*")
      .single();
    if (up.error || !up.data) {
      if (isSchemaMissingError(up.error)) throw schemaNotInitializedError();
      throw up.error ?? new Error("Failed to update profile");
    }
    return up.data as ProfileRow;
  }

  let cursor = startFrom;
  if (diffDays(cursor, yesterdayKey) > 0) {
    // If last reconciled date is in the future, clamp.
    cursor = yesterdayKey;
  }

  // Start with the day after startFrom (since startFrom itself is already processed).
  cursor = addDays(cursor, 1);

  // If there's nothing between cursor and yesterday, just record last_reconciled_date.
  if (diffDays(cursor, yesterdayKey) > 0) {
    if (!canPersistWatermark) return params.profile;

    const up = await supabase
      .from("profiles")
      .update({ last_reconciled_date: yesterdayKey })
      .eq("user_id", params.user.id)
      .select("*")
      .single();
    if (up.error || !up.data) {
      if (isSchemaMissingError(up.error)) throw schemaNotInitializedError();
      throw up.error ?? new Error("Failed to update profile");
    }
    return up.data as ProfileRow;
  }

  let profile = params.profile;
  let failedDetected = false;

  while (diffDays(cursor, yesterdayKey) <= 0) {
    const missions = await ensureMissionsForDate({
      userId: params.user.id,
      dateKey: cursor,
      difficultyMultiplier: params.difficultyMultiplier,
      progression: {
        successfulDays: profile.successful_days,
        currentStreak: profile.current_streak,
        level: profile.level,
      },
    });

    const completed = missions.filter((m) => m.status === "completed").length;
    const allComplete = missions.length > 0 && completed === missions.length;

    if (!allComplete) {
      failedDetected = true;

      // Mark any remaining pending missions as failed (server-authoritative).
      const pendingIds = missions
        .filter((m) => m.status === "pending")
        .map((m) => m.id);

      if (pendingIds.length > 0) {
        const upd = await supabase
          .from("missions")
          .update({ status: "failed" })
          .in("id", pendingIds)
          .eq("user_id", params.user.id);

        if (upd.error) {
          if (isSchemaMissingError(upd.error))
            throw schemaNotInitializedError();
          throw upd.error;
        }
      }

      const upLog = await supabase.from("progress_log").upsert(
        {
          user_id: params.user.id,
          date_key: cursor,
          completed_missions: completed,
          failed: true,
        },
        { onConflict: "user_id,date_key" },
      );

      if (upLog.error) {
        if (isSchemaMissingError(upLog.error))
          throw schemaNotInitializedError();
        throw upLog.error;
      }

      // Missing or partially completed day breaks the streak.
      if (profile.current_streak !== 0) {
        const profUpdate = await supabase
          .from("profiles")
          .update({ current_streak: 0 })
          .eq("user_id", params.user.id)
          .select("*")
          .single();

        if (profUpdate.error || !profUpdate.data) {
          if (isSchemaMissingError(profUpdate.error))
            throw schemaNotInitializedError();
          throw profUpdate.error ?? new Error("Failed to update profile");
        }
        profile = profUpdate.data as ProfileRow;
      }
    } else {
      // If the day is complete but wasn't recorded as a success, record it.
      if (profile.last_success_date !== cursor) {
        const last = profile.last_success_date;
        const dayDiff = last ? diffDays(cursor, last) : null;
        const nextStreak = dayDiff === 1 ? profile.current_streak + 1 : 1;
        const nextLongest = Math.max(profile.longest_streak, nextStreak);
        const nextSuccessfulDays = profile.successful_days + 1;
        const nextLevel =
          1 + Math.floor(nextSuccessfulDays / params.env.LEVEL_UP_EVERY_DAYS);

        const profUpdate = await supabase
          .from("profiles")
          .update({
            current_streak: nextStreak,
            longest_streak: nextLongest,
            successful_days: nextSuccessfulDays,
            level: nextLevel,
            last_success_date: cursor,
          })
          .eq("user_id", params.user.id)
          .select("*")
          .single();

        if (profUpdate.error || !profUpdate.data) {
          if (isSchemaMissingError(profUpdate.error))
            throw schemaNotInitializedError();
          throw profUpdate.error ?? new Error("Failed to update profile");
        }
        profile = profUpdate.data as ProfileRow;

        const upLog = await supabase.from("progress_log").upsert(
          {
            user_id: params.user.id,
            date_key: cursor,
            completed_missions: missions.length,
            failed: false,
          },
          { onConflict: "user_id,date_key" },
        );

        if (upLog.error) {
          if (isSchemaMissingError(upLog.error))
            throw schemaNotInitializedError();
          throw upLog.error;
        }
      }
    }

    cursor = addDays(cursor, 1);
  }

  if (!canPersistWatermark) {
    return failedDetected
      ? await upsertProfile({ user: params.user })
      : profile;
  }

  // Record reconciliation watermark.
  const up = await supabase
    .from("profiles")
    .update({ last_reconciled_date: yesterdayKey })
    .eq("user_id", params.user.id)
    .select("*")
    .single();

  if (up.error || !up.data) {
    if (isSchemaMissingError(up.error)) throw schemaNotInitializedError();
    throw up.error ?? new Error("Failed to update profile");
  }

  // If we broke the streak due to missed days, ensure we return the updated profile.
  // (The watermark update may have returned the older row depending on DB triggers.)
  return failedDetected
    ? await upsertProfile({ user: params.user })
    : (up.data as ProfileRow);
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

  function getHeader(req: any, name: string): string | undefined {
    const value = req.headers?.[name];
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value[0];
    return undefined;
  }

  app.post("/internal/reconcile", async (req) => {
    // Intentionally return 404 when disabled/unauthorized.
    if (!env.CRON_SECRET) throw notFound("Not found");
    const provided = getHeader(req, "x-cron-secret");
    if (provided !== env.CRON_SECRET) throw notFound("Not found");

    const supabase = createAdminSupabaseClient();

    const pageSize = 500;
    let offset = 0;
    let processed = 0;
    let reconciled = 0;
    const errors: Array<{ userId: string; message: string }> = [];

    while (true) {
      const page = await supabase
        .from("profiles")
        .select("*")
        .range(offset, offset + pageSize - 1);

      if (page.error) {
        if (isSchemaMissingError(page.error)) throw schemaNotInitializedError();
        throw page.error;
      }

      const rows = (page.data ?? []) as ProfileRow[];
      if (rows.length === 0) break;

      for (const profile of rows) {
        processed += 1;
        try {
          const todayKey = dateKeyInTimeZone(new Date(), profile.timezone);
          const difficultyMultiplier = await resolveDifficultyMultiplier(
            profile.archetype_id,
          );

          await reconcilePastDays({
            user: { id: profile.user_id, email: profile.email },
            profile,
            todayKey,
            difficultyMultiplier,
            env,
          });
          reconciled += 1;
        } catch (err: any) {
          errors.push({
            userId: profile.user_id,
            message: err?.message ? String(err.message) : String(err),
          });
        }
      }

      offset += rows.length;
      if (rows.length < pageSize) break;
    }

    return { ok: errors.length === 0, processed, reconciled, errors };
  });

  app.get("/v1/me", async (req) => {
    const user = await requireUser(req);
    const profile = await upsertProfile({ user });
    return { user, profile };
  });

  app.delete("/v1/me", async (req) => {
    const user = await requireUser(req);

    const supabase = createAdminSupabaseClient();

    // Deleting the auth user cascades to profiles/missions/etc via FK constraints.
    const res = await supabase.auth.admin.deleteUser(user.id);

    if (res.error) {
      // Hide internal details but keep a useful message.
      const err = new Error('Failed to delete account');
      // @ts-expect-error fastify statusCode
      err.statusCode = 500;
      throw err;
    }

    return { ok: true };
  });

  app.get("/v1/archetypes", async (req) => {
    await requireUser(req);
    const archetypes = await listArchetypes();
    return { archetypes };
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
      if (archetypeId && !(await isValidArchetypeId(archetypeId))) {
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
    const difficultyMultiplier = await resolveDifficultyMultiplier(
      profile.archetype_id,
    );

    const reconciledProfile = await reconcilePastDays({
      user,
      profile,
      todayKey: dateKey,
      difficultyMultiplier,
      env,
    });

    const missions = await getTodayMissions({
      userId: user.id,
      dateKey,
      difficultyMultiplier,
      progression: {
        successfulDays: reconciledProfile.successful_days,
        currentStreak: reconciledProfile.current_streak,
        level: reconciledProfile.level,
      },
    });

    return { dateKey, missions, profile: reconciledProfile };
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
      const currentProfile = await upsertProfile({ user });

      const updMission = await supabase
        .from("missions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", missionId)
        .eq("user_id", user.id);

      if (updMission.error) {
        if (isSchemaMissingError(updMission.error))
          throw schemaNotInitializedError();
        throw updMission.error;
      }

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
    let profile = await upsertProfile({ user });

    const supabase = createAdminSupabaseClient();

    // last 7 dates based on user timezone
    const todayKey = dateKeyInTimeZone(new Date(), profile.timezone);

    const difficultyMultiplier = await resolveDifficultyMultiplier(
      profile.archetype_id,
    );

    profile = await reconcilePastDays({
      user,
      profile,
      todayKey,
      difficultyMultiplier,
      env,
    });

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
