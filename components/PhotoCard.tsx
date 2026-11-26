import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '../lib/theme';
import { styles } from './PhotoCard.styles';

type Props = {
  uri: string | null;
  onTakePhoto: () => void;
  /** Omitted = no "Lägg till cykel manuellt" link. */
  onAddManually?: () => void;
  /** Shows a green check in place of the manual link once info was added by hand. */
  addedManually?: boolean;
};

export function PhotoCard({ uri, onTakePhoto, onAddManually, addedManually }: Props) {
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
            <Ionicons name="camera-outline" size={30} color={colors.accentLight} />
          </View>
          <Text style={styles.emptyTitle}>Fota cykeln</Text>
          <Text style={styles.emptyHint}>Tryck för att öppna kameran</Text>
          {onAddManually ? (
            <Pressable onPress={onAddManually} hitSlop={10}>
              <Text style={styles.manualLink}>Lägg till cykel manuellt</Text>
            </Pressable>
          ) : addedManually ? (
            <View style={styles.manualDone}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.manualDoneText}>Information tillagd manuellt</Text>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}
