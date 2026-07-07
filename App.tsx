import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { AddJobModal } from './components/AddJobModal';
import { BesiktningScreen } from './components/BesiktningScreen';
import { InspectionGuide } from './components/InspectionGuide';
import { JobCard } from './components/JobCard';
import { OrderCard } from './components/OrderCard';
import { OrderContext, useOrderContext } from './lib/orderContext';
import { clearDraft, loadDraft, saveDraft } from './lib/persist';
import { JobsScreen } from './components/JobsScreen';
import { MicButton, MicPhase } from './components/MicButton';
import { PhotoCard } from './components/PhotoCard';
import { analyzeTranscript, hasOpenAiKey, refineJob, transcribeAudio } from './lib/api';
import { startWebSpeech, stopWebSpeech, webSpeechAvailable } from './lib/speech';
import { saveEstimate } from './lib/supabase';
import { colors, radius, shadow } from './lib/theme';
import {
  EMPTY_ORDER,
  Job,
  OrderInfo,
  PriceItem,
  approvedTotal,
  jobsTotal,
  uid,
} from './lib/types';

function formatKr(value: number): string {
  return `${value.toLocaleString('sv-SE')} kr`;
}

function Screen() {
  const insets = useSafeAreaInsets();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { jobs, setJobs, order, setOrder, savedId, setSavedId } =
    useOrderContext();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [phase, setPhase] = useState<MicPhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [showAddJob, setShowAddJob] = useState(false);
  const [saving, setSaving] = useState(false);
  const [voiceEditId, setVoiceEditId] = useState<string | null>(null);
  const [voiceEditRecording, setVoiceEditRecording] = useState(false);
  const restored = useRef(false);

  // Återställ ev. autosparat utkast vid start (webben; native tills backend).
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setPhotoUri(draft.photoUri);
      setTranscript(draft.transcript);
      setJobs(draft.jobs);
      setOrder(draft.order);
    }
    restored.current = true;
  }, []);

  // Autospar vid varje ändring (efter att ev. utkast återställts).
  useEffect(() => {
    if (!restored.current) return;
    saveDraft({ photoUri, transcript, jobs, order });
  }, [photoUri, transcript, jobs, order]);

  const patchOrder = useCallback((patch: Partial<OrderInfo>) => {
    setOrder((current) => ({ ...current, ...patch }));
  }, []);

  const newOrder = useCallback(() => {
    clearDraft();
    setPhotoUri(null);
    setTranscript('');
    setJobs([]);
    setOrder(EMPTY_ORDER);
    setError('');
    setSavedId(null);
  }, []);

  const setApproval = useCallback(
    (jobId: string, approval: 'godkänd' | 'nekad' | undefined) => {
      setJobs((current) =>
        current.map((job) => (job.id === jobId ? { ...job, approval } : job))
      );
      setSavedId(null);
    },
    []
  );

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Kamera', 'Ge appen tillgång till kameran i Inställningar.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setSavedId(null);
    }
  }, []);

  // Utan Whisper-nyckel: använd webbläsarens taligenkänning på webben i stället.
  const useWebSpeech = !hasOpenAiKey && webSpeechAvailable;

  const startRecording = useCallback(async () => {
    setError('');
    if (useWebSpeech) {
      try {
        startWebSpeech();
        setPhase('recording');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
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
  }, [recorder, useWebSpeech]);

  const stopRecording = useCallback(async () => {
    try {
      setPhase('transcribing');
      let text: string;
      if (useWebSpeech) {
        text = await stopWebSpeech();
        if (!text) throw new Error('Ingen text uppfattades – försök igen.');
      } else {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false });
        const uri = recorder.uri;
        if (!uri) throw new Error('Ingen inspelning hittades.');
        text = await transcribeAudio(uri);
      }
      setTranscript(text);

      setPhase('analyzing');
      const newJobs = await analyzeTranscript(text);
      setJobs((current) => [...current, ...newJobs]);
      setSavedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPhase('idle');
    }
  }, [recorder, useWebSpeech]);

  const handleToggle = useCallback(() => {
    if (phase === 'recording') {
      void stopRecording();
    } else if (phase === 'idle' && !voiceEditId) {
      void startRecording();
    }
  }, [phase, startRecording, stopRecording, voiceEditId]);

  // Röstredigering av ett enskilt jobb: tryck mic på kortet, prata in
  // ändringen (t.ex. "föreslå andra Pirelli 28 mm"), tryck stopp.
  const toggleJobVoice = useCallback(
    async (jobId: string) => {
      const job = jobs.find((item) => item.id === jobId);
      if (!job) return;

      if (voiceEditId === jobId && voiceEditRecording) {
        setVoiceEditRecording(false);
        try {
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

          const updated = await refineJob(job, text);
          setJobs((current) =>
            current.map((item) => (item.id === jobId ? updated : item))
          );
          setSavedId(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setVoiceEditId(null);
        }
        return;
      }

      if (voiceEditId || phase !== 'idle') return;
      setError('');
      try {
        if (useWebSpeech) {
          startWebSpeech();
        } else {
          const permission = await AudioModule.requestRecordingPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Mikrofon', 'Ge appen tillgång till mikrofonen i Inställningar.');
            return;
          }
          await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
          await recorder.prepareToRecordAsync();
          recorder.record();
        }
        setVoiceEditId(jobId);
        setVoiceEditRecording(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [jobs, phase, recorder, useWebSpeech, voiceEditId, voiceEditRecording]
  );

  const removeJob = useCallback((jobId: string) => {
    setJobs((current) => current.filter((job) => job.id !== jobId));
  }, []);

  const addProduct = useCallback((jobId: string, name: string, price: number) => {
    setJobs((current) =>
      current.map((job) =>
        job.id === jobId
          ? { ...job, products: [...job.products, { id: uid(), name, price }] }
          : job
      )
    );
  }, []);

  const updateProduct = useCallback(
    (jobId: string, productId: string, price: number) => {
      setJobs((current) =>
        current.map((job) =>
          job.id === jobId
            ? {
              ...job,
              products: job.products.map((product) =>
                product.id === productId ? { ...product, price } : product
              ),
            }
            : job
        )
      );
      setSavedId(null);
    },
    []
  );

  const removeProduct = useCallback((jobId: string, productId: string) => {
    setJobs((current) =>
      current.map((job) =>
        job.id === jobId
          ? { ...job, products: job.products.filter((p) => p.id !== productId) }
          : job
      )
    );
  }, []);

  const pickJob = useCallback((item: PriceItem) => {
    setJobs((current) => [
      ...current,
      {
        id: uid(),
        title: item.title,
        category: item.category,
        price: item.price,
        products: [],
      },
    ]);
    setShowAddJob(false);
    setSavedId(null);
  }, []);

  const save = useCallback(async () => {
    try {
      setSaving(true);
      setError('');
      const id = await saveEstimate(photoUri, transcript, jobs);
      setSavedId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [photoUri, transcript, jobs]);

  const total = jobsTotal(jobs);
  const approved = approvedTotal(jobs);
  const hasRejected = jobs.some((job) => job.approval === 'nekad');

  return (
    <View style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: Platform.OS === 'android' ? insets.top + 16 : 16,
              paddingBottom: insets.bottom + 32,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleRow}>
            <Text style={styles.title}>SnapBike</Text>
            <Text style={styles.subtitle}>Verkstadsanteckning</Text>
            {transcript || jobs.length > 0 || photoUri ? (
              <Pressable onPress={newOrder} style={styles.newOrder} hitSlop={8}>
                <Ionicons name="add" size={15} color={colors.textSecondary} />
                <Text style={styles.newOrderText}>Ny order</Text>
              </Pressable>
            ) : null}
          </View>

          <PhotoCard uri={photoUri} onTakePhoto={takePhoto} />

          <InspectionGuide />

          <MicButton
            phase={phase}
            onToggle={handleToggle}
            onHoldStart={() => {
              if (phase === 'idle') void startRecording();
            }}
            onHoldEnd={() => {
              if (phase === 'recording') void stopRecording();
            }}
          />

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="warning-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {transcript ? (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptLabel}>TRANSKRIPTION</Text>
              <Text style={styles.transcriptText}>{transcript}</Text>
            </View>
          ) : null}

          {jobs.length > 0 ? (
            <View style={styles.jobsSection}>
              <OrderCard order={order} onChange={patchOrder} />
              <Text style={styles.sectionHeading}>Jobb</Text>
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onRemove={removeJob}
                  onAddProduct={addProduct}
                  onRemoveProduct={removeProduct}
                  onUpdateProduct={updateProduct}
                  voiceState={
                    voiceEditId === job.id
                      ? voiceEditRecording
                        ? 'recording'
                        : 'processing'
                      : undefined
                  }
                  onVoiceEdit={toggleJobVoice}
                  onSetApproval={setApproval}
                />
              ))}
            </View>
          ) : null}

          <Pressable onPress={() => setShowAddJob(true)} style={styles.addJob}>
            <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
            <Text style={styles.addJobText}>Lägg till jobb</Text>
          </Pressable>

          {jobs.length > 0 ? (
            <View style={styles.footer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  {hasRejected ? 'Att betala (godkänt)' : 'Totalt'}
                </Text>
                <View style={styles.totalValues}>
                  {hasRejected ? (
                    <Text style={styles.totalStruck}>{formatKr(total)}</Text>
                  ) : null}
                  <Text style={styles.totalValue}>{formatKr(approved)}</Text>
                </View>
              </View>
              <Pressable
                onPress={save}
                disabled={saving || savedId !== null}
                style={({ pressed }) => [
                  styles.saveButton,
                  (pressed || saving) && styles.saveButtonPressed,
                  savedId !== null && styles.saveButtonDone,
                ]}
              >
                {saving ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <>
                    <Ionicons
                      name={savedId !== null ? 'checkmark-circle' : 'cloud-upload-outline'}
                      size={19}
                      color={colors.onAccent}
                    />
                    <Text style={styles.saveText}>
                      {savedId !== null ? 'Sparad' : 'Spara'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <AddJobModal
        visible={showAddJob}
        onClose={() => setShowAddJob(false)}
        onPick={pickJob}
      />
    </View>
  );
}

type Tab = 'note' | 'inspect' | 'jobs';

const TABS: { key: Tab; label: string; icon: string; iconActive: string }[] = [
  { key: 'note', label: 'Anteckna', icon: 'mic-outline', iconActive: 'mic' },
  { key: 'inspect', label: 'Besiktning', icon: 'clipboard-outline', iconActive: 'clipboard' },
  { key: 'jobs', label: 'Jobb', icon: 'file-tray-full-outline', iconActive: 'file-tray-full' },
];

function Root() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('note');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [order, setOrder] = useState<OrderInfo>(EMPTY_ORDER);
  const [savedId, setSavedId] = useState<string | null>(null);

  const goToOrder = useCallback(() => setTab('note'), []);

  return (
    <OrderContext.Provider
      value={{ jobs, setJobs, order, setOrder, savedId, setSavedId, goToOrder }}
    >
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={[styles.page, tab !== 'note' && styles.pageHidden]}>
        <Screen />
      </View>
      <View style={[styles.page, tab !== 'inspect' && styles.pageHidden]}>
        <BesiktningScreen />
      </View>
      <View style={[styles.page, tab !== 'jobs' && styles.pageHidden]}>
        <JobsScreen active={tab === 'jobs'} />
      </View>

      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>
        {TABS.map((item) => {
          const isActive = tab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setTab(item.key)}
              style={styles.tabItem}
            >
              <Ionicons
                name={(isActive ? item.iconActive : item.icon) as never}
                size={22}
                color={isActive ? colors.accent : colors.textFaint}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
    </OrderContext.Provider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  pageHidden: {
    display: 'none',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  tabLabel: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: colors.accent,
  },
  content: {
    paddingHorizontal: 20,
    gap: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  newOrder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  newOrderText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textFaint,
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
  transcriptBox: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  transcriptLabel: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  transcriptText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  jobsSection: {
    gap: 12,
  },
  sectionHeading: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  addJob: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    paddingVertical: 14,
  },
  addJobText: {
    color: colors.accent,
    fontWeight: '600',
  },
  footer: {
    gap: 14,
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
  totalValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  totalStruck: {
    color: colors.textFaint,
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  totalValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    paddingVertical: 15,
    ...shadow.button,
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonDone: {
    backgroundColor: colors.accentDark,
  },
  saveText: {
    color: colors.onAccent,
    fontWeight: '700',
  },
});
