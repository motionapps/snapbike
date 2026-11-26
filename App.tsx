import { Ionicons } from '@expo/vector-icons';
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold';
import { Archivo_800ExtraBold } from '@expo-google-fonts/archivo/800ExtraBold';
import { IBMPlexSans_400Regular } from '@expo-google-fonts/ibm-plex-sans/400Regular';
import { IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans/600SemiBold';
import { IBMPlexSans_700Bold } from '@expo-google-fonts/ibm-plex-sans/700Bold';
import { useFonts } from 'expo-font';
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
  Text,
  View,
} from 'react-native';
import {
  SafeAreaInsetsContext,
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { AddTaskModal } from './components/AddTaskModal';
import { BookingPickerModal } from './components/BookingPickerModal';
import { CustomerModal } from './components/CustomerModal';
import { CustomerSection } from './components/CustomerSection';
import { InspectionScreen } from './components/InspectionScreen';
import { InspectionGuide } from './components/InspectionGuide';
import { TaskCard } from './components/TaskCard';
import { OrderContext, useOrderContext } from './lib/orderContext';
import { EMPTY_STEP_EMPLOYEES, fetchStepEmployees, StepEmployees } from './lib/employees';
import { StaffProvider } from './components/StaffProvider';
import { StepEmployeePicker } from './components/StepEmployee';
import { clearDraft, loadDraft, saveDraft } from './lib/persist';
import { JobsScreen } from './components/JobsScreen';
import { MessagesScreen } from './components/MessagesScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { JobListScreen } from './components/JobListScreen';
import { MicButton, MicPhase } from './components/MicButton';
import { DoneButton, LockedBanner, StepLock } from './components/StepDone';
import { FitPressable } from './components/FitPressable';
import { STEP_STATUS, StepTab, stepDone } from './lib/jobSteps';
import { PhotoCard } from './components/PhotoCard';
import { ManualBikeModal } from './components/ManualBikeModal';
import { analyzeBikePhoto, BikeData } from './lib/bikeAnalysis';
import { classifyItemKind } from './lib/itemKind';
import { pricesFor, setTaskSide, taskFromPriceItem } from './lib/prices';
import { BikeAnalysisState, BikeDetails } from './components/BikeDetails';
import { analyzeTranscript, hasOpenAiKey, refineTask, transcribeAudio } from './lib/llm-communication/api';
import { startWebSpeech, stopWebSpeech, webSpeechAvailable } from './lib/speech';
import * as FileSystem from 'expo-file-system/legacy';
import {
  fetchJobStatus,
  isStaff,
  jobImageUrl,
  saveCustomer,
  saveJob,
  uploadJobImage,
} from './lib/supabase';
import { AuthProvider, useAuth } from './lib/auth/AuthProvider';
import { startInStockSync } from './lib/inStockCache';
import { AuthView } from './components/AuthView';
import { InspectionState } from './lib/inspection';
import { CurrentBikeBar } from './components/CurrentBikeBar';
import { JobNotesModal, NoteEntry } from './components/JobNotesModal';
import { ScrollToTopContext, ScrollToTopRequest, useScrollToTop } from './lib/scrollToTop';
import { STRINGS } from './lib/strings';
import { colors } from './lib/theme';
import {
  Customer,
  EMPTY_COMMENTS,
  EMPTY_ORDER,
  Job,
  JobStatus,
  JobComments,
  JobListSendState,
  ItemKind,
  Task,
  OrderInfo,
  PriceItem,
  Side,
  approvedTotal,
  tasksTotal,
  uid,
} from './lib/types';
import { styles } from './App.styles';
import { webPage, webScroll, webScrollContent } from './lib/webEdge';

const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  bike: 'Cykel',
  part: 'Lös del',
  trolley: 'Barnvagn',
  other: 'Övrigt',
};

