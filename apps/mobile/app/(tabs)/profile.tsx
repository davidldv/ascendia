import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useMemo } from 'react';
import {
    Alert,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AscendiaLogo } from '@/components/ui/ascendia-logo';
import { HudButton } from '@/components/ui/hud-button';
import { getArchetypeById } from '@/constants/archetypes';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppState } from '@/state/app-state';

function getCardShadow() {
  if (Platform.OS === 'web') {
    return { boxShadow: '0 18px 60px rgba(0,0,0,0.45)' } as any;
  }
  return {
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  };
}

function getInitial(email: string | null | undefined) {
  const v = (email ?? '').trim();
  if (!v) return 'A';
  return v[0]?.toUpperCase() ?? 'A';
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const themeName = colorScheme === 'dark' ? 'dark' : 'light';
  const palette = Colors[themeName];
  const tint = palette.tint;

  const { state, refresh, signOut, setNotificationsEnabled } = useAppState();

  const profile = state.profile;
  const archetype = getArchetypeById(profile?.archetypeId ?? null);

  const kpis = useMemo(() => {
    return {
      level: profile?.level ?? 1,
      currentStreak: profile?.currentStreak ?? 0,
      longestStreak: profile?.longestStreak ?? 0,
      successfulDays: profile?.successfulDays ?? 0,
      totalCompleted: profile?.totalMissionsCompleted ?? 0,
    };
  }, [
    profile?.currentStreak,
    profile?.level,
    profile?.longestStreak,
    profile?.successfulDays,
    profile?.totalMissionsCompleted,
  ]);

  if (!state.session) return <Redirect href="/auth/login" />;

  const requestSignOut = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const ok = window.confirm('Sign out?\n\nYou can sign back in any time.');
      if (ok) void signOut();
      return;
    }

    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <ThemedView className="flex-1">
      {/* Background glows */}
      <LinearGradient
        colors={['rgba(55,231,255,0.10)', 'rgba(55,231,255,0.0)']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.85, y: 0.55 }}
        style={[StyleSheet.absoluteFill, { opacity: themeName === 'dark' ? 1 : 0.55 }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(139,92,255,0.12)', 'rgba(139,92,255,0.0)']}
        start={{ x: 0.9, y: 0.15 }}
        end={{ x: 0.2, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: themeName === 'dark' ? 1 : 0.5 }]}
        pointerEvents="none"
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl refreshing={state.loading} onRefresh={() => void refresh()} />
        }
        showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <AscendiaLogo size={28} />
            <View>
              <ThemedText type="defaultSemiBold" style={{ color: palette.textMuted }}>
                Account
              </ThemedText>
              <ThemedText type="title" className="-mt-1">
                Profile
              </ThemedText>
            </View>
          </View>

          <View
            className="flex-row items-center gap-2 rounded-full border px-3 py-1.5"
            style={{
              borderColor: palette.border,
              backgroundColor: themeName === 'dark' ? 'rgba(10,15,26,0.8)' : palette.surface,
            }}>
            <ThemedText className="text-[11px] tracking-wider" style={{ color: palette.textMuted }}>
              LVL
            </ThemedText>
            <ThemedText type="defaultSemiBold" style={{ color: tint }}>
              {kpis.level}
            </ThemedText>
          </View>
        </View>

        {/* Hero */}
        <View
          className="mt-4 overflow-hidden rounded-[20px] border"
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
            ...getCardShadow(),
          }}>
          <LinearGradient
            colors={
              themeName === 'dark'
                ? ['rgba(55,231,255,0.12)', 'rgba(139,92,255,0.10)', 'rgba(10,15,26,0.0)']
                : ['rgba(10,164,198,0.10)', 'rgba(109,75,255,0.08)', 'rgba(255,255,255,0.0)']
            }
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View className="p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: 'rgba(55,231,255,0.30)',
                  }}>
                  <LinearGradient
                    colors={[palette.hudDim, palette.tint, palette.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ThemedText className="text-[18px] font-bold" style={{ color: '#071018' }}>
                      {getInitial(profile?.email)}
                    </ThemedText>
                  </View>
                </View>

                <View>
                  <ThemedText type="defaultSemiBold" style={{ color: palette.textMuted }}>
                    Signed in as
                  </ThemedText>
                  <ThemedText type="defaultSemiBold" style={{ color: palette.textStrong }}>
                    {profile?.email ?? '—'}
                  </ThemedText>
                  <ThemedText className="text-[13px] opacity-75">
                    Timezone: {profile?.timezone ?? 'UTC'}
                  </ThemedText>
                </View>
              </View>

              <Pressable
                onPress={() => router.push('/choose-mentor')}
                className="flex-row items-center gap-2 rounded-full border px-3 py-2"
                style={({ pressed }) => ({
                  borderColor: palette.border,
                  backgroundColor: themeName === 'dark' ? 'rgba(5,7,12,0.55)' : palette.surface,
                  opacity: pressed ? 0.85 : 1,
                })}>
                <Ionicons name="sparkles" size={16} color={tint} />
                <ThemedText type="defaultSemiBold" className="text-[13px]" style={{ color: tint }}>
                  Mentor
                </ThemedText>
              </Pressable>
            </View>

            {/* Stats grid */}
            <View className="mt-4 flex-row gap-2">
              <View
                className="flex-1 rounded-[16px] border p-3"
                style={{
                  borderColor: palette.border,
                  backgroundColor: themeName === 'dark' ? 'rgba(10,15,26,0.65)' : palette.surface,
                }}>
                <ThemedText className="text-[12px]" style={{ color: palette.textMuted }}>
                  Current streak
                </ThemedText>
                <ThemedText type="subtitle" className="mt-0.5">
                  {kpis.currentStreak}
                </ThemedText>
              </View>
              <View
                className="flex-1 rounded-[16px] border p-3"
                style={{
                  borderColor: palette.border,
                  backgroundColor: themeName === 'dark' ? 'rgba(10,15,26,0.65)' : palette.surface,
                }}>
                <ThemedText className="text-[12px]" style={{ color: palette.textMuted }}>
                  Successful days
                </ThemedText>
                <ThemedText type="subtitle" className="mt-0.5">
                  {kpis.successfulDays}
                </ThemedText>
              </View>
            </View>

            <View className="mt-2 flex-row gap-2">
              <View
                className="flex-1 rounded-[16px] border p-3"
                style={{
                  borderColor: palette.border,
                  backgroundColor: themeName === 'dark' ? 'rgba(10,15,26,0.65)' : palette.surface,
                }}>
                <ThemedText className="text-[12px]" style={{ color: palette.textMuted }}>
                  Longest streak
                </ThemedText>
                <ThemedText type="subtitle" className="mt-0.5">
                  {kpis.longestStreak}
                </ThemedText>
              </View>
              <View
                className="flex-1 rounded-[16px] border p-3"
                style={{
                  borderColor: palette.border,
                  backgroundColor: themeName === 'dark' ? 'rgba(10,15,26,0.65)' : palette.surface,
                }}>
                <ThemedText className="text-[12px]" style={{ color: palette.textMuted }}>
                  Total completed
                </ThemedText>
                <ThemedText type="subtitle" className="mt-0.5">
                  {kpis.totalCompleted}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Mentor card */}
        <View
          className="mt-4 gap-3 rounded-[20px] border p-4"
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
            ...getCardShadow(),
          }}>
          <View className="flex-row items-end justify-between">
            <View>
              <ThemedText type="subtitle">Mentor</ThemedText>
              <ThemedText className="opacity-75">
                {archetype?.displayName ?? 'None selected'}
              </ThemedText>
            </View>

            <Pressable
              onPress={() => router.push('/choose-mentor')}
              className="flex-row items-center gap-2 rounded-full border px-3 py-2"
              style={({ pressed }) => ({
                borderColor: palette.border,
                backgroundColor: themeName === 'dark' ? 'rgba(5,7,12,0.55)' : palette.surface,
                opacity: pressed ? 0.85 : 1,
              })}>
              <Ionicons name="swap-horizontal" size={16} color={tint} />
              <ThemedText type="defaultSemiBold" className="text-[13px]" style={{ color: tint }}>
                Change
              </ThemedText>
            </Pressable>
          </View>

          <ThemedText className="opacity-80">
            {archetype?.description ?? 'Select a mentor to calibrate your daily mission pacing.'}
          </ThemedText>

          {archetype ? (
            <View className="mt-1 flex-row items-center gap-2">
              <View
                className="rounded-full border px-3 py-1"
                style={{
                  borderColor: palette.border,
                  backgroundColor:
                    themeName === 'dark' ? 'rgba(10,15,26,0.65)' : palette.surfaceRaised,
                }}>
                <ThemedText className="text-[12px]" style={{ color: palette.textMuted }}>
                  Tone: {archetype.tone}
                </ThemedText>
              </View>
              <View
                className="rounded-full border px-3 py-1"
                style={{
                  borderColor: palette.border,
                  backgroundColor:
                    themeName === 'dark' ? 'rgba(10,15,26,0.65)' : palette.surfaceRaised,
                }}>
                <ThemedText className="text-[12px]" style={{ color: palette.textMuted }}>
                  Multiplier: {archetype.difficultyMultiplier.toFixed(1)}×
                </ThemedText>
              </View>
            </View>
          ) : null}
        </View>

        {/* Actions */}
        <View
          className="mt-4 gap-3 rounded-[20px] border p-4"
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
            ...getCardShadow(),
          }}>
          <ThemedText type="subtitle">Actions</ThemedText>
          <ThemedText className="opacity-75">Account and system controls.</ThemedText>

          <HudButton
            title={`Daily reminders: ${state.notificationsEnabled ? 'ON' : 'OFF'}`}
            variant="secondary"
            disabled={state.loading}
            onPress={() => void setNotificationsEnabled(!state.notificationsEnabled)}
            left={<Ionicons name="notifications-outline" size={18} color={palette.textStrong} />}
            right={
              <Ionicons
                name={state.notificationsEnabled ? 'checkmark-circle' : 'close-circle-outline'}
                size={18}
                color={state.notificationsEnabled ? palette.reward : palette.iconMuted}
              />
            }
          />

          <HudButton
            title="Sign out"
            variant="secondary"
            onPress={() => {
              requestSignOut();
            }}
            left={<Ionicons name="log-out-outline" size={18} color={palette.textStrong} />}
            right={<Ionicons name="chevron-forward" size={18} color={palette.iconMuted} />}
            containerStyle={{}}
          />

          <ThemedText className="text-[12px] opacity-70">
            Reminder times are automatic (your timezone). Turn off only if you truly don’t want
            prompts.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
