import { View, Text, StyleSheet } from 'react-native';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

interface EmptyStateProps {
  title: string;
  description?: string;
  illustration?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, illustration, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {illustration && <View style={styles.illustrationWrapper}>{illustration}</View>}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {action && <View style={styles.actionWrapper}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  illustrationWrapper: { marginBottom: 24 },
  title: { ...type.screenTitle, color: lightColors.textPrimary, textAlign: 'center', marginBottom: 8 },
  description: { ...type.body, color: lightColors.textSecondary, textAlign: 'center', marginBottom: 24 },
  actionWrapper: { width: '100%' },
});
