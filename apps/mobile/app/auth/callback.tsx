import Constants from 'expo-constants';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackScreen() {
  const colorScheme = useColorScheme();
  const themeName = colorScheme === 'dark' ? 'dark' : 'light';
  const palette = Colors[themeName];

  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();

  const [error, setError] = useState<string | null>(null);

  const code = useMemo(() => (typeof params.code === 'string' ? params.code : null), [params.code]);
  const errorParam = useMemo(
    () => (typeof params.error_description === 'string' ? params.error_description : params.error),
    [params.error, params.error_description]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // If we're already authenticated, just continue.
        const existing = await supabase.auth.getSession();
        if (existing.data.session) {
          router.replace('/(tabs)');
          return;
        }

        // Expo Go / web often returns an implicit-flow redirect with tokens in the URL hash
        // (e.g. #access_token=...&refresh_token=...). Expo Router doesn't expose hash params
        // via useLocalSearchParams, so we pull from window.location.hash when available.
        if (typeof window !== 'undefined') {
          const hash = window.location.hash?.startsWith('#')
            ? window.location.hash.slice(1)
            : window.location.hash;
          if (hash) {
            const hashParams = new URLSearchParams(hash);
            const access_token = hashParams.get('access_token');
            const refresh_token = hashParams.get('refresh_token');

            if (access_token && refresh_token) {
              const { error: setSessionError } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              });
              if (setSessionError) {
                if (!cancelled) setError(setSessionError.message);
                return;
              }
              router.replace('/(tabs)');
              return;
            }
          }
        }

        if (typeof errorParam === 'string' && errorParam.length > 0) {
          if (!cancelled) setError(errorParam);
          return;
        }

        if (!code) {
          const isExpoGo = Constants.appOwnership === 'expo';
          if (!cancelled) {
            setError(
              isExpoGo
                ? 'Google sign-in can’t complete in Expo Go. Use a development build (EAS dev client) or a production build.'
                : 'Missing OAuth code. Please try again.'
            );
          }
          return;
        }

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (!cancelled) setError(exchangeError.message);
          return;
        }

        router.replace('/(tabs)');
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, errorParam]);

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
        <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ maxWidth: 420, paddingHorizontal: 20, gap: 10 }}>
            <ThemedText className="text-[16px] font-semibold" style={{ color: palette.textStrong }}>
              Sign-in failed
            </ThemedText>
            <ThemedText className="text-[13px]" style={{ color: palette.textMuted }}>
              {error}
            </ThemedText>
            <ThemedText
              type="link"
              className="text-[13px] font-semibold"
              onPress={() => router.replace('/auth/login')}>
              Back to login
            </ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  // If a session becomes available via auth state events before we finish, move along.
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <ActivityIndicator color={palette.tint} />
          <ThemedText className="text-[13px]" style={{ color: palette.textMuted }}>
            Verifying…
          </ThemedText>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}
