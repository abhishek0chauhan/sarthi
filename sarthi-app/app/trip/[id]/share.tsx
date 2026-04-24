import { View, Text, Pressable, Share, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTrip, useEnableSharing, useDisableSharing } from '@/hooks/useTrips';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

export default function TripShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: trip, isLoading } = useTrip(id ?? '');
  const enableSharing = useEnableSharing(id ?? '');
  const disableSharing = useDisableSharing(id ?? '');

  if (isLoading) return <LoadingSpinner />;
  if (!trip) return null;

  const shareUrl = trip.shareToken
    ? `https://sarthi.app/shared/${trip.shareToken}`
    : null;

  const handleShare = async () => {
    if (!shareUrl) return;
    await Share.share({ message: `Check out my trip to ${trip.destination}!\n${shareUrl}` });
  };

  const handleEnable = () => {
    enableSharing.mutate(undefined, {
      onError: () => Alert.alert('Error', 'Failed to enable sharing'),
    });
  };

  const handleDisable = () => {
    Alert.alert('Disable Sharing', 'This will revoke the share link.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disable', style: 'destructive', onPress: () => disableSharing.mutate() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🔗</Text>
        <Text style={styles.title}>Share "{trip.name}"</Text>
        <Text style={styles.subtitle}>
          Anyone with the link can view your itinerary and food guide.
        </Text>

        {shareUrl ? (
          <View style={styles.linkBox}>
            <Text style={styles.link} numberOfLines={2}>{shareUrl}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {shareUrl ? (
            <>
              <Button label="Share Link" onPress={handleShare} />
              <Button
                label="Disable Sharing"
                onPress={handleDisable}
                variant="destructive"
                loading={disableSharing.isPending}
              />
            </>
          ) : (
            <Button
              label="Enable Sharing"
              onPress={handleEnable}
              loading={enableSharing.isPending}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: lightColors.bgBase },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emoji: { fontSize: 48 },
  title: { ...type.screenTitle, color: lightColors.textPrimary, textAlign: 'center' },
  subtitle: { ...type.body, color: lightColors.textSecondary, textAlign: 'center' },
  linkBox: {
    backgroundColor: lightColors.bgSurface,
    borderRadius: 10,
    padding: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: lightColors.border,
  },
  link: { ...type.caption, color: lightColors.primary500 },
  actions: { width: '100%', gap: 10 },
});
