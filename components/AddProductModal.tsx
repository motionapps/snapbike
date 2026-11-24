import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
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
import { colors } from '../lib/theme';
import { StandardProduct } from '../lib/types';
import { styles } from './AddProductModal.styles';
import { webPage, webScroll, webScrollContent } from '../lib/webEdge';
import { FitPressable } from './FitPressable';

type Props = {
  visible: boolean;
  /** The task's standard products (assets/price-model), shown as one-tap chips. */
  standardProducts: StandardProduct[];
  onClose: () => void;
  onAdd: (name: string, price: number, quantity?: number) => void;
};

export function AddProductModal({ visible, standardProducts, onClose, onAdd }: Props) {
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

  const addProduct = (productName: string, productPrice: number, quantity?: number) => {
    onAdd(productName, productPrice, quantity);
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
      <View style={[styles.sheet, webPage]}>
        <View style={styles.header}>
          <Text style={styles.heading}>Lägg till produkt</Text>
          <Pressable onPress={close} hitSlop={8} style={styles.close}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
        {standardProducts.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.commonScroll}
          contentContainerStyle={styles.commonContent}
        >
          {standardProducts.map((product) => (
            <Pressable
              key={product.name}
              onPress={() =>
                addProduct(
                  product.name,
                  product.price ?? 0,
                  product.quantity > 1 ? product.quantity : undefined
                )
              }
              style={({ pressed }) => [styles.chip, pressed && styles.rowPressed]}
            >
              <Text style={styles.chipText}>
                {`${product.quantity > 1 ? `${product.quantity} st ` : ''}${product.name}${product.price !== undefined ? ` · ${product.price} kr` : ''}`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        ) : null}
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
            color={inStockOnly ? colors.accentLight : colors.textFaint}
          />
          <Text style={styles.checkLabel}>Bara i lager</Text>
          {searching ? <ActivityIndicator size="small" color={colors.accentLight} /> : null}
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
          <FitPressable
            onPress={add}
            disabled={!manualName}
            style={[styles.addButton, !manualName && styles.addButtonDisabled]}
          >
            <Text style={styles.addButtonText}>Lägg till</Text>
          </FitPressable>
        ) : null}
        <FlatList style={webScroll}
          data={results}
          keyExtractor={(item, index) => `${item.articleNumber}-${item.ean}-${index}`}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.listContent, webScrollContent]}
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
