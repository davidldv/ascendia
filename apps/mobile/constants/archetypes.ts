import type { Archetype } from "@/types/domain";

export const ARCHETYPES: readonly Archetype[] = [
  {
    id: "shadow-ascendant",
    displayName: "Shadow Ascendant",
    description: "Ruthless discipline. No excuses. No negotiation.",
    difficultyMultiplier: 1.2,
    tone: "strict",
  },
  {
    id: "iron-sentinel",
    displayName: "Iron Sentinel",
    description: "Balanced structure. Consistency over intensity.",
    difficultyMultiplier: 1.0,
    tone: "calm",
  },
  {
    id: "flame-vanguard",
    displayName: "Flame Vanguard",
    description: "Aggressive pace. Momentum is mandatory.",
    difficultyMultiplier: 1.1,
    tone: "aggressive",
  },
] as const;

export function getArchetypeById(
  id: string | null | undefined,
): Archetype | null {
  if (!id) return null;
  return (ARCHETYPES as readonly Archetype[]).find((a) => a.id === id) ?? null;
}
