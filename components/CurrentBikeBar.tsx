import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BikeData } from '../lib/bikeAnalysis';
import { colors } from '../lib/theme';
import { Customer, JobComments, customerWarning } from '../lib/types';
import { bikeLabel } from './BikeDetails';
import type { CommentField } from './JobNotesModal';

/** Bike colours light enough to need dark text on top. */
const LIGHT_COLORS = new Set([
  'white',
  'yellow',
  'orange',
  'pink',
  'silver',
  'gold',
  'lime',
  'cyan',
  'beige',
  'gray',
]);

/** Text colour that reads on top of a bike colour. */
export function textColorOnBike(color: string): string {
  return LIGHT_COLORS.has(color) ? '#0B0F14' : '#FFFFFF';
}

type Props = {
  customer: Customer | null;
  bike: BikeData['bike'] | null;
  bikeNumber: string;
  topInset: number;
  onPress: () => void;
  /** Shows the Verkstadskommentar/Kundkommentar buttons; null hides them. */
  comments: JobComments | null;
  onOpenComment: (field: CommentField) => void;
};

/** Thin bar above every tab naming the current customer and bike, tinted in the bike's colour. Tapping it opens the job. */
export function CurrentBikeBar({
  customer,
  bike,
  bikeNumber,
  topInset,
  onPress,
  comments,
  onOpenComment,
}: Props) {
  const name = customer ? `${customer.firstName} ${customer.lastName}`.trim() : '';
  const bikeText = bike
    ? [bike.brand, bikeLabel(bike.bike_type)].filter(Boolean).join(' · ')
    : '';
  const background = bike ? bike.color : colors.cardRaised;
  const textColor = bike ? textColorOnBike(bike.color) : '#FFFFFF';
  const warning = customerWarning(customer);

  return (
    <View style={[styles.bar, { backgroundColor: background, paddingTop: topInset + 6 }]}>
      <Pressable onPress={onPress} style={styles.row}>
        <Ionicons name="bicycle" size={17} color={textColor} />
        {bikeNumber ? (
          <Text style={[styles.tag, { color: textColor }]}>#{bikeNumber}</Text>
        ) : null}
        <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
          {name || 'Okänd kund'}
        </Text>
        {warning ? (
          <View style={styles.warning}>
            <Ionicons name="warning" size={14} color={colors.danger} />
            <Text style={styles.warningText} numberOfLines={1}>
              {warning}
            </Text>
          </View>
        ) : null}
        {bikeText ? (
          <Text style={[styles.bike, { color: textColor }]} numberOfLines={1}>
            {bikeText}
          </Text>
        ) : null}
      </Pressable>
      {comments ? (
        <View style={styles.commentRow}>
          <CommentButton
            label="Verkstadskommentar"
            filled={comments.mechanicComment.trim() !== ''}
            onPress={() => onOpenComment('mechanicComment')}
          />
          <CommentButton
            label="Kundkommentar"
            filled={comments.customerComment.trim() !== ''}
            onPress={() => onOpenComment('customerComment')}
          />
        </View>
      ) : null}
    </View>
  );
}

function CommentButton({
  label,
  filled,
  onPress,
}: {
  label: string;
  /** Has text: filled icon. */
  filled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.commentButton, pressed && styles.commentButtonPressed]}
    >
      <Ionicons
        name={filled ? 'chatbubble' : 'chatbubble-outline'}
        size={14}
        color={filled ? colors.accent : '#FFFFFF'}
      />
      <Text style={styles.commentButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(11, 15, 20, 0.85)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  commentButtonPressed: {
    opacity: 0.7,
  },
  commentButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  tag: {
    fontWeight: '800',
    fontSize: 14,
  },
  name: {
    flexShrink: 1,
    fontWeight: '700',
    fontSize: 14,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    backgroundColor: 'rgba(11, 15, 20, 0.85)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  warningText: {
    flexShrink: 1,
    color: colors.danger,
    fontWeight: '700',
    fontSize: 13,
  },
  bike: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    opacity: 0.85,
  },
});
