import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, shadow, statusColors } from '../lib/theme';
import { Job, Product } from '../lib/types';

const PRODUCT_LABELS: Record<NonNullable<Product['label']>, string> = {
  samma: 'Samma modell',
  likvärdig: 'Likvärdigt alternativ',
  billigare: 'Billigare alternativ',
};

type Props = {
  job: Job;
  onRemove: (jobId: string) => void;
  onAddProduct: (jobId: string, name: string, price: number) => void;
  onRemoveProduct: (jobId: string, productId: string) => void;
  onUpdateProduct: (jobId: string, productId: string, price: number) => void;
};

export function JobCard({
  job,
  onRemove,
  onAddProduct,
  onRemoveProduct,
  onUpdateProduct,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  const commitPrice = () => {
    if (editingId) {
      onUpdateProduct(job.id, editingId, Number(editPrice.replace(',', '.')) || 0);
    }
    setEditingId(null);
    setEditPrice('');
  };

  const submitProduct = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    onAddProduct(job.id, trimmed, Number(price.replace(',', '.')) || 0);
    setName('');
    setPrice('');
    setAdding(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.categoryRow}>
            <Text style={styles.category}>{job.category.toUpperCase()}</Text>
            {job.severity === 'kritisk' ? (
              <View style={styles.criticalBadge}>
                <Ionicons name="alert-circle" size={11} color={colors.danger} />
                <Text style={styles.criticalText}>KRITISK</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.title}>{job.title}</Text>
        </View>
        <Text style={styles.price}>{job.price} kr</Text>
        <Pressable onPress={() => onRemove(job.id)} hitSlop={8} style={styles.remove}>
          <Ionicons name="close" size={16} color={colors.textFaint} />
        </Pressable>
      </View>

      {job.products.map((product) => (
        <View key={product.id} style={styles.productRow}>
          <Ionicons name="cube-outline" size={15} color={colors.textSecondary} />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            {product.label || product.stock !== undefined ? (
              <Text style={styles.productMeta}>
                {product.label ? PRODUCT_LABELS[product.label] : null}
                {product.label && product.stock !== undefined ? ' · ' : null}
                {product.stock !== undefined ? (
                  <Text
                    style={
                      product.stock > 0 ? styles.inStock : styles.orderItem
                    }
                  >
                    {product.stock > 0
                      ? `I lager (${product.stock})`
                      : 'Beställningsvara'}
                  </Text>
                ) : null}
              </Text>
            ) : null}
          </View>
          {editingId === product.id ? (
            <TextInput
              style={[styles.input, styles.inputEditPrice]}
              placeholder="kr"
              placeholderTextColor={colors.textFaint}
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="numeric"
              returnKeyType="done"
              autoFocus
              onSubmitEditing={commitPrice}
              onBlur={commitPrice}
            />
          ) : (
            <Pressable
              onPress={() => {
                setEditingId(product.id);
                setEditPrice(product.price > 0 ? String(product.price) : '');
              }}
              hitSlop={6}
              style={product.price > 0 ? undefined : styles.priceMissing}
            >
              <Text
                style={[
                  styles.productPrice,
                  product.price <= 0 && styles.priceMissingText,
                ]}
              >
                {product.price > 0 ? `${product.price} kr` : '– kr'}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => onRemoveProduct(job.id, product.id)}
            hitSlop={8}
            style={styles.remove}
          >
            <Ionicons name="close" size={14} color={colors.textFaint} />
          </Pressable>
        </View>
      ))}

      {adding ? (
        <View style={styles.addForm}>
          <TextInput
            style={[styles.input, styles.inputName]}
            placeholder="Produkt"
            placeholderTextColor={colors.textFaint}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="next"
          />
          <TextInput
            style={[styles.input, styles.inputPrice]}
            placeholder="kr"
            placeholderTextColor={colors.textFaint}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={submitProduct}
          />
          <Pressable onPress={submitProduct} style={styles.confirm}>
            <Ionicons name="checkmark" size={18} color={colors.onAccent} />
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setAdding(true)} style={styles.addProduct}>
          <Ionicons name="add" size={16} color={colors.accent} />
          <Text style={styles.addProductText}>Lägg till produkt</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
    ...shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  category: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontWeight: '600',
  },
  price: {
    color: colors.text,
    fontWeight: '700',
  },
  remove: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 6,
  },
  productInfo: {
    flex: 1,
    gap: 1,
  },
  productName: {
    color: colors.textSecondary,
  },
  productMeta: {
    color: colors.textFaint,
    fontSize: 11,
  },
  inStock: {
    color: colors.accentDark,
    fontWeight: '600',
  },
  orderItem: {
    color: statusColors.inspected,
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  criticalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 90, 95, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  criticalText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  productPrice: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  priceMissing: {
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  priceMissingText: {
    color: colors.accent,
  },
  inputEditPrice: {
    width: 76,
    textAlign: 'right',
    paddingVertical: 4,
  },
  addProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  addProductText: {
    color: colors.accent,
    fontWeight: '600',
  },
  addForm: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    backgroundColor: colors.cardRaised,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputName: {
    flex: 1,
  },
  inputPrice: {
    width: 76,
    textAlign: 'right',
  },
  confirm: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
});
