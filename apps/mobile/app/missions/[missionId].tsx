import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatMissionTarget, formatMissionTitle } from "@/lib/missions";
import { useAppState } from "@/state/app-state";

export default function MissionDetailScreen() {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? "light"].tint;

  const { missionId } = useLocalSearchParams<{ missionId: string }>();
  const { state, getMissionById, completeMission } = useAppState();

  if (!state.session) {
    router.replace("/auth/login");
    return null;
  }
  const mission = getMissionById(String(missionId));

  if (!mission) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Mission</ThemedText>
        <ThemedText>Not found.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{formatMissionTitle(mission.type)}</ThemedText>
      <ThemedText style={styles.target}>
        Target: {formatMissionTarget(mission.type, mission.targetValue)}
      </ThemedText>

      <ThemedText style={styles.copy}>
        Complete it. Mark it done only when it is done.
      </ThemedText>

      <Pressable
        onPress={() => {
          void completeMission(mission.id).then(() => router.back());
        }}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: mission.status === "completed" ? "#aaa" : tint,
            borderColor: tint,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        disabled={mission.status === "completed"}
      >
        <ThemedText style={styles.buttonText}>
          {mission.status === "completed" ? "Completed" : "Mark Completed"}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  target: {
    fontSize: 18,
    opacity: 0.95,
  },
  copy: {
    opacity: 0.8,
  },
  button: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
