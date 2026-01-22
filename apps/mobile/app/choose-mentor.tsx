import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AuthBackground } from '@/components/ui/auth-background';
import { HudButton } from '@/components/ui/hud-button';
import { ARCHETYPES } from '@/constants/archetypes';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiFetch } from '@/lib/api';
import { useAppState } from '@/state/app-state';
import type { Archetype } from '@/types/domain';

export default function ChooseMentorScreen() {
  const colorScheme = useColorScheme();
  const themeName = colorScheme === 'dark' ? 'dark' : 'light';
  const palette = Colors[themeName];
  const { state, setArchetype } = useAppState();

  const [archetypes, setArchetypes] = useState<readonly Archetype[]>(ARCHETYPES);

  const [selectedId, setSelectedId] = useState<string>(() => state.profile?.archetypeId ?? '');

  const selected = useMemo(
    () => archetypes.find((a) => a.id === selectedId) ?? null,
    [archetypes, selectedId]
  );

  React.useEffect(() => {
    const session = state.session;
    if (!session) return;

    let mounted = true;
    (async () => {
      try {
        const res = await apiFetch<{ archetypes: Archetype[] }>(session, '/v1/archetypes');
        if (!mounted) return;
        if (Array.isArray(res.archetypes) && res.archetypes.length > 0) {
          setArchetypes(res.archetypes);
        }
      } catch {
        // Keep fallback archetypes.
      }
    })();

    return () => {
      mounted = false;
    };
  }, [state.session]);

  const toneMeta = useMemo(() => {
    const tone = selected?.tone ?? null;
    if (tone === 'strict') return { label: 'Strict', icon: 'shield-checkmark-outline' as const };
    if (tone === 'calm') return { label: 'Calm', icon: 'leaf-outline' as const };
    if (tone === 'aggressive') return { label: 'Aggressive', icon: 'flame-outline' as const };
    return { label: 'Tone', icon: 'sparkles-outline' as const };
  }, [selected?.tone]);

  if (!state.session) {
    router.replace('/auth/login');
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <ThemedView style={{ flex: 1, backgroundColor: palette.background }}>
        <AuthBackground intensity={0.55} />
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 28 }}>
          <View style={{ maxWidth: 720, width: '100%', alignSelf: 'center' }}>
            {/* Hero */}
            <View style={{ marginBottom: 14 }}>
              <ThemedText
                className="text-[28px] font-extrabold"
                style={{ color: palette.textStrong }}>
                Choose Mentor
              </ThemedText>
              <ThemedText className="mt-2 text-[14px]" style={{ color: palette.textMuted }}>
                This choice sets your tone and difficulty. You can change it later.
              </ThemedText>

              <View style={{ marginTop: 14 }}>
                <View style={{ height: 1, backgroundColor: palette.border, opacity: 0.9 }} />
                <View
                  style={{ height: 1, width: 92, backgroundColor: palette.tint, marginTop: -1 }}
                />
              </View>
            </View>

            {/* Error */}
            {state.error ? (
              <View
                style={{
                  marginTop: 8,
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

            {/* Cards */}
            <View style={{ marginTop: 14, gap: 12 }}>
              {archetypes.map((a) => {
                const isSelected = a.id === selectedId;
                const borderColor = isSelected ? palette.tint : palette.border;
                const glowOpacity = isSelected ? (themeName === 'dark' ? 0.22 : 0.14) : 0;

                const toneLabel =
                  a.tone === 'strict' ? 'Strict' : a.tone === 'calm' ? 'Calm' : 'Aggressive';
                const toneIcon =
                  a.tone === 'strict'
                    ? ('shield-checkmark-outline' as const)
                    : a.tone === 'calm'
                      ? ('leaf-outline' as const)
                      : ('flame-outline' as const);

                return (
                  <Pressable
                    key={a.id}
                    disabled={state.loading}
                    onPress={() => setSelectedId(a.id)}
                    style={({ pressed }) => ({
                      opacity: state.loading ? 0.55 : pressed ? 0.94 : 1,
                      transform: [{ scale: pressed && !state.loading ? 0.995 : 1 }],
                    })}>
                    <View
                      style={{
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor,
                        backgroundColor: palette.surface,
                        overflow: 'hidden',
                        ...(Platform.OS === 'web'
                          ? {
                              boxShadow: isSelected
                                ? `0px 14px 26px rgba(55,231,255,${glowOpacity})`
                                : `0px 14px 26px rgba(0,0,0,${themeName === 'dark' ? 0.25 : 0.12})`,
                            }
                          : {
                              shadowColor: palette.tint,
                              shadowOpacity: isSelected ? glowOpacity : 0,
                              shadowRadius: isSelected ? 22 : 0,
                              shadowOffset: { width: 0, height: 14 },
                            }),
                        ...(Platform.OS === 'android' ? { elevation: isSelected ? 2 : 0 } : null),
                      }}>
                      {/* Top sheen */}
                      <LinearGradient
                        colors={
                          themeName === 'dark'
                            ? (['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.00)'] as const)
                            : (['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.00)'] as const)
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 44 }}
                      />

                      <View style={{ padding: 14, gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: isSelected ? palette.tint : palette.border,
                              backgroundColor: themeName === 'dark' ? '#071018' : '#EEF7FF',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                            <Ionicons
                              name={toneIcon}
                              size={18}
                              color={isSelected ? palette.tint : palette.textMuted}
                            />
                          </View>

                          <View style={{ flex: 1 }}>
                            <ThemedText
                              className="text-[16px] font-bold"
                              style={{ color: palette.textStrong }}>
                              {a.displayName}
                            </ThemedText>
                            <ThemedText
                              className="mt-1 text-[13px]"
                              style={{ color: palette.textMuted }}>
                              {a.description}
                            </ThemedText>
                          </View>

                          {isSelected ? (
                            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                              <Ionicons name="checkmark-circle" size={22} color={palette.tint} />
                            </View>
                          ) : null}
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              borderRadius: 999,
                              borderWidth: 1,
                              borderColor: palette.border,
                              backgroundColor: palette.surfaceRaised,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                            }}>
                            <Ionicons
                              name="chatbubble-ellipses-outline"
                              size={14}
                              color={palette.iconMuted}
                            />
                            <ThemedText
                              className="text-[12px] font-semibold"
                              style={{ color: palette.textMuted }}>
                              Tone: {toneLabel}
                            </ThemedText>
                          </View>

                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              borderRadius: 999,
                              borderWidth: 1,
                              borderColor: palette.border,
                              backgroundColor: palette.surfaceRaised,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                            }}>
                            <Ionicons
                              name="trending-up-outline"
                              size={14}
                              color={palette.iconMuted}
                            />
                            <ThemedText
                              className="text-[12px] font-semibold"
                              style={{ color: palette.textMuted }}>
                              Difficulty ×{a.difficultyMultiplier}
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Confirm */}
            <View style={{ marginTop: 16 }}>
              <HudButton
                title={selected ? `Activate ${selected.displayName}` : 'Select a mentor'}
                loading={state.loading}
                disabled={!selected || state.loading}
                onPress={async () => {
                  if (!selected) return;
                  try {
                    await setArchetype(selected.id);
                    router.replace('/(tabs)');
                  } catch {
                    // error is shown via state.error
                  }
                }}
                left={<Ionicons name={toneMeta.icon} size={18} color="#071018" />}
                right={<Ionicons name="arrow-forward" size={18} color="#071018" />}
              />

              <ThemedText className="mt-3 text-[12px]" style={{ color: palette.textMuted }}>
                Tip: your mentor affects how missions are framed, not the core rules.
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}
