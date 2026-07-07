import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useCallback, useState } from 'react';
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
import { JobCard } from './components/JobCard';
import { JobsScreen } from './components/JobsScreen';
import { MicButton, MicPhase } from './components/MicButton';
import { PhotoCard } from './components/PhotoCard';
import { analyzeTranscript, transcribeAudio } from './lib/api';
import { saveEstimate } from './lib/supabase';
import { colors, radius, shadow } from './lib/theme';
import { Job, PriceItem, jobsTotal, uid } from './lib/types';

function formatKr(value: number): string {
  return `${value.toLocaleString('sv-SE')} kr`;
}

function Screen() {
  const insets = useSafeAreaInsets();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [phase, setPhase] = useState<MicPhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState('');
  const [showAddJob, setShowAddJob] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

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

  const startRecording = useCallback(async () => {
    setError('');
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Mikrofon', 'Ge appen tillgång till mikrofonen i Inställningar.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setPhase('recording');
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    try {
      setPhase('transcribing');
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;
      if (!uri) throw new Error('Ingen inspelning hittades.');

      const text = await transcribeAudio(uri);
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
  }, [recorder]);

  const handleToggle = useCallback(() => {
    if (phase === 'recording') {
      void stopRecording();
    } else if (phase === 'idle') {
      void startRecording();
    }
  }, [phase, startRecording, stopRecording]);

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
          </View>

          <PhotoCard uri={photoUri} onTakePhoto={takePhoto} />

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
              <Text style={styles.sectionHeading}>Jobb</Text>
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onRemove={removeJob}
                  onAddProduct={addProduct}
                  onRemoveProduct={removeProduct}
                  onUpdateProduct={updateProduct}
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
                <Text style={styles.totalLabel}>Totalt</Text>
                <Text style={styles.totalValue}>{formatKr(total)}</Text>
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

type Tab = 'note' | 'jobs';

const TABS: { key: Tab; label: string; icon: string; iconActive: string }[] = [
  { key: 'note', label: 'Anteckna', icon: 'mic-outline', iconActive: 'mic' },
  { key: 'jobs', label: 'Jobb', icon: 'file-tray-full-outline', iconActive: 'file-tray-full' },
];

function Root() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('note');

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={[styles.page, tab !== 'note' && styles.pageHidden]}>
        <Screen />
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
