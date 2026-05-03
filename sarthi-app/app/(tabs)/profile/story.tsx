import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { useSubmitStory } from '@/hooks/useProfile';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import { DIMENSION_LABELS } from '@/constants/profileDimensions';
import type { StoryResponse, TravelerProfile } from '@/types/profile.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_CHARACTERS = 50;
const MAX_CHARACTERS = 1000;

// ─── Helper Functions ───────────────────────────────────────────────────────

function extractDimensions(profile: TravelerProfile) {
  return Object.entries(DIMENSION_LABELS).map(([key, config]) => ({
    key,
    label: config.label,
    value: profile[key as keyof TravelerProfile]
      ? config.values[profile[key as keyof TravelerProfile] as keyof typeof config.values]
      : null,
  }));
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface SuccessStateProps {
  profile: TravelerProfile;
  colors: Colors;
  styles: ReturnType<typeof makeStyles>;
  onContinue: () => void;
  onDone: () => void;
}

function SuccessState({ profile, colors, styles, onContinue, onDone }: SuccessStateProps) {
  const dimensions = extractDimensions(profile);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.successContainer}>
        <View style={[styles.dimensionsSection, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={styles.successTitle}>Extracted Personality</Text>
          {dimensions.map((dimension, index) => (
            <View
              key={dimension.key}
              style={[
                styles.dimensionRow,
                index === 0 && styles.dimensionRowFirst,
              ]}
            >
              <Text style={styles.dimensionLabel}>{dimension.label}</Text>
              <Text style={[styles.dimensionValue, !dimension.value && styles.dimensionValueEmpty]}>
                {dimension.value || 'Not extracted'}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.actionButtonsContainer}>
          <Pressable
            accessible
            accessibilityLabel="Looks good, continue to quiz"
            accessibilityHint="Proceeds to the personality quiz based on your story"
            style={({ pressed }) => [
              styles.button,
              styles.buttonPrimary,
              { backgroundColor: colors.primary500, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={onContinue}
          >
            <Text style={styles.buttonTextPrimary}>Looks good, continue to quiz →</Text>
          </Pressable>

          <Pressable
            accessible
            accessibilityLabel="Done"
            accessibilityHint="Closes the story submission screen"
            style={({ pressed }) => [
              styles.button,
              styles.buttonSecondary,
              { borderColor: colors.primary500, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={onDone}
          >
            <Text style={[styles.buttonTextSecondary, { color: colors.primary500 }]}>Done</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function StoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = makeStyles(colors);
  const [text, setText] = useState('');
  const [successData, setSuccessData] = useState<StoryResponse | null>(null);

  const submitStoryMutation = useSubmitStory(text);

  const handleAnalyseStory = () => {
    if (text.length < MIN_CHARACTERS) {
      Alert.alert('Story too short', `Please write at least ${MIN_CHARACTERS} characters.`);
      return;
    }

    submitStoryMutation.mutate(undefined, {
      onSuccess: (data) => {
        setSuccessData(data);
      },
      onError: (error: unknown) => {
        const errorMessage = error instanceof Error
          ? error.message
          : (error as Record<string, unknown>)?.response?.data?.message || 'Please try again later.';
        Alert.alert(
          'Failed to analyse story',
          String(errorMessage)
        );
      },
    });
  };

  const handleContinueToQuiz = () => {
    router.push('/(tabs)/profile/quiz');
  };

  const handleDone = () => {
    router.push('/(tabs)/profile/personality');
  };

  if (submitStoryMutation.isPending) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.headerText}>← Traveler Personality</Text>
          </Pressable>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary500} />
          <Text style={styles.loadingText}>Sarthi is reading your story…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (successData) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.headerText}>← Traveler Personality</Text>
          </Pressable>
        </View>

        <SuccessState
          profile={successData.profile}
          colors={colors}
          styles={styles}
          onContinue={handleContinueToQuiz}
          onDone={handleDone}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          accessible
          accessibilityLabel="Back to profile"
          accessibilityHint="Returns to the main personality screen"
          style={styles.header}
          onPress={() => router.back()}
        >
          <Text style={styles.headerText}>← Traveler Personality</Text>
        </Pressable>

        <Text style={styles.overline}>TELL US YOUR STORY</Text>

        <Text style={styles.prompt}>
          Tell us about a trip you loved — what made it great? And a trip (or moment) that didn't work — what went wrong?
        </Text>

        <TextInput
          style={[styles.textInput, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          placeholder="Share your travel story..."
          placeholderTextColor={colors.textTertiary}
          multiline
          scrollEnabled
          value={text}
          onChangeText={setText}
          maxLength={MAX_CHARACTERS}
          accessible
          accessibilityLabel="Travel story input"
          accessibilityHint={`Enter your travel story. Character count: ${text.length} out of ${MAX_CHARACTERS}`}
        />

        <View style={styles.counterContainer}>
          <Text style={styles.counter}>
            {text.length} / {MAX_CHARACTERS}
          </Text>
        </View>

        <Pressable
          accessible
          accessibilityLabel="Analyse story"
          accessibilityHint={text.length < MIN_CHARACTERS ? `Enter at least ${MIN_CHARACTERS} characters to analyse` : 'Analyses your travel story to extract personality'}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.primary500, opacity: pressed && text.length >= MIN_CHARACTERS ? 0.8 : 0.6 },
          ]}
          onPress={handleAnalyseStory}
          disabled={text.length < MIN_CHARACTERS}
        >
          <Text style={[styles.buttonText, { color: text.length < MIN_CHARACTERS ? colors.textTertiary : colors.textInverse }]}>
            Analyse Story
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.bgBase,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingBottom: 32,
    },

    // Header
    header: {
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    headerText: {
      ...type.body,
      color: colors.primary500,
      fontFamily: 'Inter_600SemiBold',
    },

    // Overline
    overline: {
      ...type.overline,
      color: colors.textTertiary,
      paddingHorizontal: 24,
      marginBottom: 16,
    },

    // Prompt text
    prompt: {
      ...type.body,
      color: colors.textSecondary,
      fontStyle: 'italic',
      paddingHorizontal: 24,
      marginBottom: 16,
      lineHeight: 22,
    },

    // Text input
    textInput: {
      marginHorizontal: 24,
      marginBottom: 8,
      minHeight: 160,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textPrimary,
      fontFamily: 'Inter_400Regular',
      textAlignVertical: 'top',
    },

    // Character counter
    counterContainer: {
      paddingHorizontal: 24,
      marginBottom: 16,
      alignItems: 'flex-end',
    },
    counter: {
      ...type.caption,
      color: colors.textTertiary,
    },

    // Button
    button: {
      marginHorizontal: 24,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      ...type.body,
      fontFamily: 'Inter_600SemiBold',
    },
    buttonPrimary: {
      backgroundColor: colors.primary500,
    },
    buttonTextPrimary: {
      color: colors.textInverse,
      fontFamily: 'Inter_600SemiBold',
    },

    // Loading state
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    loadingText: {
      ...type.body,
      color: colors.textSecondary,
    },

    // Success state
    successContainer: {
      gap: 24,
    },
    dimensionsSection: {
      marginHorizontal: 24,
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
    },
    successTitle: {
      ...type.body,
      color: colors.textPrimary,
      fontFamily: 'Inter_600SemiBold',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 0,
    },
    dimensionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    dimensionRowFirst: {
      borderTopWidth: 0,
      paddingTop: 0,
    },
    dimensionLabel: {
      ...type.body,
      color: colors.textPrimary,
      flex: 1,
    },
    dimensionValue: {
      ...type.body,
      color: colors.textSecondary,
      textAlign: 'right',
    },
    dimensionValueEmpty: {
      color: colors.textTertiary,
    },

    // Action buttons (success state)
    actionButtonsContainer: {
      paddingHorizontal: 24,
      gap: 12,
    },
    buttonSecondary: {
      backgroundColor: colors.bgBase,
      borderWidth: 1,
      borderColor: colors.primary500,
    },
    buttonTextSecondary: {
      ...type.body,
      fontFamily: 'Inter_600SemiBold',
    },
  });
}
