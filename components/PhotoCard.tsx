import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors, radius, shadow } from '../lib/theme';

type Props = {
  uri: string | null;
  onTakePhoto: () => void;
};

export function PhotoCard({ uri, onTakePhoto }: Props) {
  const { height } = useWindowDimensions();
  const cardHeight = Math.round(height * 0.25);

  return (
    <Pressable onPress={onTakePhoto} style={[styles.card, { height: cardHeight }]}>
      {uri ? (
        <>
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={250}
          />
          <View style={styles.retakeBadge}>
            <Ionicons name="camera" size={16} color={colors.text} />
            <Text style={styles.retakeText}>Ta om</Text>
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <View style={styles.iconCircle}>
            <Ionicons name="camera-outline" size={30} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>Fota cykeln</Text>
          <Text style={styles.emptyHint}>Tryck för att öppna kameran</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  emptyHint: {
    color: colors.textFaint,
  },
  retakeBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(11, 15, 20, 0.65)',
  },
  retakeText: {
    color: colors.text,
    fontWeight: '600',
  },
});
