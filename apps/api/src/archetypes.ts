import { createAdminSupabaseClient } from "./supabase";

export type ArchetypeTone = "strict" | "calm" | "aggressive" | "silent";

export type Archetype = {
  id: string;
  displayName: string;
  description: string;
  difficultyMultiplier: number;
  tone: ArchetypeTone;
  messageStyle?: string | null;
  messageTemplates?: unknown;
};

type ArchetypeRow = {
  id: string;
  display_name: string;
  description: string;
  difficulty_multiplier: number;
  tone: ArchetypeTone;
  message_style: string | null;
  message_templates: unknown;
};

const DEFAULT_ARCHETYPES: readonly Archetype[] = [
  {
    id: "shadow-ascendant",
    displayName: "Shadow Ascendant",
    description: "Ruthless discipline. No excuses. No negotiation.",
    difficultyMultiplier: 1.2,
    tone: "strict",
    messageStyle: "strict",
  },
  {
    id: "iron-sentinel",
    displayName: "Iron Sentinel",
    description: "Balanced structure. Consistency over intensity.",
    difficultyMultiplier: 1.0,
    tone: "calm",
    messageStyle: "calm",
  },
  {
    id: "flame-vanguard",
    displayName: "Flame Vanguard",
    description: "Aggressive pace. Momentum is mandatory.",
    difficultyMultiplier: 1.1,
    tone: "aggressive",
    messageStyle: "aggressive",
  },
] as const;

function isMissingTableOrColumnError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    // PostgREST error code surfaced via supabase-js
    (err as any).code === "PGRST205"
  );
}

function mapRow(row: ArchetypeRow): Archetype {
  return {
    id: row.id,
    displayName: row.display_name,
    description: row.description,
    difficultyMultiplier: Number(row.difficulty_multiplier),
    tone: row.tone,
    messageStyle: row.message_style,
    messageTemplates: row.message_templates,
  };
}

export async function listArchetypes(): Promise<Archetype[]> {
  const supabase = createAdminSupabaseClient();

  const res = await supabase
    .from("archetypes")
    .select(
      "id,display_name,description,difficulty_multiplier,tone,message_style,message_templates",
    )
    .order("sort_order", { ascending: true })
    .order("display_name", { ascending: true });

  if (res.error) {
    if (isMissingTableOrColumnError(res.error)) {
      return [...DEFAULT_ARCHETYPES];
    }
    throw res.error;
  }

  return (res.data ?? []).map((r) => mapRow(r as any));
}

export async function getArchetypeById(
  id: string | null | undefined,
): Promise<Archetype | null> {
  if (!id) return null;

  const supabase = createAdminSupabaseClient();
  const res = await supabase
    .from("archetypes")
    .select(
      "id,display_name,description,difficulty_multiplier,tone,message_style,message_templates",
    )
    .eq("id", id)
    .maybeSingle();

  if (res.error) {
    if (isMissingTableOrColumnError(res.error)) {
      return DEFAULT_ARCHETYPES.find((a) => a.id === id) ?? null;
    }
    throw res.error;
  }

  return res.data ? mapRow(res.data as any) : null;
}

export async function resolveDifficultyMultiplier(
  archetypeId: string | null | undefined,
): Promise<number> {
  const archetype = await getArchetypeById(archetypeId);
  return archetype?.difficultyMultiplier ?? 1.0;
}

export async function isValidArchetypeId(id: string): Promise<boolean> {
  const archetype = await getArchetypeById(id);
  return !!archetype;
}
