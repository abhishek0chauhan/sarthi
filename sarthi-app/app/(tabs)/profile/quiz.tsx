import { View, Text, Pressable, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColorScheme';
import { useSubmitQuiz } from '@/hooks/useProfile';
import { profileService } from '@/services/profile.service';
import type { Colors } from '@/constants/colors';
import type { QuizDto } from '@/types/profile.types';
import { type } from '@/constants/typography';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionOption {
  key: string;
  label: string;
}

type DimensionKey = 'travelPace' | 'depthVsBreadth' | 'comfortLevel' | 'crowdTolerance' | 'physicalReadiness' | 'spendingStyle' | 'groundReality' | 'languageComfort' | 'travelMotivations';

interface Question {
  dimension: DimensionKey;
  question: string;
  options: QuestionOption[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUIZ_QUESTIONS: Question[] = [
  {
    dimension: 'travelPace',
    question: 'How do you prefer to structure your trips?',
    options: [
      { key: 'packed', label: 'Packed schedule' },
      { key: 'loose', label: 'Loose plan' },
      { key: 'no_plan', label: 'No plan' },
    ],
  },
  {
    dimension: 'depthVsBreadth',
    question: "What's your travel style?",
    options: [
      { key: 'deep', label: 'Deep explorer' },
      { key: 'balanced', label: 'Balanced' },
      { key: 'cover', label: 'Cover as much as possible' },
    ],
  },
  {
    dimension: 'comfortLevel',
    question: 'Where do you prefer to stay?',
    options: [
      { key: 'hotel', label: 'Hotel' },
      { key: 'homestay', label: 'Homestay' },
      { key: 'rough', label: 'Rough it' },
    ],
  },
  {
    dimension: 'crowdTolerance',
    question: 'How do you feel about crowds?',
    options: [
      { key: 'worth_it', label: 'Worth the crowds' },
      { key: 'hidden', label: 'Prefer hidden gems' },
      { key: 'avoid', label: 'Avoid crowds' },
    ],
  },
  {
    dimension: 'physicalReadiness',
    question: "What's your physical activity level?",
    options: [
      { key: 'yes', label: 'Loves a challenge' },
      { key: 'maybe', label: 'Moderate' },
      { key: 'no', label: 'Easy going' },
    ],
  },
  {
    dimension: 'spendingStyle',
    question: 'How do you approach spending while traveling?',
    options: [
      { key: 'experience', label: 'Spend on experiences' },
      { key: 'budget', label: 'Budget everything' },
      { key: 'comfort', label: 'Comfort matters' },
    ],
  },
  {
    dimension: 'groundReality',
    question: 'How do you handle unexpected situations?',
    options: [
      { key: 'bring_it', label: 'Part of the adventure' },
      { key: 'tolerate', label: 'Can handle it' },
      { key: 'need_comfort', label: 'Need basics' },
    ],
  },
  {
    dimension: 'languageComfort',
    question: 'How comfortable are you with language barriers?',
    options: [
      { key: 'fine', label: 'Comfortable anywhere' },
      { key: 'hindi', label: 'Prefer Hindi regions' },
      { key: 'english', label: 'Need English' },
    ],
  },
  {
    dimension: 'travelMotivations',
    question: "What motivates you to travel? (Select all that apply)",
    options: [
      { key: 'adventure', label: 'Adventure & thrill' },
      { key: 'culture', label: 'Culture & history' },
      { key: 'relaxation', label: 'Relaxation & escape' },
      { key: 'food', label: 'Food & cuisine' },
      { key: 'nature', label: 'Nature & landscapes' },
    ],
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

interface OptionRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  isMultiSelect: boolean;
}

function OptionRow({ label, selected, onPress, isMultiSelect }: OptionRowProps) {
  return (
    <Pressable
      accessible
      accessibilityLabel={label}
      accessibilityRole={isMultiSelect ? 'checkbox' : 'radio'}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 2,
        minHeight: 52,
        marginBottom: 0,
        backgroundColor: selected ? '#E8601C' : '#F5EFE6',
        borderColor: selected ? '#E8601C' : '#EDE5D8',
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Text style={{
        fontSize: 15,
        fontWeight: '600',
        color: selected ? '#FFFFFF' : '#1A1208',
        flex: 1,
      }}>
        {label}
      </Text>
      <View style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: selected ? 'rgba(255,255,255,0.7)' : '#C4B5A5',
        backgroundColor: selected ? 'rgba(255,255,255,0.25)' : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
      }}>
        {selected && <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>✓</Text>}
      </View>
    </Pressable>
  );
}

interface QuestionCardProps {
  question: Question;
  selectedValue: string | string[] | null;
  onSelect: (value: string | string[]) => void;
  colors: Colors;
  styles: ReturnType<typeof makeStyles>;
  isMultiSelect: boolean;
}

function QuestionCard({
  question,
  selectedValue,
  onSelect,
  colors,
  styles,
  isMultiSelect,
}: QuestionCardProps) {
  const handleOptionPress = (optionKey: string) => {
    if (isMultiSelect) {
      const currentArray = Array.isArray(selectedValue) ? selectedValue : [];
      const newArray = currentArray.includes(optionKey)
        ? currentArray.filter(k => k !== optionKey)
        : [...currentArray, optionKey];
      onSelect(newArray);
    } else {
      onSelect(optionKey);
    }
  };

  return (
    <View style={styles.questionCard}>
      <Text style={styles.questionText}>{question.question}</Text>
      <View style={styles.optionsContainer}>
        {question.options.map((option) => {
          const isSelected = isMultiSelect
            ? Array.isArray(selectedValue) && selectedValue.includes(option.key)
            : selectedValue === option.key;

          return (
            <OptionRow
              key={option.key}
              label={option.label}
              selected={isSelected}
              onPress={() => handleOptionPress(option.key)}
              isMultiSelect={isMultiSelect}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function QuizScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = makeStyles(colors);

  // Fetch prefill data
  const { data: prefillData, isLoading: isPrefillLoading } = useQuery({
    queryKey: ['quizPrefill'],
    queryFn: () => profileService.getQuizPrefill(),
  });

  // Local state for answers
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  // Initialize answers from prefill data once it's loaded
  useMemo(() => {
    if (prefillData && Object.keys(answers).length === 0) {
      setAnswers({
        travelPace: prefillData.travelPace || null,
        depthVsBreadth: prefillData.depthVsBreadth || null,
        comfortLevel: prefillData.comfortLevel || null,
        crowdTolerance: prefillData.crowdTolerance || null,
        physicalReadiness: prefillData.physicalReadiness || null,
        spendingStyle: prefillData.spendingStyle || null,
        groundReality: prefillData.groundReality || null,
        languageComfort: prefillData.languageComfort || null,
        travelMotivations: prefillData.travelMotivations || [],
      });
    }
  }, [prefillData]);

  // Submit quiz mutation
  const submitQuizMutation = useSubmitQuiz();

  const handleSelectAnswer = (dimension: string, value: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [dimension]: value,
    }));
  };

  const handleSaveProfile = () => {
    // Validate that all questions are answered
    const unanswered = QUIZ_QUESTIONS.filter(q => {
      const answer = answers[q.dimension];
      if (q.dimension === 'travelMotivations') {
        return !Array.isArray(answer) || answer.length === 0;
      }
      return !answer;
    });

    if (unanswered.length > 0) {
      Alert.alert(
        'Incomplete Quiz',
        `Please answer all questions before submitting. ${unanswered.length} question(s) remaining.`
      );
      return;
    }

    submitQuizMutation.mutate(answers as QuizDto, {
      onSuccess: () => {
        Alert.alert('Success', 'Your personality profile has been saved!', [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
          },
        ]);
      },
      onError: (error: unknown) => {
        const errorMessage = error instanceof Error
          ? error.message
          : (error as Record<string, unknown>)?.response?.data?.message || 'Please try again later.';
        Alert.alert('Failed to save profile', String(errorMessage));
      },
    });
  };

  // Loading state (while fetching prefill)
  if (isPrefillLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            accessible
            accessibilityLabel="Back to traveler personality"
            onPress={() => router.back()}
          >
            <Text style={styles.headerText}>← Traveler Personality</Text>
          </Pressable>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary500} />
          <Text style={styles.loadingText}>Loading quiz...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          accessible
          accessibilityLabel="Back to traveler personality"
          accessibilityHint="Returns to the main personality screen"
          style={styles.header}
          onPress={() => router.back()}
        >
          <Text style={styles.headerText}>← Traveler Personality</Text>
        </Pressable>

        <Text style={styles.title}>Quick Questions</Text>
        <Text style={styles.subtitle}>{QUIZ_QUESTIONS.length} questions · ~2 min</Text>

        {/* Questions */}
        <View style={styles.questionsContainer}>
          {QUIZ_QUESTIONS.map((question, index) => (
            <QuestionCard
              key={question.dimension}
              question={question}
              selectedValue={answers[question.dimension] || null}
              onSelect={(value) => handleSelectAnswer(question.dimension, value)}
              colors={colors}
              styles={styles}
              isMultiSelect={question.dimension === 'travelMotivations'}
            />
          ))}
        </View>

        {/* Save button */}
        <View style={styles.buttonContainer}>
          <Pressable
            accessible
            accessibilityLabel="Save profile"
            accessibilityHint="Saves your personality profile with current answers"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: colors.primary500, opacity: submitQuizMutation.isPending ? 0.6 : pressed ? 0.8 : 1 },
            ]}
            onPress={handleSaveProfile}
            disabled={submitQuizMutation.isPending}
          >
            {submitQuizMutation.isPending ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color={colors.textInverse} />
                <Text style={styles.saveButtonText}>Saving...</Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>Save Profile</Text>
            )}
          </Pressable>
        </View>
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

    // Title and subtitle
    title: {
      ...type.screenTitle,
      color: colors.textPrimary,
      paddingHorizontal: 24,
      marginBottom: 8,
    },
    subtitle: {
      ...type.body,
      color: colors.textSecondary,
      paddingHorizontal: 24,
      marginBottom: 24,
    },

    // Questions container
    questionsContainer: {
      paddingHorizontal: 24,
      gap: 24,
      marginBottom: 24,
    },

    // Question card
    questionCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 16,
      gap: 10,
    },
    questionText: {
      ...type.body,
      color: colors.textPrimary,
      fontFamily: 'Inter_600SemiBold',
      lineHeight: 22,
      marginBottom: 2,
    },
    optionsContainer: {
      gap: 8,
    },

    // Option row — base
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1.5,
      minHeight: 52,
    },
    optionRowUnselected: {
      backgroundColor: colors.bgSurface,
      borderColor: colors.border,
    },
    optionRowSelected: {
      backgroundColor: colors.primary500,
      borderColor: colors.primary500,
    },
    optionRowPressed: {
      opacity: 0.75,
    },

    // Option label
    optionLabel: {
      ...type.body,
      fontFamily: 'Inter_500Medium',
      fontSize: 15,
      color: colors.textPrimary,
      flex: 1,
    },
    optionLabelSelected: {
      color: '#FFFFFF',
      fontFamily: 'Inter_600SemiBold',
    },

    // Circle indicator
    optionIndicator: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.textTertiary,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
    },
    optionIndicatorSelected: {
      borderColor: 'rgba(255,255,255,0.7)',
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    optionCheckmark: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
      lineHeight: 15,
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

    // Button
    buttonContainer: {
      paddingHorizontal: 24,
      marginBottom: 8,
    },
    saveButton: {
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 54,
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    saveButtonText: {
      ...type.body,
      color: '#FFFFFF',
      fontFamily: 'Inter_700Bold',
      fontSize: 16,
    },
  });
}
