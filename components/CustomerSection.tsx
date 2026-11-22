import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { colors } from '../lib/theme';
import { Customer } from '../lib/types';
import { styles } from './CustomerSection.styles';

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
