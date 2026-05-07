import { FlatList, StyleSheet, View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { DestinationCard } from '@/components/search/DestinationCard';
import { TrekCard } from '@/components/search/TrekCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSearchStore } from '@/stores/search.store';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { SearchResultDestination, TrekResult, PlanConfirmedResponse } from '@/types/search.types';

export default function SearchResultsScreen() {
  const router = useRouter();
  const data = useSearchStore((s) => s.searchResults);
  const colors = useColors();
  const styles = makeStyles(colors);

  useEffect(() => {
    // Handle plan_confirmed mode - prompt user for itinerary or food guide
    if (data && 'mode' in data && data.mode === 'plan_confirmed') {
      const planData = data as PlanConfirmedResponse;
      Alert.alert(
        `You've selected ${planData.destination}`,
        'What would you like to do?',
        [
          {
            text: 'Get Itinerary',
            onPress: () => {
              router.push({
                pathname: '/itinerary/new',
                params: {
                  destination: planData.destination,
                },
              } as any);
            },
          },
          {
            text: 'Get Food Guide',
            onPress: () => {
              router.push({
                pathname: '/food-guide/new',
                params: {
                  destination: planData.destination,
                },
              } as any);
            },
          },
          {
            text: 'Cancel',
            onPress: () => router.back(),
            style: 'cancel',
          },
        ],
      );
    }
  }, [data, router]);

  if (!data) {
    return <EmptyState title="No results yet" description="Go back and search for a destination." />;
  }

  // Don't show results list for plan_confirmed mode
  if ('mode' in data && data.mode === 'plan_confirmed') {
    return null;
  }

  const isTrekMode = data.mode === 'trek';
  const items: (SearchResultDestination | TrekResult)[] = data.results ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={items}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <Text style={styles.header}>
            {items.length} {isTrekMode ? 'treks' : 'destinations'} found
          </Text>
        }
        renderItem={({ item }) => {
          if (isTrekMode) {
            return <TrekCard trek={item as unknown as TrekResult} />;
          }
          const dest = item as unknown as SearchResultDestination;
          return (
            <DestinationCard
              destination={dest}
              onGetItinerary={() =>
                router.push({
                  pathname: '/itinerary/new',
                  params: { destination: dest.name, state: dest.state },
                } as any)
              }
              onGetFoodGuide={() =>
                router.push({
                  pathname: '/food-guide/new',
                  params: { destination: dest.name, state: dest.state },
                } as any)
              }
            />
          );
        }}
        ListEmptyComponent={<EmptyState title="No results" description="Try a different search." />}
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgBase },
    content: { padding: 20, paddingBottom: 32 },
    header: { ...type.overline, color: colors.textSecondary, marginBottom: 16 },
  });
}
