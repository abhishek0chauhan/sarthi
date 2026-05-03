import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { useSubmitStory } from '@/hooks/useProfile';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_CHARACTERS = 50;
const MAX_CHARACTERS = 1000;

const DIMENSION_LABELS = {
  travelPace: {
    label: 'Travel Pace',
    values: { packed: 'Packed schedule', loose: 'Loose plan', no_plan: 'No plan' },
  },
  depthVsBreadth: {
    label: 'Style',
    values: { deep: 'Deep explorer', balanced: 'Balanced', cover: 'Cover as much as possible' },
  },
  comfortLevel: {
    label: 'Stay Preference',
    values: { hotel: 'Hotel', homestay: 'Homestay', rough: 'Rough it' },
  },
  crowdTolerance: {
    label: 'Crowd Tolerance',
    values: { worth_it: 'Worth the crowds', hidden: 'Prefer hidden gems', avoid: 'Avoid crowds' },
  },
  physicalReadiness: {
    label: 'Physical Activity',
    values: { yes: 'Loves a challenge', maybe: 'Moderate', no: 'Easy going' },
  },
  spendingStyle: {
    label: 'Spending Style',
    values: { experience: 'Spend on experiences', budget: 'Budget everything', comfort: 'Comfort matters' },
  },
  groundReality: {
    label: 'Ground Reality',
    values: { bring_it: 'Part of the adventure', tolerate: 'Can handle it', need_comfort: 'Need basics' },
  },
  languageComfort: {
    label: 'Language',
    values: { fine: 'Comfortable anywhere', hindi: 'Prefer Hindi regions', english: 'Need English' },
  },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

interface SuccessStateProps {
  profile: any;
  colors: Colors;
  styles: ReturnType<typeof makeStyles>;
  onContinue: () => void;
  onDone: () => void;
}

function SuccessState({ profile, colors, styles, onContinue, onDone }: SuccessStateProps) {
  const dimensions = [
    {
      key: 'travelPace',
      label: DIMENSION_LABELS.travelPace.label,
      value: profile?.travelPace
        ? DIMENSION_LABELS.travelPace.values[profile.travelPace as keyof typeof DIMENSION_LABELS.travelPace.values]
        : null,
    },
    {
      key: 'depthVsBreadth',
      label: DIMENSION_LABELS.depthVsBreadth.label,
      value: profile?.depthVsBreadth
        ? DIMENSION_LABELS.depthVsBreadth.values[profile.depthVsBreadth as keyof typeof DIMENSION_LABELS.depthVsBreadth.values]
        : null,
    },
    {
      key: 'comfortLevel',
      label: DIMENSION_LABELS.comfortLevel.label,
      value: profile?.comfortLevel
        ? DIMENSION_LABELS.comfortLevel.values[profile.comfortLevel as keyof typeof DIMENSION_LABELS.comfortLevel.values]
        : null,
    },
    {
      key: 'crowdTolerance',
      label: DIMENSION_LABELS.crowdTolerance.label,
      value: profile?.crowdTolerance
        ? DIMENSION_LABELS.crowdTolerance.values[profile.crowdTolerance as keyof typeof DIMENSION_LABELS.crowdTolerance.values]
        : null,
    },
    {
      key: 'physicalReadiness',
      label: DIMENSION_LABELS.physicalReadiness.label,
      value: profile?.physicalReadiness
        ? DIMENSION_LABELS.physicalReadiness.values[profile.physicalReadiness as keyof typeof DIMENSION_LABELS.physicalReadiness.values]
        : null,
    },
    {
      key: 'spendingStyle',
      label: DIMENSION_LABELS.spendingStyle.label,
      value: profile?.spendingStyle
        ? DIMENSION_LABELS.spendingStyle.values[profile.spendingStyle as keyof typeof DIMENSION_LABELS.spendingStyle.values]
        : null,
    },
    {
      key: 'groundReality',
      label: DIMENSION_LABELS.groundReality.label,
      value: profile?.groundReality
        ? DIMENSION_LABELS.groundReality.values[profile.groundReality as keyof typeof DIMENSION_LABELS.groundReality.values]
        : null,
    },
    {
      key: 'languageComfort',
      label: DIMENSION_LABELS.languageComfort.label,
      value: profile?.languageComfort
        ? DIMENSION_LABELS.languageComfort.values[profile.languageComfort as keyof typeof DIMENSION_LABELS.languageComfort.values]
        : null,
    },
  ];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.successContainer}>
        {/* Extracted dimensions card */}
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

        {/* Action buttons */}
        <View style={styles.actionButtonsContainer}>
          <Pressable
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
  const [successData, setSuccessData] = useState<any>(null);

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
      onError: (error: any) => {
        Alert.alert(
          'Failed to analyse story',
          error?.response?.data?.message || 'Please try again later.'
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
        {/* ── Header ── */}
        <Pressable style={styles.header} onPress={() => router.back()}>
          <Text style={styles.headerText}>← Traveler Personality</Text>
        </Pressable>

        {/* ── Overline ── */}
        <Text style={styles.overline}>TELL US YOUR STORY</Text>

        {/* ── Prompt text ── */}
        <Text style={styles.prompt}>
          Tell us about a trip you loved — what made it great? And a trip (or moment) that didn't work — what went wrong?
        </Text>

        {/* ── Text Input ── */}
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          placeholder="Share your travel story..."
          placeholderTextColor={colors.textTertiary}
          multiline
          scrollEnabled
          value={text}
          onChangeText={setText}
          maxLength={MAX_CHARACTERS}
        />

        {/* ── Character counter ── */}
        <View style={styles.counterContainer}>
          <Text style={styles.counter}>
            {text.length} / {MAX_CHARACTERS}
          </Text>
        </View>

        {/* ── Analyse Story button ── */}
        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.primary500, opacity: pressed && text.length >= MIN_CHARACTERS ? 0.8 : 1 },
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
