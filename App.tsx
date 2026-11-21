import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  SafeAreaInsetsContext,
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { AddJobModal } from './components/AddJobModal';
import { BookingPickerModal } from './components/BookingPickerModal';
import { CustomerModal } from './components/CustomerModal';
import { CustomerSection } from './components/CustomerSection';
import { InspectionScreen } from './components/InspectionScreen';
import { InspectionGuide } from './components/InspectionGuide';
import { JobCard } from './components/JobCard';
import { OrderContext, useOrderContext } from './lib/orderContext';
import { clearDraft, loadDraft, saveDraft } from './lib/persist';
import { JobsScreen } from './components/JobsScreen';
import { MicButton, MicPhase } from './components/MicButton';
import { PhotoCard } from './components/PhotoCard';
import { analyzeBikePhoto } from './lib/bikeAnalysis';
import { classifyItemKind } from './lib/itemKind';
import { pricesFor } from './lib/prices';
import { BikeAnalysisState, BikeDetails } from './components/BikeDetails';
import { analyzeTranscript, hasOpenAiKey, refineJob, transcribeAudio } from './lib/api';
import { startWebSpeech, stopWebSpeech, webSpeechAvailable } from './lib/speech';
import { saveEstimate, updateEstimateInspection } from './lib/supabase';
import { InspectionState } from './lib/inspection';
import { CurrentBikeBar } from './components/CurrentBikeBar';
import { colors, gutter, radius, shadow } from './lib/theme';
import {
  Customer,
  EMPTY_ORDER,
  Estimate,
  ItemKind,
  Job,
  OrderInfo,
  PriceItem,
  approvedTotal,
  jobsTotal,
  uid,
} from './lib/types';

const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  bike: 'Cykel',
  part: 'Lös del',
  trolley: 'Barnvagn',
  other: 'Övrigt',
};

function formatPrice(value: number): string {
  return `${value.toLocaleString('sv-SE')} kr`;
}

type LoadRequest = { estimate: Estimate; nonce: number };

