import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SILHOUETTE_ASPECT,
  SILHOUETTE_IMAGES,
  markerPosition,
  silhouetteVariant,
} from '../lib/bikeSilhouette';
import {
  CustomerJob,
  WORKSHOP_NAME,
  WORKSHOP_PHONE,
  canRespond,
  changeDeadline,
  fetchCustomerJob,
  sendCustomerResponse,
} from '../lib/customerLink';
import { INSPECTION_TEMPLATE } from '../lib/inspection';
import { jobImageUrl } from '../lib/supabase';
import { inspectionImageUrl, taskImageUrl } from '../lib/taskImages';
import { Task, taskTotal } from '../lib/types';

type Approval = 'godkänd' | 'nekad';

/** Light, calm palette for customers (the staff app is dark). */
const c = {
  bg: '#F5F6F8',
  card: '#FFFFFF',
  border: '#E3E6EA',
  text: '#16202A',
  textSecondary: '#5B6670',
  critical: '#E5484D',
  normal: '#F5A524',
  approve: '#2E9E5B',
  primary: '#16202A',
};

type Marker = {
  itemId: string;
  title: string;
  note: string;
  tasks: Task[];
  critical: boolean;
  position: { left: `${number}%`; top: `${number}%` };
};

const kr = (n: number) => `${n.toLocaleString('sv-SE')} kr`;

