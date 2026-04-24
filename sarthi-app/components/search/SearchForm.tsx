import { View, Text, Switch, StyleSheet, ScrollView } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FilterChips } from './FilterChips';
import { useSearchStore } from '@/stores/search.store';
import { lightColors } from '@/constants/colors';
import { type } from '@/constants/typography';

interface SearchFormProps {
  onSubmit: () => void;
  loading: boolean;
}

export function SearchForm({ onSubmit, loading }: SearchFormProps) {
  const { formValues, updateFormValues } = useSearchStore();

  const toggleExperience = (expType: string) => {
    const current = formValues.experienceTypes ?? [];
    const updated = current.includes(expType)
      ? current.filter((t) => t !== expType)
      : [...current, expType];
    updateFormValues({ experienceTypes: updated });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Where do you want to go?</Text>

      <Input
        label=""
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

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Find hidden gems 💎</Text>
        <Switch
          value={formValues.hiddenGem ?? false}
          onValueChange={(v) => updateFormValues({ hiddenGem: v })}
          trackColor={{ true: lightColors.primary500, false: lightColors.border }}
          thumbColor={lightColors.bgCard}
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

const styles = StyleSheet.create({
  container: { gap: 16, paddingBottom: 32 },
  sectionTitle: { ...type.screenTitle, color: lightColors.textPrimary },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  section: { gap: 8 },
  label: { ...type.overline, color: lightColors.textSecondary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { ...type.body, color: lightColors.textPrimary },
});