function Screen({ loadRequest }: { loadRequest: LoadRequest | null }) {
  const insets = useSafeAreaInsets();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const {
    jobs,
    setJobs,
    order,
    setOrder,
    savedId,
    setSavedId,
    itemKind,
    setItemKind,
    bikeAnalysis,
    setBikeAnalysis,
    prices,
    inspection,
    setInspection,
  } = useOrderContext();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const photoBase64 = useRef<string | null>(null);
  // Bumped per photo so a slow analysis of an old photo can't overwrite a newer one.
  const analysisRun = useRef(0);
  const [phase, setPhase] = useState<MicPhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [showAddJob, setShowAddJob] = useState(false);
  const [showDropIn, setShowDropIn] = useState(false);
  const [showBookings, setShowBookings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [voiceEditId, setVoiceEditId] = useState<string | null>(null);
  const [voiceEditRecording, setVoiceEditRecording] = useState(false);
  const restored = useRef(false);

  // Återställ ev. autosparat utkast vid start (webben; native tills backend).
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setPhotoUri(draft.photoUri);
      setItemKind(draft.itemKind ?? null);
      if (draft.bike) setBikeAnalysis({ status: 'ready', bike: draft.bike });
      setTranscript(draft.transcript);
      setJobs(draft.jobs);
      setInspection(draft.inspection ?? {});
      // Older drafts stored customerName/customerPhone; drop those.
      setOrder({
        bikeNumber: draft.order?.bikeNumber ?? '',
        customer: draft.order?.customer ?? null,
        bookingId: draft.order?.bookingId ?? null,
      });
    }
    restored.current = true;
  }, []);

  // Autospar vid varje ändring (efter att ev. utkast återställts).
  useEffect(() => {
    if (!restored.current) return;
    const bike = bikeAnalysis.status === 'ready' ? bikeAnalysis.bike : null;
    saveDraft({ photoUri, itemKind, bike, transcript, jobs, order, inspection });
  }, [photoUri, itemKind, bikeAnalysis, transcript, jobs, order, inspection]);

  const setCustomer = useCallback((customer: Customer | null) => {
    setOrder((current) => ({ ...current, customer }));
    setShowDropIn(false);
    setSavedId(null);
  }, []);

  const saveDropIn = useCallback((customer: Customer, bikeNumber: string) => {
    setOrder((current) => ({ ...current, customer, bikeNumber }));
    setShowDropIn(false);
    setSavedId(null);
  }, []);

  // Import a booking: its customer, its jobs (before any already noted) and,
  // if the photo hasn't produced bike data, the booking's bike.
  const importBooking = useCallback((booking: Estimate) => {
    setOrder((current) => ({
      ...current,
      customer: booking.customer,
      bookingId: booking.id,
      bikeNumber: booking.bikeNumber || current.bikeNumber,
    }));
    setJobs((current) => [...booking.jobs, ...current]);
    setInspection(booking.inspection ?? {});
    if (booking.bike) {
      setItemKind((current) => current ?? 'bike');
      setBikeAnalysis((current) =>
        current.status === 'ready' ? current : { status: 'ready', bike: booking.bike! }
      );
    }
    setShowBookings(false);
    setSavedId(null);
  }, []);

  const newOrder = useCallback(() => {
    clearDraft();
    setPhotoUri(null);
    analysisRun.current += 1;
    photoBase64.current = null;
    setItemKind(null);
    setBikeAnalysis({ status: 'idle' });
    setTranscript('');
    setJobs([]);
    setInspection({});
    setOrder(EMPTY_ORDER);
    setError('');
    setSavedId(null);
  }, []);

  // Started from the Jobb modal: replace the current order with that job.
  useEffect(() => {
    if (!loadRequest) return;
    newOrder();
    importBooking(loadRequest.estimate);
  }, [loadRequest, newOrder, importBooking]);

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
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhotoUri(asset.uri);
      setSavedId(null);
      // On web the uri is already a data: URI; use it if base64 is missing.
      photoBase64.current =
        asset.base64 ??
        (asset.uri.startsWith('data:') ? asset.uri.split(',')[1] : null);
      void runPhotoAnalysis(asset.uri);
    }
  }, []);

  // Jev decides what the photo shows; only a bike gets the detailed bike analysis.
  const runPhotoAnalysis = useCallback(async (uri: string) => {
    const run = ++analysisRun.current;
    setItemKind(null);
    setBikeAnalysis({ status: 'analyzing' });
    let kind: ItemKind | null = null;
    try {
      kind = await classifyItemKind(uri);
    } catch (err) {
      if (run === analysisRun.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    if (run !== analysisRun.current) return;
    setItemKind(kind);
    if (kind && kind !== 'bike') {
      setBikeAnalysis({ status: 'idle' });
      return;
    }
    void runBikeAnalysis();
  }, []);

  const runBikeAnalysis = useCallback(async () => {
    const base64 = photoBase64.current;
    const run = ++analysisRun.current;
    if (!base64) {
      setBikeAnalysis({ status: 'idle' });
      return;
    }
    setBikeAnalysis({ status: 'analyzing' });
    try {
      const bike = await analyzeBikePhoto(base64);
      if (run === analysisRun.current) {
        setBikeAnalysis({ status: 'ready', bike });
      }
    } catch (err) {
      if (run === analysisRun.current) {
        setBikeAnalysis({
          status: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      }
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
      const newJobs = await analyzeTranscript(text, prices);
      setJobs((current) => [...current, ...newJobs]);
      setSavedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPhase('idle');
    }
  }, [recorder, useWebSpeech, prices]);

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

          const updated = await refineJob(job, text, prices);
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
    [jobs, phase, recorder, useWebSpeech, voiceEditId, voiceEditRecording, prices]
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
      const id = await saveEstimate({
        imageUri: photoUri,
        transcript,
        jobs,
        customer: order.customer,
        bike: bikeAnalysis.status === 'ready' ? bikeAnalysis.bike : null,
        bikeNumber: order.bikeNumber,
        inspection,
        bookingId: order.bookingId,
      });
      setSavedId(id);
      // Later saves update this row instead of creating a duplicate.
      setOrder((current) => ({ ...current, bookingId: id }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [photoUri, transcript, jobs, order.customer, order.bikeNumber, order.bookingId, bikeAnalysis, inspection]);

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

          <View style={styles.photoSection}>
            <PhotoCard uri={photoUri} onTakePhoto={takePhoto} />
            {photoUri && itemKind && itemKind !== 'bike' ? (
              <View style={styles.bikeDetailsCard}>
                <Text style={styles.itemKindText}>{ITEM_KIND_LABELS[itemKind]}</Text>
              </View>
            ) : null}
            {photoUri && bikeAnalysis.status !== 'idle' ? (
              <View style={styles.bikeDetailsCard}>
                <BikeDetails
                  key={photoUri}
                  state={bikeAnalysis}
                  onRetry={runBikeAnalysis}
                  onChange={(bike) => setBikeAnalysis({ status: 'ready', bike })}
                />
              </View>
            ) : null}
            <CustomerSection
              customer={order.customer}
              onImportBooking={() => setShowBookings(true)}
              onDropIn={() => setShowDropIn(true)}
              onClear={() => setCustomer(null)}
            />
          </View>

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
                    <Text style={styles.totalStruck}>{formatPrice(total)}</Text>
                  ) : null}
                  <Text style={styles.totalValue}>{formatPrice(approved)}</Text>
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
        prices={prices}
        onClose={() => setShowAddJob(false)}
        onPick={pickJob}
      />
      <CustomerModal
        visible={showDropIn}
        initial={order.customer}
        initialBikeNumber={order.bikeNumber}
        onClose={() => setShowDropIn(false)}
        onSave={saveDropIn}
      />
      <BookingPickerModal
        visible={showBookings}
        onClose={() => setShowBookings(false)}
        onPick={importBooking}
      />
    </View>
  );
}

type Tab = 'note' | 'inspect' | 'jobs';

const TABS: { key: Tab; label: string; icon: string; iconActive: string }[] = [
  { key: 'jobs', label: 'Jobb', icon: 'file-tray-full-outline', iconActive: 'file-tray-full' },
  { key: 'note', label: 'Mottagning', icon: 'mic-outline', iconActive: 'mic' },
  { key: 'inspect', label: 'Besiktning', icon: 'clipboard-outline', iconActive: 'clipboard' },
];

function Root() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('note');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [order, setOrder] = useState<OrderInfo>(EMPTY_ORDER);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [itemKind, setItemKind] = useState<ItemKind | null>(null);
  const [bikeAnalysis, setBikeAnalysis] = useState<BikeAnalysisState>({
    status: 'idle',
  });
  const prices = useMemo(
    () => pricesFor(itemKind, bikeAnalysis.status === 'ready' ? bikeAnalysis.bike.bike : null),
    [itemKind, bikeAnalysis]
  );

  const [inspection, setInspection] = useState<InspectionState>({});

  // Auto-save the checklist onto the bike's row once it has one (before the
  // first Spara it goes along with that save instead).
  useEffect(() => {
    const id = order.bookingId;
    if (!id) return;
    const timer = setTimeout(() => {
      updateEstimateInspection(id, inspection).catch((err) =>
        console.warn(err instanceof Error ? err.message : err)
      );
    }, 800);
    return () => clearTimeout(timer);
  }, [order.bookingId, inspection]);

  const goToOrder = useCallback(() => setTab('note'), []);
  const [loadRequest, setLoadRequest] = useState<LoadRequest | null>(null);

  const startCheckIn = useCallback((estimate: Estimate) => {
    setLoadRequest({ estimate, nonce: Date.now() });
    setTab('note');
  }, []);

  const startInspection = useCallback((estimate: Estimate) => {
    setLoadRequest({ estimate, nonce: Date.now() });
    setTab('inspect');
  }, []);

  // Make a saved job the current bike without leaving the Jobb tab.
  const selectBike = useCallback((estimate: Estimate) => {
    setLoadRequest({ estimate, nonce: Date.now() });
  }, []);

  const currentBike = bikeAnalysis.status === 'ready' ? bikeAnalysis.bike.bike : null;
  const hasCurrentBike = order.customer !== null || currentBike !== null;

  return (
    <OrderContext.Provider
      value={{
        jobs,
        setJobs,
        order,
        setOrder,
        savedId,
        setSavedId,
        goToOrder,
        itemKind,
        setItemKind,
        bikeAnalysis,
        setBikeAnalysis,
        prices,
        inspection,
        setInspection,
      }}
    >
    <View style={styles.root}>
      <StatusBar style="light" />

      {hasCurrentBike ? (
        <CurrentBikeBar
          customer={order.customer}
          bike={currentBike}
          bikeNumber={order.bikeNumber}
          topInset={insets.top}
        />
      ) : null}

      {/* The bar already covers the status bar area, so screens skip it. */}
      <SafeAreaInsetsContext.Provider
        value={hasCurrentBike ? { ...insets, top: 0 } : insets}
      >

      <View style={[styles.page, tab !== 'note' && styles.pageHidden]}>
        <Screen loadRequest={loadRequest} />
      </View>
      <View style={[styles.page, tab !== 'inspect' && styles.pageHidden]}>
        <InspectionScreen />
      </View>
      <View style={[styles.page, tab !== 'jobs' && styles.pageHidden]}>
        <JobsScreen
          active={tab === 'jobs'}
          onStartCheckIn={startCheckIn}
          onStartInspection={startInspection}
          onSelectBike={selectBike}
        />
      </View>
      </SafeAreaInsetsContext.Provider>

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
    paddingHorizontal: gutter,
    gap: 20,
  },
  photoSection: {
    gap: 8,
  },
  itemKindText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    padding: 14,
  },
  bikeDetailsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
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
