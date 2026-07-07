import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PRICE_LIST } from '../lib/prices';
import { colors, radius } from '../lib/theme';
import { PriceItem } from '../lib/types';

const CATEGORIES = [...new Set(PRICE_LIST.map((item) => item.category))].sort(
  (a, b) => a.localeCompare(b, 'sv')
);

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (item: PriceItem) => void;
};

export function AddJobModal({ visible, onClose, onPick }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRICE_LIST.filter((item) => {
      if (category && item.category !== category) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.heading}>Lägg till jobb</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.close}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={17} color={colors.textFaint} />
          <TextInput
            style={styles.search}
            placeholder="Sök i prislistan…"
            placeholderTextColor={colors.textFaint}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          keyboardShouldPersistTaps="handled"
          style={styles.chipScroll}
        >
          <Pressable
            onPress={() => setCategory(null)}
            style={[styles.chip, category === null && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, category === null && styles.chipTextActive]}
            >
              Alla
            </Text>
          </Pressable>
          {CATEGORIES.map((item) => {
            const isActive = category === item;
            return (
              <Pressable
                key={item}
                onPress={() => setCategory(isActive ? null : item)}
                style={[styles.chip, isActive && styles.chipActive]}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.category}-${item.title}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onPick(item);
                setQuery('');
              }}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowCategory}>{item.category.toUpperCase()}</Text>
                <Text style={styles.rowTitle}>{item.title}</Text>
              </View>
              <Text style={styles.rowPrice}>{item.price} kr</Text>
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
  chipScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  chipRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.onAccent,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowPressed: {
    backgroundColor: colors.cardRaised,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowCategory: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 1,
  },
  rowTitle: {
    color: colors.text,
  },
  rowPrice: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
