import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppState } from '@/state/app-state';

export default function OnboardingScreen() {
  const { state } = useAppState();

  if (!state.session) {
    router.replace('/auth/login' as any);
    return null;
  }

  return (
    <ThemedView className="flex-1 justify-center gap-3.5 p-6">
      <ThemedText type="title" className="tracking-[0.5px]">
        Ascendia
      </ThemedText>
      <ThemedText className="opacity-90">
        You do not rely on motivation. You obey the system.
      </ThemedText>
      <ThemedText className="opacity-90">
        Choose a mentor archetype. Your missions will be assigned daily.
      </ThemedText>

      <ThemedText
        type="link"
        onPress={() => router.push('/choose-mentor')}
        accessibilityRole="button">
        Choose your mentor →
      </ThemedText>
    </ThemedView>
  );
}
