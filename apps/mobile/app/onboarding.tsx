import { router } from "expo-router";
import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAppState } from "@/state/app-state";

export default function OnboardingScreen() {
  const { state } = useAppState();

  if (!state.session) {
    router.replace("/auth/login" as any);
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Ascendia
      </ThemedText>
      <ThemedText style={styles.copy}>
        You do not rely on motivation. You obey the system.
      </ThemedText>
      <ThemedText style={styles.copy}>
        Choose a mentor archetype. Your missions will be assigned daily.
      </ThemedText>

      <ThemedText
        type="link"
        onPress={() => router.push("/choose-mentor")}
        accessibilityRole="button"
      >
        Choose your mentor →
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    gap: 14,
  },
  title: {
    letterSpacing: 0.5,
  },
  copy: {
    opacity: 0.9,
  },
});
