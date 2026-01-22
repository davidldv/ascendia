import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AuthBackground } from '@/components/ui/auth-background';
import { HudButton } from '@/components/ui/hud-button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatMissionTarget, formatMissionTitle } from '@/lib/missions';
import { useAppState } from '@/state/app-state';

export default function MissionDetailScreen() {
  const colorScheme = useColorScheme();
  const themeName = colorScheme === 'dark' ? 'dark' : 'light';
  const palette = Colors[themeName];

  const { missionId } = useLocalSearchParams<{ missionId: string }>();
  const { state, getMissionById, completeMission } = useAppState();

  if (!state.session) {
    router.replace('/auth/login');
    return null;
  }
  const mission = getMissionById(String(missionId));

  const isCompleted = mission?.status === 'completed';
  const title = mission ? formatMissionTitle(mission.type) : 'Mission';
  const target = mission ? formatMissionTarget(mission.type, mission.targetValue) : '';

  if (!mission) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
        <ThemedView style={{ flex: 1, backgroundColor: palette.background }}>
          <AuthBackground intensity={0.45} />
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 28 }}>
            <View style={{ maxWidth: 720, width: '100%', alignSelf: 'center', gap: 14 }}>
              <View>
                <ThemedText
                  className="text-[12px] font-semibold"
                  style={{ color: palette.textMuted }}>
                  Mission
                </ThemedText>
                <ThemedText
                  className="mt-2 text-[24px] font-extrabold"
                  style={{ color: palette.textStrong }}>
                  Not found
                </ThemedText>
                <ThemedText className="mt-2 text-[14px]" style={{ color: palette.textMuted }}>
                  This mission doesn’t exist anymore (or it’s not in today’s list).
                </ThemedText>
              </View>

              <HudButton
                title="Back"
                variant="secondary"
                onPress={() => router.back()}
                left={<Ionicons name="arrow-back" size={18} color={palette.textStrong} />}
                right={<Ionicons name="chevron-back" size={18} color={palette.iconMuted} />}
              />
            </View>
          </ScrollView>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <ThemedView style={{ flex: 1, backgroundColor: palette.background }}>
        <AuthBackground intensity={0.45} />

        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 28 }}>
          <View style={{ maxWidth: 720, width: '100%', alignSelf: 'center' }}>
            {/* Header */}
            <View style={{ marginBottom: 14 }}>
              <ThemedText
                className="text-[12px] font-semibold"
                style={{ color: palette.textMuted }}>
                Mission
              </ThemedText>
              <ThemedText
                className="mt-2 text-[32px] font-extrabold"
                style={{ color: palette.textStrong }}>
                {title}
              </ThemedText>

              <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: isCompleted ? palette.reward : palette.border,
                    backgroundColor: palette.surfaceRaised,
                  }}>
                  <Ionicons
                    name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={isCompleted ? palette.reward : palette.iconMuted}
                  />
                  <ThemedText
                    className="text-[12px] font-semibold"
                    style={{ color: palette.textMuted }}>
                    {isCompleted ? 'Completed' : 'Active'}
                  </ThemedText>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: palette.border,
                    backgroundColor: palette.surfaceRaised,
                  }}>
                  <Ionicons name="flag-outline" size={14} color={palette.iconMuted} />
                  <ThemedText
                    className="text-[12px] font-semibold"
                    style={{ color: palette.textMuted }}>
                    Target: {target}
                  </ThemedText>
                </View>
              </View>

              <View style={{ marginTop: 14 }}>
                <View style={{ height: 1, backgroundColor: palette.border, opacity: 0.9 }} />
                <View
                  style={{ height: 1, width: 92, backgroundColor: palette.tint, marginTop: -1 }}
                />
              </View>
            </View>

            {/* Mission spec card */}
            <View
              style={{
                borderRadius: 18,
                borderWidth: 1,
                borderColor: palette.border,
                backgroundColor: palette.surface,
                overflow: 'hidden',
                ...(Platform.OS === 'web'
                  ? {
                      boxShadow: `0px 18px 34px rgba(0,0,0,${themeName === 'dark' ? 0.28 : 0.14})`,
                    }
                  : {
                      shadowColor: '#000',
                      shadowOpacity: themeName === 'dark' ? 0.28 : 0.14,
                      shadowRadius: 22,
                      shadowOffset: { width: 0, height: 14 },
                    }),
                ...(Platform.OS === 'android' ? { elevation: 1 } : null),
              }}>
              <LinearGradient
                colors={
                  themeName === 'dark'
                    ? (['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.00)'] as const)
                    : (['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.00)'] as const)
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 50 }}
              />

              <View style={{ padding: 14, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: palette.border,
                      backgroundColor: themeName === 'dark' ? '#071018' : '#EEF7FF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Ionicons name="barbell-outline" size={18} color={palette.textMuted} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <ThemedText
                      className="text-[14px] font-semibold"
                      style={{ color: palette.textStrong }}>
                      Objective
                    </ThemedText>
                    <ThemedText className="mt-1 text-[13px]" style={{ color: palette.textMuted }}>
                      Complete it. Mark it done only when it is done.
                    </ThemedText>
                  </View>
                </View>

                <View
                  style={{
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: palette.border,
                    backgroundColor: palette.surfaceRaised,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}>
                  <ThemedText
                    className="text-[12px] font-semibold"
                    style={{ color: palette.textMuted }}>
                    TARGET
                  </ThemedText>
                  <ThemedText
                    className="mt-1 text-[18px] font-bold"
                    style={{ color: palette.textStrong }}>
                    {target}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* CTA */}
            <View style={{ marginTop: 16 }}>
              <HudButton
                title={isCompleted ? 'Completed' : 'Mark completed'}
                loading={state.loading}
                disabled={isCompleted || state.loading}
                onPress={async () => {
                  if (isCompleted) return;
                  try {
                    await completeMission(mission.id);
                    router.back();
                  } catch {
                    // errors shown via state.error
                  }
                }}
                left={
                  <Ionicons
                    name={isCompleted ? 'checkmark-circle' : 'checkmark-done'}
                    size={18}
                    color={isCompleted ? palette.textMuted : '#071018'}
                  />
                }
                right={
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={isCompleted ? palette.iconMuted : '#071018'}
                  />
                }
                variant={isCompleted ? 'secondary' : 'primary'}
              />

              {state.error ? (
                <View
                  style={{
                    marginTop: 10,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: palette.error,
                    backgroundColor: themeName === 'dark' ? '#12060A' : '#FFECEE',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}>
                  <ThemedText className="text-[13px]" style={{ color: palette.error }}>
                    {state.error}
                  </ThemedText>
                </View>
              ) : null}

              <ThemedText className="mt-12 text-[12px]" style={{ color: palette.textMuted }}>
                Ascendia protocol: finish first, confirm after.
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}
