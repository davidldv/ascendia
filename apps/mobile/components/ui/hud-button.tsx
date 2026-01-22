import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type HudButtonVariant = 'primary' | 'secondary';

export type HudButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  loading?: boolean;
  variant?: HudButtonVariant;
  left?: React.ReactNode;
  right?: React.ReactNode;
  containerStyle?: ViewStyle;
};

export function HudButton({
  title,
  loading,
  disabled,
  variant = 'primary',
  left,
  right,
  containerStyle,
  ...props
}: HudButtonProps) {
  const colorScheme = useColorScheme();
  const themeName = colorScheme === 'dark' ? 'dark' : 'light';
  const palette = Colors[themeName];

  const isDisabled = disabled || loading;

  const gradientColors = useMemo<readonly [string, string, ...string[]]>(() => {
    if (variant === 'secondary') {
      return themeName === 'dark'
        ? ([palette.surfaceRaised, palette.surface] as const)
        : ([palette.surface, palette.surfaceRaised] as const);
    }

    // Primary: subtle “energy” gradient using tint + violet.
    if (themeName === 'dark') return [palette.hudDim, palette.tint, palette.accent] as const;
    return [palette.tint, palette.hudDim, palette.accent] as const;
  }, [palette, themeName, variant]);

  const borderColor = variant === 'secondary' ? palette.border : palette.tint;
  const textColor = variant === 'secondary' ? palette.textStrong : '#071018';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      {...props}
      style={({ pressed }) => {
        const base: ViewStyle = {
          opacity: isDisabled ? 0.55 : pressed ? 0.92 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.99 : 1 }],
        };
        return [base, containerStyle];
      }}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          height: 52,
          borderRadius: 14,
          borderWidth: 1,
          borderColor,
          overflow: 'hidden',
          ...(Platform.OS === 'web'
            ? {
                boxShadow:
                  variant === 'primary'
                    ? `0px 10px 18px rgba(55,231,255,${themeName === 'dark' ? 0.18 : 0.1})`
                    : 'none',
              }
            : {
                shadowColor: palette.tint,
                shadowOpacity: variant === 'primary' ? (themeName === 'dark' ? 0.25 : 0.14) : 0,
                shadowRadius: variant === 'primary' ? 18 : 0,
                shadowOffset: { width: 0, height: 10 },
              }),
          ...(Platform.OS === 'android' ? { elevation: variant === 'primary' ? 3 : 0 } : null),
        }}>
        {/* Inner highlight */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 20,
            backgroundColor: 'rgba(255,255,255,0.10)',
            opacity: themeName === 'dark' ? 1 : 0.6,
          }}
        />

        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
          }}>
          <View style={{ width: 28, alignItems: 'center', justifyContent: 'center' }}>{left}</View>

          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {loading ? (
              <ActivityIndicator color={variant === 'secondary' ? palette.tint : textColor} />
            ) : (
              <ThemedText
                className="text-[15px] font-bold"
                style={{ color: variant === 'secondary' ? palette.textStrong : textColor }}>
                {title}
              </ThemedText>
            )}
          </View>

          <View style={{ width: 28, alignItems: 'center', justifyContent: 'center' }}>{right}</View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
