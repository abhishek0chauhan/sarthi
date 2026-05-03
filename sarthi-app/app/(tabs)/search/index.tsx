import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SearchForm } from '@/components/search/SearchForm';
import { useSearchDestinations } from '@/hooks/useSearch';
import { useSearchStore } from '@/stores/search.store';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import type { SearchDto } from '@/types/search.types';

export default function SearchScreen() {
  const router = useRouter();
  const { formValues, setSearchResults } = useSearchStore();
  const searchMutation = useSearchDestinations();
  const colors = useColors();
  const styles = makeStyles(colors);

  const handleSearch = () => {
    searchMutation.mutate(formValues as SearchDto, {
      onSuccess: (data) => {
        setSearchResults(data);
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

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgBase },
    scroll: { flex: 1 },
    content: { padding: 20, paddingBottom: 32 },
  });
}
