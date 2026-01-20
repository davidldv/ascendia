import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppState } from "@/state/app-state";

export default function SignupScreen() {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? "light"].tint;

  const { state, signUp } = useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const disabled = state.loading || !email || password.length < 8;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Create Account</ThemedText>
      <ThemedText style={styles.dim}>Minimum 8-character password.</ThemedText>

      {state.error ? (
        <ThemedText style={styles.error}>{state.error}</ThemedText>
      ) : null}

      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={[styles.input, { borderColor: tint }]}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={[styles.input, { borderColor: tint }]}
      />

      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={async () => {
          await signUp(email.trim(), password);
          router.replace("/(tabs)");
        }}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: disabled ? "transparent" : tint,
            borderColor: tint,
          },
          pressed && !disabled ? { opacity: 0.85 } : null,
        ]}
      >
        {state.loading ? (
          <ActivityIndicator color={disabled ? tint : "#fff"} />
        ) : (
          <ThemedText
            style={[styles.buttonText, { color: disabled ? tint : "#fff" }]}
          >
            Sign up
          </ThemedText>
        )}
      </Pressable>

      <ThemedText
        type="link"
        onPress={() => router.replace("/auth/login" as any)}
      >
        Back to login →
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
