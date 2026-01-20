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

export function generateDailyMissions(params: {
  dateKey: string;
  difficultyMultiplier: number;
  count?: number;
}): Array<{ type: MissionType; targetValue: number }> {
  const { dateKey, difficultyMultiplier, count = 4 } = params;

  const rng = mulberry32(hashStringToSeed(dateKey));
  const chosen = pickUnique(
    rng,
    MISSION_TYPES,
    Math.min(5, Math.max(3, count)),
  );

  const gentleRamp =
    1 + ((hashStringToSeed(`ramp:${dateKey}`) % 365) / 365) * 0.25;

  return chosen.map((type) => {
    const base = baseTargetFor(type);
    const noise = 0.9 + rng() * 0.2;
    const targetValue = roundTarget(
      type,
      base * difficultyMultiplier * gentleRamp * noise,
    );

    return { type, targetValue };
  });
}
