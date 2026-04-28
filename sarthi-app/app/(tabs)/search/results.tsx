import { FlatList, StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { DestinationCard } from '@/components/search/DestinationCard';
import { TrekCard } from '@/components/search/TrekCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSearchStore } from '@/stores/search.store';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { SearchResultDestination, TrekResult } from '@/types/search.types';

export default function SearchResultsScreen() {
  const router = useRouter();
  const data = useSearchStore((s) => s.searchResults);
  const colors = useColors();
  const styles = makeStyles(colors);

  if (!data) {
    return <EmptyState title="No results yet" description="Go back and search for a destination." />;
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
