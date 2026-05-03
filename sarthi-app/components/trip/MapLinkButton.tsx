import { Pressable, Text, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';

interface MapLinkButtonProps {
  mapQuery: string;
}

export function MapLinkButton({ mapQuery }: MapLinkButtonProps) {
  const colors = useColors();
  const styles = makeStyles(colors);

  const handlePress = () => {
    const encoded = encodeURIComponent(mapQuery);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
  };

  return (
    <Pressable style={styles.btn} onPress={handlePress}>
      <Text style={styles.label}>📍 Open in Maps</Text>
    </Pressable>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    btn: {
      alignSelf: 'flex-start',
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: colors.primary50,
      borderWidth: 1,
      borderColor: colors.primary200,
      marginTop: 6,
    },
    label: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.primary500 },
  });
}
