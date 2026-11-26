import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { jobImageUrl } from '../lib/supabase';
import { colors } from '../lib/theme';
import { Job, JobStatus, jobTotal, productTotal } from '../lib/types';

const kr = (n: number) => `${n.toLocaleString('sv-SE')} kr`;
import { BikeDetails } from './BikeDetails';
import { JobHeader } from './JobHeader';
import { CommentField, JobNotesModal, NoteEntry } from './JobNotesModal';
import { StatusPill } from './StatusPill';
import { ZoomableImageModal } from './ZoomableImageModal';
import { styles } from './JobDetailModal.styles';
import { webPage, webScroll, webScrollContent } from '../lib/webEdge';

type Props = {
  job: Job | null;
  onClose: () => void;
  onChangeStatus: (id: string, status: JobStatus) => void;
  onUpdateComment: (id: string, field: CommentField, text: string) => void;
  onStartCheckIn: (job: Job) => void;
  onEditBikeDetails: (job: Job) => void;
  onEditCustomer: (job: Job) => void;
  onStartInspection: (job: Job) => void;
  onOpenJobList: (job: Job) => void;
  onSelectBike: (job: Job) => void;
  onDelete: (id: string) => void;
};

/** The next step for each status: a label and what it does. */
type NextAction = { label: string; icon: string; run: () => void };

export function JobDetailModal({
  job,
  onClose,
  onChangeStatus,
  onUpdateComment,
  onStartCheckIn,
  onEditBikeDetails,
  onEditCustomer,
  onStartInspection,
  onOpenJobList,
  onSelectBike,
  onDelete,
}: Props) {
  const [zoomUri, setZoomUri] = useState<string | null>(null);
  // Snapshot of what the notes modal shows; null when it is closed.
  const [notes, setNotes] = useState<NoteEntry[] | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Rough overview of everything to do; denied Jobblista tasks are left out.
  const overviewTasks = job
    ? [...job.tasks, ...job.inspectionTasks.filter((task) => task.approval !== 'nekad')]
    : [];
  const laborTotal = overviewTasks.reduce((sum, task) => sum + task.price, 0);
  const productsTotal = overviewTasks.reduce(
    (sum, task) => sum + task.products.reduce((p, prod) => p + productTotal(prod), 0),
    0
  );

  const transcripts: NoteEntry[] = job
    ? [
        { title: 'Mottagningstranskribering', text: job.transcript },
        { title: 'Besiktningstranskribering', text: job.inspectionTranscript },
      ].filter((entry) => entry.text.trim() !== '')
    : [];

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
    setConfirmingDelete(false);
    onClose();
  };

  const deleteJob = () => {
    if (!job) return;
    close();
    onDelete(job.id);
  };

  const nextAction = ((): NextAction | null => {
    if (!job) return null;
    switch (job.status) {
      // The first step not yet marked Klar.
      case 'booked':
      case 'checked_in':
        return {
          label: 'Mottagning',
          icon: 'enter',
          run: () => {
            closeThen(() => onStartCheckIn(job));
          },
        };
      case 'received':
        return {
          label: 'Besiktning',
          icon: 'clipboard',
          run: () => {
            closeThen(() => onStartInspection(job));
          },
        };
      case 'inspected':
      case 'awaiting_customer':
      case 'customer_approved':
      case 'in_progress':
        return {
          label: 'Jobblista',
          icon: 'list',
          run: () => {
            closeThen(() => onOpenJobList(job));
          },
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
          style={[styles.sheet, webPage]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <JobHeader
            job={job}
            onClose={close}
            onPress={() => closeThen(() => onEditCustomer(job))}
          />

          <ScrollView style={webScroll}
            contentContainerStyle={[styles.content, webScrollContent]}
            keyboardShouldPersistTaps="handled"
          >
            <StatusPill
              status={job.status}
              onChange={(status) => onChangeStatus(job.id, status)}
            />

            <View style={styles.buttonRow}>
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
              <NoteButton
                label="Kundkommentar"
                icon="chatbubble"
                filled={job.customerComment.trim() !== ''}
                onPress={() =>
                  setNotes([
                    // Written by the customer when booking: read-only.
                    { title: 'Kundkommentar', text: job.customerComment },
                  ])
                }
              />
            </View>

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

            <View style={styles.overview}>
              {overviewTasks.length === 0 ? (
                <Text style={styles.overviewEmpty}>Inga jobb än</Text>
              ) : (
                overviewTasks.map((task) => (
                  <View key={task.id} style={styles.overviewRow}>
                    <Text style={styles.overviewTitle}>{task.title}</Text>
                    <View style={styles.overviewLineRow}>
                      <Text style={styles.overviewLine}>Arbete</Text>
                      <Text style={styles.overviewLine}>{kr(task.price)}</Text>
                    </View>
                    {task.products.map((product) => (
                      <View key={product.id} style={styles.overviewLineRow}>
                        <Text style={[styles.overviewLine, styles.overviewProductName]}>
                          {(product.quantity ?? 1) > 1
                            ? `${product.quantity} × ${product.name} (${kr(product.price)}/st)`
                            : product.name}
                        </Text>
                        <Text style={styles.overviewLine}>{kr(productTotal(product))}</Text>
                      </View>
                    ))}
                    {task.note?.trim() ? (
                      <Text style={styles.overviewNote}>{task.note.trim()}</Text>
                    ) : null}
                  </View>
                ))
              )}
              {[
                { label: 'Verkstadskommentar', text: job.mechanicComment },
                { label: 'Kundkommentar', text: job.customerComment },
              ]
                .filter((comment) => comment.text.trim() !== '')
                .map((comment) => (
                  <View key={comment.label} style={styles.overviewRow}>
                    <Text style={styles.overviewTitle}>{comment.label}</Text>
                    <Text style={styles.overviewNote}>{comment.text.trim()}</Text>
                  </View>
                ))}
              <View style={styles.overviewLineRow}>
                <Text style={styles.overviewLine}>Arbete</Text>
                <Text style={styles.overviewLine}>{kr(laborTotal)}</Text>
              </View>
              <View style={styles.overviewLineRow}>
                <Text style={styles.overviewLine}>Produkter</Text>
                <Text style={styles.overviewLine}>{kr(productsTotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Totalt</Text>
                <Text style={styles.totalValue}>
                  {kr(jobTotal(job.tasks, job.inspectionTasks))}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setConfirmingDelete(true)}
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
          <Modal
            visible={confirmingDelete}
            transparent
            animationType="fade"
            onRequestClose={() => setConfirmingDelete(false)}
          >
            <Pressable style={styles.confirmBackdrop} onPress={() => setConfirmingDelete(false)}>
              <Pressable style={styles.confirmCard} onPress={() => {}}>
                <Text style={styles.confirmTitle}>Ta bort jobbet?</Text>
                <Text style={styles.confirmMessage}>Jobbet tas bort permanent.</Text>
                <View style={styles.confirmButtons}>
                  <Pressable
                    onPress={() => setConfirmingDelete(false)}
                    style={styles.confirmCancel}
                    hitSlop={8}
                  >
                    <Text style={styles.confirmCancelText}>Avbryt</Text>
                  </Pressable>
                  <Pressable
                    onPress={deleteJob}
                    style={({ pressed }) => [styles.confirmDelete, pressed && styles.confirmDeletePressed]}
                  >
                    <Text style={styles.confirmDeleteText}>Ta bort</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        </KeyboardAvoidingView>
      ) : (
        <View style={[styles.sheet, webPage]} />
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
        color={filled ? colors.accentLight : colors.textSecondary}
      />
      <Text style={styles.noteButtonText} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </Pressable>
  );
}
