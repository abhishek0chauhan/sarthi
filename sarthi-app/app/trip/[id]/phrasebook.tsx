import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTrip } from '@/hooks/useTrips';
import { usePhrasebook, useGeneratePhrasebook } from '@/hooks/useEnrichment';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import type { Phrase } from '@/types/enrichment.types';

function PhraseRow({ phrase }: { phrase: Phrase }) {
  const colors = useColors();
  const styles = makePhraseStyles(colors);
  return (
    <View style={styles.row}>
      <Text style={styles.english}>{phrase.english}</Text>
      <Text style={styles.local}>{phrase.local}</Text>
      <Text style={styles.pronunciation}>{phrase.pronunciation}</Text>
    </View>
  );
}

function makePhraseStyles(colors: Colors) {
  return StyleSheet.create({
    row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 2 },
    english: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.textPrimary },
    local: { fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.primary500 },
    pronunciation: { fontSize: 11, color: colors.textTertiary, fontStyle: 'italic' },
  });
}

export default function PhrasebookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: trip } = useTrip(id ?? '');
  const { data: phrasebook, isLoading, error } = usePhrasebook(id ?? '');
  const { mutate: generate, isPending: isGenerating } = useGeneratePhrasebook(id ?? '');
  const colors = useColors();
  const styles = makeStyles(colors);

  if (isLoading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← {trip?.destination ?? 'Trip'}</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>Phrasebook</Text>

      {error && !phrasebook && (
        <View style={styles.empty}>
          <Text style={styles.errorText}>⚠️ Failed to load phrasebook</Text>
          <Text style={styles.emptyText}>Try generating a new one or try again in a moment.</Text>
          <Pressable
            style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
            onPress={() => generate()}
            disabled={isGenerating}
          >
            <Text style={styles.generateBtnText}>{isGenerating ? 'Generating…' : '✨ Generate Phrasebook'}</Text>
          </Pressable>
        </View>
      )}

      {!phrasebook && !isLoading && !error && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No phrasebook yet for this trip.</Text>
          <Pressable
            style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
            onPress={() => generate()}
            disabled={isGenerating}
          >
            <Text style={styles.generateBtnText}>{isGenerating ? 'Generating…' : '✨ Generate Phrasebook'}</Text>
          </Pressable>
        </View>
      )}

      {phrasebook && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.langBadge}>
            <Text style={styles.langText}>{phrasebook.language}</Text>
            {phrasebook.script && <Text style={styles.scriptText}>({phrasebook.script} script)</Text>}
          </View>

          {[
            { label: 'Greetings', phrases: phrasebook.greeting },
            { label: 'Food', phrases: phrasebook.food },
            { label: 'Directions', phrases: phrasebook.directions },
            { label: 'Emergency', phrases: phrasebook.emergency },
            { label: 'Bargaining', phrases: phrasebook.bargaining },
          ].map(({ label, phrases }) =>
            phrases?.length ? (
              <View key={label} style={styles.section}>
                <Text style={styles.sectionLabel}>{label}</Text>
                {phrases.map((p, i) => <PhraseRow key={i} phrase={p} />)}
              </View>
            ) : null
          )}

          {phrasebook.culturalNotes?.length > 0 && (
            <View style={styles.culturalCard}>
              <Text style={styles.sectionLabel}>Cultural Notes</Text>
              {phrasebook.culturalNotes.map((note, i) => (
                <Text key={i} style={styles.culturalNote}>• {note}</Text>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgBase },
    header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
    back: { fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.primary500 },
    title: { fontSize: 22, fontFamily: 'Inter_800ExtraBold', color: colors.textPrimary, paddingHorizontal: 16, marginBottom: 8, letterSpacing: -0.5 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    errorText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.textPrimary, textAlign: 'center' },
    generateBtn: { backgroundColor: colors.primary500, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
    generateBtnDisabled: { opacity: 0.5 },
    generateBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
    content: { padding: 16, gap: 20, paddingBottom: 40 },
    langBadge: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 },
    langText: { fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.textPrimary },
    scriptText: { fontSize: 12, color: colors.textTertiary },
    section: { gap: 4 },
    sectionLabel: { ...type.overline, color: colors.textTertiary, marginBottom: 4 },
    culturalCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    culturalNote: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  });
}
