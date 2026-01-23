import type { Archetype } from "@/types/domain";

export const ARCHETYPES: readonly Archetype[] = [
  {
    id: "shadow-ascendant",
    displayName: "Shadow Ascendant",
    description: "Ruthless discipline. No excuses. No negotiation.",
    difficultyMultiplier: 1.2,
    tone: "strict",
    messageTemplates: {
      missionAssigned: "Your mission is set. Execute.",
      eveningReminder: "You are behind. Finish your missions.",
      midnightFailure: "Failure recorded. Return stronger tomorrow.",
    },
  },
  {
    id: "iron-sentinel",
    displayName: "Iron Sentinel",
    description: "Balanced structure. Consistency over intensity.",
    difficultyMultiplier: 1.0,
    tone: "calm",
    messageTemplates: {
      missionAssigned: "Today’s missions are ready. Stay consistent.",
      eveningReminder: "You still have missions to complete.",
      midnightFailure: "Today is marked as failed. Reset and continue.",
    },
  },
  {
    id: "flame-vanguard",
    displayName: "Flame Vanguard",
    description: "Aggressive pace. Momentum is mandatory.",
    difficultyMultiplier: 1.1,
    tone: "aggressive",
    messageTemplates: {
      missionAssigned: "Missions locked. Move now.",
      eveningReminder: "No hesitation. Finish what you started.",
      midnightFailure: "Deadline missed. Streak broken.",
    },
  },
] as const;

export function getArchetypeById(
  id: string | null | undefined,
): Archetype | null {
  if (!id) return null;
  return (ARCHETYPES as readonly Archetype[]).find((a) => a.id === id) ?? null;
}
