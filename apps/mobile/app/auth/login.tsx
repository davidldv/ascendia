import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppState } from "@/state/app-state";

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = (colorScheme ?? "light") === "dark";

  // iOS-like surfaces to match the reference screenshot
  const pageBg = isDark ? "#1C1C1E" : "#F2F2F7";
  const sheetBg = pageBg;
  const sheetBorder = "transparent";
  const rowBg = isDark ? "#2C2C2E" : "#F2F2F7";
  const rowBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  const mutedText = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  const inputBg = isDark ? "#1C1C1E" : "#FFFFFF";
  const inputText = isDark ? "#FFFFFF" : "#111111";
  const placeholder = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
  const primary = isDark ? "#0A84FF" : "#007AFF";

  const { state, startEmailOtp, verifyEmailOtp } = useAppState();

  const [emailExpanded, setEmailExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");

  const isValidEmail = useMemo(() => {
    const value = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }, [email]);

  const isValidCode = useMemo(() => {
    const value = code.trim();
    return /^\d{6}$/.test(value) || value.length >= 6;
  }, [code]);

  if (state.session) return <Redirect href="/(tabs)" />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: pageBg }]}>
      <ThemedView style={[styles.backdrop, { backgroundColor: pageBg }]}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: sheetBg, borderColor: sheetBorder },
          ]}
        >
          <ThemedText type="title" style={styles.title}>
            Add an account
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: mutedText }]}>
            Use an existing account,
            {"\n"}or sign up with a new email
          </ThemedText>

          {state.error ? (
            <ThemedText style={styles.error}>{state.error}</ThemedText>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                Alert.alert(
                  "Coming soon",
                  "Google sign-in will be enabled next.",
                );
              }}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed
                    ? isDark
                      ? "#3A3A3C"
                      : "#E5E5EA"
                    : rowBg,
                  borderColor: rowBorder,
                },
              ]}
            >
              <View style={styles.leftSlot}>
                <Ionicons
                  name="logo-google"
                  size={20}
                  color={isDark ? "#fff" : "#111"}
                />
              </View>
              <ThemedText style={styles.centerText}>
                Continue with Google
              </ThemedText>
              <View style={styles.rightSlot} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setEmailExpanded(true);
              }}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed
                    ? isDark
                      ? "#3A3A3C"
                      : "#E5E5EA"
                    : rowBg,
                  borderColor: rowBorder,
                },
              ]}
            >
              <View style={styles.leftSlot}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={isDark ? "#fff" : "#111"}
                />
              </View>
              <ThemedText style={styles.centerText}>
                Continue with email
              </ThemedText>
              <View style={styles.rightSlot} />
            </Pressable>
          </View>

          {emailExpanded ? (
            <View style={[styles.emailSection, { borderColor: rowBorder }]}>
              <ThemedText style={[styles.label, { color: mutedText }]}>
                Email
              </ThemedText>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!state.loading}
                placeholder="Enter your email address…"
                placeholderTextColor={placeholder}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setStep("email");
                  setCode("");
                }}
                style={[
                  styles.input,
                  {
                    backgroundColor: inputBg,
                    borderColor: rowBorder,
                    color: inputText,
                  },
                ]}
              />

              <ThemedText style={[styles.help, { color: mutedText }]}>
                We’ll send you a 6‑digit verification code.
              </ThemedText>

              {step === "code" ? (
                <>
                  <ThemedText style={[styles.label, { color: mutedText }]}>
                    Verification code
                  </ThemedText>
                  <TextInput
                    keyboardType="number-pad"
                    editable={!state.loading}
                    placeholder="Enter code"
                    placeholderTextColor={placeholder}
                    value={code}
                    onChangeText={setCode}
                    style={[
                      styles.input,
                      {
                        backgroundColor: inputBg,
                        borderColor: rowBorder,
                        color: inputText,
                      },
                    ]}
                  />
                </>
              ) : null}

              <Pressable
                accessibilityRole="button"
                disabled={
                  state.loading ||
                  (step === "email" ? !isValidEmail : !isValidCode)
                }
                onPress={async () => {
                  try {
                    if (step === "email") {
                      await startEmailOtp(email.trim());
                      setStep("code");
                      return;
                    }
                    await verifyEmailOtp(email.trim(), code.trim());
                  } catch {
                    // error is surfaced via state.error
                  }
                }}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: primary,
                    opacity:
                      state.loading ||
                      (step === "email" ? !isValidEmail : !isValidCode)
                        ? 0.55
                        : pressed
                          ? 0.9
                          : 1,
                  },
                ]}
              >
                <ThemedText style={styles.primaryButtonText}>
                  Continue
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 18,
    paddingTop: 56,
  },
  sheet: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    borderRadius: 0,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 18,
  },
  title: {
    textAlign: "center",
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    textAlign: "center",
    marginTop: 8,
    marginBottom: 18,
    fontSize: 16,
    lineHeight: 22,
  },
  error: {
    color: "#b00020",
    textAlign: "center",
    marginBottom: 10,
  },
  actions: {
    gap: 12,
  },
  row: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  leftSlot: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  rightSlot: {
    width: 28,
  },
  centerText: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  emailSection: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  help: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 6,
  },
  primaryButton: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
