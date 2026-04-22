import { Stack } from 'expo-router';
import { lightColors } from '@/constants/colors';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: lightColors.bgBase },
      }}
    />
  );
}
