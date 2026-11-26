import { Ionicons } from '@expo/vector-icons';
import { useState, useSyncExternalStore } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { confirmDestructive } from '../lib/confirm';
import { colors } from '../lib/theme';
import { NewProduct, Side, Task, Product, taskTotal } from '../lib/types';
import { productImageUrl } from '../lib/productSearch';
import { findInStock, getInStockStatus, subscribeInStock } from '../lib/inStockCache';
import { BikeData } from '../lib/bikeAnalysis';
import { needsSide, sideLabel, standardProductsFor, taskWarnings } from '../lib/prices';
import { AddProductModal } from './AddProductModal';
import { FitPressable } from './FitPressable';
import { ImagePreviewModal } from './ImagePreviewModal';
import { CategoryCard } from './CategoryCard';
import { styles } from './TaskCard.styles';

const PRODUCT_LABELS: Record<NonNullable<Product['label']>, string> = {
  samma: 'Samma modell',
  likvärdig: 'Likvärdigt alternativ',
  billigare: 'Billigare alternativ',
};

type Props = {
  task: Task;
  onRemove: (taskId: string) => void;
  onAddProduct: (taskId: string, product: NewProduct) => void;
  onRemoveProduct: (taskId: string, productId: string) => void;
  onUpdateProduct: (taskId: string, productId: string, price: number) => void;
  /** Röstredigering av jobbet: 'recording' = spelar in, 'processing' = AI:n jobbar. */
  voiceState?: 'recording' | 'processing';
  onVoiceEdit?: (taskId: string) => void;
  /** Visa kundens godkänn/neka-knappar (offertläge). */
  onSetApproval?: (taskId: string, approval: 'godkänd' | 'nekad' | undefined) => void;
  /** Picks fram/bak/fram+bak on a sided task that has none yet. */
  onSetSide?: (taskId: string, side: Side) => void;
  /** The bike the task is for; a task that doesn't fit it shows a warning. */
  bike?: BikeData['bike'] | null;
};

const SIDES: Side[] = ['front', 'rear', 'both'];

export function TaskCard({
  task,
  onRemove,
  onAddProduct,
  onRemoveProduct,
  onUpdateProduct,
  voiceState,
  onVoiceEdit,
  onSetApproval,
  onSetSide,
  bike = null,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  // Re-render when the in-stock list loads, so older products find their photo.
  useSyncExternalStore(subscribeInStock, getInStockStatus);

  const commitPrice = () => {
    if (editingId) {
      onUpdateProduct(task.id, editingId, Number(editPrice.replace(',', '.')) || 0);
    }
    setEditingId(null);
    setEditPrice('');
  };

  const rejected = task.approval === 'nekad';
  const warnings = taskWarnings(task, bike);

  return (
    <CategoryCard category={task.category} style={rejected && styles.cardRejected}>
      <View style={styles.topRow}>
        <View style={styles.topRowBadges}>
          {task.severity === 'kritisk' || task.approval ? (
            <View style={styles.categoryRow}>
              {task.severity === 'kritisk' ? (
                <View style={styles.criticalBadge}>
                  <Ionicons name="alert-circle" size={13} color={colors.danger} />
                  <Text style={styles.criticalText}>KRITISK</Text>
                </View>
              ) : null}
              {task.approval === 'godkänd' ? (
                <View style={styles.approvedBadge}>
                  <Ionicons name="checkmark" size={13} color={colors.success} />
                  <Text style={styles.approvedText}>GODKÄND</Text>
                </View>
              ) : null}
              {rejected ? (
                <View style={styles.rejectedBadge}>
                  <Text style={styles.rejectedText}>NEKAD</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
        <Pressable
          onPress={() =>
            confirmDestructive(
              'Ta bort produkten',
              'Är du säker på att du vill ta bort produkten?',
              'Ja',
              () => onRemove(task.id)
            )
          }
          hitSlop={8}
          accessibilityLabel="Ta bort"
          style={styles.delete}
        >
          <Ionicons name="trash-outline" size={19} color={colors.danger} />
        </Pressable>
      </View>
      {warnings.map((warning) => (
        <View key={warning} style={styles.warning}>
          <Ionicons name="warning" size={16} color={colors.danger} />
          <Text style={styles.warningText}>{warning}</Text>
        </View>
      ))}
      <View style={styles.header}>
        <Text style={[styles.title, styles.headerText]}>{task.title}</Text>
        <Text style={[styles.price, rejected && styles.priceStruck]}>{task.price} kr</Text>
        {onVoiceEdit ? (
          <Pressable
            onPress={() => onVoiceEdit(task.id)}
            hitSlop={8}
            style={[styles.voice, voiceState === 'recording' && styles.voiceActive]}
            disabled={voiceState === 'processing'}
          >
            {voiceState === 'processing' ? (
              <ActivityIndicator size="small" color={colors.accentLight} />
            ) : (
              <Ionicons
                name={voiceState === 'recording' ? 'stop' : 'mic-outline'}
                size={22}
                color={voiceState === 'recording' ? colors.onAccent : colors.accentLight}
              />
            )}
          </Pressable>
        ) : null}
      </View>
      {voiceState === 'recording' ? (
        <Text style={styles.voiceHint}>
          Prata in ändringen, t.ex. "föreslå andra Pirelli 28 mm" – tryck stopp när du är klar.
        </Text>
      ) : null}

      {onSetSide && !task.side && needsSide(task) ? (
        <View style={styles.approvalRow}>
          {SIDES.map((side) => (
            <Pressable key={side} onPress={() => onSetSide(task.id, side)} style={styles.approveBtn}>
              <Text style={styles.approveLabel}>{sideLabel(side)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {task.products.map((product) => {
        // A product saved before it kept its supplier gets it from the in-stock list.
        const stocked = !product.supplier && product.articleNumber ? findInStock(product.articleNumber) : undefined;
        const imageUrl = productImageUrl(
          stocked
            ? { ...product, supplier: stocked.supplier?.name, ean: stocked.ean, hasImage: stocked.hasImage }
            : product
        );
        return (
        <View key={product.id} style={styles.productRow}>
          <Ionicons name="cube-outline" size={15} color={colors.textSecondary} />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>
              {product.quantity ? `${product.quantity} st ` : ''}
              {product.name}
            </Text>
            {product.label || product.stock !== undefined || imageUrl ? (
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
                {imageUrl && (product.label || product.stock !== undefined) ? ' · ' : null}
                {imageUrl ? (
                  <Text style={styles.imageLink} onPress={() => setPreviewUri(imageUrl)}>
                    Bild
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
            <Ionicons name="close" size={18} color={colors.textSoft} />
          </Pressable>
        </View>
        );
      })}

      {task.products.length > 0 ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Totalt:</Text>
          <Text style={[styles.totalPrice, rejected && styles.priceStruck]}>
            {taskTotal(task).toLocaleString('sv-SE')} kr
          </Text>
        </View>
      ) : null}

      <FitPressable onPress={() => setAdding(true)} style={styles.addProduct}>
        <Ionicons name="add-circle-outline" size={20} color={colors.accentLight} />
        <Text style={styles.addProductText}>Lägg till produkt</Text>
      </FitPressable>
      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
      <AddProductModal
        visible={adding}
        standardProducts={standardProductsFor(task)}
        onClose={() => setAdding(false)}
        onAdd={(product) => {
          onAddProduct(task.id, product);
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
              color={task.approval === 'godkänd' ? colors.onAccent : colors.accentLight}
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
    </CategoryCard>
  );
}
