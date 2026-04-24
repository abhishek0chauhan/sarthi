import { View, Text, Switch, StyleSheet, ScrollView } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FilterChips } from './FilterChips';
import { useSearchStore } from '@/stores/search.store';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';

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

  const toggleExperience = (expType: string) => {
    const current = formValues.experienceTypes ?? [];
    const updated = current.includes(expType)
      ? current.filter((t) => t !== expType)
      : [...current, expType];
    updateFormValues({ experienceTypes: updated });
  };

  return (
    <View style={styles.container}>
      {/* Greeting header */}
      <View style={styles.greetingHeader}>
        <Text style={styles.greetingOverline}>{getTimeGreeting()}</Text>
        <Text style={styles.greetingTitle}>Where to next?</Text>
        <Text style={styles.greetingSubtitle}>Plan your next adventure</Text>
      </View>

      <Input
        placeholder="Describe your dream trip... beaches, mountains, culture?"
        value={formValues.freeText ?? ''}
        onChangeText={(v) => updateFormValues({ freeText: v })}
        multiline
        numberOfLines={3}
      />

      <View style={styles.row}>
        <View style={styles.flex}>
          <Input
            label="From date"
            placeholder="2026-05-15"
            value={formValues.dates?.from ?? ''}
            onChangeText={(v) =>
              updateFormValues({ dates: { from: v, to: formValues.dates?.to ?? '' } })
            }
          />
        </View>
        <View style={styles.flex}>
          <Input
            label="To date"
            placeholder="2026-05-20"
            value={formValues.dates?.to ?? ''}
            onChangeText={(v) =>
              updateFormValues({ dates: { from: formValues.dates?.from ?? '', to: v } })
            }
          />
        </View>
      </View>

      <Input
        label="Departure city"
        placeholder="Delhi"
        value={formValues.departureCity ?? ''}
        onChangeText={(v) => updateFormValues({ departureCity: v })}
      />

      <View style={styles.row}>
        <View style={styles.flex}>
          <Input
            label="Group size"
            placeholder="2"
            value={formValues.group?.size?.toString() ?? ''}
            onChangeText={(v) =>
              updateFormValues({
                group: { size: parseInt(v) || 2, type: formValues.group?.type ?? 'friends' },
              })
            }
            keyboardType="numeric"
          />
        </View>
        <View style={styles.flex}>
          <Input
            label="Budget min (₹)"
            placeholder="5000"
            value={formValues.budget?.min?.toString() ?? ''}
            onChangeText={(v) =>
              updateFormValues({
                budget: { min: parseInt(v) || 0, max: formValues.budget?.max ?? 20000 },
              })
            }
            keyboardType="numeric"
          />
        </View>
        <View style={styles.flex}>
          <Input
            label="Budget max (₹)"
            placeholder="20000"
            value={formValues.budget?.max?.toString() ?? ''}
            onChangeText={(v) =>
              updateFormValues({
                budget: { min: formValues.budget?.min ?? 5000, max: parseInt(v) || 20000 },
              })
            }
            keyboardType="numeric"
          />
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
        onPress={onSubmit}
        loading={loading}
        disabled={!formValues.freeText?.trim()}
      />
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    container: { gap: 16, paddingBottom: 32 },
    sectionTitle: { ...type.screenTitle, color: colors.textPrimary },
    greetingHeader: { marginBottom: 24, gap: 4 },
    greetingOverline: { ...type.overline, color: colors.textTertiary },
    greetingTitle: { ...type.screenTitle, color: colors.textPrimary },
    greetingSubtitle: { ...type.body, color: colors.textSecondary },
    row: { flexDirection: 'row', gap: 10 },
    flex: { flex: 1 },
    section: { gap: 8 },
    label: { ...type.overline, color: colors.textSecondary },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    toggleLabel: { ...type.body, color: colors.textPrimary },
    hiddenGemsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 20, gap: 10 },
    hiddenGemsContent: { flexDirection: 'row', flex: 1, gap: 10, alignItems: 'center' },
    hiddenGemsIcon: { fontSize: 20 },
    hiddenGemsText: { flex: 1, gap: 2 },
    hiddenGemsLabel: { ...type.body, fontFamily: 'Inter_600SemiBold', color: colors.textPrimary },
    hiddenGemsDesc: { ...type.caption, color: colors.textTertiary },
  });
}