function formatPrice(value: number): string {
  return `${value.toLocaleString('sv-SE')} kr`;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** The parts of the current job that are saved to Supabase. */
type JobSnapshot = {
  photoUri: string | null;
  transcript: string;
  tasks: Task[];
  inspectionTasks: Task[];
  customer: Customer | null;
  bikeNumber: string;
  bike: BikeData | null;
  inspection: InspectionState;
  inspectionTranscript: string;
  comments: JobComments;
};

/** What is already stored in Supabase for the current job. */
type RemoteJob = {
  jobId: string | null;
  imagePath: string | null;
  /** Local photo that imagePath was uploaded from. */
  uploadedPhotoUri: string | null;
  /** undefined = unknown, leave the row's customer as it is. */
  customerId: string | null | undefined;
  /** JSON of the customer as last saved. */
  customerKey: string;
};

function emptyRemote(): RemoteJob {
  return {
    jobId: null,
    imagePath: null,
    uploadedPhotoUri: null,
    customerId: null,
    customerKey: 'null',
  };
}

function jobSignature(s: JobSnapshot): string {
  return JSON.stringify(s);
}

function snapshotIsEmpty(s: JobSnapshot): boolean {
  return (
    !s.photoUri &&
    !s.bike &&
    !s.transcript &&
    s.tasks.length === 0 &&
    s.inspectionTasks.length === 0 &&
    !s.customer &&
    !s.bikeNumber.trim() &&
    Object.keys(s.inspection).length === 0 &&
    !s.inspectionTranscript &&
    !s.comments.customerComment &&
    !s.comments.mechanicComment
  );
}

/**
 * job null = start an empty job. focusBikeDetails opens and scrolls to Mer information;
 * editCustomer opens the customer modal.
 */
type LoadRequest = {
  job: Job | null;
  nonce: number;
  focusBikeDetails?: boolean;
  editCustomer?: boolean;
};

function Screen({ loadRequest }: { loadRequest: LoadRequest | null }) {
  const insets = useSafeAreaInsets();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const {
    tasks,
    setTasks,
    inspectionTasks,
    setInspectionTasks,
    setJobListSend,
    order,
    setOrder,
    itemKind,
    setItemKind,
    bikeAnalysis,
    setBikeAnalysis,
    prices,
    inspection,
    setInspection,
    inspectionTranscript,
    setInspectionTranscript,
    comments,
    setComments,
    holdSave,
    currentStatus,
    setCurrentStatus,
    setStepEmployees,
  } = useOrderContext();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const photoBase64 = useRef<string | null>(null);
  // Bumped per photo so a slow analysis of an old photo can't overwrite a newer one.
  const analysisRun = useRef(0);
  const [phase, setPhase] = useState<MicPhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [showDropIn, setShowDropIn] = useState(false);
  const [showBookings, setShowBookings] = useState(false);
  const [showManualBike, setShowManualBike] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [voiceEditId, setVoiceEditId] = useState<string | null>(null);
  const [voiceEditRecording, setVoiceEditRecording] = useState(false);
  const restored = useRef(false);
  // What has been stored in Supabase for the current job. Replaced (not
  // mutated) on Ny order, so an in-flight save of the old job can't leak in.
  const remote = useRef<RemoteJob>(emptyRemote());
  // Signature of the state last saved (or loaded), to skip no-op saves.
  const lastSig = useRef('');
  // Set when a job is loaded from the Jobb tab: loading is not an edit.
  const skipNextSave = useRef(false);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop('note', () => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  // Layout y of the photo section and of the bike details card inside it.
  const photoSectionY = useRef(0);
  const bikeDetailsY = useRef(0);
  // Bumped to expand Mer information and scroll its card to the top.
  const [focusBikeNonce, setFocusBikeNonce] = useState(0);

  const bike = bikeAnalysis.status === 'ready' ? bikeAnalysis.bike : null;
  const snapshot: JobSnapshot = {
    photoUri,
    transcript,
    tasks,
    inspectionTasks,
    customer: order.customer,
    bikeNumber: order.bikeNumber,
    bike,
    inspection,
    inspectionTranscript,
    comments,
  };
  const latest = useRef(snapshot);
  latest.current = snapshot;

  const itemKindRef = useRef(itemKind);
  itemKindRef.current = itemKind;
  const statusRef = useRef(currentStatus);
  statusRef.current = currentStatus;

  const writeDraft = useCallback(() => {
    const s = latest.current;
    const r = remote.current;
    saveDraft({
      photoUri: s.photoUri,
      itemKind: itemKindRef.current,
      bike: s.bike,
      transcript: s.transcript,
      inspectionTranscript: s.inspectionTranscript,
      comments: s.comments,
      tasks: s.tasks,
      inspectionTasks: s.inspectionTasks,
      order: { customer: s.customer, bikeNumber: s.bikeNumber, bookingId: r.jobId },
      inspection: s.inspection,
      imagePath: r.imagePath,
      uploadedPhotoUri: r.uploadedPhotoUri,
      customerId: r.customerId,
      customerKey: r.customerKey,
      jobStatus: statusRef.current,
    });
  }, []);

  // Queues a Supabase save of the snapshot; saves run one at a time so the
  // first one's insert finishes before later ones update the same row.
  const persistRemote = useCallback((s: JobSnapshot, r: RemoteJob) => {
    saveChain.current = saveChain.current.then(async () => {
      const sig = jobSignature(s);
      const current = () => remote.current === r;
      if (current()) setSaveStatus('saving');
      try {
        if (s.photoUri && s.photoUri !== r.uploadedPhotoUri && !s.photoUri.startsWith('http')) {
          r.imagePath = await uploadJobImage(s.photoUri);
          r.uploadedPhotoUri = s.photoUri;
        }
        const customerKey = JSON.stringify(s.customer);
        if (customerKey !== r.customerKey) {
          r.customerId = s.customer ? await saveCustomer(s.customer, r.customerId) : null;
          r.customerKey = customerKey;
        }
        r.jobId = await saveJob({
          jobId: r.jobId,
          imagePath: r.imagePath,
          transcript: s.transcript,
          inspectionTranscript: s.inspectionTranscript,
          comments: s.comments,
          tasks: s.tasks,
          inspectionTasks: s.inspectionTasks,
          customerId: r.customerId,
          bike: s.bike,
          bikeNumber: s.bikeNumber,
          inspection: s.inspection,
        });
        if (!current()) return;
        lastSig.current = sig;
        const jobId = r.jobId;
        setOrder((o) => (o.bookingId === jobId ? o : { ...o, bookingId: jobId }));
        // saveJob inserts as checked_in and moves a booking to checked_in.
        setCurrentStatus((st) => (!st || st === 'booked' ? 'checked_in' : st));
        writeDraft();
        setSaveStatus('saved');
      } catch (err) {
        if (!current()) return;
        // Force the next attempt even if nothing changes.
        lastSig.current = '';
        setSaveStatus('error');
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }, []);

  // Saves changes that are still waiting (e.g. held by an open note) before
  // switching job.
  const flushSave = useCallback(() => {
    const s = latest.current;
    if (jobSignature(s) === lastSig.current || snapshotIsEmpty(s)) return;
    persistRemote(s, remote.current);
  }, []);

  const retrySave = useCallback(() => {
    if (snapshotIsEmpty(latest.current)) return;
    persistRemote(latest.current, remote.current);
  }, []);

  // Restore an auto-saved draft on start.
  useEffect(() => {
    void (async () => {
      const draft = await loadDraft();
      if (draft) {
        let photo = draft.photoUri;
        // The camera photo lives in the cache folder; if the OS has cleared it,
        // fall back to the uploaded copy.
        if (photo && Platform.OS !== 'web' && photo.startsWith('file:')) {
          const info = await FileSystem.getInfoAsync(photo).catch(() => null);
          if (!info?.exists) photo = draft.imagePath ? jobImageUrl(draft.imagePath) : null;
        }
        remote.current = {
          jobId: draft.order?.bookingId ?? null,
          imagePath: draft.imagePath ?? null,
          uploadedPhotoUri: draft.uploadedPhotoUri ?? null,
          customerId: draft.customerId,
          customerKey: draft.customerKey ?? 'null',
        };
        setPhotoUri(photo);
        setItemKind(draft.itemKind ?? null);
        if (draft.bike) setBikeAnalysis({ status: 'ready', bike: draft.bike });
        setTranscript(draft.transcript);
        setTasks(draft.tasks);
        setInspectionTasks(draft.inspectionTasks ?? []);
        setInspection(draft.inspection ?? {});
        setInspectionTranscript(draft.inspectionTranscript ?? '');
        setComments(draft.comments ?? EMPTY_COMMENTS);
        setCurrentStatus(draft.jobStatus ?? (draft.order?.bookingId ? 'checked_in' : null));
        // Older drafts stored customerName/customerPhone; drop those.
        setOrder({
          bikeNumber: draft.order?.bikeNumber ?? '',
          customer: draft.order?.customer ?? null,
          bookingId: draft.order?.bookingId ?? null,
        });
      }
      restored.current = true;
    })();
  }, []);

  // Auto-save on every change (after any draft has been restored): to the
  // device at once, to Supabase when the edit is done. Most edits are already
  // whole steps (photo, closed modal, added task, tapped status); typing a
  // note or recording holds the save until the field is left / it finishes.
  useEffect(() => {
    if (!restored.current) return;
    writeDraft();
    const sig = jobSignature(latest.current);
    if (skipNextSave.current) {
      skipNextSave.current = false;
      lastSig.current = sig;
      return;
    }
    if (holdSave || phase !== 'idle') return;
    if (sig === lastSig.current || snapshotIsEmpty(latest.current)) return;
    persistRemote(latest.current, remote.current);
  }, [photoUri, itemKind, bikeAnalysis, transcript, tasks, inspectionTasks, order, inspection, inspectionTranscript, comments, holdSave, phase, currentStatus]);

  const saveDropIn = useCallback((customer: Customer, bikeNumber: string) => {
    setOrder((current) => ({ ...current, customer, bikeNumber }));
    setShowDropIn(false);
  }, []);

  // Import a booking: its customer, its tasks (before any already noted) and,
  // if the photo hasn't produced bike data, the booking's bike.
  const importBooking = useCallback((booking: Job) => {
    // From now on the booking's row is the one saved. Its customer already
    // has a row, so it is only re-saved if edited.
    remote.current.jobId = booking.id;
    remote.current.customerId = undefined;
    remote.current.customerKey = JSON.stringify(booking.customer);
    // Show the job's saved photo unless a photo has already been taken.
    if (booking.imagePath) {
      const bookingPhoto = jobImageUrl(booking.imagePath);
      if (!remote.current.imagePath) remote.current.imagePath = booking.imagePath;
      setPhotoUri((current) => current ?? bookingPhoto);
    }
    setOrder((current) => ({
      ...current,
      customer: booking.customer,
      bookingId: booking.id,
      bikeNumber: booking.bikeNumber || current.bikeNumber,
    }));
    setTasks((current) => [...booking.tasks, ...current]);
    setInspectionTasks(booking.inspectionTasks ?? []);
    setInspection(booking.inspection ?? {});
    setInspectionTranscript(booking.inspectionTranscript ?? '');
    setComments({
      customerComment: booking.customerComment,
      mechanicComment: booking.mechanicComment,
    });
    setTranscript(booking.transcript);
    setCurrentStatus(booking.status);
    if (booking.bike) {
      setItemKind((current) => current ?? 'bike');
      setBikeAnalysis((current) =>
        current.status === 'ready' ? current : { status: 'ready', bike: booking.bike! }
      );
    }
    setShowBookings(false);
  }, []);

  const newOrder = useCallback(() => {
    flushSave();
    remote.current = emptyRemote();
    lastSig.current = '';
    setSaveStatus('idle');
    clearDraft();
    setPhotoUri(null);
    analysisRun.current += 1;
    photoBase64.current = null;
    setItemKind(null);
    setBikeAnalysis({ status: 'idle' });
    setTranscript('');
    setTasks([]);
    setInspectionTasks([]);
    setJobListSend(null);
    setInspection({});
    setInspectionTranscript('');
    setComments(EMPTY_COMMENTS);
    setOrder(EMPTY_ORDER);
    setCurrentStatus(null);
    setStepEmployees(EMPTY_STEP_EMPLOYEES);
    setError('');
  }, []);

  // Started from the Jobb modal: replace the current order with that job.
  useEffect(() => {
    if (!loadRequest) return;
    newOrder();
    if (loadRequest.job) {
      importBooking(loadRequest.job);
      skipNextSave.current = true;
    }
    if (loadRequest.focusBikeDetails) setFocusBikeNonce(loadRequest.nonce);
    if (loadRequest.editCustomer) setShowDropIn(true);
  }, [loadRequest, newOrder, importBooking]);

  // Wait for the tab to lay out and the card to expand before scrolling.
  useEffect(() => {
    if (!focusBikeNonce) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: photoSectionY.current + bikeDetailsY.current,
        animated: true,
      });
      setFocusBikeNonce(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [focusBikeNonce]);

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
      // Tasks are added to the job, so the spoken text is added too.
      setTranscript((current) => `${current} ${text}`.trim());

      setPhase('analyzing');
      const newTasks = await analyzeTranscript(text, prices);
      setTasks((current) => [...current, ...newTasks]);
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
  const toggleTaskVoice = useCallback(
    async (taskId: string) => {
      const task = tasks.find((item) => item.id === taskId);
      if (!task) return;

      if (voiceEditId === taskId && voiceEditRecording) {
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

          const updated = await refineTask(task, text, prices);
          setTasks((current) =>
            current.map((item) => (item.id === taskId ? updated : item))
          );
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
        setVoiceEditId(taskId);
        setVoiceEditRecording(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [tasks, phase, recorder, useWebSpeech, voiceEditId, voiceEditRecording, prices]
  );

  const removeTask = useCallback((taskId: string) => {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  }, []);

  const addProduct = useCallback((taskId: string, name: string, price: number, quantity?: number) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? { ...task, products: [...task.products, { id: uid(), name, price, quantity }] }
          : task
      )
    );
  }, []);

  const updateProduct = useCallback(
    (taskId: string, productId: string, price: number) => {
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? {
              ...task,
              products: task.products.map((product) =>
                product.id === productId ? { ...product, price } : product
              ),
            }
            : task
        )
      );
    },
    []
  );

  const removeProduct = useCallback((taskId: string, productId: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? { ...task, products: task.products.filter((p) => p.id !== productId) }
          : task
      )
    );
  }, []);

  const setSide = useCallback((taskId: string, side: Side) => {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? setTaskSide(task, side) : task))
    );
  }, []);

  const pickTask = useCallback((item: PriceItem) => {
    setTasks((current) => [...current, taskFromPriceItem(item)]);
    setShowAddTask(false);
  }, []);

  const total = tasksTotal(tasks);
  const approved = approvedTotal(tasks);
  const hasRejected = tasks.some((task) => task.approval === 'nekad');

  return (
    <View style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={webScroll}
          ref={scrollRef}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[webScrollContent, 
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
            {transcript || tasks.length > 0 || photoUri || bike ? (
              <Pressable onPress={newOrder} style={styles.newOrder} hitSlop={8}>
                <Ionicons name="add" size={15} color={colors.textSoft} />
                <Text style={styles.newOrderText}>Ny order</Text>
              </Pressable>
            ) : null}
          </View>

          <LockedBanner tab="note" />

          <StepLock tab="note" gap={20}>
            <StepEmployeePicker tab="note" />
            <View
              style={styles.photoSection}
              onLayout={(e) => (photoSectionY.current = e.nativeEvent.layout.y)}
            >
              <PhotoCard
                uri={photoUri}
                onTakePhoto={takePhoto}
                onAddManually={bike ? undefined : () => setShowManualBike(true)}
              />
              {photoUri && itemKind && itemKind !== 'bike' ? (
                <View style={styles.bikeDetailsCard}>
                  <Text style={styles.itemKindText}>{ITEM_KIND_LABELS[itemKind]}</Text>
                </View>
              ) : null}
              {(photoUri || bike) && bikeAnalysis.status !== 'idle' ? (
                <View
                  style={styles.bikeDetailsCard}
                  onLayout={(e) => (bikeDetailsY.current = e.nativeEvent.layout.y)}
                >
                  <BikeDetails
                    key={photoUri ?? 'manual'}
                    expandNonce={focusBikeNonce}
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

          </StepLock>

          {/* Outside the lock: the transcript can be read while Mottagning is Klar. */}
          {transcript ? (
            <View style={styles.transcriptBox}>
              <Pressable
                onPress={() => setTranscriptOpen((open) => !open)}
                style={styles.transcriptHeader}
                hitSlop={8}
              >
                <Text style={styles.transcriptLabel}>TRANSKRIPTION</Text>
                <Ionicons
                  name={transcriptOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textFaint}
                />
              </Pressable>
              {transcriptOpen ? (
                <Text style={styles.transcriptText}>{transcript}</Text>
              ) : null}
            </View>
          ) : null}

          <StepLock tab="note" gap={20}>
            {tasks.length > 0 ? (
              <View style={styles.tasksSection}>
                <Text style={styles.sectionHeading}>Jobb</Text>
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onRemove={removeTask}
                    onAddProduct={addProduct}
                    onRemoveProduct={removeProduct}
                    onUpdateProduct={updateProduct}
                    voiceState={
                      voiceEditId === task.id
                        ? voiceEditRecording
                          ? 'recording'
                          : 'processing'
                        : undefined
                    }
                    onVoiceEdit={toggleTaskVoice}
                    onSetSide={setSide}
                  />
                ))}
              </View>
            ) : null}

            <FitPressable onPress={() => setShowAddTask(true)} style={styles.addTask}>
              <Ionicons name="add-circle-outline" size={20} color={colors.accentLight} />
              <Text style={styles.addTaskText}>{STRINGS.addActionManually}</Text>
            </FitPressable>

            {tasks.length > 0 ? (
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
              </View>
            ) : null}

          </StepLock>

          <DoneButton tab="note" alignRight />

          {saveStatus === 'error' ? (
            <Pressable onPress={retrySave} style={styles.saveStatus}>
              <Ionicons name="cloud-offline-outline" size={16} color={colors.danger} />
              <Text style={[styles.saveStatusText, styles.saveStatusError]}>
                Kunde inte spara – tryck för att försöka igen
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <AddTaskModal
        visible={showAddTask}
        prices={prices}
        onClose={() => setShowAddTask(false)}
        onPick={pickTask}
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
      <ManualBikeModal
        visible={showManualBike}
        initial={bike}
        onClose={() => setShowManualBike(false)}
        onSave={(data) => {
          // A manual entry wins over any analysis still running.
          analysisRun.current++;
          setItemKind('bike');
          setBikeAnalysis({ status: 'ready', bike: data });
        }}
      />
    </View>
  );
}

type Tab = 'note' | 'inspect' | 'jobList' | 'messages' | 'jobs';

// In the browser the tabs sit on top as a text nav, like BikeOffice's header.
const IS_WEB = Platform.OS === 'web';

const TABS: { key: Tab; label: string; icon: string; iconActive: string }[] = [
  { key: 'jobs', label: 'Jobb', icon: 'file-tray-full-outline', iconActive: 'file-tray-full' },
  { key: 'note', label: 'Mottagning', icon: 'mic-outline', iconActive: 'mic' },
  { key: 'inspect', label: 'Besiktning', icon: 'clipboard-outline', iconActive: 'clipboard' },
  { key: 'jobList', label: 'Jobblista', icon: 'list-outline', iconActive: 'list' },
  { key: 'messages', label: 'Meddelande', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
];

function Root() {
  const insets = useSafeAreaInsets();
  // 'settings' is browser-only and opened from the cog, not a tab.
  const [tab, setTab] = useState<Tab | 'settings'>('note');
  const [scrollToTop, setScrollToTop] = useState<ScrollToTopRequest>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inspectionTasks, setInspectionTasks] = useState<Task[]>([]);
  const [jobListSend, setJobListSend] = useState<JobListSendState | null>(null);
  const [order, setOrder] = useState<OrderInfo>(EMPTY_ORDER);
  const [itemKind, setItemKind] = useState<ItemKind | null>(null);
  const [bikeAnalysis, setBikeAnalysis] = useState<BikeAnalysisState>({
    status: 'idle',
  });
  const prices = useMemo(
    () => pricesFor(itemKind, bikeAnalysis.status === 'ready' ? bikeAnalysis.bike.bike : null),
    [itemKind, bikeAnalysis]
  );

  const [inspection, setInspection] = useState<InspectionState>({});
  const [inspectionTranscript, setInspectionTranscript] = useState('');
  const [comments, setComments] = useState<JobComments>(EMPTY_COMMENTS);
  // Comment opened from the bike bar; null when closed.
  const [barNote, setBarNote] = useState<NoteEntry[] | null>(null);
  const [holdSave, setHoldSave] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<JobStatus | null>(null);
  const [stepEmployees, setStepEmployees] = useState<StepEmployees>(EMPTY_STEP_EMPLOYEES);

  // Who did each step is read from the job whenever it becomes current. A
  // choice made before a new job had its row is kept (Ny order clears it).
  useEffect(() => {
    const id = order.bookingId;
    if (!id) return;
    let cancelled = false;
    fetchStepEmployees(id)
      .then((loaded) => {
        if (cancelled) return;
        setStepEmployees((current) => ({
          note: loaded.note ?? current.note,
          inspect: loaded.inspect ?? current.inspect,
          jobList: loaded.jobList ?? current.jobList,
        }));
      })
      .catch(() => {
        // Offline: Klar asks again.
      });
    return () => {
      cancelled = true;
    };
  }, [order.bookingId]);

  const goToJobList = useCallback(() => setTab('jobList'), []);
  // Klar on Mottagning: Besiktning starts from the top.
  const [inspectionScrollReset, setInspectionScrollReset] = useState(0);
  const goToInspection = useCallback(() => {
    setInspectionScrollReset((n) => n + 1);
    setTab('inspect');
  }, []);

  // The stored status is the truth: re-read it for the current job on every
  // tab switch (and on start), so a local copy can never be stale.
  useEffect(() => {
    const id = order.bookingId;
    if (!id) return;
    let cancelled = false;
    fetchJobStatus(id)
      .then((status) => {
        if (!cancelled && status) setCurrentStatus(status);
      })
      .catch(() => {
        // Offline: keep the status we have.
      });
    return () => {
      cancelled = true;
    };
  }, [tab, order.bookingId]);
  const [loadRequest, setLoadRequest] = useState<LoadRequest | null>(null);

  const startCheckIn = useCallback((job: Job) => {
    setLoadRequest({ job, nonce: Date.now() });
    setTab('note');
  }, []);

  // Edit button on the job's bike details: Mottagning with Mer information open.
  const editBikeDetails = useCallback((job: Job) => {
    setLoadRequest({ job, nonce: Date.now(), focusBikeDetails: true });
    setTab('note');
  }, []);

  // Tapping the job modal's header: Mottagning with the customer modal open.
  const editCustomer = useCallback((job: Job) => {
    setLoadRequest({ job, nonce: Date.now(), editCustomer: true });
    setTab('note');
  }, []);

  const startInspection = useCallback((job: Job) => {
    setLoadRequest({ job, nonce: Date.now() });
    setTab('inspect');
  }, []);

  const openJobList = useCallback((job: Job) => {
    setLoadRequest({ job, nonce: Date.now() });
    setTab('jobList');
  }, []);

  const startNewJob = useCallback(() => {
    setLoadRequest({ job: null, nonce: Date.now() });
    setTab('note');
  }, []);

  // Make a saved job the current bike without leaving the Jobb tab.
  const selectBike = useCallback((job: Job) => {
    setLoadRequest({ job, nonce: Date.now() });
  }, []);

  // Tapping the bike bar: show the current job in the Jobb tab.
  const [openJobRequest, setOpenJobRequest] = useState<{ id: string; nonce: number } | null>(null);
  const openCurrentJob = useCallback(() => {
    if (order.bookingId) setOpenJobRequest({ id: order.bookingId, nonce: Date.now() });
  }, [order.bookingId]);

  // A deleted job can't stay the current bike.
  const jobDeleted = useCallback(
    (id: string) => {
      if (order.bookingId === id) setLoadRequest({ job: null, nonce: Date.now() });
    },
    [order.bookingId]
  );

  const currentBike = bikeAnalysis.status === 'ready' ? bikeAnalysis.bike.bike : null;
  const hasCurrentBike = order.customer !== null || currentBike !== null;

  const currentBikeBar = (
    <CurrentBikeBar
      customer={order.customer}
      bike={currentBike}
      bikeNumber={order.bikeNumber}
      status={currentStatus}
      topInset={IS_WEB ? 0 : insets.top}
      compact={IS_WEB}
      onPress={openCurrentJob}
      comments={tab === 'note' || tab === 'inspect' || tab === 'jobList' ? comments : null}
      onOpenComment={(field) =>
        setBarNote([
          field === 'customerComment'
            ? // Written by the customer when booking: read-only.
            { title: 'Kundkommentar', text: comments.customerComment }
            : { title: 'Verkstadskommentar', text: comments.mechanicComment, field },
        ])
      }
    />
  );

  return (
    <OrderContext.Provider
      value={{
        tasks,
        setTasks,
        inspectionTasks,
        setInspectionTasks,
        jobListSend,
        setJobListSend,
        order,
        setOrder,
        goToJobList,
        goToInspection,
        itemKind,
        setItemKind,
        bikeAnalysis,
        setBikeAnalysis,
        prices,
        inspection,
        setInspection,
        inspectionTranscript,
        setInspectionTranscript,
        comments,
        setComments,
        holdSave,
        setHoldSave,
        currentStatus,
        setCurrentStatus,
        stepEmployees,
        setStepEmployees,
      }}
    >
      <View style={[styles.root, webPage]}>
        <StatusBar style="light" />

        {IS_WEB ? (
          <View style={styles.topNav}>
            {TABS.map((item) => {
              const isActive = tab === item.key;
              const done = item.key in STEP_STATUS && stepDone(item.key as StepTab, currentStatus);
              return (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    if (isActive) setScrollToTop({ tab: item.key, nonce: Date.now() });
                    else setTab(item.key);
                  }}
                  style={[styles.topNavItem, isActive && styles.topNavItemActive]}
                >
                  <Text style={[styles.topNavLabel, isActive && styles.topNavLabelActive]}>
                    {item.label}
                  </Text>
                  {done ? <Ionicons name="checkmark" size={12} color={colors.accentLight} /> : null}
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setTab('settings')}
              hitSlop={10}
              style={styles.topNavPushRight}
            >
              <Ionicons
                name={tab === 'settings' ? 'settings' : 'settings-outline'}
                size={20}
                color={tab === 'settings' ? colors.text : colors.textFaint}
              />
            </Pressable>
          </View>
        ) : null}

        {/* Settings shows the bar in its own title row instead. */}
        {hasCurrentBike && tab !== 'settings' ? currentBikeBar : null}
        <JobNotesModal
          entries={barNote}
          listTitle=""
          onSave={(field, text) => setComments((current) => ({ ...current, [field]: text }))}
          onClose={() => setBarNote(null)}
        />

        {/* The bar already covers the status bar area, so screens skip it. */}
        <SafeAreaInsetsContext.Provider
          value={hasCurrentBike ? { ...insets, top: 0 } : insets}
        >
        <ScrollToTopContext.Provider value={scrollToTop}>

          <View style={[styles.page, tab !== 'note' && styles.pageHidden]}>
            <Screen loadRequest={loadRequest} />
          </View>
          <View style={[styles.page, tab !== 'inspect' && styles.pageHidden]}>
            <InspectionScreen scrollReset={inspectionScrollReset} />
          </View>
          <View style={[styles.page, tab !== 'jobList' && styles.pageHidden]}>
            <JobListScreen active={tab === 'jobList'} />
          </View>
          <View style={[styles.page, tab !== 'messages' && styles.pageHidden]}>
            <MessagesScreen active={tab === 'messages'} />
          </View>
          <View style={[styles.page, tab !== 'jobs' && styles.pageCollapsed]}>
            <JobsScreen
              active={tab === 'jobs'}
              onStartCheckIn={startCheckIn}
              onEditBikeDetails={editBikeDetails}
              onEditCustomer={editCustomer}
              onStartInspection={startInspection}
              onOpenJobList={openJobList}
              onSelectBike={selectBike}
              onNewJob={startNewJob}
              onJobDeleted={jobDeleted}
              openRequest={openJobRequest}
            />
          </View>
          {IS_WEB && tab === 'settings' ? <SettingsScreen headerRight={hasCurrentBike ? currentBikeBar : null} /> : null}
        </ScrollToTopContext.Provider>
        </SafeAreaInsetsContext.Provider>

        {IS_WEB ? null : (
        <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom - 22, 6) }]}>
          {TABS.map((item) => {
            const isActive = tab === item.key;
            const done = item.key in STEP_STATUS && stepDone(item.key as StepTab, currentStatus);
            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  // Pressing the tab already shown scrolls it to the top.
                  if (isActive) setScrollToTop({ tab: item.key, nonce: Date.now() });
                  else setTab(item.key);
                }}
                style={[styles.tabItem, item.key === 'jobs' && styles.tabItemNarrow]}
              >
                <View style={[styles.tabIcon, done && styles.tabIconDone]}>
                  <Ionicons
                    name={(isActive ? item.iconActive : item.icon) as never}
                    size={22}
                    color={isActive ? colors.accentLight : colors.textFaint}
                  />
                  {done ? (
                    <View style={styles.tabCheck}>
                      <Ionicons name="checkmark" size={10} color={colors.onAccent} />
                    </View>
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.tabLabel,
                    item.key === 'messages' && styles.tabLabelSmall,
                    isActive && styles.tabLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        )}
      </View>
    </OrderContext.Provider>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
  });
  // On a load error, fall back to system fonts rather than a blank app.
  if (!fontsLoaded && !fontError) return null;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/** Login first; only users on the snapbike_staff allowlist reach the app. */
function AuthGate() {
  const { session, loading, signOut } = useAuth();
  const userId = session?.user.id ?? null;
  const [staff, setStaff] = useState<boolean | null>(null);

  useEffect(() => {
    setStaff(null);
    if (!userId) return;
    let cancelled = false;
    isStaff()
      .then((ok) => {
        if (!cancelled) setStaff(ok);
      })
      .catch((err) => {
        console.warn(err instanceof Error ? err.message : err);
        if (!cancelled) setStaff(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Keeps the store's in-stock list cached on the phone for the product search.
  useEffect(() => {
    if (!userId || !staff) return;
    return startInStockSync(userId);
  }, [userId, staff]);

  if (loading || (userId && staff === null)) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }
  if (!session) return <AuthView />;
  if (!staff) {
    return (
      <View style={[styles.root, styles.centered]}>
        <StatusBar style="light" />
        <Text style={styles.noAccessText}>
          {`${session.user.email ?? 'Kontot'} har inte åtkomst till SnapBike.`}
        </Text>
        <Pressable onPress={() => void signOut()} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Logga ut</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <StaffProvider userId={session.user.id}>
      <Root />
    </StaffProvider>
  );
}
