import "dotenv/config";

import { resolveDifficultyMultiplier } from "../archetypes.js";
import { getEnv } from "../env.js";
import { reconcilePastDays, type ProfileRow } from "../routes.js";
import { createAdminSupabaseClient } from "../supabase.js";
import { dateKeyInTimeZone } from "../time.js";

async function main() {
  const env = getEnv();
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

    if (page.error) throw page.error;

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

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      { ok: errors.length === 0, processed, reconciled, errors },
      null,
      2,
    ),
  );

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
