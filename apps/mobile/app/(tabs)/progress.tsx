import { router } from "expo-router";
import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAppState } from "@/state/app-state";

export default function ProgressScreen() {
  const { state } = useAppState();

  if (!state.session) {
    router.replace("/auth/login");
    return null;
  }

  const totalCompletions = state.profile?.totalMissionsCompleted ?? 0;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Progress</ThemedText>
      <ThemedText style={styles.sub}>
        Basic analytics (MVP): last 7 days + totals.
      </ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Totals</ThemedText>
        <ThemedText>Total missions completed: {totalCompletions}</ThemedText>
        <ThemedText>
          Current streak: {state.profile?.currentStreak ?? 0}
        </ThemedText>
        <ThemedText>
          Longest streak: {state.profile?.longestStreak ?? 0}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Last 7 Days</ThemedText>
        {state.last7Days.map((d) => (
          <ThemedText key={d.dateKey} style={styles.row}>
            {d.dateKey}: {d.completed}/{d.total} completed
          </ThemedText>
        ))}
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
  sub: {
    opacity: 0.8,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(127,127,127,0.35)",
  },
  row: {
    opacity: 0.9,
  },
});
