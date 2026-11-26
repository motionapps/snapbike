import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { colors } from '../lib/theme';
import { Job, customerWarning } from '../lib/types';
import { bikeLabel } from '../lib/bikeLabels';
import { bikeColorHex, textColorOnBike } from './CurrentBikeBar';
import { styles } from './JobHeader.styles';

type Props = {
  job: Job;
  onClose: () => void;
  /** Tapping the tag/customer area: edit the customer. */
  onPress: () => void;
};

/** Top of the job modal: large tag number and customer name, like the job card. */
export function JobHeader({ job, onClose, onPress }: Props) {
  const customer = job.customer;
  const name = customer ? `${customer.firstName} ${customer.lastName}`.trim() : '';
  const bike = job.bike?.bike;
  const bikeText = bike
    ? [bikeLabel(bike.bike_type), bike.brand, bikeLabel(bike.color)].filter(Boolean).join(' · ')
    : '';
  const warning = customerWarning(customer);
  // Tinted in the bike's colour, like the bar above the tabs.
  const background = bike ? bikeColorHex(bike.color) : colors.bg;
  const textColor = bike ? textColorOnBike(bike.color) : colors.text;

  return (
    <View style={[styles.header, { backgroundColor: background }]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.edit, pressed && styles.editPressed]}
      >
        {job.bikeNumber ? (
          <View style={styles.tag}>
            <Text style={styles.tagText}>#{job.bikeNumber}</Text>
          </View>
        ) : null}
        <View style={styles.info}>
          <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
            {name || 'Okänd kund'}
          </Text>
          {customer?.phone ? (
            <Text style={[styles.detail, { color: textColor }]}>{customer.phone}</Text>
          ) : null}
          {bikeText ? (
            <View style={styles.bikeRow}>
              {bike ? <View style={[styles.colorDot, { backgroundColor: bikeColorHex(bike.color) }]} /> : null}
              <Text style={[styles.detail, { color: textColor }]} numberOfLines={1}>
                {bikeText}
              </Text>
            </View>
          ) : null}
          {warning ? (
            <View style={styles.warningPill}>
              <Ionicons name="warning" size={13} color={colors.danger} />
              <Text style={styles.warning} numberOfLines={1}>
                {warning}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
      <Pressable onPress={onClose} hitSlop={8} style={styles.close}>
        <Ionicons name="close" size={20} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}
