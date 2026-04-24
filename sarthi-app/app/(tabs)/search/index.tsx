import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SearchForm } from '@/components/search/SearchForm';
import { useSearchDestinations } from '@/hooks/useSearch';
import { useSearchStore } from '@/stores/search.store';
import { lightColors } from '@/constants/colors';
import type { SearchDto } from '@/types/search.types';

export default function SearchScreen() {
  const router = useRouter();
  const { formValues } = useSearchStore();
  const searchMutation = useSearchDestinations();

  const handleSearch = () => {
    searchMutation.mutate(formValues as SearchDto, {
      onSuccess: () => {
        router.push('/(tabs)/search/results' as any);
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SearchForm onSubmit={handleSearch} loading={searchMutation.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: lightColors.bgBase },
  scroll: { flex: 1 },
  content: { padding: 20 },
});
