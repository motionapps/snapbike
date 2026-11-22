import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ensureInStock,
  getInStockStatus,
  searchInStock,
  subscribeInStock,
} from '../lib/inStockCache';
import { searchProducts, SearchProduct } from '../lib/productSearch';
import { colors, radius } from '../lib/theme';

/** Most used products, one tap to add. Placeholders until the real list is decided. */
const COMMON_PRODUCTS: { name: string; price: number }[] = [
  { name: 'Marathon Plus däck', price: 0 },
  { name: 'Marathon däck', price: 0 },
  { name: 'Road Cruiser däck', price: 0 },
  { name: 'Slang', price: 0 },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, price: number) => void;
};

export function AddProductModal({ visible, onClose, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(true);
  const [remoteResults, setRemoteResults] = useState<SearchProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "Bara i lager": instant search in the hourly cached stock list on the phone.
  const stock = useSyncExternalStore(subscribeInStock, getInStockStatus);
  useEffect(() => {
    if (visible && inStockOnly) ensureInStock();
  }, [visible, inStockOnly]);
  const localResults = useMemo(
    () => (inStockOnly ? searchInStock(query) : []),
    [inStockOnly, query, stock]
  );

  // Everything else: Produktsök, 300 ms after the last keystroke; a newer search
  // cancels the older one.
  useEffect(() => {
    const q = query.trim();
    if (inStockOnly || q.length < 2) {
      setRemoteResults([]);
      setSearching(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(() => {
      searchProducts(q, controller.signal)
        .then((products) => {
          setRemoteResults(products);
          setError(null);
        })
        .catch((err: Error) => {
          if (controller.signal.aborted) return;
          setRemoteResults([]);
          setError(err.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, inStockOnly]);

  const results = inStockOnly ? localResults : remoteResults;
  const stockNotice =
    stock.state === 'error'
      ? `Kunde inte hämta lagerlistan: ${stock.error}`
      : stock.state !== 'ready'
        ? 'Lagerlistan laddas…'
        : null;
  const notice = error ?? (inStockOnly && query.trim() ? stockNotice : null);

  const reset = () => {
    setQuery('');
    setName('');
    setPrice('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const addProduct = (productName: string, productPrice: number) => {
    onAdd(productName, productPrice);
    reset();
  };

  // Manual entry: the name field, or the search text if no name was typed.
  const manualName = name.trim() || query.trim();
  const showAddButton = Boolean(query.trim() || name.trim() || price.trim());

  const add = () => {
    if (!manualName) return;
    addProduct(manualName, Number(price.replace(',', '.')) || 0);
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.commonScroll}
          contentContainerStyle={styles.commonContent}
        >
          {COMMON_PRODUCTS.map((product) => (
            <Pressable
              key={product.name}
              onPress={() => addProduct(product.name, product.price)}
              style={({ pressed }) => [styles.chip, pressed && styles.rowPressed]}
            >
              <Text style={styles.chipText}>{product.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
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
        <Pressable
          onPress={() => setInStockOnly((value) => !value)}
          style={styles.checkRow}
          hitSlop={6}
        >
          <Ionicons
            name={inStockOnly ? 'checkbox' : 'square-outline'}
            size={20}
            color={inStockOnly ? colors.accent : colors.textFaint}
          />
          <Text style={styles.checkLabel}>Bara i lager</Text>
          {searching ? <ActivityIndicator size="small" color={colors.accent} /> : null}
        </Pressable>
        {notice ? <Text style={styles.error}>{notice}</Text> : null}
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
        {showAddButton ? (
          <Pressable
            onPress={add}
            disabled={!manualName}
            style={[styles.addButton, !manualName && styles.addButtonDisabled]}
          >
            <Text style={styles.addButtonText}>Lägg till</Text>
          </Pressable>
        ) : null}
        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.articleNumber}-${item.ean}-${index}`}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => addProduct(item.name, item.sellPrice > 0 ? item.sellPrice : 0)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {[
                    item.supplier?.name,
                    item.articleNumber && `Art ${item.articleNumber}`,
                    item.ean && `EAN ${item.ean}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
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
  commonScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  commonContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipText: {
    color: colors.text,
    fontWeight: '600',
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
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  checkLabel: {
    color: colors.text,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
    marginHorizontal: 20,
    marginBottom: 10,
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
  rowPrice: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
