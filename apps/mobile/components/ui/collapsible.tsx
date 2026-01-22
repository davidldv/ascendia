import { PropsWithChildren, useState } from 'react';
import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const iconColor = useThemeColor({}, 'icon');

  return (
    <ThemedView>
      <Pressable
        className="flex-row items-center gap-1.5"
        onPress={() => setIsOpen((value) => !value)}>
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color={iconColor}
          style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
        />

        <ThemedText type="defaultSemiBold">{title}</ThemedText>
      </Pressable>
      {isOpen && <ThemedView className="ml-6 mt-1.5">{children}</ThemedView>}
    </ThemedView>
  );
}