const timeFormat = new Intl.DateTimeFormat('sv-SE', {
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

export function CustomerView({ token }: { token: string }) {
  const [job, setJob] = useState<CustomerJob | null>(null);
  const [state, setState] = useState<'loading' | 'missing' | 'ready'>('loading');
  const [decisions, setDecisions] = useState<Record<string, Approval>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await fetchCustomerJob(token);
      if (!data) {
        setState('missing');
        return;
      }
      setJob(data);
      const initial: Record<string, Approval> = {};
      // Everything is approved unless the customer has denied it.
      for (const task of data.tasks) initial[task.id] = task.approval ?? 'godkänd';
      setDecisions(initial);
      setState('ready');
    } catch {
      setState('missing');
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const markers = useMemo<Marker[]>(() => {
    if (!job) return [];
    const variant = silhouetteVariant(job.bike);
    const list: Marker[] = [];
    for (const section of INSPECTION_TEMPLATE) {
      for (const item of section.items) {
        const result = job.inspection?.[item.id];
        if (result?.status !== 'issue') continue;
        const position = markerPosition(item.id, variant);
        if (!position) continue;
        const tasks = job.tasks.filter((t) => t.inspectionItemIds?.includes(item.id));
        list.push({
          itemId: item.id,
          title: item.title,
          note: result.note,
          tasks,
          critical: tasks.some((t) => t.severity === 'kritisk'),
          position,
        });
      }
    }
    return list;
  }, [job]);

  if (state === 'loading') {
    return (
      <View style={[styles.page, styles.center]}>
        <ActivityIndicator color={c.text} />
      </View>
    );
  }

  if (state === 'missing' || !job) {
    return (
      <View style={[styles.page, styles.center]}>
        <Text style={styles.title}>Länken fungerar inte längre</Text>
        <Text style={styles.muted}>Kontakta {WORKSHOP_NAME} om du har frågor.</Text>
        <ContactButton />
      </View>
    );
  }

  const open = canRespond(job);
  const deadline = changeDeadline(job.respondedAt);
  const selectedMarker = markers.find((m) => m.itemId === selected) ?? null;
  const photoUrl = jobImageUrl(job.imagePath);
  const approvedSum = job.tasks
    .filter((t) => decisions[t.id] !== 'nekad')
    .reduce((sum, t) => sum + taskTotal(t), 0);

  const decide = (taskId: string, approval: Approval) => {
    if (!open) return;
    setMessage(null);
    setDecisions((current) => ({ ...current, [taskId]: approval }));
  };

  const send = async () => {
    setSending(true);
    setMessage(null);
    try {
      await sendCustomerResponse(token, decisions);
      await load();
      setMessage('Tack! Vi har fått ditt svar.');
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.workshop}>{WORKSHOP_NAME}</Text>
      <Text style={styles.title}>
        {job.firstName ? `Hej ${job.firstName}!` : 'Hej!'}
      </Text>
      <Text style={styles.muted}>
        Vi har gått igenom din cykel
        {job.bikeNumber ? ` (nr ${job.bikeNumber})` : ''}. Tryck på de
        markerade delarna för att se vad vi hittade.
      </Text>

      {open ? null : (
        <View style={styles.lockedBanner}>
          <Ionicons name="lock-closed" size={18} color={c.text} />
          <Text style={styles.lockedBannerText}>
            {job.status === 'customer_approved'
              ? 'Tiden för att ändra ditt svar har gått ut'
              : 'Arbetet har redan startat'}{' '}
            – kontakta verkstaden för ändringar.
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.bikeBox}>
          {showPhoto && photoUrl ? (
            <Image source={photoUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <>
              <Image
                source={SILHOUETTE_IMAGES[silhouetteVariant(job.bike)]}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
              />
              {markers.map((marker) => (
                <Glow
                  key={marker.itemId}
                  marker={marker}
                  selected={marker.itemId === selected}
                  onPress={() =>
                    setSelected((s) => (s === marker.itemId ? null : marker.itemId))
                  }
                />
              ))}
            </>
          )}
          {photoUrl ? (
            <Pressable
              onPress={() => setShowPhoto((v) => !v)}
              style={styles.eye}
              hitSlop={8}
              accessibilityLabel={showPhoto ? 'Visa markeringar' : 'Visa din cykel'}
            >
              <Ionicons name={showPhoto ? 'eye-off' : 'eye'} size={20} color={c.text} />
            </Pressable>
          ) : null}
        </View>

        {selectedMarker && !showPhoto ? (
          <View style={styles.detail}>
            <View style={styles.detailHead}>
              <Image
                source={inspectionImageUrl(selectedMarker.itemId, selectedMarker.title)}
                style={styles.partImage}
                contentFit="contain"
              />
              <Text style={styles.detailTitle}>{selectedMarker.title}</Text>
            </View>
            {selectedMarker.note ? (
              <Text style={styles.muted}>{selectedMarker.note}</Text>
            ) : null}
            {selectedMarker.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                decision={decisions[task.id]}
                disabled={!open}
                onDecide={decide}
              />
            ))}
          </View>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Det här behöver göras</Text>
      <View style={styles.card}>
        {job.tasks.length === 0 ? (
          <Text style={styles.muted}>Inga åtgärder behövs.</Text>
        ) : (
          job.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              note={(task.inspectionItemIds ?? [])
                .map((id) => job.inspection?.[id]?.note?.trim())
                .filter(Boolean)
                .join(' ')}
              decision={decisions[task.id]}
              disabled={!open}
              onDecide={decide}
            />
          ))
        )}
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Totalt</Text>
        <Text style={styles.totalValue}>{kr(approvedSum)}</Text>
      </View>

      {open ? (
        <>
          <Pressable
            onPress={send}
            disabled={sending}
            style={[styles.send, sending && styles.sendDisabled]}
          >
            <Text style={styles.sendText}>
              {sending ? 'Skickar…' : job.respondedAt ? 'Uppdatera svar' : 'Skicka svar'}
            </Text>
          </Pressable>
          {deadline ? (
            <Text style={[styles.muted, styles.centerText]}>
              Du kan ändra ditt svar fram till {timeFormat.format(deadline)}.
            </Text>
          ) : null}
        </>
      ) : (
        <View style={styles.locked}>
          <Text style={styles.muted}>Kontakta verkstaden för att göra ändringar.</Text>
          <ContactButton />
        </View>
      )}
      {message ? <Text style={[styles.message, styles.centerText]}>{message}</Text> : null}
    </ScrollView>
  );
}

function TaskRow({
  task,
  note,
  decision,
  disabled,
  onDecide,
}: {
  task: Task;
  /** The mechanic's comment from the linked inspection item(s). */
  note?: string;
  decision: Approval | undefined;
  disabled: boolean;
  onDecide: (taskId: string, approval: Approval) => void;
}) {
  return (
    <View style={styles.task}>
      <View style={styles.taskHead}>
        <Image source={taskImageUrl(task.title)} style={styles.partImage} contentFit="contain" />
        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.taskPrice}>{kr(taskTotal(task))}</Text>
      </View>
      {note ? <Text style={styles.muted}>{note}</Text> : null}
      {task.severity === 'kritisk' ? (
        <View style={styles.criticalBadge}>
          <Ionicons name="warning" size={14} color={c.critical} />
          <Text style={styles.criticalText}>Påverkar säkerheten</Text>
        </View>
      ) : null}
      <View style={styles.choiceRow}>
        <Choice
          label="Godkänn"
          active={decision === 'godkänd'}
          color={c.approve}
          disabled={disabled}
          onPress={() => onDecide(task.id, 'godkänd')}
        />
        <Choice
          label="Neka"
          active={decision === 'nekad'}
          color={c.textSecondary}
          disabled={disabled}
          onPress={() => onDecide(task.id, 'nekad')}
        />
      </View>
    </View>
  );
}

function Choice({
  label,
  active,
  color,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  color: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.choice,
        active && { backgroundColor: color, borderColor: color },
        disabled && !active && styles.choiceDisabled,
      ]}
    >
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

/** Pulsing red/orange glow over a part with a remark. */
function Glow({
  marker,
  selected,
  onPress,
}: {
  marker: Marker;
  selected: boolean;
  onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const color = marker.critical ? c.critical : c.normal;
  const size = 56;
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={marker.title}
      style={[
        styles.glowHit,
        { left: marker.position.left, top: marker.position.top, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 },
      ]}
    >
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: color,
            boxShadow: `0 0 18px 10px ${color}`,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.1] }) }],
          },
        ]}
      />
      <View style={[styles.glowDot, { backgroundColor: color }, selected && styles.glowDotSelected]} />
    </Pressable>
  );
}

