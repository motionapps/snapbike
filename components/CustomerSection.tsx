import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../lib/theme';
import { Customer } from '../lib/types';

type Props = {
  customer: Customer | null;
  onImportBooking: () => void;
  onDropIn: () => void;
};

/**
 * Below the bike details: pick a customer either from a booking or as a
 * drop-in. Once set, shows a compact summary instead.
 */
export function CustomerSection({
  customer,
  onImportBooking,
  onDropIn,
}: Props) {
  if (!customer) {
    return (
      <View style={styles.buttons}>
        <Pressable onPress={onImportBooking} style={styles.button}>
          <Ionicons name="calendar-outline" size={18} color={colors.accent} />
          <Text style={styles.buttonText}>Hämta bokning</Text>
        </Pressable>
        <Pressable onPress={onDropIn} style={styles.button}>
          <Ionicons name="person-add-outline" size={18} color={colors.accent} />
          <Text style={styles.buttonText}>Drop-in</Text>
        </Pressable>
      </View>
    );
  }

  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ');
  return (
    <Pressable
      onPress={onDropIn}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <Ionicons name="person-circle-outline" size={28} color={colors.accent} />
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>
          {[customer.phone, customer.email].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <View style={styles.iconButton}>
        <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
  },
  buttonText: {
    color: colors.accent,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardPressed: {
    opacity: 0.6,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontWeight: '700',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  iconButton: {
    padding: 4,
  },
});
