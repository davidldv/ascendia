type MissionType = "pushups" | "squats" | "plank" | "crunches" | "run";

const MISSION_TYPES: readonly MissionType[] = [
  "pushups",
  "squats",
  "plank",
  "crunches",
  "run",
];

function hashStringToSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickUnique<T>(
  rng: () => number,
  items: readonly T[],
  count: number,
): T[] {
  const copy = [...items];
  const selected: T[] = [];
  while (selected.length < count && copy.length > 0) {
    const idx = Math.floor(rng() * copy.length);
    selected.push(copy.splice(idx, 1)[0]!);
  }
  return selected;
}

function baseTargetFor(type: MissionType): number {
  switch (type) {
    case "pushups":
      return 20;
    case "squats":
      return 30;
    case "plank":
      return 60;
    case "crunches":
      return 25;
    case "run":
      return 15;
    default:
      return 10;
  }
}

function roundTarget(type: MissionType, value: number): number {
  if (type === "plank") return Math.max(20, Math.round(value / 10) * 10);
  if (type === "run") return Math.max(5, Math.round(value / 5) * 5);
  return Math.max(5, Math.round(value / 5) * 5);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function computeProgressionMultiplier(params?: {
  successfulDays?: number;
  currentStreak?: number;
  level?: number;
}): number {
  if (!params) return 1.0;

  const successfulDays = Math.max(0, Number(params.successfulDays ?? 0));
  const currentStreak = Math.max(0, Number(params.currentStreak ?? 0));
  const level = Math.max(1, Number(params.level ?? 1));

  // Slow, user-based progression:
  // - successfulDays is the primary driver (caps at +35%)
  // - currentStreak provides a small momentum bonus (caps at +10%)
  // - level provides a tiny smoothing factor (caps at +10%)
  const bySuccessfulDays = 1 + clamp(successfulDays * 0.01, 0, 0.35);
  const byStreak = 1 + clamp(currentStreak * 0.005, 0, 0.1);
  const byLevel = 1 + clamp((level - 1) * 0.01, 0, 0.1);

  return clamp(bySuccessfulDays * byStreak * byLevel, 0.9, 1.6);
}

export function generateDailyMissions(params: {
  dateKey: string;
  difficultyMultiplier: number;
  count?: number;
  progression?: {
    successfulDays?: number;
    currentStreak?: number;
    level?: number;
  };
}): Array<{ type: MissionType; targetValue: number }> {
  const { dateKey, difficultyMultiplier, count = 4, progression } = params;

  const rng = mulberry32(hashStringToSeed(dateKey));
  const chosen = pickUnique(
    rng,
    MISSION_TYPES,
    Math.min(5, Math.max(3, count)),
  );

  // Keep a tiny date-based wobble (prevents flat targets across long stretches),
  // but make the primary increase depend on the user's progression.
  const gentleRamp = 1 + ((hashStringToSeed(`ramp:${dateKey}`) % 365) / 365) * 0.08;
  const progressionMultiplier = computeProgressionMultiplier(progression);
  const effectiveMultiplier = difficultyMultiplier * progressionMultiplier;

  return chosen.map((type) => {
    const base = baseTargetFor(type);
    const noise = 0.9 + rng() * 0.2;
    const targetValue = roundTarget(
      type,
      base * effectiveMultiplier * gentleRamp * noise,
    );

    return { type, targetValue };
  });
}
