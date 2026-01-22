import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AscendiaLogo } from '@/components/ui/ascendia-logo';
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

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function formatShortDate(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDayLabel(dateKey: string) {
  // dateKey is YYYY-MM-DD
  const d = new Date(`${dateKey}T00:00:00Z`);
  // Keep it simple and consistent across platforms
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

function nextThreshold(value: number, thresholds: number[]) {
  const sorted = thresholds.slice().sort((a, b) => a - b);
  for (const t of sorted) {
    if (value < t) return t;
  }
  return sorted[sorted.length - 1] ?? value;
}

export default function ProgressScreen() {
  const { state, refresh } = useAppState();
  const colorScheme = useColorScheme();
  const themeName = colorScheme === 'dark' ? 'dark' : 'light';
  const palette = Colors[themeName];
  const tint = palette.tint;

  const totalCompletions = state.profile?.totalMissionsCompleted ?? 0;
  const currentStreak = state.profile?.currentStreak ?? 0;
  const longestStreak = state.profile?.longestStreak ?? 0;
  const successfulDays = state.profile?.successfulDays ?? 0;
  const level = state.profile?.level ?? 1;

  const days = useMemo(() => state.last7Days ?? [], [state.last7Days]);
  const sum = days.reduce(
    (acc, d) => {
      acc.total += d.total;
      acc.completed += d.completed;
      return acc;
    },
    { total: 0, completed: 0 }
  );
  const weeklyRate = sum.total > 0 ? clamp01(sum.completed / sum.total) : 0;
  const weeklyPct = Math.round(weeklyRate * 100);

  // API returns today first
  const todayKey = days[0]?.dateKey ?? state.todayDateKey ?? null;

  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(todayKey);

  const selected = useMemo(() => {
    const key = selectedDateKey ?? todayKey;
    const d = key ? days.find((x) => x.dateKey === key) : undefined;
    return { key: key ?? null, day: d ?? null };
  }, [days, selectedDateKey, todayKey]);

  const selectedRate =
    selected.day && selected.day.total > 0 ? selected.day.completed / selected.day.total : 0;
  const selectedPct = Math.round(clamp01(selectedRate) * 100);
  const selectedSecured =
    !!selected.day && selected.day.total > 0 && selected.day.completed === selected.day.total;

  const milestones = useMemo(() => {
    const nextStreak = nextThreshold(currentStreak, [3, 7, 14, 30, 60, 90, 180, 365]);
    const nextCompletions = nextThreshold(totalCompletions, [10, 25, 50, 100, 250, 500, 1000]);
    const nextSuccessDays = nextThreshold(successfulDays, [3, 7, 14, 30, 60, 90, 180, 365]);

    // pick the closest “next” goal to highlight
    const candidates = [
      {
        id: 'streak',
        label: 'Streak',
        value: currentStreak,
        next: nextStreak,
        icon: 'flame-outline' as const,
      },
      {
        id: 'successfulDays',
        label: 'Successful days',
        value: successfulDays,
        next: nextSuccessDays,
        icon: 'shield-checkmark-outline' as const,
      },
      {
        id: 'completions',
        label: 'Missions completed',
        value: totalCompletions,
        next: nextCompletions,
        icon: 'checkmark-done-outline' as const,
      },
    ].map((c) => ({ ...c, remaining: Math.max(0, c.next - c.value) }));

    const primary =
      candidates.slice().sort((a, b) => a.remaining - b.remaining)[0] ?? candidates[0];
    const progress = primary.next > 0 ? clamp01(primary.value / primary.next) : 0;

    return { primary, progressPct: Math.round(progress * 100) };
  }, [currentStreak, successfulDays, totalCompletions]);

  if (!state.session) return <Redirect href="/auth/login" />;

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
                Analytics
              </ThemedText>
              <ThemedText type="title" className="-mt-1">
                Progress
              </ThemedText>
            </View>
          </View>

          <View
            className="flex-row items-center gap-2 rounded-full border px-3 py-1.5"
            style={{
              borderColor: palette.border,
              backgroundColor: themeName === 'dark' ? 'rgba(10,15,26,0.8)' : palette.surface,
            }}>
            <Ionicons name="calendar-outline" size={14} color={palette.textMuted} />
            <ThemedText className="text-[12px]" style={{ color: palette.textMuted }}>
              Last 7 days
            </ThemedText>
          </View>
        </View>

        {/* Hero KPIs */}
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
                  Weekly completion
                </ThemedText>
                <ThemedText type="subtitle" className="mt-0.5">
                  {weeklyPct}%
                </ThemedText>
                <ThemedText className="mt-1 opacity-75">
                  {sum.total > 0
                    ? `${sum.completed}/${sum.total} missions completed`
                    : 'No data yet.'}
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
                  LVL {level}
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
                style={{ width: `${Math.max(2, weeklyPct)}%`, height: '100%' }}
              />
            </View>

            {/* KPI grid */}
            <View className="mt-1 flex-row gap-2">
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
                  {currentStreak}
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
                  {successfulDays}
                </ThemedText>
              </View>
            </View>

            <View className="flex-row gap-2">
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
                  {longestStreak}
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
                  {totalCompletions}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Milestones */}
        <View
          className="mt-4 gap-3 rounded-[20px] border p-4"
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
            ...getCardShadow(),
          }}>
          <View className="flex-row items-end justify-between">
            <View>
              <ThemedText type="subtitle">Milestones</ThemedText>
              <ThemedText className="opacity-75">Next target to hit</ThemedText>
            </View>
            <View
              className="rounded-full border px-3 py-1"
              style={{
                borderColor: palette.border,
                backgroundColor: themeName === 'dark' ? 'rgba(5,7,12,0.55)' : palette.surface,
              }}>
              <ThemedText className="text-[12px]" style={{ color: palette.textMuted }}>
                {milestones.progressPct}%
              </ThemedText>
            </View>
          </View>

          <View
            className="overflow-hidden rounded-[18px] border"
            style={{
              borderColor: palette.border,
              backgroundColor: themeName === 'dark' ? 'rgba(5,7,12,0.25)' : palette.surface,
            }}>
            <LinearGradient
              colors={['rgba(55,231,255,0.10)', 'rgba(139,92,255,0.08)', 'rgba(0,0,0,0.0)']}
              start={{ x: 0, y: 0.1 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View className="flex-row items-center justify-between px-3.5 py-3">
              <View className="flex-row items-center gap-3">
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(55,231,255,0.28)',
                    backgroundColor:
                      themeName === 'dark' ? 'rgba(55,231,255,0.10)' : 'rgba(10,164,198,0.10)',
                  }}>
                  <Ionicons name={milestones.primary.icon as any} size={18} color={tint} />
                </View>

                <View>
                  <ThemedText type="defaultSemiBold">{milestones.primary.label}</ThemedText>
                  <ThemedText className="text-[13px] opacity-75">
                    {milestones.primary.value} / {milestones.primary.next}
                    {milestones.primary.remaining > 0
                      ? ` • ${milestones.primary.remaining} to go`
                      : ' • milestone reached'}
                  </ThemedText>
                </View>
              </View>

              <View className="items-end gap-1">
                <View
                  className="rounded-full border px-3 py-1"
                  style={{
                    borderColor: 'rgba(55,231,255,0.35)',
                    backgroundColor:
                      themeName === 'dark' ? 'rgba(55,231,255,0.10)' : 'rgba(10,164,198,0.10)',
                  }}>
                  <ThemedText
                    type="defaultSemiBold"
                    className="text-[12px]"
                    style={{ color: tint }}>
                    Target
                  </ThemedText>
                </View>
              </View>
            </View>

            <View
              style={{
                height: 8,
                backgroundColor:
                  themeName === 'dark' ? 'rgba(27,42,68,0.55)' : palette.surfaceRaised,
                overflow: 'hidden',
              }}>
              <LinearGradient
                colors={[palette.hudDim, palette.tint, palette.accentBright]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ width: `${Math.max(2, milestones.progressPct)}%`, height: '100%' }}
              />
            </View>
          </View>
        </View>

        {/* 7-day chart */}
        <View
          className="mt-4 gap-3 rounded-[20px] border p-4"
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
            ...getCardShadow(),
          }}>
          <View className="flex-row items-end justify-between">
            <View>
              <ThemedText type="subtitle">7-day activity</ThemedText>
              <ThemedText className="opacity-75">Completion rate by day</ThemedText>
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)')}
              className="flex-row items-center gap-2 rounded-full border px-3 py-2"
              style={({ pressed }) => ({
                borderColor: palette.border,
                backgroundColor: themeName === 'dark' ? 'rgba(5,7,12,0.55)' : palette.surface,
                opacity: pressed ? 0.85 : 1,
              })}>
              <Ionicons name="flash-outline" size={16} color={tint} />
              <ThemedText type="defaultSemiBold" className="text-[13px]" style={{ color: tint }}>
                Today
              </ThemedText>
            </Pressable>
          </View>

          {/* Selected day */}
          {selected.key ? (
            <View
              className="mt-1 overflow-hidden rounded-[18px] border"
              style={{
                borderColor: selectedSecured ? 'rgba(55,231,255,0.35)' : palette.border,
                backgroundColor: themeName === 'dark' ? 'rgba(5,7,12,0.25)' : palette.surface,
              }}>
              {selectedSecured ? (
                <LinearGradient
                  colors={['rgba(55,231,255,0.12)', 'rgba(139,92,255,0.10)', 'rgba(0,0,0,0.0)']}
                  start={{ x: 0, y: 0.1 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
              ) : null}

              <View className="flex-row items-center justify-between px-3.5 py-3">
                <View className="flex-row items-center gap-3">
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: selectedSecured ? 'rgba(55,231,255,0.28)' : palette.border,
                      backgroundColor: selectedSecured
                        ? themeName === 'dark'
                          ? 'rgba(55,231,255,0.10)'
                          : 'rgba(10,164,198,0.10)'
                        : themeName === 'dark'
                          ? 'rgba(10,15,26,0.75)'
                          : palette.surfaceRaised,
                    }}>
                    <Ionicons
                      name={selectedSecured ? 'shield-checkmark-outline' : 'stats-chart-outline'}
                      size={18}
                      color={selectedSecured ? tint : palette.textMuted}
                    />
                  </View>
                  <View>
                    <ThemedText type="defaultSemiBold">
                      {todayKey && selected.key === todayKey
                        ? 'Today'
                        : formatShortDate(selected.key)}
                    </ThemedText>
                    <ThemedText className="text-[13px] opacity-75">
                      {selected.day?.total
                        ? `${selected.day.completed}/${selected.day.total} completed`
                        : 'No missions'}
                      {selectedSecured ? ' • day secured' : ''}
                    </ThemedText>
                  </View>
                </View>
                <View
                  className="rounded-full border px-3 py-1"
                  style={{
                    borderColor: selectedSecured ? 'rgba(55,231,255,0.35)' : palette.border,
                    backgroundColor: selectedSecured
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
                    style={{ color: selectedSecured ? tint : palette.textMuted }}>
                    {selectedPct}%
                  </ThemedText>
                </View>
              </View>
            </View>
          ) : null}

          <View className="mt-1 flex-row items-end justify-between" style={{ height: 120 }}>
            {days
              .slice()
              .reverse()
              .map((d) => {
                const r = d.total > 0 ? clamp01(d.completed / d.total) : 0;
                const h = 18 + Math.round(r * 96);
                const isToday = todayKey ? d.dateKey === todayKey : false;
                const secured = d.total > 0 && d.completed === d.total;
                const isSelected = selected.key ? d.dateKey === selected.key : false;

                return (
                  <Pressable
                    key={d.dateKey}
                    onPress={() => setSelectedDateKey(d.dateKey)}
                    style={({ pressed }) => ({
                      width: 42,
                      alignItems: 'center',
                      opacity: pressed ? 0.85 : 1,
                    })}>
                    <View
                      style={{
                        width: 18,
                        height: 100,
                        borderRadius: 999,
                        backgroundColor:
                          themeName === 'dark' ? 'rgba(27,42,68,0.55)' : palette.surfaceRaised,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: isSelected
                          ? 'rgba(167,139,255,0.50)'
                          : isToday
                            ? 'rgba(55,231,255,0.35)'
                            : palette.border,
                      }}>
                      <LinearGradient
                        colors={
                          secured
                            ? [palette.accent, palette.tint]
                            : [palette.hudDim, palette.tint, palette.accentBright]
                        }
                        start={{ x: 0, y: 1 }}
                        end={{ x: 0, y: 0 }}
                        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: h }}
                      />
                    </View>
                    <ThemedText
                      className="mt-2 text-[12px]"
                      style={{
                        color: isSelected
                          ? palette.accentBright
                          : isToday
                            ? tint
                            : palette.textMuted,
                      }}>
                      {formatDayLabel(d.dateKey)}
                    </ThemedText>
                  </Pressable>
                );
              })}
          </View>
        </View>

        {/* Day breakdown */}
        <View
          className="mt-4 gap-3 rounded-[20px] border p-4"
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
            ...getCardShadow(),
          }}>
          <View className="flex-row items-end justify-between">
            <View>
              <ThemedText type="subtitle">Day breakdown</ThemedText>
              <ThemedText className="opacity-75">How you’ve been shipping</ThemedText>
            </View>
            <View
              className="rounded-full border px-3 py-1"
              style={{
                borderColor: palette.border,
                backgroundColor: themeName === 'dark' ? 'rgba(5,7,12,0.55)' : palette.surface,
              }}>
              <ThemedText className="text-[12px]" style={{ color: palette.textMuted }}>
                {weeklyPct}% weekly
              </ThemedText>
            </View>
          </View>

          <View className="gap-2">
            {days.map((d, idx) => {
              const r = d.total > 0 ? clamp01(d.completed / d.total) : 0;
              const pct = Math.round(r * 100);
              const secured = d.total > 0 && d.completed === d.total;
              const isToday = todayKey ? d.dateKey === todayKey : idx === 0;
              const isSelected = selected.key ? d.dateKey === selected.key : false;

              return (
                <Pressable
                  key={d.dateKey}
                  onPress={() => setSelectedDateKey(d.dateKey)}
                  className="overflow-hidden rounded-[18px] border"
                  style={({ pressed }) => ({
                    borderColor: isSelected
                      ? 'rgba(167,139,255,0.50)'
                      : isToday
                        ? 'rgba(55,231,255,0.35)'
                        : palette.border,
                    backgroundColor: themeName === 'dark' ? 'rgba(5,7,12,0.25)' : palette.surface,
                    opacity: pressed ? 0.92 : 1,
                  })}>
                  {secured ? (
                    <LinearGradient
                      colors={['rgba(55,231,255,0.12)', 'rgba(139,92,255,0.10)', 'rgba(0,0,0,0.0)']}
                      start={{ x: 0, y: 0.1 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                      pointerEvents="none"
                    />
                  ) : null}

                  <View className="flex-row items-center justify-between px-3.5 py-3">
                    <View className="flex-row items-center gap-3">
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: secured ? 'rgba(55,231,255,0.28)' : palette.border,
                          backgroundColor: secured
                            ? themeName === 'dark'
                              ? 'rgba(55,231,255,0.10)'
                              : 'rgba(10,164,198,0.10)'
                            : themeName === 'dark'
                              ? 'rgba(10,15,26,0.75)'
                              : palette.surfaceRaised,
                        }}>
                        <Ionicons
                          name={secured ? 'shield-checkmark-outline' : 'time-outline'}
                          size={18}
                          color={secured ? tint : palette.textMuted}
                        />
                      </View>

                      <View>
                        <ThemedText type="defaultSemiBold">
                          {isToday ? 'Today' : formatDayLabel(d.dateKey)}
                        </ThemedText>
                        <ThemedText className="text-[13px] opacity-75">
                          {d.total === 0
                            ? 'No missions'
                            : secured
                              ? 'Day secured'
                              : `${d.completed}/${d.total} completed`}
                        </ThemedText>
                      </View>
                    </View>

                    <View className="items-end gap-1">
                      <View
                        className="rounded-full border px-3 py-1"
                        style={{
                          borderColor: secured ? 'rgba(55,231,255,0.35)' : palette.border,
                          backgroundColor: secured
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
                          style={{ color: secured ? tint : palette.textMuted }}>
                          {pct}%
                        </ThemedText>
                      </View>
                      <ThemedText className="text-[12px]" style={{ color: palette.textMuted }}>
                        {d.dateKey}
                      </ThemedText>
                    </View>
                  </View>

                  <View
                    style={{
                      height: 8,
                      backgroundColor:
                        themeName === 'dark' ? 'rgba(27,42,68,0.55)' : palette.surfaceRaised,
                      overflow: 'hidden',
                    }}>
                    <LinearGradient
                      colors={[palette.hudDim, palette.tint, palette.accentBright]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ width: `${Math.max(2, pct)}%`, height: '100%' }}
                    />
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
