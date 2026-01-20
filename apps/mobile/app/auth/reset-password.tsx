import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, TextInput } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordScreen() {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? "light"].tint;

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Reset Password</ThemedText>
      <ThemedText style={styles.dim}>
        Send a password reset email via Supabase.
      </ThemedText>

      {status ? <ThemedText style={styles.status}>{status}</ThemedText> : null}
      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={[styles.input, { borderColor: tint }]}
      />

      <Pressable
        accessibilityRole="button"
        onPress={async () => {
          setError(null);
          setStatus(null);
          const { error } = await supabase.auth.resetPasswordForEmail(
            email.trim(),
          );
          if (error) {
            setError(error.message);
            return;
          }
          setStatus("If that email exists, a reset link was sent.");
        }}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: tint, borderColor: tint },
          pressed ? { opacity: 0.85 } : null,
        ]}
      >
        <ThemedText style={[styles.buttonText, { color: "#fff" }]}>
          Send reset email
        </ThemedText>
      </Pressable>

      <ThemedText type="link" onPress={() => router.back()}>
        Back →
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    gap: 12,
  },
  dim: {
    opacity: 0.75,
  },
  status: {
    opacity: 0.9,
  },
  error: {
    color: "#b00020",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
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
