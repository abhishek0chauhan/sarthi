import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from '@/constants/colors';
import { useThemeStore } from '@/stores/theme.store';

export function useColors() {
  const systemScheme = useColorScheme();
  const override = useThemeStore(s => s.override);
  const effective = override === 'system' ? systemScheme : override;
  return effective === 'dark' ? darkColors : lightColors;
}
