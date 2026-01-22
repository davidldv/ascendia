import { Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
  className?: string;
};

const typeClassName: Record<NonNullable<ThemedTextProps['type']>, string> = {
  default: 'text-base leading-6',
  defaultSemiBold: 'text-base leading-6 font-semibold',
  title: 'text-[32px] leading-[32px] font-bold',
  subtitle: 'text-[20px] font-bold',
  link: 'text-base leading-[30px]',
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  className,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const colorName = type === 'link' ? 'tint' : 'text';
  const color = useThemeColor({ light: lightColor, dark: darkColor }, colorName);

  const combinedClassName = [typeClassName[type], className].filter(Boolean).join(' ');

  return <Text className={combinedClassName} style={[{ color }, style]} {...rest} />;
}
