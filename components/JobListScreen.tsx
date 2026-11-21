import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { customerLink } from '../lib/customerLink';
import { useOrderContext } from '../lib/orderContext';
import { approveJobListVerbally, fetchJobList, fetchJobStatus, sendJobList } from '../lib/supabase';
import { colors, gutter, radius } from '../lib/theme';
import {
  PriceItem,
  Task,
  approvedTotal,
  jobTotal,
  splitJobList,
  taskTotal,
  tasksTotal,
  uid,
} from '../lib/types';
import { AddTaskModal } from './AddTaskModal';
import { DoneButton, LockedBanner, StepLock, useStepLocked } from './StepDone';
import { ChecklistRow, TaskDetailModal } from './TaskChecklist';
import { TaskCard } from './TaskCard';

const kr = (n: number) => `${n.toLocaleString('sv-SE')} kr`;

const timeFormat = new Intl.DateTimeFormat('sv-SE', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** Takes customer answers from the stored list for tasks still unanswered locally. */
function mergeApprovals(local: Task[], stored: Task[]): Task[] {
  const answers = new Map(stored.filter((t) => t.approval).map((t) => [t.id, t.approval]));
  let changed = false;
  const merged = local.map((task) => {
    const approval = answers.get(task.id);
    if (task.approval || !approval) return task;
    changed = true;
    return { ...task, approval };
  });
  return changed ? merged : local;
}

/**
 * Jobblista: the tasks from the Besiktning remarks, i.e. what the customer is
 * asked to approve. Editable until sent; after that locked until "Ändra".
 */
export function JobListScreen({ active }: { active: boolean }) {
  const insets = useSafeAreaInsets();
  const {
    tasks,
    setTasks,
    inspectionTasks,
    setInspectionTasks,
    jobListSend,
    setJobListSend,
    order,
    prices,
    setCurrentStatus,
  } = useOrderContext();
  const jobId = order.bookingId;
  const [editing, setEditing] = useState(false);
  const editingRef = useRef(false);
  editingRef.current = editing;
  // The list when "Ändra" was pressed; restored by "Avbryt".
  const backup = useRef<Task[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);

  useEffect(() => {
    setEditing(false);
    setError('');
  }, [jobId]);

  // Load the send state, and pick up customer answers, when the tab opens.
  useEffect(() => {
    if (!active || !jobId) return;
    let cancelled = false;
    fetchJobList(jobId)
      .then(({ inspectionTasks: stored, send }) => {
        if (cancelled) return;
        setJobListSend(send);
        if (!editingRef.current) setInspectionTasks((current) => mergeApprovals(current, stored));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [active, jobId, setJobListSend, setInspectionTasks]);

  const sent = !!jobListSend?.sentAt;
  const stepLocked = useStepLocked('jobList');
  // Klar also ends an edit in progress.
  const locked = (sent && !editing) || stepLocked;
  // Once sent, the list is the work checklist: swipe to tick tasks off.
  const checklist = sent && locked;
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const openTask =
    [...tasks, ...inspectionTasks].find((task) => task.id === openTaskId) ?? null;

  // Checklist changes (done, note) don't touch the customer's approval.
  const patchTask = useCallback(
    (taskId: string, patch: Pick<Task, 'done' | 'note'>) => {
      const apply = (list: Task[]) =>
        list.map((task) => (task.id === taskId ? { ...task, ...patch } : task));
      setInspectionTasks(apply);
      setTasks(apply);
    },
    [setInspectionTasks, setTasks]
  );

  /** Checklist row, or a plain row for a task the customer said no to. */
  const renderChecklistTask = (task: Task) =>
    task.approval === 'nekad' ? (
      <TaskRow key={task.id} task={task} />
    ) : (
      <ChecklistRow
        key={task.id}
        task={task}
        onSetDone={(done) => patchTask(task.id, { done })}
        onOpen={() => setOpenTaskId(task.id)}
      />
    );
  const changed = editing && JSON.stringify(inspectionTasks) !== JSON.stringify(backup.current);

  // A changed task needs a new answer from the customer.
  const changeTask = useCallback(
    (taskId: string, change: (task: Task) => Task) => {
      setInspectionTasks((current) =>
        current.map((task) =>
          task.id === taskId ? { ...change(task), approval: undefined } : task
        )
      );
    },
    [setInspectionTasks]
  );

  const removeTask = useCallback(
    (taskId: string) => setInspectionTasks((current) => current.filter((t) => t.id !== taskId)),
    [setInspectionTasks]
  );

  const addProduct = useCallback(
    (taskId: string, name: string, price: number) =>
      changeTask(taskId, (task) => ({
        ...task,
        products: [...task.products, { id: uid(), name, price }],
      })),
    [changeTask]
  );

  const updateProduct = useCallback(
    (taskId: string, productId: string, price: number) =>
      changeTask(taskId, (task) => ({
        ...task,
        products: task.products.map((p) => (p.id === productId ? { ...p, price } : p)),
      })),
    [changeTask]
  );

  const removeProduct = useCallback(
    (taskId: string, productId: string) =>
      changeTask(taskId, (task) => ({
        ...task,
        products: task.products.filter((p) => p.id !== productId),
      })),
    [changeTask]
  );

  const setApproval = useCallback(
    (taskId: string, approval: 'godkänd' | 'nekad' | undefined) =>
      setInspectionTasks((current) =>
        current.map((task) => (task.id === taskId ? { ...task, approval } : task))
      ),
    [setInspectionTasks]
  );

  const pickTask = useCallback(
    (item: PriceItem) => {
      setInspectionTasks((current) => [
        ...current,
        { id: uid(), title: item.title, category: item.category, price: item.price, products: [] },
      ]);
      setShowAddTask(false);
    },
    [setInspectionTasks]
  );

  const startEdit = () => {
    backup.current = inspectionTasks;
    setEditing(true);
  };

  const cancelEdit = () => {
    setInspectionTasks(backup.current);
    setEditing(false);
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const send = () =>
    run(async () => {
      if (!jobId) return;
      const sentAt = await sendJobList(jobId, inspectionTasks);
      setJobListSend((current) =>
        current
          ? { ...current, sentTasks: inspectionTasks, sentAt, verbalApprovalAt: null }
          : current
      );
      // Sending may move the job to Besiktigad.
      const status = await fetchJobStatus(jobId);
      if (status) setCurrentStatus(status);
    });

  const approveVerbally = () =>
    run(async () => {
      if (!jobId) return;
      const approved = inspectionTasks.map((task) =>
        task.approval ? task : { ...task, approval: 'godkänd' as const }
      );
      const verbalApprovalAt = await approveJobListVerbally(jobId, approved);
      setInspectionTasks(approved);
      setJobListSend((current) =>
        current ? { ...current, sentTasks: approved, verbalApprovalAt } : current
      );
      // The approval moves the job to Godkänd av kund.
      const status = await fetchJobStatus(jobId);
      if (status) setCurrentStatus(status);
    });

  const preview = () => {
    if (!jobListSend) return;
    const url = `${customerLink(jobListSend.shareToken)}?preview=1`;
    if (Platform.OS === 'web') window.open(url, '_blank');
    else
      Linking.openURL(url).catch(() =>
        setError(`Kunde inte öppna kundsidan (${url}). Är EXPO_PUBLIC_CUSTOMER_URL satt?`)
      );
  };

  const split = splitJobList(inspectionTasks);
  const renderTask = (task: Task) =>
    checklist ? (
      renderChecklistTask(task)
    ) : locked ? (
      <TaskRow key={task.id} task={task} />
    ) : (
      <TaskCard
        key={task.id}
        task={task}
        onRemove={removeTask}
        onAddProduct={addProduct}
        onRemoveProduct={removeProduct}
        onUpdateProduct={updateProduct}
        onSetApproval={sent ? setApproval : undefined}
      />
    );

  const statusText = jobListSend?.verbalApprovalAt
    ? `Muntligt godkänt ${timeFormat.format(new Date(jobListSend.verbalApprovalAt))}`
    : jobListSend?.sentAt
      ? `Skickad ${timeFormat.format(new Date(jobListSend.sentAt))}`
      : 'Inte skickad till kund';

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.titleRow,
          { paddingTop: Platform.OS === 'android' ? insets.top + 16 : insets.top + 8 },
        ]}
      >
        <Text style={styles.title}>Jobblista</Text>
        <Text style={styles.subtitle}>{statusText}</Text>
        {locked && !stepLocked ? (
          <Pressable onPress={startEdit} style={styles.editButton} hitSlop={8}>
            <Ionicons name="create-outline" size={15} color={colors.text} />
            <Text style={styles.editButtonText}>Ändra</Text>
          </Pressable>
        ) : null}
      </View>
      <LockedBanner tab="jobList" style={styles.lockedBanner} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {inspectionTasks.length === 0 ? (
          <Text style={styles.empty}>
            Skapa jobblistan från anmärkningarna under Besiktning.
          </Text>
        ) : null}

        {tasks.length > 0 ? (
          <Section title="Redan godkända vid mottagning" sum={tasksTotal(tasks)}>
            {tasks.map((task) =>
              checklist ? renderChecklistTask(task) : <TaskRow key={task.id} task={task} />
            )}
          </Section>
        ) : null}

        {split.kind === 'single' ? (
          split.tasks.length > 0 ? (
            <Section
              title="Nya besiktningsanmärkningar vid besiktning"
              sum={approvedTotal(split.tasks)}
              initiallyOpen
            >
              {split.tasks.map(renderTask)}
            </Section>
          ) : null
        ) : (
          <>
            <Section title="Tidigare godkänt" sum={approvedTotal(split.previous)}>
              {split.previous.map(renderTask)}
            </Section>
            <Section title="Tilläggsorder" sum={approvedTotal(split.addOn)} initiallyOpen>
              {split.addOn.map(renderTask)}
            </Section>
          </>
        )}

        <StepLock tab="jobList" gap={16}>
        {!locked && inspectionTasks.length > 0 ? (
          <Pressable onPress={() => setShowAddTask(true)} style={styles.addTask}>
            <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
            <Text style={styles.addTaskText}>Lägg till jobb</Text>
          </Pressable>
        ) : null}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Totalt</Text>
          <Text style={styles.totalValue}>{kr(jobTotal(tasks, inspectionTasks))}</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {inspectionTasks.length > 0 ? (
          <View style={styles.actions}>
            {busy ? <ActivityIndicator color={colors.textSecondary} /> : null}
            {!sent ? (
              <PrimaryButton
                label={jobId ? 'Skicka till kund' : 'Sparar…'}
                icon="send"
                disabled={busy || !jobId}
                onPress={send}
              />
            ) : null}
            {changed ? (
              <>
                <PrimaryButton label="Skicka igen" icon="send" disabled={busy} onPress={send} />
                <SecondaryButton
                  label="Muntligt godkänt av kund"
                  icon="call-outline"
                  disabled={busy}
                  onPress={approveVerbally}
                />
              </>
            ) : null}
            <SecondaryButton
              label="Förhandsgranska"
              icon="open-outline"
              disabled={!jobListSend}
              onPress={preview}
            />
            {editing ? (
              <Pressable onPress={cancelEdit} disabled={busy} style={styles.cancel} hitSlop={8}>
                <Text style={styles.cancelText}>Avbryt</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        </StepLock>

        <DoneButton tab="jobList" />
      </ScrollView>

      <TaskDetailModal
        task={openTask}
        onClose={() => setOpenTaskId(null)}
        onChange={patchTask}
      />
      <AddTaskModal
        visible={showAddTask}
        prices={prices}
        onClose={() => setShowAddTask(false)}
        onPick={pickTask}
      />
    </View>
  );
}

function Section({
  title,
  sum,
  initiallyOpen = false,
  children,
}: {
  title: string;
  sum: number;
  initiallyOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={styles.section}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.sectionHeader} hitSlop={4}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSum}>{kr(sum)}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

/** Read-only task: Mottagning tasks, and the Jobblista while locked. */
function TaskRow({ task }: { task: Task }) {
  const rejected = task.approval === 'nekad';
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, rejected && styles.struck]}>{task.title}</Text>
        {task.products.map((product) => (
          <Text key={product.id} style={styles.rowProduct}>
            {product.name}
          </Text>
        ))}
      </View>
      {task.approval ? (
        <Text style={[styles.rowBadge, rejected ? styles.badgeRejected : styles.badgeApproved]}>
          {rejected ? 'NEKAD' : 'GODKÄND'}
        </Text>
      ) : null}
      <Text style={[styles.rowPrice, rejected && styles.struck]}>{kr(taskTotal(task))}</Text>
    </View>
  );
}

function PrimaryButton({
  label,
  icon,
  disabled,
  onPress,
}: {
  label: string;
  icon: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.primary, disabled && styles.buttonDisabled]}
    >
      <Ionicons name={icon as never} size={18} color={colors.onAccent} />
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  icon,
  disabled,
  onPress,
}: {
  label: string;
  icon: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.secondary, disabled && styles.buttonDisabled]}
    >
      <Ionicons name={icon as never} size={18} color={colors.text} />
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingHorizontal: gutter,
    paddingBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textFaint,
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  lockedBanner: {
    marginHorizontal: gutter,
    marginBottom: 8,
  },
  content: {
    paddingHorizontal: gutter,
    paddingTop: 8,
    gap: 16,
  },
  empty: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  sectionSum: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sectionBody: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  rowProduct: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  rowBadge: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  badgeApproved: {
    color: colors.accentDark,
  },
  badgeRejected: {
    color: colors.textFaint,
  },
  rowPrice: {
    color: colors.text,
    fontWeight: '600',
  },
  struck: {
    textDecorationLine: 'line-through',
    color: colors.textFaint,
  },
  addTask: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  addTaskText: {
    color: colors.accent,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 4,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  errorText: {
    color: colors.danger,
    flex: 1,
  },
  actions: {
    gap: 10,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 14,
  },
  primaryText: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: '700',
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 13,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
