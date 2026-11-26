import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { setTaskSide, taskFromPriceItem } from '../lib/prices';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WORKSHOP_NAME } from '../lib/customerLink';
import { customerIdByPhone, sendMessage } from '../lib/messages';
import { useOrderContext } from '../lib/orderContext';
import { approveJobListVerbally, fetchJobList, fetchJobStatus, sendJobList } from '../lib/supabase';
import { STRINGS } from '../lib/strings';
import { useScrollToTop } from '../lib/scrollToTop';
import { colors } from '../lib/theme';
import {
  PriceItem,
  NewProduct,
  Task,
  approvedTotal,
  jobTotal,
  splitJobList,
  taskTotal,
  tasksTotal,
  uid,
  Side,
} from '../lib/types';
import { AddTaskModal } from './AddTaskModal';
import { CustomerPreviewModal } from './CustomerPreviewModal';
import { CategoryCard } from './CategoryCard';
import { DoneButton, LockedBanner, StepLock, useSetStepDone, useStepLocked } from './StepDone';
import { StepEmployeePicker, useEnsureStepEmployee } from './StepEmployee';
import { ChecklistRow, TaskDetailModal } from './TaskChecklist';
import { TaskCard } from './TaskCard';
import { TaskCardGrid } from './TaskCardGrid';
import { styles } from './JobListScreen.styles';
import { webScroll, webScrollContent } from '../lib/webEdge';
import { FitPressable } from './FitPressable';

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

