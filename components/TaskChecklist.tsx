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
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../lib/theme';
import { Task, productTotal, taskTotal } from '../lib/types';
import { CategoryCard } from './CategoryCard';
import { styles } from './TaskChecklist.styles';
import { webPage, webScroll, webScrollContent } from '../lib/webEdge';

const kr = (n: number) => `${n.toLocaleString('sv-SE')} kr`;

/** How far a row must be dragged to count as a swipe. */
const SWIPE_THRESHOLD = 80;

/**
 * A task on the work checklist: swipe right = klar, swipe left = ej klar,
 * tap the circle = toggle klar, tap elsewhere = details.
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
          <Ionicons name="checkmark-circle" size={18} color={colors.accentLight} />
          <Text style={[styles.behindText, { color: colors.accentLight }]}>Klar</Text>
        </View>
        <View style={styles.behindSide}>
          <Text style={styles.behindText}>Ej klar</Text>
          <Ionicons name="ellipse-outline" size={18} color={colors.textSecondary} />
        </View>
      </View>
      <Animated.View style={{ transform: [{ translateX: dx }] }} {...pan.panHandlers}>
        <CategoryCard category={task.category}>
          <Pressable onPress={onOpen} style={styles.row}>
            {/* Tapping the circle toggles klar, as an alternative to swiping. */}
            <Pressable onPress={() => onSetDone(!done)} hitSlop={10}>
              <Ionicons
                name={done ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={done ? colors.accentLight : colors.textFaint}
              />
            </Pressable>
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
        </CategoryCard>
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
        style={[styles.sheet, webPage]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.heading}>{current.title}</Text>
          <Pressable onPress={close} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView style={webScroll} contentContainerStyle={[styles.body, webScrollContent]} keyboardShouldPersistTaps="handled">
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
