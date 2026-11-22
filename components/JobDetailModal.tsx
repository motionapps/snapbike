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

type Props = {
  job: Job | null;
  onClose: () => void;
  onChangeStatus: (id: string, status: JobStatus) => void;
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

export function JobDetailModal({
  job,
  onClose,
  onChangeStatus,
  onUpdateComment,
  onStartCheckIn,
  onEditBikeDetails,
  onEditCustomer,
  onStartInspection,
  onSelectBike,
  onDelete,
}: Props) {
  const [zoomUri, setZoomUri] = useState<string | null>(null);
  // Snapshot of what the notes modal shows; null when it is closed.
  const [notes, setNotes] = useState<NoteEntry[] | null>(null);

  // Rough overview of everything to do; denied Jobblista tasks are left out.
  const overviewTasks = job
    ? [...job.tasks, ...job.inspectionTasks.filter((task) => task.approval !== 'nekad')]
    : [];

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
      case 'received':
        return {
          label: 'Starta besiktningen',
          icon: 'clipboard',
          run: () => {
            closeThen(() => onStartInspection(job));
          },
        };
      case 'inspected':
      case 'awaiting_customer':
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

            <View style={styles.overview}>
              {overviewTasks.length === 0 ? (
                <Text style={styles.overviewEmpty}>Inga jobb än</Text>
              ) : (
                overviewTasks.map((task) => {
                  const products = task.products.reduce((sum, p) => sum + productTotal(p), 0);
                  return (
                    <View key={task.id} style={styles.overviewRow}>
                      <Text style={styles.overviewTitle}>{task.title}</Text>
                      <Text style={styles.overviewLine}>Arbete {kr(task.price)}</Text>
                      {task.products.length > 0 ? (
                        <Text style={styles.overviewLine}>Produkter {kr(products)}</Text>
                      ) : null}
                    </View>
                  );
                })
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Totalt</Text>
                <Text style={styles.totalValue}>
                  {kr(jobTotal(job.tasks, job.inspectionTasks))}
                </Text>
              </View>
            </View>

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
        color={filled ? colors.accentLight : colors.textSecondary}
      />
      <Text style={styles.noteButtonText} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </Pressable>
  );
}
