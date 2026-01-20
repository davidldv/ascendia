import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getArchetypeById } from "@/constants/archetypes";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppState } from "@/state/app-state";

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? "light"].tint;

  const { state, signOut } = useAppState();

  if (!state.session) {
    router.replace("/auth/login");
    return null;
  }

  const archetype = getArchetypeById(state.profile?.archetypeId ?? null);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Profile</ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Account</ThemedText>
        <ThemedText>{state.profile?.email ?? ""}</ThemedText>
        <ThemedText style={styles.dim}>
          Timezone: {state.profile?.timezone ?? "UTC"}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Mentor</ThemedText>
        <ThemedText>{archetype?.displayName ?? "None selected"}</ThemedText>
        {archetype ? (
          <ThemedText style={styles.dim}>{archetype.description}</ThemedText>
        ) : null}

        <ThemedText type="link" onPress={() => router.push("/choose-mentor")}>
          Change mentor →
        </ThemedText>
      </ThemedView>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void signOut();
        }}
        style={({ pressed }) => [
          styles.outlineButton,
          { borderColor: tint, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <ThemedText style={{ color: tint, fontWeight: "700" }}>
          Sign out
        </ThemedText>
      </Pressable>

      <ThemedText style={styles.dim}>
        Auth, account settings, and notifications land next.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
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
  outlineButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
});
