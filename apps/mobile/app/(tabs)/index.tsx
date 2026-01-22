import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
    cancelAnimation,
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AscendiaLogo } from '@/components/ui/ascendia-logo';
import { getArchetypeById } from '@/constants/archetypes';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatMissionTarget, formatMissionTitle } from '@/lib/missions';
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

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const themeName = colorScheme === 'dark' ? 'dark' : 'light';
  const palette = Colors[themeName];
  const tint = palette.tint;

  const { state, setTimezoneIfNeeded, refresh } = useAppState();

  const missions = state.missionsToday ?? [];
  const completedCount = missions.filter((m) => m.status === 'completed').length;
  const allComplete = missions.length > 0 && completedCount === missions.length;
  const progress = missions.length > 0 ? clamp01(completedCount / missions.length) : 0;
  const progressPct = Math.round(progress * 100);

  const archetype = getArchetypeById(state.profile?.archetypeId);

  const firePulse = useSharedValue(0);

  useEffect(() => {
    if (allComplete) {
      firePulse.value = withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      );
      return;
    }
    cancelAnimation(firePulse);
    firePulse.value = 0;
  }, [allComplete, firePulse]);

  const fireballStyle = useAnimatedStyle(() => {
    const t = firePulse.value;
    return {
      transform: [{ scale: interpolate(t, [0, 1], [1, 1.08]) }],
    };
  });

  const fireGlowStyle = useAnimatedStyle(() => {
    const t = firePulse.value;
    return {
      opacity: interpolate(t, [0, 1], [0.35, 0.75]),
      transform: [{ scale: interpolate(t, [0, 1], [1.0, 1.18]) }],
    };
  });

  useEffect(() => {
    void setTimezoneIfNeeded();
  }, [setTimezoneIfNeeded]);

  if (!state.session) return <Redirect href="/auth/login" />;

  if (state.loading && !state.profile) {
    return (
      <ThemedView className="flex-1 gap-3 p-4">
        <ThemedText type="title">Loading…</ThemedText>
        <ThemedText className="opacity-75">Fetching your profile and missions.</ThemedText>
      </ThemedView>
    );
  }

  if (state.error && !state.profile) {
    return (
      <ThemedView className="flex-1 gap-3 p-4">
        <ThemedText type="title">Can’t load data</ThemedText>
        <ThemedText className="opacity-75">{state.error}</ThemedText>
        <Pressable
          onPress={() => void refresh()}
          className="mt-2 items-center rounded-[14px] border px-3.5 py-3"
          style={({ pressed }) => ({ borderColor: tint, opacity: pressed ? 0.85 : 1 })}>
          <ThemedText type="defaultSemiBold">Retry</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  if (!state.profile) return null;
  if (!state.profile.archetypeId) return <Redirect href="/onboarding" />;

  return (
    <ThemedView className="flex-1">
      {/* Background glows */}
      <LinearGradient
        colors={['rgba(55,231,255,0.10)', 'rgba(55,231,255,0.0)']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 0.6 }}
        style={[StyleSheet.absoluteFill, { opacity: themeName === 'dark' ? 1 : 0.55 }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(139,92,255,0.12)', 'rgba(139,92,255,0.0)']}
        start={{ x: 0.85, y: 0.1 }}
        end={{ x: 0.2, y: 0.9 }}
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
                Today
              </ThemedText>
              <ThemedText type="title" className="-mt-1">
                Missions
              </ThemedText>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <View
              className="flex-row items-center gap-2 rounded-full border px-3 py-1.5"
              style={{
                borderColor: palette.border,
                backgroundColor: themeName === 'dark' ? 'rgba(10,15,26,0.8)' : palette.surface,
              }}>
              <ThemedText
                className="text-[11px] tracking-wider"
                style={{ color: palette.textMuted }}>
                LVL
              </ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: tint }}>
                {state.profile.level}
              </ThemedText>
            </View>

            <Animated.View
              style={[{ width: 32, height: 32 }, fireballStyle]}
              accessibilityLabel={allComplete ? 'Day complete' : 'Day not complete'}
              accessibilityRole="image">
              {allComplete ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.fireGlow,
                    fireGlowStyle,
                    { backgroundColor: 'rgba(139, 92, 255, 0.25)' },
                  ]}
                />
              ) : null}

              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: allComplete ? 0 : 1,
                  borderColor: allComplete ? 'transparent' : palette.border,
                  backgroundColor: allComplete ? '#090717' : 'transparent',
                }}>
                {allComplete ? (
                  <>
                    <LinearGradient
                      colors={[palette.accent, palette.tint]}
                      start={{ x: 0.15, y: 0.1 }}
                      end={{ x: 0.9, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <LinearGradient
                      pointerEvents="none"
                      colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.0)']}
                      start={{ x: 0.05, y: 0.05 }}
                      end={{ x: 0.7, y: 0.85 }}
                      style={styles.fireSpecular}
                    />
                    <View
                      pointerEvents="none"
                      style={[styles.fireInnerRim, { borderColor: 'rgba(255,255,255,0.14)' }]}
                    />
                    <Ionicons name="flame" size={18} color={palette.textStrong} />
                  </>
                ) : (
                  <Ionicons name="flame-outline" size={18} color={palette.textMuted} />
                )}
              </View>
            </Animated.View>
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

          <View className="gap-3 p-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <ThemedText type="defaultSemiBold" style={{ color: palette.textMuted }}>
                  Daily progress
                </ThemedText>
                <ThemedText type="subtitle" className="mt-0.5">
                  {progressPct}% complete
                </ThemedText>
                <ThemedText className="mt-1 opacity-75">
                  {missions.length === 0
                    ? 'No missions yet — check back in a moment.'
                    : `${completedCount}/${missions.length} done${allComplete ? ' • day secured' : ''}`}
                </ThemedText>
              </View>

              <View
                className="rounded-full border px-3 py-1.5"
                style={{
                  borderColor: palette.border,
                  backgroundColor: themeName === 'dark' ? 'rgba(5,7,12,0.55)' : palette.surface,
                }}>
                <ThemedText
                  className="text-[11px] tracking-wider"
                  style={{ color: palette.textMuted }}>
                  SYSTEM
                </ThemedText>
              </View>
            </View>

            {/* Progress bar */}
            <View
              style={{
                height: 10,
                borderRadius: 999,
                backgroundColor:
                  themeName === 'dark' ? 'rgba(27,42,68,0.55)' : palette.surfaceRaised,
                overflow: 'hidden',
              }}>
              <LinearGradient
                colors={[palette.hudDim, palette.tint, palette.accentBright]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ width: `${Math.max(2, progressPct)}%`, height: '100%' }}
              />
            </View>

            <Pressable
              onPress={() => {
                if (missions[0]) {
                  router.push(`/missions/${encodeURIComponent(missions[0].id)}`);
                }
              }}
              disabled={!missions[0]}
              className="mt-1 flex-row items-center justify-between rounded-[16px] border px-4 py-3"
              style={({ pressed }) => ({
                borderColor: missions[0] ? palette.border : 'rgba(127,127,127,0.25)',
                backgroundColor: themeName === 'dark' ? 'rgba(10,15,26,0.65)' : palette.surface,
                opacity: pressed ? 0.85 : 1,
              })}>
              <View className="flex-row items-center gap-2">
                <Ionicons name="rocket-outline" size={18} color={tint} />
                <ThemedText type="defaultSemiBold">Open next mission</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
            </Pressable>
          </View>
        </View>

        {/* Mentor */}
        <View
          className="mt-4 gap-2 rounded-[20px] border p-4"
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
            ...getCardShadow(),
          }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    themeName === 'dark' ? 'rgba(55,231,255,0.10)' : 'rgba(10,164,198,0.10)',
                  borderWidth: 1,
                  borderColor:
                    themeName === 'dark' ? 'rgba(55,231,255,0.22)' : 'rgba(10,164,198,0.20)',
                }}>
                <Ionicons name="sparkles" size={16} color={tint} />
              </View>
              <View>
                <ThemedText type="defaultSemiBold">Mentor</ThemedText>
                <ThemedText className="text-[13px] opacity-75">
                  {archetype?.displayName ?? state.profile.archetypeId}
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
              <ThemedText type="defaultSemiBold" className="text-[13px]" style={{ color: tint }}>
                Change
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color={tint} />
            </Pressable>
          </View>

          <ThemedText className="opacity-80">
            {archetype?.description ?? 'Your mentor calibrates the mission plan and pacing.'}
          </ThemedText>

          <View className="mt-1 flex-row items-center gap-2">
            <View
              className="rounded-full border px-3 py-1"
              style={{
                borderColor: palette.border,
                backgroundColor:
                  themeName === 'dark' ? 'rgba(10,15,26,0.65)' : palette.surfaceRaised,
              }}>
              <ThemedText className="text-[12px]" style={{ color: palette.textMuted }}>
                Tone: {archetype?.tone ?? '—'}
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
                Multiplier: {archetype?.difficultyMultiplier?.toFixed(1) ?? '—'}×
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Missions */}
        <View
          className="mt-4 gap-3 rounded-[20px] border p-4"
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
            ...getCardShadow(),
          }}>
          <View className="flex-row items-end justify-between">
            <View>
              <ThemedText type="subtitle">Today’s missions</ThemedText>
              <ThemedText className="opacity-75">
                {missions.length === 0
                  ? 'Generating your mission set…'
                  : allComplete
                    ? 'All complete. Day secured.'
                    : 'Finish all missions to secure the day.'}
              </ThemedText>
            </View>
            <View
              className="rounded-full border px-3 py-1"
              style={{
                borderColor: palette.border,
                backgroundColor: themeName === 'dark' ? 'rgba(5,7,12,0.55)' : palette.surface,
              }}>
              <ThemedText
                className="text-[12px]"
                style={{ color: allComplete ? palette.success : palette.textMuted }}>
                {completedCount}/{missions.length || '—'}
              </ThemedText>
            </View>
          </View>

          <View className="gap-2.5">
            {missions.map((m) => {
              const done = m.status === 'completed';
              const rightLabel = done ? 'DONE' : formatMissionTarget(m.type, m.targetValue);
              const leftIcon =
                m.type === 'steps'
                  ? 'walk-outline'
                  : m.type === 'pushups'
                    ? 'fitness-outline'
                    : m.type === 'plank'
                      ? 'body-outline'
                      : m.type === 'squats'
                        ? 'barbell-outline'
                        : 'flash-outline';

              return (
                <Pressable
                  key={m.id}
                  onPress={() => router.push(`/missions/${encodeURIComponent(m.id)}`)}
                  className="overflow-hidden rounded-[18px] border"
                  style={({ pressed }) => ({
                    borderColor: done ? 'rgba(55,231,255,0.35)' : palette.border,
                    backgroundColor: done
                      ? themeName === 'dark'
                        ? 'rgba(55,231,255,0.06)'
                        : 'rgba(10,164,198,0.06)'
                      : themeName === 'dark'
                        ? 'rgba(5,7,12,0.25)'
                        : palette.surface,
                    opacity: pressed ? 0.9 : 1,
                  })}>
                  {done ? (
                    <LinearGradient
                      colors={['rgba(55,231,255,0.14)', 'rgba(139,92,255,0.10)', 'rgba(0,0,0,0.0)']}
                      start={{ x: 0, y: 0.1 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                      pointerEvents="none"
                    />
                  ) : null}

                  <View className="flex-row items-center gap-3 px-3.5 py-3">
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: done ? 'rgba(55,231,255,0.28)' : palette.border,
                        backgroundColor: done
                          ? themeName === 'dark'
                            ? 'rgba(55,231,255,0.10)'
                            : 'rgba(10,164,198,0.10)'
                          : themeName === 'dark'
                            ? 'rgba(10,15,26,0.75)'
                            : palette.surfaceRaised,
                      }}>
                      <Ionicons
                        name={leftIcon as any}
                        size={18}
                        color={done ? tint : palette.textMuted}
                      />
                    </View>

                    <View className="flex-1">
                      <ThemedText type="defaultSemiBold">{formatMissionTitle(m.type)}</ThemedText>
                      <ThemedText className="text-[13px] opacity-75">
                        {done ? 'Locked in. Logged.' : 'No edits. No excuses.'}
                      </ThemedText>
                    </View>

                    <View className="items-end gap-1">
                      <View
                        className="rounded-full border px-3 py-1"
                        style={{
                          borderColor: done ? 'rgba(55,231,255,0.35)' : palette.border,
                          backgroundColor: done
                            ? themeName === 'dark'
                              ? 'rgba(55,231,255,0.10)'
                              : 'rgba(10,164,198,0.10)'
                            : themeName === 'dark'
                              ? 'rgba(10,15,26,0.65)'
                              : palette.surfaceRaised,
                        }}>
                        <ThemedText
                          type="defaultSemiBold"
                          className="text-[12px]"
                          style={{ color: done ? tint : palette.textMuted }}>
                          {rightLabel}
                        </ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fireGlow: {
    position: 'absolute',
    top: -5,
    left: -5,
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  fireSpecular: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    transform: [{ rotate: '-20deg' }],
  },
  fireInnerRim: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 15,
    borderWidth: 1,
  },
});
