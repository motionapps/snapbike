import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radius } from '../lib/theme';
import { Task, productTotal, taskTotal } from '../lib/types';

const kr = (n: number) => `${n.toLocaleString('sv-SE')} kr`;

/** How far a row must be dragged to count as a swipe. */
const SWIPE_THRESHOLD = 80;

/**
 * A task on the work checklist: swipe right = klar, swipe left = ej klar,
 * tap = details.
 */
export function ChecklistRow({
  task,
  onSetDone,
  onOpen,
}: {
  task: Task;
  onSetDone: (done: boolean) => void;
  onOpen: () => void;
}) {
  const dx = useRef(new Animated.Value(0)).current;
  const onSetDoneRef = useRef(onSetDone);
  onSetDoneRef.current = onSetDone;

  const pan = useRef(
    PanResponder.create({
      // Only horizontal drags; vertical ones scroll the list.
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: Animated.event([null, { dx }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) onSetDoneRef.current(true);
        else if (g.dx < -SWIPE_THRESHOLD) onSetDoneRef.current(false);
        Animated.spring(dx, { toValue: 0, useNativeDriver: false }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(dx, { toValue: 0, useNativeDriver: false }).start();
      },
    })
  ).current;

  const done = !!task.done;

  return (
    <View style={styles.rowWrap}>
      <View style={styles.behind}>
        <View style={styles.behindSide}>
          <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
          <Text style={[styles.behindText, { color: colors.accent }]}>Klar</Text>
        </View>
        <View style={styles.behindSide}>
          <Text style={styles.behindText}>Ej klar</Text>
          <Ionicons name="ellipse-outline" size={18} color={colors.textSecondary} />
        </View>
      </View>
      <Animated.View style={{ transform: [{ translateX: dx }] }} {...pan.panHandlers}>
        <Pressable onPress={onOpen} style={styles.row}>
          <Ionicons
            name={done ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={done ? colors.accent : colors.textFaint}
          />
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, done && styles.rowTitleDone]}>{task.title}</Text>
            {task.products.map((product) => (
              <Text key={product.id} style={styles.rowProduct}>
                {product.name}
              </Text>
            ))}
            {task.note ? (
              <Text style={styles.rowNote} numberOfLines={1}>
                {task.note}
              </Text>
            ) : null}
          </View>
          <Text style={styles.rowPrice}>{kr(taskTotal(task))}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/** Details of a checklist task: products with article numbers, a comment, Klar. */
export function TaskDetailModal({
  task,
  onClose,
  onChange,
}: {
  /** null hides the modal. */
  task: Task | null;
  onClose: () => void;
  onChange: (taskId: string, patch: Pick<Task, 'done' | 'note'>) => void;
}) {
  const [note, setNote] = useState('');
  // The task stays rendered while the sheet slides away; emptying it at
  // once made the closing sheet flash blank.
  const [shown, setShown] = useState<Task | null>(task);
  if (task && task !== shown) setShown(task);

  useEffect(() => {
    if (task) setNote(task.note ?? '');
  }, [task?.id]);

  const current = task ?? shown;
  if (!current) return null;

  const noteChanged = note.trim() !== (current.note ?? '');
  const close = () => {
    if (!task) return;
    if (noteChanged) onChange(task.id, { note: note.trim() });
    onClose();
  };
  const toggleDone = () => {
    if (!task) return;
    onChange(task.id, { done: !task.done, ...(noteChanged ? { note: note.trim() } : {}) });
    onClose();
  };

  return (
    <Modal visible={task !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.sheet}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.heading}>{current.title}</Text>
          <Pressable onPress={close} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.line}>
              <Text style={styles.lineLabel}>{current.category || 'Arbete'}</Text>
              <Text style={styles.lineValue}>{kr(current.price)}</Text>
            </View>
            {current.products.map((product) => (
              <View key={product.id} style={styles.product}>
                <View style={styles.line}>
                  <Text style={styles.productName}>
                    {product.quantity ? `${product.quantity} st ` : ''}
                    {product.name}
                  </Text>
                  <Text style={styles.lineValue}>{kr(productTotal(product))}</Text>
                </View>
                <Text style={styles.productMeta} selectable>
                  Art.nr {product.articleNumber || '–'}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.label}>KOMMENTAR</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Anteckning om jobbet"
            placeholderTextColor={colors.textFaint}
            multiline
            style={styles.input}
          />

          <Pressable
            onPress={toggleDone}
            style={[styles.doneButton, current.done && styles.undoButton]}
          >
            <Ionicons
              name={current.done ? 'ellipse-outline' : 'checkmark'}
              size={18}
              color={current.done ? colors.text : colors.onAccent}
            />
            <Text style={[styles.doneText, current.done && styles.undoText]}>
              {current.done ? 'Markera som ej klar' : 'Markera som klar'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  behind: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  behindSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  behindText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 10,
    backgroundColor: colors.card,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  rowTitleDone: {
    color: colors.textSecondary,
  },
  rowProduct: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  rowNote: {
    color: colors.textFaint,
    fontSize: 12,
    fontStyle: 'italic',
  },
  rowPrice: {
    color: colors.text,
    fontWeight: '600',
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  heading: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
    fontSize: 18,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  lineLabel: {
    color: colors.textSecondary,
    flex: 1,
  },
  lineValue: {
    color: colors.text,
    fontWeight: '600',
  },
  product: {
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  productName: {
    color: colors.text,
    flex: 1,
  },
  productMeta: {
    color: colors.textFaint,
    fontSize: 12,
  },
  label: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  input: {
    minHeight: 90,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 12,
    textAlignVertical: 'top',
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    paddingVertical: 14,
    backgroundColor: colors.accent,
    marginTop: 8,
  },
  undoButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  doneText: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: '700',
  },
  undoText: {
    color: colors.text,
  },
});
