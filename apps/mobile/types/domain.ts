export type ArchetypeTone = "strict" | "calm" | "aggressive" | "silent";

export type ArchetypeMessageTemplates = {
  missionAssigned?: string;
  eveningReminder?: string;
  midnightFailure?: string;
};

export type Archetype = {
  id: string;
  displayName: string;
  description: string;
  difficultyMultiplier: number;
  tone: ArchetypeTone;
  messageTemplates?: ArchetypeMessageTemplates;
};

export type MissionType = "pushups" | "squats" | "plank" | "crunches" | "run";

export type MissionStatus = "pending" | "completed" | "failed" | "skipped";

export type Mission = {
  id: string;
  dateKey: string; // YYYY-MM-DD in user's local timezone
  type: MissionType;
  targetValue: number;
  status: MissionStatus;
};
