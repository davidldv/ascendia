import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AuthBackground } from '@/components/ui/auth-background';
import { HudButton } from '@/components/ui/hud-button';
import { HudInput } from '@/components/ui/hud-input';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppState } from '@/state/app-state';

export default function SignupScreen() {
  const colorScheme = useColorScheme();
  const themeName = colorScheme === 'dark' ? 'dark' : 'light';
  const palette = Colors[themeName];

  const { state, signUp } = useAppState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const disabled = state.loading || !email || password.length < 8;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <AuthBackground />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
          style={{ backgroundColor: palette.background }}>
          <ThemedView className="flex-1 px-5" style={{ backgroundColor: palette.background }}>
            <View className="w-full max-w-[520px] flex-1 self-center pt-10">
              <View className="mb-8">
                <ThemedText
                  className="text-[28px] font-extrabold"
                  style={{ color: palette.textStrong }}>
                  Create account
                </ThemedText>
                <ThemedText className="mt-1.5 text-[13px]" style={{ color: palette.textMuted }}>
                  Minimum 8-character password.
                </ThemedText>
              </View>

              <View
                className="rounded-2xl border p-5"
                style={{ backgroundColor: palette.surface, borderColor: palette.border }}>
                {state.error ? (
                  <View
                    className="mb-4 rounded-xl border px-3 py-2"
                    style={{
                      borderColor: palette.error,
                      backgroundColor: themeName === 'dark' ? '#12060A' : '#FFECEE',
                    }}>
                    <ThemedText className="text-[13px]" style={{ color: palette.error }}>
                      {state.error}
                    </ThemedText>
                  </View>
                ) : null}

                <HudInput
                  label="Email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="you@domain.com"
                  value={email}
                  onChangeText={setEmail}
                />

                <View className="mt-4">
                  <HudInput
                    label="Password"
                    placeholder="••••••••"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>

                <View className="mt-6">
                  <HudButton
                    title="Create account"
                    loading={state.loading}
                    disabled={disabled}
                    onPress={async () => {
                      await signUp(email.trim(), password);
                      router.replace('/(tabs)');
                    }}
                  />
                </View>

                <View className="mt-4 items-center">
                  <ThemedText
                    type="link"
                    className="text-[13px] font-semibold"
                    onPress={() => router.replace('/auth/login' as any)}>
                    Back to login →
                  </ThemedText>
                </View>
              </View>
            </View>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
