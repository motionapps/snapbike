import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { jobImageUrl } from '../lib/supabase';
import { colors, gutter, radius } from '../lib/theme';
import { Job, Task, JobStatus, tasksTotal } from '../lib/types';
import { BikeDetails } from './BikeDetails';
import { InspectionSummary } from './InspectionSummary';
import { JobHeader } from './JobHeader';
import { CommentField, JobNotesModal, NoteEntry } from './JobNotesModal';
import { StatusPill } from './StatusPill';
import { ZoomableImageModal } from './ZoomableImageModal';

type Props = {
  job: Job | null;
  onClose: () => void;
  onChangeStatus: (id: string, status: JobStatus) => void;
  onUpdateTasks: (id: string, tasks: Task[]) => void;
  onUpdateComment: (id: string, field: CommentField, text: string) => void;
  onStartCheckIn: (job: Job) => void;
  onEditBikeDetails: (job: Job) => void;
  onEditCustomer: (job: Job) => void;
  onStartInspection: (job: Job) => void;
  onSelectBike: (job: Job) => void;
  onDelete: (id: string) => void;
};

/** The next step for each status: a label and what it does. */
type NextAction = { label: string; icon: string; run: () => void };

/** Identifies the price being edited: a task's own price or one of its products. */
type EditTarget = { taskId: string; productId: string | null };

