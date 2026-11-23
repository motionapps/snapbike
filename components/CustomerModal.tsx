import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useState } from 'react';
import {
  KeyboardTypeOptions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { searchCustomers } from '../lib/supabase';
import { colors } from '../lib/theme';
import { Customer, EMPTY_CUSTOMER, customerHasPhone, normalizePhone } from '../lib/types';
import { styles } from './CustomerModal.styles';
import { webPage, webScroll, webScrollContent } from '../lib/webEdge';
import { FitPressable } from './FitPressable';

/** Fields whose text searches existing customers. */
type SearchField = 'firstName' | 'lastName' | 'phone';

type Props = {
  visible: boolean;
  initial: Customer | null;
  initialBikeNumber: string;
  onClose: () => void;
  onSave: (customer: Customer, bikeNumber: string) => void;
};

/**
 * Drop-in: manually enter the customer and the bike tag. Every field is
 * optional so a job can be filled in partially; the tag must be 1–100 when given.
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

  const [searchField, setSearchField] = useState<SearchField | null>(null);
  const [matches, setMatches] = useState<Customer[]>([]);

  useEffect(() => {
    if (visible) {
      setCustomer(initial ?? EMPTY_CUSTOMER);
      setBikeNumber(initialBikeNumber);
      setSearchField(null);
      setMatches([]);
    }
  }, [visible, initial, initialBikeNumber]);

  const searchText = searchField ? customer[searchField] : '';
  useEffect(() => {
    if (searchText.trim().length < 2) {
      setMatches([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      searchCustomers(searchText)
        .then((found) => {
          if (!cancelled) setMatches(found);
        })
        .catch((err) => console.warn(err instanceof Error ? err.message : err));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchText]);

  const pick = (match: Customer) => {
    setCustomer(match);
    setSearchField(null);
    setMatches([]);
  };

  const suggestionsFor = (field: SearchField) =>
    searchField === field && matches.length > 0 ? (
      <View style={styles.suggestions}>
        {matches.map((match, index) => (
          <Pressable key={match.phone || index} onPress={() => pick(match)} style={styles.suggestion}>
            <Ionicons name="person-outline" size={14} color={colors.textFaint} />
            <Text style={styles.suggestionName} numberOfLines={1}>
              {[match.firstName, match.lastName].filter(Boolean).join(' ')}
            </Text>
            <Text style={styles.suggestionPhone}>{match.phone}</Text>
          </Pressable>
        ))}
      </View>
    ) : null;

  const bikeNum = Number(bikeNumber);
  const bikeInvalid =
    bikeNumber !== '' && (bikeNum < 1 || bikeNum > 100 || !Number.isInteger(bikeNum));
  const valid = !bikeInvalid;
  const missingPhone = !customerHasPhone(customer);
  const missingTag = bikeNumber === '';
  const set = (key: keyof Customer) => (text: string) => {
    setCustomer((current) => ({ ...current, [key]: text }));
    setSearchField(key === 'email' ? null : key);
  };

  const save = () => {
    if (!valid) return;
    onSave({
      firstName: customer.firstName.trim(),
      lastName: customer.lastName.trim(),
      phone: normalizePhone(customer.phone),
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
      <View style={[styles.sheet, webPage]}>
        <View style={styles.header}>
          <Text style={styles.heading}>Drop-in kund</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.close}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
        <ScrollView style={webScroll}
          contentContainerStyle={[styles.form, webScrollContent]}
          keyboardShouldPersistTaps="handled"
        >
          <SearchSlot layer={3}>
            <Field label="Förnamn" value={customer.firstName} onChange={set('firstName')} autoFocus />
            {suggestionsFor('firstName')}
          </SearchSlot>
          <SearchSlot layer={2}>
            <Field label="Efternamn" value={customer.lastName} onChange={set('lastName')} />
            {suggestionsFor('lastName')}
          </SearchSlot>
          <SearchSlot layer={1}>
            <Field
              label="Telefon"
              value={customer.phone}
              onChange={set('phone')}
              placeholder="07x-xxx xx xx"
              keyboardType="phone-pad"
            />
            {suggestionsFor('phone')}
          </SearchSlot>
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
          <FitPressable
            onPress={save}
            disabled={!valid}
            style={[
              styles.saveButton,
              (missingPhone || missingTag) && styles.saveButtonWarning,
              !valid && styles.saveButtonDisabled,
            ]}
          >
            <Text style={styles.saveText}>Spara kund</Text>
          </FitPressable>
          {missingPhone ? (
            <Text style={styles.warningText}>Inget korrekt telefonnummer har sparats</Text>
          ) : null}
          {missingTag ? (
            <Text style={styles.warningText}>Ingen cykeltagg har angetts</Text>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

/**
 * Holds a searchable field. Each slot keeps a fixed layer, higher than the
 * fields below it, so its suggestions overlay them. The layer must not change
 * while typing: changing zIndex reorders the native views and the input loses
 * focus, which dismisses the keyboard.
 */
function SearchSlot({ layer, children }: { layer: number; children: ReactNode }) {
  return <View style={[styles.slot, { zIndex: layer, elevation: layer }]}>{children}</View>;
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
