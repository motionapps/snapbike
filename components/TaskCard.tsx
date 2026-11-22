import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../lib/theme';
import { Task, Product } from '../lib/types';
import { AddProductModal } from './AddProductModal';
import { styles } from './TaskCard.styles';

const PRODUCT_LABELS: Record<NonNullable<Product['label']>, string> = {
  samma: 'Samma modell',
  likvärdig: 'Likvärdigt alternativ',
  billigare: 'Billigare alternativ',
};

type Props = {
  task: Task;
  onRemove: (taskId: string) => void;
  onAddProduct: (taskId: string, name: string, price: number) => void;
  onRemoveProduct: (taskId: string, productId: string) => void;
  onUpdateProduct: (taskId: string, productId: string, price: number) => void;
  /** Röstredigering av jobbet: 'recording' = spelar in, 'processing' = AI:n jobbar. */
  voiceState?: 'recording' | 'processing';
  onVoiceEdit?: (taskId: string) => void;
  /** Visa kundens godkänn/neka-knappar (offertläge). */
  onSetApproval?: (taskId: string, approval: 'godkänd' | 'nekad' | undefined) => void;
};

export function TaskCard({
  task,
  onRemove,
  onAddProduct,
  onRemoveProduct,
  onUpdateProduct,
  voiceState,
  onVoiceEdit,
  onSetApproval,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  const commitPrice = () => {
    if (editingId) {
      onUpdateProduct(task.id, editingId, Number(editPrice.replace(',', '.')) || 0);
    }
    setEditingId(null);
    setEditPrice('');
  };

  const rejected = task.approval === 'nekad';

  return (
    <View style={[styles.card, rejected && styles.cardRejected]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.categoryRow}>
            <Text style={styles.category}>{task.category.toUpperCase()}</Text>
            {task.severity === 'kritisk' ? (
              <View style={styles.criticalBadge}>
                <Ionicons name="alert-circle" size={11} color={colors.danger} />
                <Text style={styles.criticalText}>KRITISK</Text>
              </View>
            ) : null}
            {task.approval === 'godkänd' ? (
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
          <Text style={styles.title}>{task.title}</Text>
        </View>
        <Text style={[styles.price, rejected && styles.priceStruck]}>{task.price} kr</Text>
        {onVoiceEdit ? (
          <Pressable
            onPress={() => onVoiceEdit(task.id)}
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
        <Pressable onPress={() => onRemove(task.id)} hitSlop={8} style={styles.remove}>
          <Ionicons name="close" size={16} color={colors.textFaint} />
        </Pressable>
      </View>
      {voiceState === 'recording' ? (
        <Text style={styles.voiceHint}>
          Prata in ändringen, t.ex. "föreslå andra Pirelli 28 mm" – tryck stopp när du är klar.
        </Text>
      ) : null}

      {task.products.map((product) => (
        <View key={product.id} style={styles.productRow}>
          <Ionicons name="cube-outline" size={15} color={colors.textSecondary} />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>
              {product.quantity ? `${product.quantity} st ` : ''}
              {product.name}
            </Text>
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
                      ? 'I lager'
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
                {product.price > 0
                    ? `${product.quantity ? `${product.quantity} × ` : ''}${product.price} kr`
                    : '– kr'}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => onRemoveProduct(task.id, product.id)}
            hitSlop={8}
            style={styles.remove}
          >
            <Ionicons name="close" size={14} color={colors.textFaint} />
          </Pressable>
        </View>
      ))}

      <Pressable onPress={() => setAdding(true)} style={styles.addProduct}>
        <Ionicons name="add" size={16} color={colors.accent} />
        <Text style={styles.addProductText}>Lägg till produkt</Text>
      </Pressable>
      <AddProductModal
        visible={adding}
        onClose={() => setAdding(false)}
        onAdd={(name, price) => {
          onAddProduct(task.id, name, price);
          setAdding(false);
        }}
      />

      {onSetApproval ? (
        <View style={styles.approvalRow}>
          <Pressable
            onPress={() =>
              onSetApproval(task.id, task.approval === 'godkänd' ? undefined : 'godkänd')
            }
            style={[styles.approveBtn, task.approval === 'godkänd' && styles.approveBtnActive]}
          >
            <Ionicons
              name="checkmark"
              size={16}
              color={task.approval === 'godkänd' ? colors.onAccent : colors.accent}
            />
            <Text
              style={[
                styles.approveLabel,
                task.approval === 'godkänd' && styles.approveLabelActive,
              ]}
            >
              Godkänn
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onSetApproval(task.id, rejected ? undefined : 'nekad')}
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