export function JobDetailModal({
  job,
  onClose,
  onChangeStatus,
  onUpdateTasks,
  onUpdateComment,
  onStartCheckIn,
  onEditBikeDetails,
  onEditCustomer,
  onStartInspection,
  onSelectBike,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [editValue, setEditValue] = useState('');
  const [zoomUri, setZoomUri] = useState<string | null>(null);
  // Snapshot of what the notes modal shows; null when it is closed.
  const [notes, setNotes] = useState<NoteEntry[] | null>(null);

  const transcripts: NoteEntry[] = job
    ? [
        { title: 'Mottagningstranskribering', text: job.transcript },
        { title: 'Besiktningstranskribering', text: job.inspectionTranscript },
      ].filter((entry) => entry.text.trim() !== '')
    : [];

  const startEdit = (target: EditTarget, price: number) => {
    setEditing(target);
    setEditValue(price > 0 ? String(price) : '');
  };

  const commitEdit = () => {
    if (editing && job) {
      const price = Number(editValue.replace(',', '.')) || 0;
      const tasks = job.tasks.map((task) => {
        if (task.id !== editing.taskId) return task;
        if (editing.productId === null) return { ...task, price };
        return {
          ...task,
          products: task.products.map((product) =>
            product.id === editing.productId ? { ...product, price } : product
          ),
        };
      });
      onUpdateTasks(job.id, tasks);
    }
    setEditing(null);
    setEditValue('');
  };

  // Navigation that switches tab waits until the modal is fully dismissed:
  // on iOS, hiding the Jobb tab mid-dismiss leaves an invisible modal that
  // blocks every touch on the tab.
  const afterDismiss = useRef<(() => void) | null>(null);

  const runAfterDismiss = () => {
    const action = afterDismiss.current;
    afterDismiss.current = null;
    action?.();
  };

  const closeThen = (action: () => void) => {
    if (Platform.OS === 'ios') {
      afterDismiss.current = action;
      close();
    } else {
      close();
      action();
    }
  };

  const close = () => {
    setZoomUri(null);
    setNotes(null);
    setEditing(null);
    setEditValue('');
    onClose();
  };

  const confirmDelete = () => {
    if (!job) return;
    const remove = () => {
      close();
      onDelete(job.id);
    };
    const message = 'Jobbet tas bort permanent.';
    if (Platform.OS === 'web') {
      if (window.confirm(`Ta bort jobbet? ${message}`)) remove();
      return;
    }
    Alert.alert('Ta bort jobbet?', message, [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Ta bort', style: 'destructive', onPress: remove },
    ]);
  };

  const nextAction = ((): NextAction | null => {
    if (!job) return null;
    switch (job.status) {
      case 'booked':
        return {
          label: 'Starta mottagningen',
          icon: 'mic',
          run: () => {
            closeThen(() => onStartCheckIn(job));
          },
        };
      case 'checked_in':
        return {
          label: 'Starta besiktningen',
          icon: 'clipboard',
          run: () => {
            closeThen(() => onStartInspection(job));
          },
        };
      case 'inspected':
      case 'customer_approved':
        return {
          label: 'Starta arbetet',
          icon: 'construct',
          run: () => onChangeStatus(job.id, 'in_progress'),
        };
      case 'in_progress':
        return {
          label: 'Markera klar',
          icon: 'checkmark-circle',
          run: () => onChangeStatus(job.id, 'ready'),
        };
      case 'ready':
        return {
          label: 'Lämna ut',
          icon: 'exit',
          run: () => onChangeStatus(job.id, 'delivered'),
        };
      default:
        return null;
    }
  })();

  const priceInput = (
    <TextInput
      style={styles.priceInput}
      placeholder="kr"
      placeholderTextColor={colors.textFaint}
      value={editValue}
      onChangeText={setEditValue}
      keyboardType="numeric"
      returnKeyType="done"
      autoFocus
      onSubmitEditing={commitEdit}
      onBlur={commitEdit}
    />
  );

  return (
    <Modal
      visible={job !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
      onDismiss={runAfterDismiss}
    >
      {job ? (
        <KeyboardAvoidingView
          style={styles.sheet}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <JobHeader
            job={job}
            onClose={close}
            onPress={() => closeThen(() => onEditCustomer(job))}
          />

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <StatusPill
              status={job.status}
              onChange={(status) => onChangeStatus(job.id, status)}
            />

            <View style={styles.buttonRow}>
              <NoteButton
                label="Kundkommentar"
                icon="chatbubble"
                filled={job.customerComment.trim() !== ''}
                onPress={() =>
                  setNotes([
                    { title: 'Kundkommentar', text: job.customerComment, field: 'customerComment' },
                  ])
                }
              />
              <NoteButton
                label="Verkstadskommentar"
                icon="construct"
                filled={job.mechanicComment.trim() !== ''}
                onPress={() =>
                  setNotes([
                    { title: 'Verkstadskommentar', text: job.mechanicComment, field: 'mechanicComment' },
                  ])
                }
              />
              <NoteButton
                label="Transkribering"
                icon="document-text"
                filled={transcripts.length > 0}
                disabled={transcripts.length === 0}
                onPress={() => setNotes(transcripts)}
              />
            </View>

            {job.imagePath ? (
              <Pressable onPress={() => setZoomUri(jobImageUrl(job.imagePath))}>
                <Image
                  source={jobImageUrl(job.imagePath)}
                  style={styles.photo}
                  contentFit="cover"
                  transition={200}
                />
              </Pressable>
            ) : null}

            {job.bike ? (
              <View style={styles.bikeDetailsCard}>
                <BikeDetails
                  state={{ status: 'ready', bike: job.bike }}
                  onRetry={() => {}}
                  onEdit={() => {
                    closeThen(() => onEditBikeDetails(job));
                  }}
                />
              </View>
            ) : null}

            <View style={styles.buttonRow}>
              {nextAction ? (
                <Pressable
                  onPress={nextAction.run}
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                >
                  <Ionicons
                    name={nextAction.icon as never}
                    size={18}
                    color={colors.onAccent}
                  />
                  <Text style={styles.actionButtonText} numberOfLines={1}>
                    {nextAction.label}
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => {
                  close();
                  onSelectBike(job);
                }}
                style={({ pressed }) => [
                  styles.selectButton,
                  pressed && styles.selectButtonPressed,
                ]}
              >
                <Ionicons name="bicycle" size={18} color={colors.text} />
                <Text style={styles.selectButtonText} numberOfLines={1}>
                  Välj den här cykeln
                </Text>
              </Pressable>
            </View>

            <View style={styles.taskList}>
              {job.tasks.map((task) => (
                <View key={task.id} style={styles.taskCard}>
                  <View style={styles.taskRow}>
                    <View style={styles.taskText}>
                      <Text style={styles.taskCategory}>
                        {task.category.toUpperCase()}
                      </Text>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                    </View>
                    {editing?.taskId === task.id && editing.productId === null ? (
                      priceInput
                    ) : (
                      <Pressable
                        onPress={() =>
                          startEdit({ taskId: task.id, productId: null }, task.price)
                        }
                        hitSlop={6}
                      >
                        <Text style={styles.taskPrice}>{task.price} kr</Text>
                      </Pressable>
                    )}
                  </View>
                  {task.products.map((product) => (
                    <View key={product.id} style={styles.productRow}>
                      <Ionicons
                        name="cube-outline"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.productName}>{product.name}</Text>
                      {editing?.taskId === task.id &&
                      editing.productId === product.id ? (
                        priceInput
                      ) : (
                        <Pressable
                          onPress={() =>
                            startEdit(
                              { taskId: task.id, productId: product.id },
                              product.price
                            )
                          }
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
                    </View>
                  ))}
                </View>
              ))}
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Totalt</Text>
              <Text style={styles.totalValue}>
                {tasksTotal(job.tasks).toLocaleString('sv-SE')} kr
              </Text>
            </View>

            <InspectionSummary
              job={job}
              onContinue={() => {
                closeThen(() => onStartInspection(job));
              }}
            />

            <Pressable
              onPress={confirmDelete}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.selectButtonPressed,
              ]}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={styles.deleteButtonText}>Ta bort jobb</Text>
            </Pressable>
          </ScrollView>
          <ZoomableImageModal uri={zoomUri} onClose={() => setZoomUri(null)} />
          <JobNotesModal
            entries={notes}
            listTitle="Transkribering"
            onSave={(field, text) => onUpdateComment(job.id, field, text)}
            onClose={() => setNotes(null)}
          />
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.sheet} />
      )}
    </Modal>
  );
}

type NoteButtonProps = {
  label: string;
  icon: string;
  /** Has content: shows the filled icon. */
  filled: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function NoteButton({ label, icon, filled, disabled, onPress }: NoteButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.noteButton,
        pressed && styles.selectButtonPressed,
        disabled && styles.noteButtonDisabled,
      ]}
    >
      <Ionicons
        name={(filled ? icon : `${icon}-outline`) as never}
        size={18}
        color={filled ? colors.accent : colors.textSecondary}
      />
      <Text style={styles.noteButtonText} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  noteButton: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  noteButtonDisabled: {
    opacity: 0.4,
  },
  noteButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 12,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  bikeDetailsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  content: {
    paddingTop: 16,
    paddingHorizontal: gutter,
    paddingBottom: 40,
    gap: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  actionButtonPressed: {
    backgroundColor: colors.accentDark,
  },
  selectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  selectButtonPressed: {
    backgroundColor: colors.cardRaised,
  },
  selectButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  deleteButton: {
    marginTop: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 12,
  },
  deleteButtonText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 15,
  },
  actionButtonText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 15,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.cardRaised,
  },
  taskList: {
    gap: 10,
  },
  taskCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taskText: {
    flex: 1,
    gap: 3,
  },
  taskCategory: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
  },
  taskTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  taskPrice: {
    color: colors.text,
    fontWeight: '700',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 6,
  },
  productName: {
    flex: 1,
    color: colors.textSecondary,
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
  priceInput: {
    backgroundColor: colors.cardRaised,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 4,
    width: 76,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  totalValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
});
