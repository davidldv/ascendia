/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

/**
 * Ascendia palette (Sci‑Fi HUD): dark, high-contrast surfaces with cyan HUD accents.
 * Keep existing keys (`text`, `background`, `tint`, etc.) for compatibility.
 */

const HUD_CYAN = '#37E7FF';
const HUD_CYAN_DIM = '#19BFD6';
const ARC_VIOLET = '#8B5CFF';
const ARC_VIOLET_BRIGHT = '#A78BFF';
const REWARD_GOLD = '#FFB020';

export const Colors = {
  light: {
    // Base
    background: '#F7FAFF',
    surface: '#FFFFFF',
    surfaceRaised: '#EEF3FF',
    border: '#D3DDF2',

    // Text
    textStrong: '#0A1222',
    text: '#1C2B44',
    textMuted: '#52698A',

    // UI
    tint: '#0AA4C6',
    icon: '#52698A',
    iconMuted: '#6F84A6',

    // Game / system accents
    hud: '#0AA4C6',
    hudDim: '#078CA8',
    accent: '#6D4BFF',
    accentBright: '#8C79FF',
    reward: REWARD_GOLD,

    // States
    success: '#00BFA5',
    warning: REWARD_GOLD,
    error: '#E0355A',
    info: '#0AA4C6',

    // Tabs
    tabIconDefault: '#6F84A6',
    tabIconSelected: '#0AA4C6',
  },
  dark: {
    // Base
    background: '#05070C',
    surface: '#0A0F1A',
    surfaceRaised: '#0F1729',
    border: '#1B2A44',

    // Text
    textStrong: '#EAF2FF',
    text: '#B7C6E3',
    textMuted: '#7D8FB3',

    // UI
    tint: HUD_CYAN,
    icon: '#B7C6E3',
    iconMuted: '#5C6E93',

    // Game / system accents
    hud: HUD_CYAN,
    hudDim: HUD_CYAN_DIM,
    accent: ARC_VIOLET,
    accentBright: ARC_VIOLET_BRIGHT,
    reward: REWARD_GOLD,

    // States
    success: '#2CFFB7',
    warning: REWARD_GOLD,
    error: '#FF4D6D',
    info: HUD_CYAN,

    // Tabs
    tabIconDefault: '#5C6E93',
    tabIconSelected: HUD_CYAN,
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
