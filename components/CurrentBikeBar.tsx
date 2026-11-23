import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { BikeData } from '../lib/bikeAnalysis';
import { colors, statusColors } from '../lib/theme';
import { Customer, JobComments, JobStatus, STATUS_LABELS, customerWarning } from '../lib/types';
import { bikeLabel } from './BikeDetails';
import type { CommentField } from './JobNotesModal';
import { styles } from './CurrentBikeBar.styles';

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

/**
 * Hex per bike colour. CSS colour names don't match how the colours are
 * named (CSS "brown" is a blood red), so each one is set explicitly.
 */
const BIKE_COLOR_HEX: Record<string, string> = {
  black: '#1A1A1A',
  white: '#F2F2F2',
  red: '#D32F2F',
  blue: '#1E5BC6',
  green: '#2E7D32',
  yellow: '#F2C200',
  orange: '#EF6C00',
  purple: '#6A3FA0',
  pink: '#E88AB4',
  brown: '#6B4423',
  gray: '#8A8F96',
  silver: '#C0C4C8',
  gold: '#C9A227',
  navy: '#1B2A4A',
  maroon: '#7A1F2B',
  teal: '#00897B',
  lime: '#9CCC3C',
  cyan: '#26C6DA',
  magenta: '#C2185B',
  beige: '#D9C7A3',
};

/** Display colour for a bike colour name. */
export function bikeColorHex(color: string): string {
  return BIKE_COLOR_HEX[color] ?? color;
}

/** Text colour that reads on top of a bike colour. */
export function textColorOnBike(color: string): string {
  return LIGHT_COLORS.has(color) ? '#0B0F14' : '#FFFFFF';
}

type Props = {
  customer: Customer | null;
  bike: BikeData['bike'] | null;
  bikeNumber: string;
  /** The job's status, shown at the end of the row. */
  status: JobStatus | null;
  topInset: number;
  /** Browser: one row at the right end of the top nav. */
  compact?: boolean;
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
  status,
  topInset,
  compact = false,
  onPress,
  comments,
  onOpenComment,
}: Props) {
  const name = customer ? `${customer.firstName} ${customer.lastName}`.trim() : '';
  const bikeText = bike
    ? [bike.brand, bikeLabel(bike.bike_type)].filter(Boolean).join(' · ')
    : '';
  const background = bike ? bikeColorHex(bike.color) : colors.cardRaised;
  const textColor = bike ? textColorOnBike(bike.color) : '#FFFFFF';
  const warning = customerWarning(customer);

  if (compact) {
    return (
      <View style={styles.compact}>
        <Pressable
          onPress={onPress}
          style={[styles.row, styles.compactChip, { backgroundColor: background }]}
        >
          <Ionicons name="bicycle" size={15} color={textColor} />
          {bikeNumber ? (
            <Text style={[styles.tag, { color: textColor }]}>#{bikeNumber}</Text>
          ) : null}
          <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
            {name || 'Okänd kund'}
            {bikeText ? <Text style={styles.compactBike}> · {bikeText}</Text> : null}
          </Text>
          {warning ? (
            <View style={styles.warning}>
              <Ionicons name="warning" size={14} color={colors.danger} />
              <Text style={styles.warningText} numberOfLines={1}>
                {warning}
              </Text>
            </View>
          ) : null}
          {status ? (
            <View style={styles.status}>
              <View style={[styles.statusDot, { backgroundColor: statusColors[status] }]} />
              <Text style={styles.statusText} numberOfLines={1}>
                {STATUS_LABELS[status]}
              </Text>
            </View>
          ) : null}
        </Pressable>
        {comments ? (
          <>
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
          </>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.bar, { backgroundColor: background, paddingTop: topInset }]}>
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
        {status ? (
          <View style={styles.status}>
            <View style={[styles.statusDot, { backgroundColor: statusColors[status] }]} />
            <Text style={styles.statusText} numberOfLines={1}>
              {STATUS_LABELS[status]}
            </Text>
          </View>
        ) : null}
      </Pressable>
      {bikeText ? (
        <Pressable onPress={onPress}>
          <Text style={[styles.bike, { color: textColor }]} numberOfLines={1}>
            {bikeText}
          </Text>
        </Pressable>
      ) : null}
      {comments ? (
        // Not tappable itself: taps between the buttons don't open the job.
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
      style={({ pressed }) => [styles.commentButton, pressed && styles.commentButtonPressed]}
    >
      <Ionicons
        name={filled ? 'chatbubble' : 'chatbubble-outline'}
        size={14}
        color={filled ? colors.accentLight : '#FFFFFF'}
      />
      <Text style={styles.commentButtonText}>{label}</Text>
    </Pressable>
  );
}
