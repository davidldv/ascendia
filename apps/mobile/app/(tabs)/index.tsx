import { Redirect, router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatMissionTarget, formatMissionTitle } from "@/lib/missions";
import { useAppState } from "@/state/app-state";

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? "light"].tint;

  const { state, setTimezoneIfNeeded, refresh } = useAppState();

  useEffect(() => {
    void setTimezoneIfNeeded();
  }, [setTimezoneIfNeeded]);

  if (!state.session) return <Redirect href="/auth/login" />;

  if (state.loading && !state.profile) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Loading…</ThemedText>
        <ThemedText style={styles.dim}>
          Fetching your profile and missions.
        </ThemedText>
      </ThemedView>
    );
  }

  if (state.error && !state.profile) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Can’t load data</ThemedText>
        <ThemedText style={styles.dim}>{state.error}</ThemedText>
        <Pressable
          onPress={() => void refresh()}
          style={({ pressed }) => [
            styles.retryButton,
            { borderColor: tint, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <ThemedText type="defaultSemiBold">Retry</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  if (!state.profile) return null;
  if (!state.profile.archetypeId) return <Redirect href="/onboarding" />;

  const missions = state.missionsToday;
  const completedCount = missions.filter(
    (m) => m.status === "completed",
  ).length;
  const allComplete = completedCount === missions.length;

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.headerRow}>
        <ThemedText type="title">Today</ThemedText>
        <ThemedText style={styles.dim}>{state.todayDateKey ?? ""}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Mentor</ThemedText>
        <ThemedText>{state.profile.archetypeId}</ThemedText>
        <ThemedText type="link" onPress={() => router.push("/choose-mentor")}>
          Change →
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Missions</ThemedText>
        <ThemedText style={styles.dim}>
          {completedCount}/{missions.length} completed
          {allComplete ? " • day secured" : ""}
        </ThemedText>

        <ThemedView style={styles.list}>
          {missions.map((m) => (
            <Pressable
              key={m.id}
              onPress={() =>
                router.push(`/missions/${encodeURIComponent(m.id)}`)
              }
              style={({ pressed }) => [
                styles.missionRow,
                {
                  borderColor: tint,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <ThemedView style={styles.missionRowTop}>
                <ThemedText type="defaultSemiBold">
                  {formatMissionTitle(m.type)}
                </ThemedText>
                <ThemedText
                  style={{ color: m.status === "completed" ? tint : undefined }}
                >
                  {m.status === "completed"
                    ? "DONE"
                    : formatMissionTarget(m.type, m.targetValue)}
                </ThemedText>
              </ThemedView>
              <ThemedText style={styles.dim}>No edits. No excuses.</ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  dim: {
    opacity: 0.75,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(127,127,127,0.35)",
  },
  list: {
    gap: 10,
    marginTop: 6,
  },
  missionRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  missionRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  retryButton: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
});
