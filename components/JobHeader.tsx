import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, gutter, radius } from '../lib/theme';
import { Job, customerWarning } from '../lib/types';
import { bikeLabel } from './BikeDetails';

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

  return (
    <View style={styles.header}>
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
          <Text style={styles.name} numberOfLines={1}>
            {name || 'Okänd kund'}
          </Text>
          {customer?.phone ? <Text style={styles.detail}>{customer.phone}</Text> : null}
          {bikeText ? (
            <View style={styles.bikeRow}>
              {bike ? <View style={[styles.colorDot, { backgroundColor: bike.color }]} /> : null}
              <Text style={styles.detail} numberOfLines={1}>
                {bikeText}
              </Text>
            </View>
          ) : null}
          {warning ? (
            <View style={styles.bikeRow}>
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

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: gutter,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  edit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  editPressed: {
    opacity: 0.6,
  },
  tag: {
    backgroundColor: colors.cardRaised,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  tagText: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 32,
    fontVariant: ['tabular-nums'],
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 24,
  },
  bikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detail: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: 13,
  },
  warning: {
    flexShrink: 1,
    color: colors.danger,
    fontWeight: '700',
    fontSize: 12,
  },
  close: {
    alignSelf: 'flex-start',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },
});
