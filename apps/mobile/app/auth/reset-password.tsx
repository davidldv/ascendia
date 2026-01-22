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
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const colorScheme = useColorScheme();
  const themeName = colorScheme === 'dark' ? 'dark' : 'light';
  const palette = Colors[themeName];

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
                  Reset password
                </ThemedText>
                <ThemedText className="mt-1.5 text-[13px]" style={{ color: palette.textMuted }}>
                  We’ll email you a reset link.
                </ThemedText>
              </View>

              <View
                className="rounded-2xl border p-5"
                style={{ backgroundColor: palette.surface, borderColor: palette.border }}>
                {status ? (
                  <View
                    className="mb-4 rounded-xl border px-3 py-2"
                    style={{
                      borderColor: palette.success,
                      backgroundColor: themeName === 'dark' ? '#061210' : '#E9FFF8',
                    }}>
                    <ThemedText className="text-[13px]" style={{ color: palette.success }}>
                      {status}
                    </ThemedText>
                  </View>
                ) : null}

                {error ? (
                  <View
                    className="mb-4 rounded-xl border px-3 py-2"
                    style={{
                      borderColor: palette.error,
                      backgroundColor: themeName === 'dark' ? '#12060A' : '#FFECEE',
                    }}>
                    <ThemedText className="text-[13px]" style={{ color: palette.error }}>
                      {error}
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

                <View className="mt-6">
                  <HudButton
                    title="Send reset email"
                    disabled={!email}
                    onPress={async () => {
                      setError(null);
                      setStatus(null);
                      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
                      if (error) {
                        setError(error.message);
                        return;
                      }
                      setStatus('If that email exists, a reset link was sent.');
                    }}
                  />
                </View>

                <View className="mt-4 items-center">
                  <ThemedText
                    type="link"
                    className="text-[13px] font-semibold"
                    onPress={() => router.back()}>
                    Back →
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