/** Mottagning tasks: the customer's stored answer wins where it differs. */
function mergeReceptionApprovals(local: Task[], stored: Task[]): Task[] {
  const answers = new Map(stored.filter((t) => t.approval).map((t) => [t.id, t.approval]));
  let changed = false;
  const merged = local.map((task) => {
    const approval = answers.get(task.id);
    if (!approval || task.approval === approval) return task;
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
    bikeAnalysis,
  } = useOrderContext();
  const bike = bikeAnalysis.status === 'ready' ? bikeAnalysis.bike.bike : null;
  const jobId = order.bookingId;
  const [editing, setEditing] = useState(false);
  const editingRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop('jobList', () => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  editingRef.current = editing;
  // The list when "Ändra" was pressed; restored by "Avbryt".
  const backup = useRef<Task[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [previewToken, setPreviewToken] = useState<string | null>(null);

  useEffect(() => {
    setEditing(false);
    setError('');
  }, [jobId]);

  // Load the send state, and pick up customer answers, when the tab opens.
  useEffect(() => {
    if (!active || !jobId) return;
    let cancelled = false;
    fetchJobList(jobId)
      .then(({ tasks: storedTasks, inspectionTasks: stored, send }) => {
        if (cancelled) return;
        setJobListSend(send);
        setTasks((current) => mergeReceptionApprovals(current, storedTasks));
        if (!editingRef.current) setInspectionTasks((current) => mergeApprovals(current, stored));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [active, jobId, setJobListSend, setInspectionTasks, setTasks]);

  const sent = !!jobListSend?.sentAt;
  const stepLocked = useStepLocked('jobList');
  // Klar also ends an edit in progress.
  const locked = (sent && !editing) || stepLocked;
  // Mottagning Klar without remarks: the Mottagning tasks are the whole list.
  const receptionDone = useStepLocked('note');
  const receptionOnly = inspectionTasks.length === 0 && receptionDone;
  // Once sent, or with only Mottagning, the list is the work checklist.
  const checklist = (sent && locked) || receptionOnly;
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
    (taskId: string, product: NewProduct) =>
      changeTask(taskId, (task) => ({
        ...task,
        products: [...task.products, { ...product, id: uid() }],
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

  const setSide = useCallback(
    (taskId: string, side: Side) => changeTask(taskId, (task) => setTaskSide(task, side)),
    [changeTask]
  );

  // Mottagning tasks are edited here too; they were agreed at Mottagning, so
  // a change keeps their approval.
  const changeReceptionTask = useCallback(
    (taskId: string, change: (task: Task) => Task) =>
      setTasks((current) => current.map((task) => (task.id === taskId ? change(task) : task))),
    [setTasks]
  );

  const receptionHandlers = {
    onSetSide: (taskId: string, side: Side) =>
      changeReceptionTask(taskId, (task) => setTaskSide(task, side)),
    onRemove: (taskId: string) => setTasks((current) => current.filter((t) => t.id !== taskId)),
    onAddProduct: (taskId: string, product: NewProduct) =>
      changeReceptionTask(taskId, (task) => ({
        ...task,
        products: [...task.products, { ...product, id: uid() }],
      })),
    onUpdateProduct: (taskId: string, productId: string, price: number) =>
      changeReceptionTask(taskId, (task) => ({
        ...task,
        products: task.products.map((p) => (p.id === productId ? { ...p, price } : p)),
      })),
    onRemoveProduct: (taskId: string, productId: string) =>
      changeReceptionTask(taskId, (task) => ({
        ...task,
        products: task.products.filter((p) => p.id !== productId),
      })),
  };

  const setApproval = useCallback(
    (taskId: string, approval: 'godkänd' | 'nekad' | undefined) =>
      setInspectionTasks((current) =>
        current.map((task) => (task.id === taskId ? { ...task, approval } : task))
      ),
    [setInspectionTasks]
  );

  const pickTask = useCallback(
    (item: PriceItem) => {
      setInspectionTasks((current) => [...current, taskFromPriceItem(item)]);
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
    if (jobListSend) setPreviewToken(jobListSend.shareToken);
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
        onSetSide={setSide}
        bike={bike}
      />
    );

  const renderReceptionTask = (task: Task) =>
    checklist ? (
      renderChecklistTask(task)
    ) : locked ? (
      <TaskRow key={task.id} task={task} />
    ) : (
      <TaskCard key={task.id} task={task} bike={bike} {...receptionHandlers} />
    );

  // Cards go side by side on big screens.
  const cardGrid = (items: ReactNode[]) => <TaskCardGrid gap={10}>{items}</TaskCardGrid>;

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

      <ScrollView style={webScroll}
        ref={scrollRef}
        contentContainerStyle={[webScrollContent, styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <StepLock tab="jobList" gap={16}>
        <StepEmployeePicker tab="jobList" />
        {inspectionTasks.length === 0 && !receptionOnly ? (
          <Text style={styles.empty}>
            Markera Mottagning som Klar, eller skapa jobblistan från anmärkningarna under Besiktning.
          </Text>
        ) : null}

        {tasks.length > 0 ? (
          // Open: this is what the mechanic works from (closed only for the customer).
          <Section title="Redan godkända vid mottagning" sum={tasksTotal(tasks)} initiallyOpen>
            {cardGrid(tasks.map(renderReceptionTask))}
          </Section>
        ) : null}

        {split.kind === 'single' ? (
          split.tasks.length > 0 ? (
            <Section
              title="Nya besiktningsanmärkningar vid besiktning"
              sum={approvedTotal(split.tasks)}
              initiallyOpen
            >
              {cardGrid(split.tasks.map(renderTask))}
            </Section>
          ) : null
        ) : (
          <>
            <Section title="Tidigare godkänt" sum={approvedTotal(split.previous)}>
              {cardGrid(split.previous.map(renderTask))}
            </Section>
            <Section title="Tilläggsorder" sum={approvedTotal(split.addOn)} initiallyOpen>
              {cardGrid(split.addOn.map(renderTask))}
            </Section>
          </>
        )}

        {!locked ? (
          <Pressable onPress={() => setShowAddTask(true)} style={styles.addTask}>
            <Ionicons name="add-circle-outline" size={20} color={colors.accentLight} />
            <Text style={styles.addTaskText}>{STRINGS.addActionManually}</Text>
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
            {changed ? (
              <>
                <PrimaryButton label="Skicka igen" icon="send" disabled={busy} fit onPress={send} />
                <SecondaryButton
                  label="Muntligt godkänt av kund"
                  icon="call-outline"
                  disabled={busy}
                  fit
                  onPress={approveVerbally}
                />
              </>
            ) : null}
            <View style={styles.actionRow}>
              {!sent ? (
                <View style={styles.actionRowItem}>
                  <PrimaryButton
                    label={jobId ? 'Skicka till kund' : 'Sparar…'}
                    icon="send"
                    disabled={busy || !jobId}
                    onPress={send}
                  />
                </View>
              ) : null}
              <View style={styles.actionRowItem}>
                <SecondaryButton
                  label="Förhandsgranska"
                  icon="eye-outline"
                  disabled={!jobListSend}
                  onPress={preview}
                />
              </View>
            </View>
            {editing ? (
              <Pressable onPress={cancelEdit} disabled={busy} style={styles.cancel} hitSlop={8}>
                <Text style={styles.cancelText}>Avbryt</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        </StepLock>

        {stepLocked ? <DoneButton tab="jobList" /> : <ReadyRow />}
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
      <CustomerPreviewModal token={previewToken} onClose={() => setPreviewToken(null)} />
    </View>
  );
}

/**
 * Klar on the Jobblista: the bike is ready. "Skicka klarmeddelande" (on by
 * default) also messages the customer.
 */
function ReadyRow() {
  const { order } = useOrderContext();
  const setStepDone = useSetStepDone('jobList');
  const ensureStepEmployee = useEnsureStepEmployee('jobList');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const jobId = order.bookingId;

  useEffect(() => {
    setNotify(true);
    setError('');
  }, [jobId]);

  const markReady = async () => {
    setBusy(true);
    setError('');
    try {
      // Klar needs to know who did the work; Avbryt in the picker stops here.
      if (!(await ensureStepEmployee())) return;
      await setStepDone(true);
      if (!notify) return;
      const customerId = order.customer ? await customerIdByPhone(order.customer.phone) : null;
      if (!customerId) {
        setError('Cykeln är klar, men kunden saknar telefonnummer – inget meddelande skickades.');
        return;
      }
      const name = order.customer?.firstName.trim();
      await sendMessage(
        customerId,
        `Hej${name ? ` ${name}` : ''}! Din cykel är klar och kan hämtas hos ${WORKSHOP_NAME}. Välkommen!`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.readyWrap}>
      <View style={styles.readyRow}>
        <Pressable
          onPress={() => setNotify((n) => !n)}
          style={styles.notifyToggle}
          hitSlop={8}
        >
          <Ionicons
            name={notify ? 'checkbox' : 'square-outline'}
            size={22}
            color={notify ? colors.accentLight : colors.textFaint}
          />
          <Text style={styles.notifyText}>Skicka klarmeddelande</Text>
        </Pressable>
        <Pressable
          onPress={markReady}
          disabled={!jobId || busy}
          style={({ pressed }) => [
            styles.readyButton,
            (!jobId || busy) && styles.buttonDisabled,
            pressed && styles.readyButtonPressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color={colors.onAccent} />
              <Text style={styles.readyButtonText}>Klar</Text>
            </>
          )}
        </Pressable>
      </View>
      {error ? <Text style={styles.readyError}>{error}</Text> : null}
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
    <CategoryCard category={task.category} style={rejected && styles.rowRejected}>
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
    </CategoryCard>
  );
}

function PrimaryButton({
  label,
  icon,
  disabled,
  fit,
  onPress,
}: {
  label: string;
  icon: string;
  disabled?: boolean;
  /** Standalone (not in a row): fitted and centered on wider screens. */
  fit?: boolean;
  onPress: () => void;
}) {
  const Button = fit ? FitPressable : Pressable;
  return (
    <Button
      onPress={onPress}
      disabled={disabled}
      style={[styles.primary, disabled && styles.buttonDisabled]}
    >
      <Ionicons name={icon as never} size={18} color={colors.onAccent} />
      <Text style={styles.primaryText}>{label}</Text>
    </Button>
  );
}

function SecondaryButton({
  label,
  icon,
  disabled,
  fit,
  onPress,
}: {
  label: string;
  icon: string;
  disabled?: boolean;
  /** Standalone (not in a row): fitted and centered on wider screens. */
  fit?: boolean;
  onPress: () => void;
}) {
  const Button = fit ? FitPressable : Pressable;
  return (
    <Button
      onPress={onPress}
      disabled={disabled}
      style={[styles.secondary, disabled && styles.buttonDisabled]}
    >
      <Ionicons name={icon as never} size={18} color={colors.text} />
      <Text style={styles.secondaryText}>{label}</Text>
    </Button>
  );
}
