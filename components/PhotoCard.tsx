import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '../lib/theme';
import { styles } from './PhotoCard.styles';

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
            <Ionicons name="camera-outline" size={30} color={colors.accentLight} />
          </View>
          <Text style={styles.emptyTitle}>Fota cykeln</Text>
          <Text style={styles.emptyHint}>Tryck för att öppna kameran</Text>
        </View>
      )}
    </Pressable>
  );
}
