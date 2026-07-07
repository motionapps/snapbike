import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../lib/theme';
import { OrderInfo } from '../lib/types';

type Props = {
  order: OrderInfo;
  onChange: (patch: Partial<OrderInfo>) => void;
};

/**
 * Arbetsorderns huvud: cykelnummer (1–100) och kunduppgifter. Lokalt i appen
 * tills vidare – "ledigt nummer" och kundhämtning kopplas till backend senare.
 */
export function OrderCard({ order, onChange }: Props) {
  const bikeNum = Number(order.bikeNumber);
  const bikeInvalid =
    order.bikeNumber !== '' && (bikeNum < 1 || bikeNum > 100 || !Number.isInteger(bikeNum));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="reader-outline" size={16} color={colors.accent} />
        <Text style={styles.heading}>ARBETSORDER</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.numberField}>
          <Text style={styles.label}>Cykelnr</Text>
          <TextInput
            style={[styles.input, styles.numberInput, bikeInvalid && styles.inputError]}
            placeholder="1–100"
            placeholderTextColor={colors.textFaint}
            value={order.bikeNumber}
            onChangeText={(text) =>
              onChange({ bikeNumber: text.replace(/[^0-9]/g, '').slice(0, 3) })
            }
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>
        <View style={styles.nameField}>
          <Text style={styles.label}>Kund</Text>
          <TextInput
            style={styles.input}
            placeholder="Namn"
            placeholderTextColor={colors.textFaint}
            value={order.customerName}
            onChangeText={(text) => onChange({ customerName: text })}
          />
        </View>
      </View>

      <View>
        <Text style={styles.label}>Telefon</Text>
        <TextInput
          style={styles.input}
          placeholder="07x-xxx xx xx"
          placeholderTextColor={colors.textFaint}
          value={order.customerPhone}
          onChangeText={(text) => onChange({ customerPhone: text })}
          keyboardType="phone-pad"
        />
      </View>

      {bikeInvalid ? (
        <Text style={styles.hint}>Cykelnummer måste vara 1–100.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heading: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  numberField: {
    width: 90,
    gap: 4,
  },
  nameField: {
    flex: 1,
    gap: 4,
  },
  label: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  input: {
    backgroundColor: colors.cardRaised,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  numberInput: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },
  inputError: {
    borderColor: colors.danger,
  },
  hint: {
    color: colors.danger,
    fontSize: 12,
  },
});
