import { Stack } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';

export default function AuthLayout() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgBase },
      }}
    />
  );
}
