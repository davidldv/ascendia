import React, { useMemo, useState } from 'react';
import { Platform, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type HudInputProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  hint?: string;
  error?: string | null;
  containerStyle?: ViewStyle;
};

export function HudInput({
  label,
  hint,
  error,
  containerStyle,
  onFocus,
  onBlur,
  editable = true,
  ...props
}: HudInputProps) {
  const colorScheme = useColorScheme();
  const themeName = colorScheme === 'dark' ? 'dark' : 'light';
  const palette = Colors[themeName];

  const [focused, setFocused] = useState(false);

  const borderColor = useMemo(() => {
    if (error) return palette.error;
    if (focused) return palette.tint;
    return palette.border;
  }, [error, focused, palette.border, palette.error, palette.tint]);

  const backgroundColor = themeName === 'dark' ? palette.background : palette.surface;
  const textColor = palette.textStrong;
  const placeholderTextColor = palette.textMuted;

  return (
    <View style={containerStyle}>
      {label ? (
        <ThemedText className="mb-1 text-[13px] font-semibold" style={{ color: palette.textMuted }}>
          {label}
        </ThemedText>
      ) : null}

      <View
        className="rounded-xl border"
        style={{
          borderColor,
          backgroundColor,
          ...(Platform.OS === 'web'
            ? {
                boxShadow: focused
                  ? `0px 8px 18px rgba(55,231,255,${themeName === 'dark' ? 0.12 : 0.06})`
                  : 'none',
              }
            : {
                shadowColor: themeName === 'dark' ? palette.tint : '#000',
                shadowOpacity: focused ? (themeName === 'dark' ? 0.18 : 0.08) : 0,
                shadowRadius: focused ? 18 : 0,
                shadowOffset: { width: 0, height: 8 },
              }),
          ...(Platform.OS === 'android' ? { elevation: focused ? 4 : 0 } : null),
        }}>
        <TextInput
          {...props}
          editable={editable}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={placeholderTextColor}
          className="h-[50px] px-3.5 text-[15px]"
          style={{
            color: textColor,
          }}
        />
      </View>

      {error ? (
        <ThemedText className="mt-1 text-[12px]" style={{ color: palette.error }}>
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText className="mt-1 text-[12px]" style={{ color: palette.textMuted }}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}
