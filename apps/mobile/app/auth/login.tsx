import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const themeName = colorScheme === 'dark' ? 'dark' : 'light';
  const palette = Colors[themeName];

  const pageBg = palette.background;
  const cardBg = palette.surface;
  const cardBorder = palette.border;
  const mutedText = palette.textMuted;
  const primary = palette.tint;
  const danger = palette.error;

  const { state, startEmailOtp, verifyEmailOtp, signIn, signInWithGoogle } = useAppState();

  const RESEND_COOLDOWN_SECONDS = 15;
  const RATE_LIMIT_FALLBACK_SECONDS = 60;

  const [emailExpanded, setEmailExpanded] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'code' | 'password'>('code');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);

  useEffect(() => {
    if (step !== 'code') return;
    if (resendSecondsLeft <= 0) return;

    const id = setInterval(() => {
      setResendSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);

    return () => clearInterval(id);
  }, [step, resendSecondsLeft]);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: pageBg }}>
      <AuthBackground />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
          style={{ backgroundColor: pageBg }}>
          <ThemedView className="flex-1 px-5" style={{ backgroundColor: pageBg }}>
            <View className="w-full max-w-[520px] flex-1 self-center pt-6">
              <View className="mb-8">
                <Image
                  source={require('@/assets/images/ascendia-logo-lockup.png')}
                  contentFit="contain"
                  accessibilityLabel="Ascendia"
                  style={{ width: 240, height: 64 }}
                />
                <ThemedText className="mt-2 text-[14px]" style={{ color: mutedText }}>
                  Your system for daily progression.
                </ThemedText>

                <View className="mt-5">
                  <View style={{ height: 1, backgroundColor: palette.border, opacity: 0.9 }} />
                  <View style={{ height: 1, width: 84, backgroundColor: primary, marginTop: -1 }} />
                </View>
              </View>

              <View
                className="rounded-2xl border p-5"
                style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
                <ThemedText className="text-[18px] font-bold" style={{ color: palette.textStrong }}>
                  Sign in
                </ThemedText>
                <ThemedText className="mt-1 text-[13px]" style={{ color: mutedText }}>
                  Continue with email to create or access your account.
                </ThemedText>

                {state.error ? (
                  <View
                    className="mt-4 rounded-xl border px-3 py-2"
                    style={{
                      borderColor: danger,
                      backgroundColor: themeName === 'dark' ? '#12060A' : '#FFECEE',
                    }}>
                    <ThemedText className="text-[13px]" style={{ color: danger }}>
                      {state.error}
                    </ThemedText>
                  </View>
                ) : null}

                <View className="mt-5 gap-3">
                  <HudButton
                    title="Continue with Google"
                    variant="secondary"
                    disabled={state.loading}
                    onPress={async () => {
                      if (state.loading) return;
                      try {
                        await signInWithGoogle();
                      } catch {
                        // AppState will surface the message via `state.error`.
                      }
                    }}
                    left={
                      <Ionicons
                        name="logo-google"
                        size={18}
                        color={themeName === 'dark' ? palette.textStrong : '#111'}
                      />
                    }
                    right={<Ionicons name="chevron-forward" size={18} color={palette.iconMuted} />}
                  />

                  <HudButton
                    title="Continue with email"
                    variant="secondary"
                    onPress={() => setEmailExpanded(true)}
                    left={<Ionicons name="mail-outline" size={18} color={palette.textStrong} />}
                    right={<Ionicons name="chevron-forward" size={18} color={palette.iconMuted} />}
                  />
                </View>

                {emailExpanded ? (
                  <View className="mt-5 border-t pt-5" style={{ borderColor: palette.border }}>
                    <View className="mb-3 flex-row gap-2">
                      <HudButton
                        title="Code"
                        variant={mode === 'code' ? 'primary' : 'secondary'}
                        disabled={state.loading}
                        onPress={() => {
                          setMode('code');
                          setStep('email');
                          setCode('');
                        }}
                      />
                      <HudButton
                        title="Password"
                        variant={mode === 'password' ? 'primary' : 'secondary'}
                        disabled={state.loading}
                        onPress={() => {
                          setMode('password');
                          setStep('email');
                          setCode('');
                        }}
                      />
                    </View>

                    <HudInput
                      label="Email"
                      hint="We’ll send a 6‑digit verification code."
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      editable={!state.loading}
                      placeholder="you@domain.com"
                      value={email}
                      onChangeText={(t) => {
                        setEmail(t);
                        setStep('email');
                        setCode('');
                        setPassword('');
                        setResendSecondsLeft(0);
                      }}
                      returnKeyType="send"
                      onSubmitEditing={async () => {
                        if (state.loading) return;
                        if (!isValidEmail) return;
                        if (mode === 'password') {
                          return;
                        }
                        if (step !== 'email') return;
                        try {
                          await startEmailOtp(email.trim());
                          setStep('code');
                          setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
                        } catch (e) {
                          const errCode =
                            e && typeof e === 'object' && 'code' in e
                              ? String((e as any).code)
                              : '';
                          if (
                            errCode === 'over_email_send_rate_limit' ||
                            errCode === 'over_request_rate_limit'
                          ) {
                            setResendSecondsLeft(
                              Math.max(resendSecondsLeft, RATE_LIMIT_FALLBACK_SECONDS)
                            );
                          }
                        }
                      }}
                    />

                    {mode === 'password' ? (
                      <View className="mt-4">
                        <HudInput
                          label="Password"
                          secureTextEntry
                          editable={!state.loading}
                          placeholder="••••••••"
                          value={password}
                          onChangeText={setPassword}
                          returnKeyType="done"
                        />
                      </View>
                    ) : step === 'code' ? (
                      <View className="mt-4">
                        <HudInput
                          label="Verification code"
                          keyboardType="number-pad"
                          editable={!state.loading}
                          placeholder="6-digit code"
                          value={code}
                          onChangeText={setCode}
                          returnKeyType="done"
                        />
                      </View>
                    ) : null}

                    <View className="mt-5">
                      <HudButton
                        title={
                          mode === 'password'
                            ? 'Sign in'
                            : step === 'email'
                              ? 'Send code'
                              : 'Verify & continue'
                        }
                        loading={state.loading}
                        disabled={
                          mode === 'password'
                            ? !isValidEmail || password.length < 8
                            : step === 'email'
                              ? !isValidEmail
                              : !isValidCode
                        }
                        onPress={async () => {
                          try {
                            if (mode === 'password') {
                              await signIn(email.trim(), password);
                              return;
                            }
                            if (step === 'email') {
                              await startEmailOtp(email.trim());
                              setStep('code');
                              setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
                              return;
                            }
                            await verifyEmailOtp(email.trim(), code.trim());
                          } catch (e) {
                            const errCode =
                              e && typeof e === 'object' && 'code' in e
                                ? String((e as any).code)
                                : '';
                            if (
                              errCode === 'over_email_send_rate_limit' ||
                              errCode === 'over_request_rate_limit'
                            ) {
                              setResendSecondsLeft(
                                Math.max(resendSecondsLeft, RATE_LIMIT_FALLBACK_SECONDS)
                              );
                            }
                          }
                        }}
                        right={<Ionicons name="arrow-forward" size={18} color="#071018" />}
                      />
                    </View>

                    {mode === 'password' ? (
                      <View className="mt-4 items-center justify-center gap-2">
                        <ThemedText
                          type="link"
                          className="text-[12px] font-semibold"
                          onPress={() => router.push('/auth/reset-password' as any)}>
                          Forgot password?
                        </ThemedText>
                        <ThemedText
                          type="link"
                          className="text-[12px] font-semibold"
                          onPress={() => router.push('/auth/signup' as any)}>
                          Create an account
                        </ThemedText>
                      </View>
                    ) : null}

                    {mode === 'code' && step === 'code' ? (
                      <View className="mt-4 items-center justify-center gap-1">
                        {resendSecondsLeft > 0 ? (
                          <ThemedText className="text-[12px]" style={{ color: mutedText }}>
                            Resend available in 00:{String(resendSecondsLeft).padStart(2, '0')}
                          </ThemedText>
                        ) : (
                          <View className="mt-1 flex-row items-center gap-2">
                            <View
                              className="rounded-full border px-3 py-1.5"
                              style={{
                                borderColor: palette.border,
                                backgroundColor: palette.surface,
                              }}>
                              <ThemedText
                                type="link"
                                className="text-[12px] font-semibold"
                                onPress={async () => {
                                  if (state.loading || !isValidEmail) return;
                                  try {
                                    await startEmailOtp(email.trim());
                                    setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
                                  } catch (e) {
                                    const errCode =
                                      e && typeof e === 'object' && 'code' in e
                                        ? String((e as any).code)
                                        : '';
                                    if (
                                      errCode === 'over_email_send_rate_limit' ||
                                      errCode === 'over_request_rate_limit'
                                    ) {
                                      setResendSecondsLeft(
                                        Math.max(resendSecondsLeft, RATE_LIMIT_FALLBACK_SECONDS)
                                      );
                                    }
                                  }
                                }}>
                                Resend code
                              </ThemedText>
                            </View>
                          </View>
                        )}

                        <View
                          className="mt-1 rounded-full border px-3 py-1.5"
                          style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
                          <ThemedText
                            type="link"
                            className="text-[12px] font-semibold"
                            onPress={() => {
                              if (state.loading) return;
                              setStep('email');
                              setCode('');
                              setResendSecondsLeft(0);
                            }}>
                            Use a different email
                          </ThemedText>
                        </View>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>

              <View className="mt-6 pb-10">
                <ThemedText className="text-[12px]" style={{ color: mutedText }}>
                  By continuing, you agree to keep climbing.
                </ThemedText>
              </View>
            </View>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
