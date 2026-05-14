import { View, Text, Switch, StyleSheet, Alert, Pressable } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { FilterChips } from './FilterChips';
import { useSearchStore } from '@/stores/search.store';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';

const GROUP_TYPES = [
  { key: 'solo',    icon: '🧍', label: 'Solo'    },
  { key: 'couple',  icon: '👫', label: 'Couple'  },
  { key: 'friends', icon: '👯', label: 'Friends' },
  { key: 'family',  icon: '👨‍👩‍👧', label: 'Family'  },
];

interface SearchFormProps {
  onSubmit: () => void;
  loading: boolean;
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'GOOD MORNING';
  if (hour >= 12 && hour < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

export function SearchForm({ onSubmit, loading }: SearchFormProps) {
  const { formValues, updateFormValues } = useSearchStore();
  const colors = useColors();
  const styles = makeStyles(colors);
  const mode = formValues.mode ?? 'find';

  const toggleExperience = (expType: string) => {
    const current = formValues.experienceTypes ?? [];
    const updated = current.includes(expType)
      ? current.filter((t) => t !== expType)
      : [...current, expType];
    updateFormValues({ experienceTypes: updated });
  };

  const validate = (): boolean => {
    if (mode === 'find' && !formValues.freeText?.trim()) {
      Alert.alert('Missing info', 'Please describe your dream trip.');
      return false;
    }
    if (mode === 'plan' && !formValues.destination?.trim()) {
      Alert.alert('Missing info', 'Please enter a destination.');
      return false;
    }
    const from = formValues.dates?.from;
    const to = formValues.dates?.to;
    if (!from || !to) {
      Alert.alert('Missing dates', 'Please select both from and to dates.');
      return false;
    }
    if (new Date(to) < new Date(from)) {
      Alert.alert('Invalid dates', '"To" date must be after "From" date.');
      return false;
    }
    if (!formValues.departureCity?.trim()) {
      Alert.alert('Missing info', 'Please enter your departure city.');
      return false;
    }
    const budgetMin = formValues.budget?.min;
    const budgetMax = formValues.budget?.max;
    if (budgetMin !== undefined && budgetMax !== undefined && budgetMax < budgetMin) {
      Alert.alert('Invalid budget', 'Maximum budget must be greater than or equal to minimum.');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (validate()) onSubmit();
  };

  return (
    <View style={styles.container}>
      {/* Greeting header */}
      <View style={styles.greetingHeader}>
        <Text style={styles.greetingOverline}>{getTimeGreeting()}</Text>
        <Text style={styles.greetingTitle}>Where to next?</Text>
        <Text style={styles.greetingSubtitle}>Plan your next adventure</Text>
      </View>

      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        <Pressable
          onPress={() => updateFormValues({ mode: 'find' })}
          style={[styles.modeBtn, mode === 'find' && styles.modeBtnActive]}
        >
          <Text style={[styles.modeBtnText, mode === 'find' && styles.modeBtnTextActive]}>
            🔍 Find Destination
          </Text>
        </Pressable>
        <Pressable
          onPress={() => updateFormValues({ mode: 'plan' })}
          style={[styles.modeBtn, mode === 'plan' && styles.modeBtnActive]}
        >
          <Text style={[styles.modeBtnText, mode === 'plan' && styles.modeBtnTextActive]}>
            📍 Plan My Destination
          </Text>
        </Pressable>
      </View>

      {mode === 'find' ? (
        <Input
          placeholder="Describe your dream trip... beaches, mountains, culture?"
          value={formValues.freeText ?? ''}
          onChangeText={(v) => updateFormValues({ freeText: v })}
          multiline
          numberOfLines={3}
        />
      ) : (
        <Input
          placeholder="e.g., Goa, Himalayas, Kerala backwaters"
          value={formValues.destination ?? ''}
          onChangeText={(v) => updateFormValues({ destination: v })}
          label="Destination"
        />
      )}

      <View style={styles.row}>
        <View style={styles.flex}>
          <DatePicker
            label="From date"
            value={formValues.dates?.from ?? ''}
            onChange={(v) => updateFormValues({ dates: { from: v, to: formValues.dates?.to ?? '' } })}
          />
        </View>
        <View style={styles.flex}>
          <DatePicker
            label="To date"
            value={formValues.dates?.to ?? ''}
            onChange={(v) => updateFormValues({ dates: { from: formValues.dates?.from ?? '', to: v } })}
            minDate={formValues.dates?.from}
          />
        </View>
      </View>

      <Input
        label="Departure city"
        placeholder="Delhi"
        value={formValues.departureCity ?? ''}
        onChangeText={(v) => updateFormValues({ departureCity: v })}
      />

      <View style={styles.section}>
        <Text style={styles.label}>GROUP TYPE</Text>
        <View style={styles.groupTypeRow}>
          {GROUP_TYPES.map(({ key, icon, label }) => {
            const active = (formValues.group?.type ?? 'friends') === key;
            return (
              <Pressable
                key={key}
                onPress={() => updateFormValues({ group: { type: key as any } })}
                style={[styles.groupTypeBtn, active && styles.groupTypeBtnActive]}
              >
                <Text style={styles.groupTypeIcon}>{icon}</Text>
                <Text style={[styles.groupTypeLabel, active && styles.groupTypeLabelActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>BUDGET (₹)</Text>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Input
              placeholder="Min (e.g. 5000)"
              value={formValues.budget?.min?.toString() ?? ''}
              onChangeText={(v) => {
                const parsed = parseInt(v, 10);
                updateFormValues({
                  budget: { min: isNaN(parsed) ? undefined : parsed, max: formValues.budget?.max },
                });
              }}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.flex}>
            <Input
              placeholder="Max (e.g. 20000)"
              value={formValues.budget?.max?.toString() ?? ''}
              onChangeText={(v) => {
                const parsed = parseInt(v, 10);
                updateFormValues({
                  budget: { min: formValues.budget?.min, max: isNaN(parsed) ? undefined : parsed },
                });
              }}
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Experiences</Text>
        <FilterChips
          selected={formValues.experienceTypes ?? []}
          onToggle={toggleExperience}
        />
      </View>

      <View style={styles.hiddenGemsRow}>
        <View style={styles.hiddenGemsContent}>
          <Text style={styles.hiddenGemsIcon}>✨</Text>
          <View style={styles.hiddenGemsText}>
            <Text style={styles.hiddenGemsLabel}>Hidden Gems</Text>
            <Text style={styles.hiddenGemsDesc}>Discover off-the-beaten-path destinations</Text>
          </View>
        </View>
        <Switch
          value={formValues.hiddenGem ?? false}
          onValueChange={(v) => updateFormValues({ hiddenGem: v })}
          trackColor={{ true: colors.primary500, false: colors.border }}
          thumbColor={colors.bgCard}
        />
      </View>

      <Button
        label="Find Destinations →"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
      />
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    container: { gap: 16, paddingBottom: 32 },
    sectionTitle: { ...type.screenTitle, color: colors.textPrimary },
    greetingHeader: { marginBottom: 8, gap: 2 },
    greetingOverline: { ...type.overline, color: colors.primary500, letterSpacing: 1 },
    greetingTitle: { ...type.screenTitle, color: colors.textPrimary },
    greetingSubtitle: { ...type.body, color: colors.textSecondary },
    row: { flexDirection: 'row', gap: 10 },
    flex: { flex: 1 },
    section: { gap: 8 },
    label: { ...type.overline, color: colors.textSecondary },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    toggleLabel: { ...type.body, color: colors.textPrimary },
    modeToggle: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    modeBtn: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.bgCard,
      alignItems: 'center',
    },
    modeBtnActive: { backgroundColor: colors.primary500, borderColor: colors.primary500 },
    modeBtnText: { ...type.caption, color: colors.textSecondary, fontFamily: 'Inter_600SemiBold' },
    modeBtnTextActive: { color: '#fff' },
    hiddenGemsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 20, gap: 10 },
    hiddenGemsContent: { flexDirection: 'row', flex: 1, gap: 10, alignItems: 'center' },
    hiddenGemsIcon: { fontSize: 20 },
    hiddenGemsText: { flex: 1, gap: 2 },
    hiddenGemsLabel: { ...type.body, fontFamily: 'Inter_600SemiBold', color: colors.textPrimary },
    hiddenGemsDesc: { ...type.caption, color: colors.textTertiary },
    groupTypeRow: { flexDirection: 'row', gap: 8 },
    groupTypeBtn: {
      flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12,
      borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bgCard, gap: 4,
    },
    groupTypeBtnActive: { backgroundColor: colors.primary500, borderColor: colors.primary500 },
    groupTypeIcon: { fontSize: 20 },
    groupTypeLabel: { ...type.caption, color: colors.textSecondary },
    groupTypeLabelActive: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
  });
}
