import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  KeyboardTypeOptions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radius } from '../lib/theme';
import { Customer, EMPTY_CUSTOMER, isCustomerValid } from '../lib/types';

type Props = {
  visible: boolean;
  initial: Customer | null;
  initialBikeNumber: string;
  onClose: () => void;
  onSave: (customer: Customer, bikeNumber: string) => void;
};

/**
 * Drop-in: manually enter the customer and the bike tag. First name and phone
 * are required; the tag is optional but must be 1–100 when given.
 */
export function CustomerModal({
  visible,
  initial,
  initialBikeNumber,
  onClose,
  onSave,
}: Props) {
  const [customer, setCustomer] = useState<Customer>(initial ?? EMPTY_CUSTOMER);
  const [bikeNumber, setBikeNumber] = useState(initialBikeNumber);

  useEffect(() => {
    if (visible) {
      setCustomer(initial ?? EMPTY_CUSTOMER);
      setBikeNumber(initialBikeNumber);
    }
  }, [visible, initial, initialBikeNumber]);

  const bikeNum = Number(bikeNumber);
  const bikeInvalid =
    bikeNumber !== '' && (bikeNum < 1 || bikeNum > 100 || !Number.isInteger(bikeNum));
  const valid = isCustomerValid(customer) && !bikeInvalid;
  const set = (key: keyof Customer) => (text: string) =>
    setCustomer((current) => ({ ...current, [key]: text }));

  const save = () => {
    if (!valid) return;
    onSave({
      firstName: customer.firstName.trim(),
      lastName: customer.lastName.trim(),
      phone: customer.phone.trim(),
      email: customer.email.trim(),
    }, bikeNumber);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.heading}>Drop-in kund</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.close}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <Field label="Förnamn *" value={customer.firstName} onChange={set('firstName')} autoFocus />
          <Field label="Efternamn" value={customer.lastName} onChange={set('lastName')} />
          <Field
            label="Telefon *"
            value={customer.phone}
            onChange={set('phone')}
            placeholder="07x-xxx xx xx"
            keyboardType="phone-pad"
          />
          <Field
            label="E-post"
            value={customer.email}
            onChange={set('email')}
            keyboardType="email-address"
          />
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Ionicons name="pricetag-outline" size={13} color={colors.textFaint} />
              <Text style={styles.label}>Cykeltagg</Text>
            </View>
            <TextInput
              style={[styles.input, styles.tagInput, bikeInvalid && styles.inputError]}
              value={bikeNumber}
              onChangeText={(text) => setBikeNumber(text.replace(/[^0-9]/g, '').slice(0, 3))}
              placeholder="1–100"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              maxLength={3}
            />
            {bikeInvalid ? (
              <Text style={styles.hint}>Cykeltaggen måste vara 1–100.</Text>
            ) : null}
          </View>
          <Pressable
            onPress={save}
            disabled={!valid}
            style={[styles.saveButton, !valid && styles.saveButtonDisabled]}
          >
            <Text style={styles.saveText}>Spara kund</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoFocus?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
        autoCorrect={false}
        autoFocus={autoFocus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  heading: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
    fontSize: 18,
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },
  form: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 14,
  },
  field: {
    gap: 6,
  },
  label: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tagInput: {
    width: 90,
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
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    paddingVertical: 15,
    marginTop: 6,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveText: {
    color: colors.onAccent,
    fontWeight: '700',
  },
});
