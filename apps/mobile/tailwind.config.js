/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './constants/**/*.{js,jsx,ts,tsx}',
    './hooks/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
    './state/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ascendia: {
          // Dark base (Sci‑Fi HUD)
          bg0: '#05070C',
          bg1: '#0A0F1A',
          bg2: '#0F1729',
          border: '#1B2A44',

          // Text
          textStrong: '#EAF2FF',
          text: '#B7C6E3',
          textMuted: '#7D8FB3',
          iconMuted: '#5C6E93',

          // Accents
          hud: '#37E7FF',
          hudDim: '#19BFD6',
          violet: '#8B5CFF',
          violetBright: '#A78BFF',
          gold: '#FFB020',

          // States
          success: '#2CFFB7',
          warning: '#FFB020',
          error: '#FF4D6D',
        },
      },
    },
  },
  plugins: [],
};
