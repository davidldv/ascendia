import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ARCHETYPES } from "@/constants/archetypes";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppState } from "@/state/app-state";

export default function ChooseMentorScreen() {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? "light"].tint;
  const { state, setArchetype } = useAppState();

  if (!state.session) {
    router.replace("/auth/login");
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Choose Mentor</ThemedText>
      <ThemedText style={styles.subtitle}>
        This choice sets your tone and difficulty.
      </ThemedText>

      <ThemedView style={styles.list}>
        {ARCHETYPES.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => {
              void setArchetype(a.id).then(() => router.replace("/(tabs)"));
            }}
            style={({ pressed }) => [
              styles.card,
              { borderColor: tint, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <ThemedText type="subtitle">{a.displayName}</ThemedText>
            <ThemedText style={styles.desc}>{a.description}</ThemedText>
            <ThemedText style={styles.meta}>
              Tone: {a.tone} • Difficulty: ×{a.difficultyMultiplier}
            </ThemedText>
          </Pressable>
        ))}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  subtitle: {
    opacity: 0.8,
  },
  list: {
    gap: 12,
    marginTop: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  desc: {
    opacity: 0.9,
  },
  meta: {
    opacity: 0.7,
    fontSize: 14,
  },
});
