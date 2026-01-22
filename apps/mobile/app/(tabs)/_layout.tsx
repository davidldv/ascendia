import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import {
  HudHomeIcon,
  HudProfileIcon,
  HudProgressIcon,
  HudTabIconFrame,
} from '@/components/ui/hud-tab-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const themeName = colorScheme === 'dark' ? 'dark' : 'light';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[themeName].tint,
        tabBarInactiveTintColor: Colors[themeName].tabIconDefault,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: Colors[themeName].surface,
          borderTopColor: Colors[themeName].border,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <HudTabIconFrame size={26} focused={focused}>
              <HudHomeIcon size={26} color={color} focused={focused} />
            </HudTabIconFrame>
          ),
        }}
      />

      {/* Hide template screen (no tab) */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, focused }) => (
            <HudTabIconFrame size={26} focused={focused}>
              <HudProgressIcon size={26} color={color} focused={focused} />
            </HudTabIconFrame>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <HudTabIconFrame size={26} focused={focused}>
              <HudProfileIcon size={26} color={color} focused={focused} />
            </HudTabIconFrame>
          ),
        }}
      />
    </Tabs>
  );
}
