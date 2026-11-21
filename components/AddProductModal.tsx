import { Ionicons } from '@expo/vector-icons';
import { useDeferredValue, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { searchProducts } from '../lib/stock';
import { colors, radius } from '../lib/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, price: number) => void;
};

export function AddProductModal({ visible, onClose, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => searchProducts(deferredQuery), [deferredQuery]);

  const reset = () => {
    setQuery('');
    setName('');
    setPrice('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed, Number(price.replace(',', '.')) || 0);
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.heading}>Lägg till produkt</Text>
          <Pressable onPress={close} hitSlop={8} style={styles.close}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={17} color={colors.textFaint} />
          <TextInput
            style={styles.search}
            placeholder="Sök namn, artikelnummer eller EAN…"
            placeholderTextColor={colors.textFaint}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
          />
        </View>
        <View style={styles.form}>
          <TextInput
            style={[styles.input, styles.inputName]}
            placeholder="Namn"
            placeholderTextColor={colors.textFaint}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={[styles.input, styles.inputPrice]}
            placeholder="kr"
            placeholderTextColor={colors.textFaint}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
        </View>
        <Pressable
          onPress={add}
          disabled={!name.trim()}
          style={[styles.addButton, !name.trim() && styles.addButtonDisabled]}
        >
          <Text style={styles.addButtonText}>Lägg till</Text>
        </Pressable>
        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.articleNumber}-${item.ean}-${index}`}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setName(item.name);
                setPrice(item.sellPrice > 0 ? String(item.sellPrice) : '');
              }}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {[item.articleNumber && `Art ${item.articleNumber}`, item.ean && `EAN ${item.ean}`]
                    .filter(Boolean)
                    .join(' · ')}
                  {' · '}
                  <Text style={item.stock > 0 ? styles.inStock : styles.orderItem}>
                    {item.stock > 0 ? `I lager (${item.stock})` : 'Beställningsvara'}
                  </Text>
                </Text>
              </View>
              <Text style={styles.rowPrice}>
                {item.sellPrice > 0 ? `${item.sellPrice} kr` : '– kr'}
              </Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
  },
  search: {
    flex: 1,
    color: colors.text,
    paddingVertical: 11,
  },
  form: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  inputName: {
    flex: 1,
  },
  inputPrice: {
    width: 90,
    textAlign: 'right',
  },
  addButton: {
    marginHorizontal: 20,
    marginBottom: 14,
    alignItems: 'center',
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: colors.accent,
    paddingVertical: 12,
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    color: colors.onAccent,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  rowPressed: {
    backgroundColor: colors.cardRaised,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
  },
  rowMeta: {
    color: colors.textFaint,
    fontSize: 11,
  },
  inStock: {
    color: colors.accentDark,
    fontWeight: '600',
  },
  orderItem: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  rowPrice: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
