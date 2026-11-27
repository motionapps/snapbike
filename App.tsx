import { Ionicons } from '@expo/vector-icons';
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold';
import { Archivo_800ExtraBold } from '@expo-google-fonts/archivo/800ExtraBold';
import { IBMPlexSans_400Regular } from '@expo-google-fonts/ibm-plex-sans/400Regular';
import { IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans/600SemiBold';
import { IBMPlexSans_700Bold } from '@expo-google-fonts/ibm-plex-sans/700Bold';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaInsetsContext,
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { AuthView } from './components/AuthView';
import { BikeAnalysisState } from './components/BikeDetails';
import { CheckInScreen } from './components/CheckInScreen';
import { CurrentBikeBar } from './components/CurrentBikeBar';
import { InspectionScreen } from './components/InspectionScreen';
import { JobListScreen } from './components/JobListScreen';
import { JobNotesModal, NoteEntry } from './components/JobNotesModal';
import { JobsScreen } from './components/JobsScreen';
import { MessagesScreen } from './components/MessagesScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { StaffProvider } from './components/StaffProvider';
import { AuthProvider, useAuth } from './lib/auth/AuthProvider';
import { EMPTY_STEP_EMPLOYEES, fetchStepEmployees, StepEmployees } from './lib/employees';
import { startInStockSync } from './lib/inStockCache';
import { InspectionState } from './lib/inspection';
import { LoadRequest } from './lib/jobSnapshot';
import { STEP_STATUS, StepTab, stepDone } from './lib/jobSteps';
import { OrderContext } from './lib/orderContext';
import { pricesFor } from './lib/prices';
import { ScrollToTopContext, ScrollToTopRequest } from './lib/scrollToTop';
import { fetchJobStatus, isStaff } from './lib/supabase';
import { colors } from './lib/theme';
import {
  EMPTY_COMMENTS,
  EMPTY_ORDER,
  Job,
  JobComments,
  JobListSendState,
  JobStatus,
  ItemKind,
  OrderInfo,
  Task,
} from './lib/types';
import { webPage } from './lib/webEdge';
import { styles } from './App.styles';

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

  // Fades the new view in after the job modal has closed and switched tab.
  const pageFade = useRef(new Animated.Value(1)).current;
  const fadeInPage = useCallback(() => {
    pageFade.setValue(0);
    Animated.timing(pageFade, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [pageFade]);

  const startCheckIn = useCallback((job: Job) => {
    setLoadRequest({ job, nonce: Date.now() });
    setTab('note');
    fadeInPage();
  }, [fadeInPage]);

  // Edit button on the job's bike details: Mottagning with Mer information open.
  const editBikeDetails = useCallback((job: Job) => {
    setLoadRequest({ job, nonce: Date.now(), focusBikeDetails: true });
    setTab('note');
    fadeInPage();
  }, [fadeInPage]);

  // Tapping the job modal's header: Mottagning with the customer modal open.
  const editCustomer = useCallback((job: Job) => {
    setLoadRequest({ job, nonce: Date.now(), editCustomer: true });
    setTab('note');
    fadeInPage();
  }, [fadeInPage]);

  const startInspection = useCallback((job: Job) => {
    setLoadRequest({ job, nonce: Date.now() });
    setTab('inspect');
    fadeInPage();
  }, [fadeInPage]);

  const openJobList = useCallback((job: Job) => {
    setLoadRequest({ job, nonce: Date.now() });
    setTab('jobList');
    fadeInPage();
  }, [fadeInPage]);

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

          <Animated.View style={[styles.page, { opacity: pageFade }]}>
          <View style={[styles.page, tab !== 'note' && styles.pageHidden]}>
            <CheckInScreen loadRequest={loadRequest} />
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
          </Animated.View>
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
