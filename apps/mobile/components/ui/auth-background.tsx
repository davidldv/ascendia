import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function withAlpha(hex: string, alpha: number): string {
  const value = hex.trim();
  if (!value.startsWith('#')) return value;
  const raw = value.slice(1);

  const normalized =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  if (normalized.length !== 6) return value;

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * A subtle animated background for auth screens.
 * - Uses a moving “scan” band (very low opacity)
 * - Adds faint HUD glows/vignettes
 *
 * Render it once as an absolutely-positioned layer (pointerEvents: none).
 */
export function AuthBackground({ intensity = 1 }: { intensity?: number }) {
  const colorScheme = useColorScheme();
  const themeName = colorScheme === 'dark' ? 'dark' : 'light';
  const palette = Colors[themeName];
  const { height, width } = useWindowDimensions();

  const i = Math.max(0, Math.min(1, intensity));

  const scanProgress = useSharedValue(0);

  useEffect(() => {
    scanProgress.value = 0;
    scanProgress.value = withRepeat(
      withTiming(1, {
        duration: 6500,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      false
    );
  }, [scanProgress]);

  const scanColors = useMemo(() => {
    const mid =
      themeName === 'dark' ? withAlpha(palette.tint, 0.12 * i) : withAlpha(palette.tint, 0.08 * i);
    return ['transparent', mid, 'transparent'] as const;
  }, [palette.tint, themeName, i]);

  const glowTopLeft = useMemo(() => {
    const a = (themeName === 'dark' ? 0.16 : 0.1) * i;
    return [withAlpha(palette.accent, a), 'transparent'] as const;
  }, [palette.accent, themeName, i]);

  const glowBottomRight = useMemo(() => {
    const a = (themeName === 'dark' ? 0.18 : 0.1) * i;
    return [withAlpha(palette.tint, a), 'transparent'] as const;
  }, [palette.tint, themeName, i]);

  const vignetteTop = useMemo(() => {
    return [
      withAlpha(palette.background, 0.0),
      withAlpha(palette.background, (themeName === 'dark' ? 0.65 : 0.25) * i),
    ] as const;
  }, [palette.background, themeName, i]);

  const vignetteBottom = useMemo(() => {
    return [
      withAlpha(palette.background, (themeName === 'dark' ? 0.72 : 0.3) * i),
      withAlpha(palette.background, 0.0),
    ] as const;
  }, [palette.background, themeName, i]);

  const scanAnimatedStyle = useAnimatedStyle(() => {
    const bandHeight = 220;
    const start = -bandHeight;
    const end = height + bandHeight;
    const translateY = interpolate(scanProgress.value, [0, 1], [start, end]);
    return {
      transform: [{ translateY }],
    };
  }, [height]);

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: palette.background }]}>
      {/* Corner glows */}
      <LinearGradient
        colors={glowTopLeft}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: 1,
            transform: [{ translateX: -width * 0.1 }, { translateY: -height * 0.05 }],
          },
        ]}
      />
      <LinearGradient
        colors={glowBottomRight}
        start={{ x: 1, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: 1,
            transform: [{ translateX: width * 0.08 }, { translateY: height * 0.06 }],
          },
        ]}
      />

      {/* Moving scan band */}
      <Animated.View style={[StyleSheet.absoluteFill, scanAnimatedStyle]}>
        <LinearGradient
          colors={scanColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            height: 220,
            width: '100%',
            opacity: (themeName === 'dark' ? 1 : 0.75) * i,
          }}
        />
      </Animated.View>

      {/* Vignettes for legibility */}
      <LinearGradient
        colors={vignetteTop}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 180 }}
      />
      <LinearGradient
        colors={vignetteBottom}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 260 }}
      />

      {/* Subtle gridline tint */}
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor:
            themeName === 'dark'
              ? withAlpha(palette.border, 0.06 * i)
              : withAlpha(palette.border, 0.04 * i),
          opacity: 1,
        }}
      />
    </View>
  );
}
