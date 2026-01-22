import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = {
  size?: number;
  color: string;
  focused?: boolean;
};

type FrameProps = {
  size?: number;
  focused?: boolean;
  children: React.ReactNode;
};

export function HudTabIconFrame({ size = 26, focused = false, children }: FrameProps) {
  const scan = useSharedValue(0);

  useEffect(() => {
    if (focused) {
      scan.value = withRepeat(
        withTiming(1, {
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        false
      );
      return;
    }
    cancelAnimation(scan);
    scan.value = 0;
  }, [focused, scan]);

  const scanStyle = useAnimatedStyle(() => {
    const t = scan.value;
    const y = interpolate(t, [0, 1], [-size * 0.9, size * 0.9]);
    const opacity = focused ? interpolate(t, [0, 0.2, 0.8, 1], [0.0, 0.65, 0.65, 0.0]) : 0;
    return {
      opacity,
      transform: [{ translateY: y }, { rotate: '-18deg' }],
    };
  });

  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      {children}
      {/* scan */}
      <Animated.View pointerEvents="none" style={[styles.scan, scanStyle, { width: size * 1.8 }]}>
        <LinearGradient
          colors={[
            'rgba(0,0,0,0)',
            'rgba(55,231,255,0.75)',
            'rgba(139,92,255,0.65)',
            'rgba(0,0,0,0)',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.scanGradient}
        />
      </Animated.View>
    </View>
  );
}

export function HudHomeIcon({ size = 26, color, focused = false }: Props) {
  const strokeWidth = 2;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* glow */}
      {focused ? (
        <Path
          d="M4.6 11.1 12 4.7l7.4 6.4v7.2c0 1.1-.9 2-2 2H6.6c-1.1 0-2-.9-2-2v-7.2Z"
          stroke={color}
          strokeWidth={strokeWidth + 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.18}
        />
      ) : null}
      {/* frame */}
      <Path
        d="M4.6 11.1 12 4.7l7.4 6.4v7.2c0 1.1-.9 2-2 2H6.6c-1.1 0-2-.9-2-2v-7.2Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* core */}
      <Path
        d="M9.2 20v-6.2c0-.7.6-1.3 1.3-1.3h3c.7 0 1.3.6 1.3 1.3V20"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={focused ? 0.95 : 0.8}
      />
      {/* hud notch */}
      <Path
        d="M7.3 11.6h9.4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={focused ? 0.5 : 0.25}
      />
    </Svg>
  );
}

export function HudProgressIcon({ size = 26, color, focused = false }: Props) {
  const strokeWidth = 2;
  const r = 7.2;
  const c = 2 * Math.PI * r;
  const progress = 0.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* glow */}
      {focused ? (
        <>
          <Circle
            cx={12}
            cy={12}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth + 2}
            opacity={0.14}
          />
          <Circle
            cx={12}
            cy={12}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth + 3.5}
            strokeDasharray={`${c * progress} ${c}`}
            strokeDashoffset={c * 0.25}
            strokeLinecap="round"
            opacity={0.12}
          />
        </>
      ) : null}

      {/* ring track */}
      <Circle
        cx={12}
        cy={12}
        r={r}
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={focused ? 0.28 : 0.18}
      />

      {/* ring progress */}
      <Circle
        cx={12}
        cy={12}
        r={r}
        stroke={color}
        strokeWidth={strokeWidth + 0.6}
        strokeDasharray={`${c * progress} ${c}`}
        strokeDashoffset={c * 0.25}
        strokeLinecap="round"
        opacity={focused ? 0.95 : 0.85}
      />

      {/* marker + hud notch */}
      <Circle cx={17.4} cy={15.6} r={1.1} fill={color} opacity={focused ? 0.95 : 0.75} />
      <Path
        d="M12 6.8v1.6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={focused ? 0.5 : 0.25}
      />
    </Svg>
  );
}

export function HudProfileIcon({ size = 26, color, focused = false }: Props) {
  const strokeWidth = 2;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {focused ? (
        <Path
          d="M12 12.2c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 1.8-4 4 1.8 4 4 4Z"
          stroke={color}
          strokeWidth={strokeWidth + 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.18}
        />
      ) : null}
      {/* head */}
      <Path
        d="M12 12.2c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 1.8-4 4 1.8 4 4 4Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* shoulders */}
      <Path
        d="M4.6 20c1.6-3.2 4.2-4.8 7.4-4.8S17.8 16.8 19.4 20"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={focused ? 0.95 : 0.85}
      />
      {/* hud collar line */}
      <Path
        d="M8.2 16.9h7.6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={focused ? 0.4 : 0.22}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 10,
  },
  scan: {
    position: 'absolute',
    height: 7,
    borderRadius: 999,
  },
  scanGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
});
