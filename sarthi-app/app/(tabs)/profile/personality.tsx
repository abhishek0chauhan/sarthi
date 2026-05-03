import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { useProfile, useResetProfile } from '@/hooks/useProfile';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';
import { DIMENSION_LABELS } from '@/constants/profileDimensions';

// ─── Sub-components ──────────────────────────────────────────────────────────

interface CompletionBarProps {
  completeness: number;
  colors: Colors;
  styles: ReturnType<typeof makeStyles>;
}

function CompletionBar({ completeness, colors, styles }: CompletionBarProps) {
  return (
    <View style={styles.completionContainer}>
      <View style={styles.completionLabelRow}>
        <Text style={styles.completionLabel}>Profile Completeness</Text>
        <Text style={styles.completionPercent}>{completeness}%</Text>
      </View>
      <View style={[styles.completionBar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.completionFill,
            { backgroundColor: colors.primary500, width: `${completeness}%` },
          ]}
        />
      </View>
    </View>
  );
}

interface DimensionRowProps {
  label: string;
  value: string | null;
  colors: Colors;
  styles: ReturnType<typeof makeStyles>;
  isFirst?: boolean;
}

function DimensionRow({ label, value, colors, styles, isFirst }: DimensionRowProps) {
  return (
    <View style={[styles.dimensionRow, isFirst && styles.dimensionRowFirst]}>
      <Text style={styles.dimensionLabel}>{label}</Text>
      <Text style={[styles.dimensionValue, !value && styles.dimensionValueEmpty]}>
        {value || 'Not set'}
      </Text>
    </View>
  );
}

interface EmptyStateProps {
  colors: Colors;
  styles: ReturnType<typeof makeStyles>;
  onStoryPress: () => void;
  onQuizPress: () => void;
}

function EmptyState({ colors, styles, onStoryPress, onQuizPress }: EmptyStateProps) {
  return (
    <View style={styles.emptyStateContainer}>
      <View style={[styles.onboardingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <Text style={styles.onboardingTitle}>Get to Know Your Travel Style</Text>
        <Text style={styles.onboardingDescription}>
          Tell us about your travel preferences so we can personalize your experience.
        </Text>

        <View style={styles.buttonGroup}>
          <Pressable
            accessible
            accessibilityLabel="Share a story"
            accessibilityHint="Tell us about your travel experiences"
            style={({ pressed }) => [
              styles.button,
              styles.buttonPrimary,
              { backgroundColor: colors.primary500, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={onStoryPress}
          >
            <Text style={styles.buttonTextPrimary}>📖 Share a Story</Text>
          </Pressable>

          <Pressable
            accessible
            accessibilityLabel="Take a quiz"
            accessibilityHint="Answer questions about your travel preferences"
            style={({ pressed }) => [
              styles.button,
              styles.buttonSecondary,
              { borderColor: colors.primary500, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={onQuizPress}
          >
            <Text style={[styles.buttonTextSecondary, { color: colors.primary500 }]}>📋 Take a Quiz</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PersonalityScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = makeStyles(colors);
  const { data: profile, isLoading } = useProfile();
  const resetProfileMutation = useResetProfile();

  const handleReset = () => {
    Alert.alert('Reset Profile', 'Are you sure you want to reset your personality profile? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          resetProfileMutation.mutate();
        },
      },
    ]);
  };

  const isEmpty = !profile || profile.completeness === 0;

  // Map dimension keys to their readable labels and values
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          accessible
          accessibilityLabel="Back to profile"
          accessibilityHint="Returns to the main profile screen"
          style={styles.header}
          onPress={() => router.back()}
        >
          <Text style={styles.headerText}>← Profile</Text>
        </Pressable>

        <Text style={styles.title}>Traveler Personality</Text>

        {/* ── Content ── */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : isEmpty ? (
          <EmptyState
            colors={colors}
            styles={styles}
            onStoryPress={() => router.push('/(tabs)/profile/story')}
            onQuizPress={() => router.push('/(tabs)/profile/quiz')}
          />
        ) : (
          <View style={styles.filledStateContainer}>
            {/* Completeness bar */}
            <CompletionBar completeness={profile.completeness} colors={colors} styles={styles} />

            {/* Dimensions section */}
            <View style={[styles.dimensionsSection, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              {dimensions.map((dimension, index) => (
                <DimensionRow
                  key={dimension.key}
                  label={dimension.label}
                  value={dimension.value}
                  colors={colors}
                  styles={styles}
                  isFirst={index === 0}
                />
              ))}
            </View>

            <View style={styles.actionButtonsContainer}>
              <Pressable
                accessible
                accessibilityLabel="Edit via quiz"
                accessibilityHint="Update your personality profile by taking a quiz"
                style={({ pressed }) => [
                  styles.editButton,
                  { backgroundColor: colors.primary500, opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => router.push('/(tabs)/profile/quiz')}
              >
                <Text style={styles.editButtonText}>Edit via Quiz</Text>
              </Pressable>

              <Pressable
                accessible
                accessibilityLabel="Reset profile"
                accessibilityHint="Clear your personality profile. This action cannot be undone."
                style={({ pressed }) => [
                  styles.resetButton,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={handleReset}
              >
                <Text style={[styles.resetButtonText, { color: colors.danger }]}>Reset Profile</Text>
              </Pressable>
            </View>
          </View>
        )}
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

    // Title
    title: {
      ...type.screenTitle,
      color: colors.textPrimary,
      paddingHorizontal: 24,
      marginBottom: 24,
    },

    // Loading state
    loadingContainer: {
      paddingHorizontal: 24,
      paddingVertical: 32,
      alignItems: 'center',
    },
    loadingText: {
      ...type.body,
      color: colors.textSecondary,
    },

    // Empty state
    emptyStateContainer: {
      paddingHorizontal: 24,
    },
    onboardingCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      padding: 20,
      gap: 16,
    },
    onboardingTitle: {
      ...type.cardHeading,
      color: colors.textPrimary,
    },
    onboardingDescription: {
      ...type.body,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    buttonGroup: {
      gap: 12,
      marginTop: 8,
    },
    button: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPrimary: {
      backgroundColor: colors.primary500,
    },
    buttonSecondary: {
      backgroundColor: colors.bgBase,
      borderWidth: 1,
      borderColor: colors.primary500,
    },
    buttonTextPrimary: {
      ...type.body,
      color: colors.textInverse,
      fontFamily: 'Inter_600SemiBold',
    },
    buttonTextSecondary: {
      ...type.body,
      color: colors.primary500,
      fontFamily: 'Inter_600SemiBold',
    },

    // Filled state
    filledStateContainer: {
      gap: 20,
    },

    // Completeness bar
    completionContainer: {
      paddingHorizontal: 24,
      gap: 8,
    },
    completionLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    completionLabel: {
      ...type.body,
      color: colors.textPrimary,
      fontFamily: 'Inter_600SemiBold',
    },
    completionPercent: {
      ...type.body,
      color: colors.primary500,
      fontFamily: 'Inter_600SemiBold',
    },
    completionBar: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      backgroundColor: colors.border,
    },
    completionFill: {
      height: '100%',
      borderRadius: 4,
    },

    // Dimensions section
    dimensionsSection: {
      marginHorizontal: 24,
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
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

    // Action buttons
    actionButtonsContainer: {
      paddingHorizontal: 24,
      gap: 12,
    },
    editButton: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editButtonText: {
      ...type.body,
      color: colors.textInverse,
      fontFamily: 'Inter_600SemiBold',
    },
    resetButton: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetButtonText: {
      ...type.body,
      fontFamily: 'Inter_600SemiBold',
    },
  });
}
