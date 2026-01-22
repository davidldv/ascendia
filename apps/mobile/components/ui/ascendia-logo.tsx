import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Platform, View, type ViewProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type AscendiaLogoProps = ViewProps & {
  /** Size of the square logo mark in pixels. */
  size?: number;
  /** Show text label next to the mark. */
  showWordmark?: boolean;
  /** Optional override for the label text. */
  label?: string;
};

export function AscendiaLogo({
  size = 28,
  showWordmark = false,
  label = 'Ascendia',
  style,
  ...rest
}: AscendiaLogoProps) {
  const colorScheme = useColorScheme();
  const themeName = colorScheme === 'dark' ? 'dark' : 'light';
  const palette = Colors[themeName];

  const gradientColors = useMemo<readonly [string, string, ...string[]]>(
    () => [palette.hudDim, palette.tint, palette.accent] as const,
    [palette.accent, palette.hudDim, palette.tint]
  );

  const markRadius = Math.max(10, Math.round(size * 0.35));

  return (
    <View
      {...rest}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        },
        style,
      ]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: markRadius,
          borderWidth: 1,
          borderColor: palette.border,
          overflow: 'hidden',
          ...(Platform.OS === 'web'
            ? {
                boxShadow: `0px 10px ${themeName === 'dark' ? 18 : 12}px rgba(55,231,255,${
                  themeName === 'dark' ? 0.16 : 0.08
                })`,
              }
            : {
                shadowColor: palette.tint,
                shadowOpacity: themeName === 'dark' ? 0.28 : 0.12,
                shadowRadius: themeName === 'dark' ? 18 : 12,
                shadowOffset: { width: 0, height: 10 },
              }),
          ...(Platform.OS === 'android' ? { elevation: 2 } : null),
        }}>
        {/* Inner gloss */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: Math.round(size * 0.45),
            backgroundColor: 'rgba(255,255,255,0.14)',
          }}
        />

        {/* Monogram */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ThemedText
            className="text-[16px] font-black"
            style={{
              color: '#071018',
              letterSpacing: -0.5,
              transform: [{ translateY: -0.5 }],
            }}>
            A
          </ThemedText>
        </View>
      </LinearGradient>

      {showWordmark ? (
        <ThemedText
          className="text-[16px] font-extrabold tracking-tight"
          style={{ color: palette.textStrong }}>
          {label}
        </ThemedText>
      ) : null}
    </View>
  );
}
