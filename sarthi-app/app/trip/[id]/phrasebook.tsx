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
      {phrase.context ? (
        <Text style={styles.context}>{phrase.context}</Text>
      ) : null}
      <Text style={styles.local}>{phrase.local}</Text>
      <Text style={styles.pronunciation}>🔊 {phrase.pronunciation}</Text>
    </View>
  );
}

function makePhraseStyles(colors: Colors) {
  return StyleSheet.create({
    row: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 3,
    },
    english: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: colors.textPrimary,
    },
    context: {
      fontSize: 11,
      color: colors.textTertiary,
      fontStyle: 'italic',
    },
    local: {
      fontSize: 18,
      fontFamily: 'Inter_700Bold',
      color: colors.primary500,
      lineHeight: 26,
    },
    pronunciation: {
      fontSize: 12,
      color: colors.textSecondary,
      letterSpacing: 0.2,
    },
  });
}

const CATEGORIES = [
  { key: 'greeting', label: '👋 Greetings' },
  { key: 'food', label: '🍛 Food & Dining' },
  { key: 'transport', label: '🛺 Transport' },
  { key: 'directions', label: '🗺️ Directions' },
  { key: 'shopping', label: '🛍️ Shopping' },
  { key: 'accommodation', label: '🏨 Hotel & Stay' },
  { key: 'bargaining', label: '💰 Bargaining' },
  { key: 'polite', label: '🙏 Polite Expressions' },
  { key: 'emergency', label: '🚨 Emergency' },
] as const;

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

      {phrasebook && phrasebook.language ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.langBadge}>
            <Text style={styles.langText}>{phrasebook.language}</Text>
            {phrasebook.script && (
              <Text style={styles.scriptText}>{phrasebook.script} script</Text>
            )}
          </View>

          {CATEGORIES.map(({ key, label }) => {
            const phrases = (phrasebook as any)[key] as Phrase[] | undefined;
            if (!phrases?.length) return null;
            return (
              <View key={key} style={styles.section}>
                <Text style={styles.sectionLabel}>{label}</Text>
                {phrases.map((p, i) => (
                  <PhraseRow key={i} phrase={p} />
                ))}
              </View>
            );
          })}

          {phrasebook.culturalNotes?.length > 0 && (
            <View style={styles.culturalCard}>
              <Text style={styles.culturalLabel}>💡 Cultural Notes</Text>
              {phrasebook.culturalNotes.map((note, i) => (
                <Text key={i} style={styles.culturalNote}>• {note}</Text>
              ))}
            </View>
          )}

          <Pressable
            style={[styles.regenerateBtn, isGenerating && styles.generateBtnDisabled]}
            onPress={() => generate()}
            disabled={isGenerating}
          >
            <Text style={styles.generateBtnText}>
              {isGenerating ? 'Regenerating…' : '↻ Regenerate Phrasebook'}
            </Text>
          </Pressable>
        </ScrollView>
      ) : (
        <View style={styles.empty}>
          {error && (
            <Text style={styles.errorText}>⚠️ Failed to load phrasebook</Text>
          )}
          <Text style={styles.emptyText}>
            {error
              ? 'Try generating a new one or try again in a moment.'
              : 'No phrasebook yet for this trip.'}
          </Text>
          <Pressable
            style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
            onPress={() => generate()}
            disabled={isGenerating}
          >
            <Text style={styles.generateBtnText}>
              {isGenerating ? 'Generating…' : '✨ Generate Phrasebook'}
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgBase },
    header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
    back: {
      fontSize: 14,
      fontFamily: 'Inter_700Bold',
      color: colors.primary500,
    },
    title: {
      fontSize: 22,
      fontFamily: 'Inter_800ExtraBold',
      color: colors.textPrimary,
      paddingHorizontal: 16,
      marginBottom: 8,
      letterSpacing: -0.5,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: 32,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    errorText: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    generateBtn: {
      backgroundColor: colors.primary500,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    regenerateBtn: {
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      paddingVertical: 11,
      paddingHorizontal: 24,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignSelf: 'center',
      marginTop: 8,
    },
    generateBtnDisabled: { opacity: 0.5 },
    generateBtnText: {
      color: '#fff',
      fontFamily: 'Inter_700Bold',
      fontSize: 14,
      textAlign: 'center',
    },
    content: { padding: 16, gap: 20, paddingBottom: 40 },
    langBadge: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      marginBottom: 4,
      backgroundColor: colors.primary50,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.primary200,
    },
    langText: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: colors.primary500,
    },
    scriptText: {
      fontSize: 12,
      color: colors.textTertiary,
      backgroundColor: colors.bgSurface,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    section: { gap: 4 },
    sectionLabel: {
      fontSize: 13,
      fontFamily: 'Inter_700Bold',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    culturalCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    culturalLabel: {
      fontSize: 13,
      fontFamily: 'Inter_700Bold',
      color: colors.textPrimary,
    },
    culturalNote: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
    },
  });
}
