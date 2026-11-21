import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  /** Röstredigering av jobbet: 'recording' = spelar in, 'processing' = AI:n jobbar. */
  voiceState?: 'recording' | 'processing';
  onVoiceEdit?: (jobId: string) => void;
  /** Visa kundens godkänn/neka-knappar (offertläge). */
  onSetApproval?: (jobId: string, approval: 'godkänd' | 'nekad' | undefined) => void;
};

export function JobCard({
  job,
  onRemove,
  onAddProduct,
  onRemoveProduct,
  onUpdateProduct,
  voiceState,
  onVoiceEdit,
  onSetApproval,
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

  const rejected = job.approval === 'nekad';

  return (
    <View style={[styles.card, rejected && styles.cardRejected]}>
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
            {job.approval === 'godkänd' ? (
              <View style={styles.approvedBadge}>
                <Ionicons name="checkmark" size={11} color={colors.accentDark} />
                <Text style={styles.approvedText}>GODKÄND</Text>
              </View>
            ) : null}
            {rejected ? (
              <View style={styles.rejectedBadge}>
                <Text style={styles.rejectedText}>NEKAD</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.title}>{job.title}</Text>
        </View>
        <Text style={[styles.price, rejected && styles.priceStruck]}>{job.price} kr</Text>
        {onVoiceEdit ? (
          <Pressable
            onPress={() => onVoiceEdit(job.id)}
            hitSlop={8}
            style={[styles.voice, voiceState === 'recording' && styles.voiceActive]}
            disabled={voiceState === 'processing'}
          >
            {voiceState === 'processing' ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons
                name={voiceState === 'recording' ? 'stop' : 'mic-outline'}
                size={16}
                color={voiceState === 'recording' ? colors.onAccent : colors.accent}
              />
            )}
          </Pressable>
        ) : null}
        <Pressable onPress={() => onRemove(job.id)} hitSlop={8} style={styles.remove}>
          <Ionicons name="close" size={16} color={colors.textFaint} />
        </Pressable>
      </View>
      {voiceState === 'recording' ? (
        <Text style={styles.voiceHint}>
          Prata in ändringen, t.ex. "föreslå andra Pirelli 28 mm" – tryck stopp när du är klar.
        </Text>
      ) : null}

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

      {onSetApproval ? (
        <View style={styles.approvalRow}>
          <Pressable
            onPress={() =>
              onSetApproval(job.id, job.approval === 'godkänd' ? undefined : 'godkänd')
            }
            style={[styles.approveBtn, job.approval === 'godkänd' && styles.approveBtnActive]}
          >
            <Ionicons
              name="checkmark"
              size={16}
              color={job.approval === 'godkänd' ? colors.onAccent : colors.accent}
            />
            <Text
              style={[
                styles.approveLabel,
                job.approval === 'godkänd' && styles.approveLabelActive,
              ]}
            >
              Godkänn
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onSetApproval(job.id, rejected ? undefined : 'nekad')}
            style={[styles.rejectBtn, rejected && styles.rejectBtnActive]}
          >
            <Ionicons
              name="close"
              size={16}
              color={rejected ? colors.onAccent : colors.danger}
            />
            <Text style={[styles.rejectLabel, rejected && styles.rejectLabelActive]}>
              Neka
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardRejected: {
    opacity: 0.55,
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(185, 241, 60, 0.14)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  approvedText: {
    color: colors.accentDark,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rejectedBadge: {
    backgroundColor: 'rgba(255, 90, 95, 0.14)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  rejectedText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  priceStruck: {
    textDecorationLine: 'line-through',
    color: colors.textFaint,
  },
  approvalRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 10,
  },
  approveBtnActive: {
    backgroundColor: colors.accent,
  },
  approveLabel: {
    color: colors.accent,
    fontWeight: '700',
  },
  approveLabelActive: {
    color: colors.onAccent,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 95, 0.5)',
    paddingVertical: 10,
  },
  rejectBtnActive: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  rejectLabel: {
    color: colors.danger,
    fontWeight: '700',
  },
  rejectLabelActive: {
    color: colors.onAccent,
  },
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
  voice: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voiceActive: {
    backgroundColor: colors.recording,
    borderColor: colors.recording,
  },
  voiceHint: {
    color: colors.textFaint,
    fontSize: 11,
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
