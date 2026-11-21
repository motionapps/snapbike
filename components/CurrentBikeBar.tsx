import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { BikeData } from '../lib/bikeAnalysis';
import { colors } from '../lib/theme';
import { Customer, customerWarning } from '../lib/types';
import { bikeLabel } from './BikeDetails';

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

type Props = {
  customer: Customer | null;
  bike: BikeData['bike'] | null;
  bikeNumber: string;
  topInset: number;
};

/** Thin bar above every tab naming the current customer and bike, tinted in the bike's colour. */
export function CurrentBikeBar({ customer, bike, bikeNumber, topInset }: Props) {
  const name = customer ? `${customer.firstName} ${customer.lastName}`.trim() : '';
  const bikeText = bike
    ? [bike.brand, bikeLabel(bike.bike_type)].filter(Boolean).join(' · ')
    : '';
  const background = bike ? bike.color : colors.cardRaised;
  const textColor = bike && LIGHT_COLORS.has(bike.color) ? '#0B0F14' : '#FFFFFF';
  const warning = customerWarning(customer);

  return (
    <View style={[styles.bar, { backgroundColor: background, paddingTop: topInset + 6 }]}>
      <Ionicons name="bicycle" size={16} color={textColor} />
      {bikeNumber ? (
        <Text style={[styles.tag, { color: textColor }]}>#{bikeNumber}</Text>
      ) : null}
      <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
        {name || 'Okänd kund'}
      </Text>
      {warning ? (
        <View style={styles.warning}>
          <Ionicons name="warning" size={13} color={colors.danger} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  tag: {
    fontWeight: '800',
    fontSize: 13,
  },
  name: {
    flexShrink: 1,
    fontWeight: '700',
    fontSize: 13,
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
    fontSize: 12,
  },
  bike: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    opacity: 0.85,
  },
});
