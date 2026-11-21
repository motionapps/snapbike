import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  analyzeInspection,
  hasOpenAiKey,
  tasksFromInspection,
  transcribeAudio,
} from '../lib/api';
import { inspectionImageUrl } from '../lib/taskImages';
import { useOrderContext } from '../lib/orderContext';
import {
  INSPECTION_ITEM_COUNT,
  INSPECTION_TEMPLATE,
  InspectionStatus,
  inspectionIssues,
  inspectionSummaryText,
  matchInspectionPhrase,
} from '../lib/inspection';

/** itemId → sektionsnyckel, för att kunna scrolla till rätt sektion live. */
const ITEM_SECTION: Record<string, string> = {};
for (const section of INSPECTION_TEMPLATE) {
  for (const item of section.items) ITEM_SECTION[item.id] = section.key;
}
import { startWebSpeech, stopWebSpeech, webSpeechAvailable } from '../lib/speech';
import { colors, gutter, radius } from '../lib/theme';
import { ImagePreviewModal } from './ImagePreviewModal';
import { MicButton, MicPhase } from './MicButton';
import { WaveText } from './WaveText';

const MIC_LABELS: Partial<Record<MicPhase, string>> = {
  idle: 'Prata in genomgången – tryck för att spela in',
  analyzing: 'Fyller i checklistan…',
};

/**
 * Hela besiktningen som en scrollbar lista (Marken → Bak → Fram) med en
 * sammanfattning i botten som uppdateras löpande – tänkt att visas för
 * kunden på en telefon eller skärm medan cykeln gås igenom.
 */
