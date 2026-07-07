import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useCallback, useMemo, useRef, useState } from 'react';
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
  jobsFromInspection,
  transcribeAudio,
} from '../lib/api';
import { useOrderContext } from '../lib/orderContext';
import {
  INSPECTION_ITEM_COUNT,
  INSPECTION_TEMPLATE,
  InspectionState,
  InspectionStatus,
  inspectionIssues,
  inspectionSummaryText,
  matchInspectionPhrase,
} from '../lib/besiktning';

/** itemId → sektionsnyckel, för att kunna scrolla till rätt sektion live. */
const ITEM_SECTION: Record<string, string> = {};
for (const section of INSPECTION_TEMPLATE) {
  for (const item of section.items) ITEM_SECTION[item.id] = section.key;
}
import { startWebSpeech, stopWebSpeech, webSpeechAvailable } from '../lib/speech';
import { colors, radius } from '../lib/theme';
import { MicButton, MicPhase } from './MicButton';

const MIC_LABELS: Partial<Record<MicPhase, string>> = {
  idle: 'Prata in genomgången – tryck för att spela in',
  analyzing: 'Fyller i checklistan…',
};

/**
 * Hela besiktningen som en scrollbar lista (Marken → Bak → Fram) med en
 * sammanfattning i botten som uppdateras löpande – tänkt att visas för
 * kunden på en telefon eller skärm medan cykeln gås igenom.
 */
export function BesiktningScreen() {
  const insets = useSafeAreaInsets();
  const { setJobs, goToOrder } = useOrderContext();
  const [results, setResults] = useState<InspectionState>({});
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [phase, setPhase] = useState<MicPhase>('idle');
  const [micError, setMicError] = useState('');
  const [creatingJobs, setCreatingJobs] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Record<string, number>>({});
  const transcriptRef = useRef('');

  const useWebSpeech = !hasOpenAiKey && webSpeechAvailable;

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

  const startRecording = useCallback(async () => {
    setMicError('');
    if (useWebSpeech) {
      try {
        startWebSpeech(handlePhrase);
        setPhase('recording');
      } catch (err) {
        setMicError(err instanceof Error ? err.message : String(err));
      }
      return;
    }
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Mikrofon', 'Ge appen tillgång till mikrofonen i Inställningar.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setPhase('recording');
  }, [handlePhrase, recorder, useWebSpeech]);

  const stopRecording = useCallback(async () => {
    try {
      setPhase('transcribing');
      let text: string;
      if (useWebSpeech) {
        text = await stopWebSpeech();
      } else {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false });
        const uri = recorder.uri;
        if (!uri) throw new Error('Ingen inspelning hittades.');
        text = await transcribeAudio(uri);
      }
      if (!text) throw new Error('Ingen text uppfattades – försök igen.');
      // Spara hela inspelningen (för att kunna skapa jobblista med delar).
      transcriptRef.current = `${transcriptRef.current} ${text}`.trim();

      setPhase('analyzing');
      const found = await analyzeInspection(text);
      // AI:n är facit och skriver över live-gissningarna för nämnda punkter.
      setResults((current) => ({ ...current, ...found }));
    } catch (err) {
      setMicError(err instanceof Error ? err.message : String(err));
    } finally {
      setPhase('idle');
    }
  }, [recorder, useWebSpeech]);

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
    transcriptRef.current = '';
  }, []);

  const checkedCount = useMemo(() => Object.keys(results).length, [results]);
  const issues = useMemo(() => inspectionIssues(results), [results]);
  const done = checkedCount === INSPECTION_ITEM_COUNT;

  // Gör en prissatt jobblista av anmärkningarna och hoppa till offerten.
  const createJobs = useCallback(async () => {
    if (issues.length === 0) return;
    setMicError('');
    setCreatingJobs(true);
    try {
      const newJobs = await jobsFromInspection(issues, transcriptRef.current);
      setJobs((current) => [...current, ...newJobs]);
      goToOrder();
    } catch (err) {
      setMicError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingJobs(false);
    }
  }, [issues, setJobs, goToOrder]);

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
            kan alltid ändra manuellt.
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
                return (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemText}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.itemHint}>{item.hint}</Text>
                      </View>
                      <View style={styles.statusRow}>
                        <StatusButton
                          icon="checkmark"
                          active={result?.status === 'ok'}
                          activeColor={colors.accent}
                          onPress={() => setStatus(item.id, 'ok')}
                        />
                        <StatusButton
                          icon="warning"
                          active={result?.status === 'issue'}
                          activeColor={colors.danger}
                          onPress={() => setStatus(item.id, 'issue')}
                        />
                        <StatusButton
                          icon="remove"
                          active={result?.status === 'skip'}
                          activeColor={colors.textSecondary}
                          onPress={() => setStatus(item.id, 'skip')}
                        />
                      </View>
                    </View>
                    {result?.status === 'issue' ? (
                      <TextInput
                        style={styles.noteInput}
                        placeholder="Anteckning (t.ex. kedja 0,75 % sliten)"
                        placeholderTextColor={colors.textFaint}
                        value={result.note}
                        onChangeText={(text) => setNote(item.id, text)}
                        multiline
                      />
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
              onPress={createJobs}
              disabled={creatingJobs}
              style={[styles.createJobs, creatingJobs && styles.createJobsBusy]}
            >
              {creatingJobs ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <>
                  <Ionicons
                    name="construct-outline"
                    size={18}
                    color={colors.onAccent}
                  />
                  <Text style={styles.createJobsText}>
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
    </View>
  );
}

type StatusButtonProps = {
  icon: string;
  active: boolean;
  activeColor: string;
  onPress: () => void;
};

function StatusButton({ icon, active, activeColor, onPress }: StatusButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.statusButton,
        active && { backgroundColor: activeColor, borderColor: activeColor },
      ]}
    >
      <Ionicons
        name={icon as never}
        size={18}
        color={active ? colors.bg : colors.textFaint}
      />
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
    paddingHorizontal: 20,
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
    marginHorizontal: 20,
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
    paddingHorizontal: 20,
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
    padding: 12,
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    gap: 6,
  },
  statusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  createJobs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    paddingVertical: 14,
  },
  createJobsBusy: {
    opacity: 0.8,
  },
  createJobsText: {
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
