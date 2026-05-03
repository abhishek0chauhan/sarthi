import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import type { PlaceContext } from '@/types/enrichment.types';

interface PlaceContextCardProps {
  context: PlaceContext;
}

export function PlaceContextCard({ context }: PlaceContextCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <Pressable style={styles.toggle} onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.toggleLabel}>Why visit?</Text>
        <Text style={styles.toggleIcon}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          <Text style={styles.whySpecial}>{context.whySpecial}</Text>

          <Text style={styles.label}>Best time</Text>
          <Text style={styles.value}>{context.bestTimeToVisit}</Text>

          <Text style={styles.label}>Duration</Text>
          <Text style={styles.value}>{context.suggestedDuration}</Text>

          {context.insiderTips.length > 0 && (
            <>
              <Text style={styles.label}>Insider tips</Text>
              {context.insiderTips.map((tip, i) => (
                <Text key={i} style={styles.bullet}>• {tip}</Text>
              ))}
            </>
          )}

          {context.whatToCarry.length > 0 && (
            <>
              <Text style={styles.label}>What to carry</Text>
              {context.whatToCarry.map((item, i) => (
                <Text key={i} style={styles.bullet}>• {item}</Text>
              ))}
            </>
          )}

          {context.nearbyAlternative && (
            <>
              <Text style={styles.label}>Nearby alternative</Text>
              <Text style={styles.value}>{context.nearbyAlternative}</Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      marginTop: 8,
      borderRadius: 8,
      backgroundColor: colors.bgSurface,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    toggle: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    toggleLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.primary500 },
    toggleIcon: { fontSize: 9, color: colors.textTertiary },
    body: { paddingHorizontal: 10, paddingBottom: 10, gap: 3 },
    whySpecial: { fontSize: 12, color: colors.textPrimary, lineHeight: 18, marginBottom: 4 },
    label: { fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 },
    value: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
    bullet: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  });
}