export function InspectionScreen() {
  const insets = useSafeAreaInsets();
  const {
    setTasks,
    goToOrder,
    prices,
    inspection: results,
    setInspection: setResults,
    inspectionTranscript,
    setInspectionTranscript,
    setHoldSave,
  } = useOrderContext();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [phase, setPhase] = useState<MicPhase>('idle');
  const [micError, setMicError] = useState('');
  const [creatingTasks, setCreatingTasks] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Record<string, number>>({});
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  // Hold ✓ or ⚠ on an item to speak a comment into its note field.
  const [dictation, setDictation] = useState<{
    itemId: string;
    status: InspectionStatus;
    phase: 'recording' | 'transcribing';
  } | null>(null);
  const dictationRef = useRef<{ itemId: string; ready: Promise<boolean> } | null>(
    null
  );

  const useWebSpeech = !hasOpenAiKey && webSpeechAvailable;

  // Hold the Supabase auto-save while a note is being typed or speech is
  // coming in; it saves once the field is left / the recording is done.
  const [noteFocused, setNoteFocused] = useState(false);
  useEffect(() => {
    setHoldSave(noteFocused || phase !== 'idle' || dictation !== null);
  }, [noteFocused, phase, dictation, setHoldSave]);

  const scrollToItem = useCallback((itemId: string) => {
    const y = sectionY.current[ITEM_SECTION[itemId]];
    if (y != null) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    }
  }, []);

  // Live medan man pratar: markera punkten och scrolla dit (webb-taligenkänning).
  const handlePhrase = useCallback(
    (phrase: string) => {
      const hits = matchInspectionPhrase(phrase);
      if (hits.length === 0) return;
      setResults((current) => {
        const next = { ...current };
        for (const hit of hits) {
          next[hit.itemId] = { status: hit.status, note: hit.note };
        }
        return next;
      });
      scrollToItem(hits[0].itemId);
    },
    [scrollToItem]
  );

  /** Starts capturing speech; false if the microphone was not allowed. */
  const beginCapture = useCallback(
    async (onPhrase?: (phrase: string) => void): Promise<boolean> => {
      if (useWebSpeech) {
        startWebSpeech(onPhrase);
        return true;
      }
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Mikrofon', 'Ge appen tillgång till mikrofonen i Inställningar.');
        return false;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      return true;
    },
    [recorder, useWebSpeech]
  );

  /** Stops capturing and returns the transcribed text. */
  const endCapture = useCallback(async (): Promise<string> => {
    if (useWebSpeech) return stopWebSpeech();
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    const uri = recorder.uri;
    if (!uri) throw new Error('Ingen inspelning hittades.');
    return transcribeAudio(uri);
  }, [recorder, useWebSpeech]);

  const startRecording = useCallback(async () => {
    if (dictationRef.current) return;
    setMicError('');
    try {
      if (await beginCapture(handlePhrase)) setPhase('recording');
    } catch (err) {
      setMicError(err instanceof Error ? err.message : String(err));
    }
  }, [beginCapture, handlePhrase]);

  const stopRecording = useCallback(async () => {
    try {
      setPhase('transcribing');
      const text = await endCapture();
      if (!text) throw new Error('Ingen text uppfattades – försök igen.');
      // Save the whole recording with the job (also used to create tasks with parts).
      setInspectionTranscript((current) => `${current} ${text}`.trim());

      setPhase('analyzing');
      const found = await analyzeInspection(text);
      // AI:n är facit och skriver över live-gissningarna för nämnda punkter.
      setResults((current) => ({ ...current, ...found }));
    } catch (err) {
      setMicError(err instanceof Error ? err.message : String(err));
    } finally {
      setPhase('idle');
    }
  }, [endCapture, setInspectionTranscript]);

  /** Long press on ✓/⚠: set that status and start listening for a comment. */
  const startDictation = useCallback(
    (itemId: string, status: InspectionStatus) => {
      if (phase !== 'idle' || dictationRef.current) return;
      setMicError('');
      setResults((current) => ({
        ...current,
        [itemId]: { status, note: current[itemId]?.note ?? '' },
      }));
      // Short tick as recording starts. Fired before the mic opens, because
      // iOS mutes haptics while the audio session is recording.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const ready = beginCapture().catch((err) => {
        setMicError(err instanceof Error ? err.message : String(err));
        return false;
      });
      dictationRef.current = { itemId, ready };
      setDictation({ itemId, status, phase: 'recording' });
    },
    [phase, beginCapture]
  );

  /** Release after a long press: transcribe and append to the item's note. */
  const stopDictation = useCallback(async () => {
    const current = dictationRef.current;
    if (!current) return;
    try {
      if (!(await current.ready)) return;
      setDictation((d) => (d ? { ...d, phase: 'transcribing' } : d));
      const text = (await endCapture()).trim();
      if (!text) throw new Error('Ingen text uppfattades – försök igen.');
      setResults((state) => {
        const existing = state[current.itemId];
        if (!existing) return state;
        const note = existing.note.trim() ? `${existing.note.trim()} ${text}` : text;
        return { ...state, [current.itemId]: { ...existing, note } };
      });
    } catch (err) {
      setMicError(err instanceof Error ? err.message : String(err));
    } finally {
      dictationRef.current = null;
      setDictation(null);
    }
  }, [endCapture]);

  const handleMic = useCallback(() => {
    if (phase === 'recording') void stopRecording();
    else if (phase === 'idle') void startRecording();
  }, [phase, startRecording, stopRecording]);

  const setStatus = useCallback((itemId: string, status: InspectionStatus) => {
    setResults((current) => {
      const existing = current[itemId];
      if (existing?.status === status) {
        // Tryck på aktiv status nollställer punkten igen.
        const next = { ...current };
        delete next[itemId];
        return next;
      }
      return {
        ...current,
        [itemId]: { status, note: existing?.note ?? '' },
      };
    });
  }, []);

  const setNote = useCallback((itemId: string, note: string) => {
    setResults((current) => {
      const existing = current[itemId];
      if (!existing) return current;
      return { ...current, [itemId]: { ...existing, note } };
    });
  }, []);

  const markSectionOk = useCallback((sectionIndex: number) => {
    setResults((current) => {
      const next = { ...current };
      for (const item of INSPECTION_TEMPLATE[sectionIndex].items) {
        if (!next[item.id]) {
          next[item.id] = { status: 'ok', note: '' };
        }
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setResults({});
    setInspectionTranscript('');
  }, [setResults, setInspectionTranscript]);

  const checkedCount = useMemo(() => Object.keys(results).length, [results]);
  const issues = useMemo(() => inspectionIssues(results), [results]);
  const done = checkedCount === INSPECTION_ITEM_COUNT;

  // Gör en prissatt jobblista av anmärkningarna och hoppa till offerten.
  const createTasks = useCallback(async () => {
    if (issues.length === 0) return;
    setMicError('');
    setCreatingTasks(true);
    try {
      const newTasks = await tasksFromInspection(issues, inspectionTranscript, prices);
      setTasks((current) => [...current, ...newTasks]);
      goToOrder();
    } catch (err) {
      setMicError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingTasks(false);
    }
  }, [issues, setTasks, goToOrder, prices, inspectionTranscript]);

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.titleRow,
          { paddingTop: Platform.OS === 'android' ? insets.top + 16 : insets.top + 8 },
        ]}
      >
        <Text style={styles.title}>Besiktning</Text>
        <Text style={styles.subtitle}>
          {checkedCount}/{INSPECTION_ITEM_COUNT} punkter
        </Text>
        {issues.length > 0 ? (
          <View style={styles.issueCounter}>
            <Ionicons name="warning" size={12} color={colors.danger} />
            <Text style={styles.issueCounterText}>{issues.length}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${(checkedCount / INSPECTION_ITEM_COUNT) * 100}%` },
          ]}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.micCard}>
          <MicButton
            phase={phase}
            onToggle={handleMic}
            onHoldStart={() => {
              if (phase === 'idle') void startRecording();
            }}
            onHoldEnd={() => {
              if (phase === 'recording') void stopRecording();
            }}
            labels={MIC_LABELS}
          />
          <Text style={styles.micHint}>
            Prata dig igenom cykeln bak → fram. Punkterna bockas av och listan
            scrollar med medan du pratar; när du stoppar finjusteras allt. Du
            kan alltid ändra manuellt. Håll in ✓ eller ⚠ på en punkt för att
            prata in en kommentar.
          </Text>
        </View>

        {micError ? (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{micError}</Text>
          </View>
        ) : null}

        {INSPECTION_TEMPLATE.map((section, sectionIndex) => {
          const sectionDone = section.items.every((item) => results[item.id]);
          return (
            <View
              key={section.key}
              style={styles.section}
              onLayout={(e) => {
                sectionY.current[section.key] = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.sectionHeader}>
                <Ionicons
                  name={section.icon as never}
                  size={16}
                  color={sectionDone ? colors.accent : colors.textSecondary}
                />
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {sectionDone ? (
                  <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                ) : null}
              </View>

              {section.items.map((item) => {
                const result = results[item.id];
                const imageUri = inspectionImageUrl(item.id, item.title);
                const listening =
                  dictation?.itemId === item.id ? dictation : null;
                const statusButton = (
                  icon: string,
                  status: InspectionStatus,
                  activeColor: string,
                  canDictate: boolean
                ) => (
                  <StatusButton
                    icon={
                      listening?.status === status && listening.phase === 'recording'
                        ? 'mic'
                        : icon
                    }
                    active={result?.status === status}
                    activeColor={activeColor}
                    onPress={() => setStatus(item.id, status)}
                    onLongPress={
                      canDictate ? () => startDictation(item.id, status) : undefined
                    }
                    onPressOut={canDictate ? () => void stopDictation() : undefined}
                  />
                );
                return (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.itemRow}>
                      <Pressable
                        onPress={() => setPreviewUri(imageUri)}
                        style={styles.itemImageButton}
                      >
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.itemImage}
                          contentFit="contain"
                          transition={150}
                        />
                      </Pressable>
                      <View style={styles.itemText}>
                        <Text style={styles.itemTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <Text style={styles.itemHint} numberOfLines={2}>
                          {item.hint}
                        </Text>
                      </View>
                      <View style={styles.statusRow}>
                        {statusButton('checkmark', 'ok', colors.accent, true)}
                        {statusButton('warning', 'issue', colors.danger, true)}
                        {statusButton('remove', 'skip', colors.textSecondary, false)}
                      </View>
                    </View>
                    {result && result.status !== 'skip' ? (
                      <View style={styles.noteWrap}>
                        <TextInput
                          style={styles.noteInput}
                          placeholder={
                            listening ? '' : 'Anteckning (t.ex. kedja 0,75 % sliten)'
                          }
                          placeholderTextColor={colors.textFaint}
                          value={result.note}
                          onChangeText={(text) => setNote(item.id, text)}
                          onFocus={() => setNoteFocused(true)}
                          onBlur={() => setNoteFocused(false)}
                          multiline
                        />
                        {listening && !result.note ? (
                          <View style={styles.noteOverlay} pointerEvents="none">
                            <WaveText
                              text={
                                listening.phase === 'recording'
                                  ? 'Lyssnar… släpp när du är klar'
                                  : 'Transkriberar…'
                              }
                              style={styles.noteWaveText}
                            />
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })}

              {!sectionDone ? (
                <Pressable
                  onPress={() => markSectionOk(sectionIndex)}
                  style={styles.allOk}
                >
                  <Ionicons
                    name="checkmark-done-outline"
                    size={18}
                    color={colors.accent}
                  />
                  <Text style={styles.allOkText}>Resten av sektionen OK</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}

        <View style={styles.summary}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="flag-outline"
              size={16}
              color={done ? colors.accent : colors.textSecondary}
            />
            <Text style={styles.sectionTitle}>Sammanfattning</Text>
            <Text style={styles.summaryCount}>
              {checkedCount}/{INSPECTION_ITEM_COUNT}
            </Text>
          </View>

          {checkedCount === 0 ? (
            <Text style={styles.emptyText}>
              Sammanfattningen fylls i medan besiktningen pågår.
            </Text>
          ) : issues.length === 0 ? (
            <View style={styles.noIssues}>
              <Ionicons
                name="checkmark-circle-outline"
                size={28}
                color={colors.accent}
              />
              <Text style={styles.noIssuesText}>
                {done ? 'Inga anmärkningar' : 'Inga anmärkningar hittills'}
              </Text>
            </View>
          ) : (
            issues.map((issue, index) => (
              <View key={index} style={styles.issueCard}>
                <Ionicons name="warning" size={16} color={colors.danger} />
                <View style={styles.issueText}>
                  <Text style={styles.issueTitle}>
                    {issue.title}
                    <Text style={styles.issueSection}> · {issue.section}</Text>
                  </Text>
                  {issue.note ? (
                    <Text style={styles.issueNote}>{issue.note}</Text>
                  ) : null}
                </View>
              </View>
            ))
          )}

          {issues.length > 0 ? (
            <Pressable
              onPress={createTasks}
              disabled={creatingTasks}
              style={[styles.createTasks, creatingTasks && styles.createTasksBusy]}
            >
              {creatingTasks ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <>
                  <Ionicons
                    name="construct-outline"
                    size={18}
                    color={colors.onAccent}
                  />
                  <Text style={styles.createTasksText}>
                    Skapa jobblista av anmärkningarna ({issues.length})
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}

          {checkedCount > 0 ? (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>SOM TEXT</Text>
              <Text selectable style={styles.summaryText}>
                {inspectionSummaryText(results)}
              </Text>
            </View>
          ) : null}

          {checkedCount > 0 ? (
            <Pressable onPress={reset} style={styles.resetButton}>
              <Ionicons name="refresh-outline" size={18} color={colors.text} />
              <Text style={styles.resetText}>Ny besiktning</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
    </View>
  );
}

type StatusButtonProps = {
  icon: string;
  active: boolean;
  activeColor: string;
  onPress: () => void;
  onLongPress?: () => void;
  onPressOut?: () => void;
};

function StatusButton({
  icon,
  active,
  activeColor,
  onPress,
  onLongPress,
  onPressOut,
}: StatusButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressOut={onPressOut}
      delayLongPress={350}
      style={[
        styles.statusButton,
        active && { backgroundColor: activeColor, borderColor: activeColor },
      ]}
    >
      <Ionicons
        name={icon as never}
        size={23}
        color={active ? colors.bg : colors.textFaint}
      />
    </Pressable>
  );
}

/** Fixed item row height, so the square image always matches it. */
const ITEM_ROW_HEIGHT = 76;

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
  issueCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 90, 95, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  issueCounterText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
  },
  progressTrack: {
    height: 4,
    marginHorizontal: gutter,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  content: {
    paddingHorizontal: gutter,
    paddingTop: 8,
    gap: 22,
  },
  micCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 12,
    alignItems: 'center',
  },
  micHint: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 90, 95, 0.1)',
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 95, 0.35)',
    padding: 12,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  summaryCount: {
    color: colors.textFaint,
    fontSize: 12,
    marginLeft: 'auto',
  },
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: ITEM_ROW_HEIGHT,
    paddingRight: 12,
  },
  // The image fills the full row height, square, flush with the card edge.
  itemImageButton: {
    width: ITEM_ROW_HEIGHT,
    height: ITEM_ROW_HEIGHT,
    backgroundColor: '#fff',
  },
  itemImage: {
    flex: 1,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  itemHint: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 1,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statusButton: {
    width: 41,
    height: 41,
    borderRadius: 20.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteInput: {
    backgroundColor: colors.cardRaised,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 10,
    minHeight: 40,
  },
  noteWrap: {
    margin: 12,
    marginTop: 0,
  },
  noteOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 11,
    justifyContent: 'center',
  },
  noteWaveText: {
    color: colors.text,
    fontSize: 15,
  },
  allOk: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    paddingVertical: 12,
  },
  summary: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 18,
  },
  allOkText: {
    color: colors.accent,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.textFaint,
    fontSize: 13,
  },
  noIssues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  noIssuesText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  issueCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 90, 95, 0.08)',
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 95, 0.3)',
    padding: 12,
  },
  issueText: {
    flex: 1,
  },
  issueTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  issueSection: {
    color: colors.textFaint,
    fontWeight: '400',
    fontSize: 12,
  },
  issueNote: {
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 13,
  },
  createTasks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    paddingVertical: 14,
  },
  createTasksBusy: {
    opacity: 0.8,
  },
  createTasksText: {
    color: colors.onAccent,
    fontWeight: '700',
  },
  summaryBox: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  summaryLabel: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 13,
  },
  resetText: {
    color: colors.text,
    fontWeight: '600',
  },
});