function ContactButton() {
  if (!WORKSHOP_PHONE) return null;
  return (
    <Pressable onPress={() => Linking.openURL(`tel:${WORKSHOP_PHONE}`)} style={styles.contact}>
      <Ionicons name="call" size={16} color={c.text} />
      <Text style={styles.contactText}>{WORKSHOP_PHONE}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  centerText: { textAlign: 'center' },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    padding: 16,
    paddingBottom: 48,
    gap: 12,
  },
  workshop: { color: c.textSecondary, fontWeight: '700', letterSpacing: 1, fontSize: 12 },
  title: { color: c.text, fontSize: 26, fontWeight: '800' },
  muted: { color: c.textSecondary, fontSize: 15, lineHeight: 21 },
  sectionTitle: { color: c.text, fontSize: 18, fontWeight: '700', marginTop: 8 },
  card: {
    backgroundColor: c.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
    gap: 12,
  },
  bikeBox: { width: '100%', aspectRatio: SILHOUETTE_ASPECT, borderRadius: 12, overflow: 'hidden' },
  eye: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: c.border,
  },
  glowHit: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 36, height: 36, borderRadius: 18 },
  glowDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#FFFFFF' },
  glowDotSelected: { width: 18, height: 18, borderRadius: 9 },
  detail: { gap: 8, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12 },
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  partImage: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: c.border },
  detailTitle: { color: c.text, fontSize: 18, fontWeight: '700' },
  task: { gap: 6, paddingVertical: 6 },
  taskHead: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  taskTitle: { flex: 1, color: c.text, fontSize: 16, fontWeight: '600' },
  taskPrice: { color: c.text, fontSize: 16, fontWeight: '700' },
  criticalBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  criticalText: { color: c.critical, fontWeight: '600' },
  choiceRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  choice: {
    flex: 1,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  choiceDisabled: { opacity: 0.4 },
  choiceText: { color: c.text, fontWeight: '600' },
  choiceTextActive: { color: '#FFFFFF' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  totalLabel: { color: c.textSecondary, fontWeight: '600', fontSize: 16 },
  totalValue: { color: c.text, fontWeight: '800', fontSize: 22 },
  send: { backgroundColor: c.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  locked: { alignItems: 'center', gap: 10 },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF4D6',
    borderColor: '#F5D27A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  lockedBannerText: { flex: 1, color: c.text, fontWeight: '600' },
  message: { color: c.text, fontWeight: '600' },
  contact: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: c.card,
  },
  contactText: { color: c.text, fontWeight: '600' },
});
