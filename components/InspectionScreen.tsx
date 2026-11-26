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
  Text,
  TextInput,
  View,
} from 'react-native';
import { confirmDestructive } from '../lib/confirm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  analyzeInspection,
  hasOpenAiKey,
  tasksFromInspection,
  transcribeAudio,
} from '../lib/llm-communication/api';
import { inspectionImageUrl } from '../lib/taskImages';
import { useOrderContext } from '../lib/orderContext';
import { clearJobListSent } from '../lib/supabase';
import {
  INSPECTION_TEMPLATE,
  InspectionState,
  InspectionStatus,
  inspectionTemplateFor,
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
import { useScrollToTop } from '../lib/scrollToTop';
import { colors } from '../lib/theme';
import { ImagePreviewModal } from './ImagePreviewModal';
import { JobNotesModal } from './JobNotesModal';
import { MicButton, MicPhase } from './MicButton';
import { DoneButton, LockedBanner, StepLock, useSetStepDone, useStepLocked } from './StepDone';
import { StepEmployeePicker, useEnsureStepEmployee } from './StepEmployee';
import { WaveText } from './WaveText';
import { styles } from './InspectionScreen.styles';
import { webGrid, webHalf, webScroll, webScrollContent } from '../lib/webEdge';
import { FitPressable } from './FitPressable';

/** How the inspection works, behind the info button. Constant so the modal doesn't reset on render. */
const HELP_ENTRIES = [
  {
    title: 'Så funkar besiktningen',
    text:
      'Prata dig igenom cykeln bak → fram. Punkterna bockas av och listan scrollar med medan du pratar; ' +
      'när du stoppar finjusteras allt. Du kan alltid ändra manuellt. Håll in ✓ eller ⚠ på en punkt ' +
      'för att prata in en kommentar.',
  },
];

const MIC_LABELS: Partial<Record<MicPhase, string>> = {
  idle: 'Prata in genomgången – tryck för att spela in',
  analyzing: 'Fyller i checklistan…',
};

/**
 * Hela besiktningen som en scrollbar lista (Marken → Bak → Fram) med en
 * sammanfattning i botten som uppdateras löpande – tänkt att visas för
 * kunden på en telefon eller skärm medan cykeln gås igenom.
 */
/** scrollReset: each new value scrolls back to the top (Klar on Mottagning). */
export function InspectionScreen({ scrollReset }: { scrollReset: number }) {
  const insets = useSafeAreaInsets();
  const {
    tasks,
    inspectionTasks,
    setInspectionTasks,
    setJobListSend,
    order,
    goToJobList,
    prices,
    inspection: results,
    setInspection: setResults,
    inspectionTranscript,
    setInspectionTranscript,
    setHoldSave,
    bikeAnalysis,
  } = useOrderContext();
  // Only the items that apply to this bike (gear system, suspension, type).
  const bike = bikeAnalysis.status === 'ready' ? bikeAnalysis.bike.bike : null;
  const template = useMemo(() => inspectionTemplateFor(bike), [bike]);
  const itemIds = useMemo(
    () => new Set(template.flatMap((section) => section.items.map((item) => item.id))),
    [template]
  );
  // Mottagning flows into Besiktning: each agreed task's inspection items get a
  // "Mottagning" line, and items with no result yet start as remarks.
  const receptionLines = useMemo(() => {
    const lines: Record<string, string[]> = {};
    for (const task of tasks) {
      for (const id of task.inspectionItemIds ?? []) {
        if (!itemIds.has(id)) continue;
        (lines[id] ??= []).push(task.note?.trim() ? `${task.title} – ${task.note.trim()}` : task.title);
      }
    }
    return lines;
  }, [tasks, itemIds]);
  // A finished (locked) Besiktning is left as it is.
  const stepLocked = useStepLocked('inspect');
  useEffect(() => {
    if (stepLocked) return;
    const missing = Object.keys(receptionLines).filter((id) => !results[id]);
    if (missing.length === 0) return;
    setResults((current) => {
      const next = { ...current };
      for (const id of missing) next[id] ??= { status: 'issue', note: '' };
      return next;
    });
  }, [receptionLines, results, setResults, stepLocked]);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [phase, setPhase] = useState<MicPhase>('idle');
  const [micError, setMicError] = useState('');
  const [creatingTasks, setCreatingTasks] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop('inspect', () => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  useEffect(() => {
    if (scrollReset) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [scrollReset]);
  // Bottom edge of the mic card; once scrolled past it, a thin stop bar shows.
  const micCardBottom = useRef(0);
  const [micScrolledAway, setMicScrolledAway] = useState(false);
  const sectionY = useRef<Record<string, number>>({});
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
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
      const hits = matchInspectionPhrase(phrase).filter((hit) => itemIds.has(hit.itemId));
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
    [scrollToItem, itemIds]
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
      // Items that don't apply to this bike are ignored.
      const applicable: InspectionState = {};
      for (const [id, result] of Object.entries(found)) {
        if (itemIds.has(id)) applicable[id] = result;
      }
      // AI:n är facit och skriver över live-gissningarna för nämnda punkter.
      setResults((current) => ({ ...current, ...applicable }));
    } catch (err) {
      setMicError(err instanceof Error ? err.message : String(err));
    } finally {
      setPhase('idle');
    }
  }, [endCapture, setInspectionTranscript, itemIds]);

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
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
      for (const item of template[sectionIndex].items) {
        if (!next[item.id]) {
          next[item.id] = { status: 'ok', note: '' };
        }
      }
      return next;
    });
  }, [template]);

  const itemCount = itemIds.size;
  const checkedCount = useMemo(
    () => [...itemIds].filter((id) => results[id]).length,
    [results, itemIds]
  );
  const issues = useMemo(() => inspectionIssues(results, template), [results, template]);
  const done = checkedCount === itemCount;

  const setInspectionDone = useSetStepDone('inspect');
  const ensureStepEmployee = useEnsureStepEmployee('inspect');

  // Klar, skapa jobblista: make the Jobblista from the remarks, mark
  // Besiktning Klar and jump to the Jobblista tab.
  const runCreateTasks = useCallback(async () => {
    setMicError('');
    setCreatingTasks(true);
    try {
      const newTasks = await tasksFromInspection(issues, inspectionTranscript, prices, tasks);
      if (newTasks.length === 0) {
        setMicError('Alla anmärkningar täcks redan av det som avtalades vid mottagningen.');
        return;
      }
      // A recreated list is unsent again.
      if (order.bookingId) await clearJobListSent(order.bookingId);
      setJobListSend((current) =>
        current ? { ...current, sentTasks: null, sentAt: null, verbalApprovalAt: null } : current
      );
      setInspectionTasks(newTasks);
      await setInspectionDone(true);
      goToJobList();
    } catch (err) {
      setMicError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingTasks(false);
    }
  }, [issues, inspectionTranscript, prices, tasks, order.bookingId, setInspectionTasks, setJobListSend, setInspectionDone, goToJobList]);

  const createTasks = useCallback(async () => {
    // Klar needs to know who did the inspection; Avbryt in the picker stops here.
    try {
      if (!(await ensureStepEmployee())) return;
    } catch (err) {
      setMicError(err instanceof Error ? err.message : String(err));
      return;
    }
    if (issues.length === 0) {
      // Nothing to list: just mark Besiktning Klar and move on.
      setMicError('');
      setInspectionDone(true)
        .then(goToJobList)
        .catch((err) => setMicError(err instanceof Error ? err.message : String(err)));
      return;
    }
    if (inspectionTasks.length === 0) {
      void runCreateTasks();
      return;
    }
    confirmDestructive(
      'Du har redan skapat en jobblista',
      'Är du säker på att du vill skapa den igen?',
      'Skapa igen',
      () => void runCreateTasks()
    );
  }, [issues.length, inspectionTasks.length, runCreateTasks, setInspectionDone, goToJobList, ensureStepEmployee]);

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
          {checkedCount}/{itemCount} punkter
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
            { width: `${(checkedCount / itemCount) * 100}%` },
          ]}
        />
      </View>
      <LockedBanner tab="inspect" style={styles.lockedBanner} />

      {phase === 'recording' && micScrolledAway ? (
        <Pressable onPress={() => void stopRecording()} style={styles.compactMic}>
          <Ionicons name="stop" size={12} color={colors.text} />
          <Text style={styles.compactMicText}>Spelar in – tryck för att stoppa</Text>
        </Pressable>
      ) : null}

      <ScrollView style={webScroll}
        ref={scrollRef}
        onScroll={(e) => {
          const away = e.nativeEvent.contentOffset.y > micCardBottom.current;
          if (away !== micScrolledAway) setMicScrolledAway(away);
        }}
        scrollEventThrottle={32}
        contentContainerStyle={[webScrollContent, 
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <StepLock tab="inspect" gap={22}>
          <StepEmployeePicker tab="inspect" />
          <View
            style={styles.micCard}
            onLayout={(e) => {
              const { y, height } = e.nativeEvent.layout;
              micCardBottom.current = y + height;
            }}
          >
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
            <Pressable onPress={() => setShowHelp(true)} hitSlop={8} style={styles.helpButton}>
              <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {micError ? (
            <View style={styles.errorBox}>
              <Ionicons name="warning-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{micError}</Text>
            </View>
          ) : null}

          {template.map((section, sectionIndex) => {
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
                  <View style={styles.sectionIcon}>
                    <Ionicons
                      name={section.icon as never}
                      size={24}
                      color={sectionDone ? colors.success : colors.accentLight}
                    />
                  </View>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  {sectionDone ? (
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  ) : null}
                </View>

                <View style={webGrid}>
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
                    <View key={item.id} style={[styles.itemCard, webHalf]}>
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
                          {statusButton('checkmark', 'ok', colors.success, true)}
                          {statusButton('warning', 'issue', colors.danger, true)}
                          {statusButton('remove', 'skip', colors.textSecondary, false)}
                        </View>
                      </View>
                      {receptionLines[item.id] ? (
                        <View style={styles.receptionRow}>
                          <Text style={styles.receptionLabel}>MOTTAGNING</Text>
                          <Text style={styles.receptionText}>
                            {receptionLines[item.id].join(' · ')}
                          </Text>
                        </View>
                      ) : null}
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
                </View>

                {!sectionDone ? (
                  <FitPressable
                    onPress={() => markSectionOk(sectionIndex)}
                    style={styles.allOk}
                  >
                    <Ionicons
                      name="checkmark-done-outline"
                      size={18}
                      color={colors.accentLight}
                    />
                    <Text style={styles.allOkText}>Resten av sektionen OK</Text>
                  </FitPressable>
                ) : null}
              </View>
            );
          })}

          <View style={styles.summary}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="flag-outline"
                  size={24}
                  color={done ? colors.success : colors.accentLight}
                />
              </View>
              <Text style={styles.sectionTitle}>Sammanfattning</Text>
              <Text style={styles.summaryCount}>
                {checkedCount}/{itemCount}
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
                  color={colors.accentLight}
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

            {!stepLocked ? (
              <FitPressable
                onPress={() => void createTasks()}
                disabled={creatingTasks}
                style={[styles.createTasks, creatingTasks && styles.createTasksBusy]}
              >
                {creatingTasks ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={colors.onAccent}
                    />
                    <Text style={styles.createTasksText}>Klar, skapa jobblista</Text>
                  </>
                )}
              </FitPressable>
            ) : null}

            {checkedCount > 0 ? (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>SOM TEXT</Text>
                <Text selectable style={styles.summaryText}>
                  {inspectionSummaryText(results, template)}
                </Text>
              </View>
            ) : null}
          </View>
        </StepLock>

        {/* Klar is "Klar, skapa jobblista" above; this only shows Lås upp. */}
        {stepLocked ? (
          <DoneButton tab="inspect" />
        ) : null}
      </ScrollView>
      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
      <JobNotesModal
        entries={showHelp ? HELP_ENTRIES : null}
        listTitle=""
        onSave={() => {}}
        onClose={() => setShowHelp(false)}
      />
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
        color={active ? colors.bg : colors.textSoft}
      />
    </Pressable>
  );
}

