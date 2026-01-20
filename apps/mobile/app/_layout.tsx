import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AppStateProvider } from "@/state/app-state";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AppStateProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          <Stack.Screen
            name="auth/email"
            options={{ title: "Continue with email" }}
          />
          <Stack.Screen
            name="auth/signup"
            options={{ title: "Create Account" }}
          />
          <Stack.Screen
            name="auth/reset-password"
            options={{ title: "Reset Password" }}
          />
          <Stack.Screen name="onboarding" options={{ title: "Ascendia" }} />
          <Stack.Screen
            name="choose-mentor"
            options={{ title: "Choose Mentor" }}
          />
          <Stack.Screen
            name="missions/[missionId]"
            options={{ title: "Mission" }}
          />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
        <StatusBar style="auto" />
      </AppStateProvider>
    </ThemeProvider>
  );
}
