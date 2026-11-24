import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import { Pressable, StyleProp, Text, useWindowDimensions, View, ViewStyle } from 'react-native';
import { STEP_STATUS, StepTab, stepDone } from '../lib/jobSteps';
import { useOrderContext } from '../lib/orderContext';
import { setJobStatus } from '../lib/supabase';
import { colors, PHONE_MAX_WIDTH } from '../lib/theme';
import { styles } from './StepDone.styles';
import { FitPressable } from './FitPressable';

/** Whether the tab is marked Klar for the current job, i.e. read-only. */
export function useStepLocked(tab: StepTab): boolean {
  return stepDone(tab, useOrderContext().currentStatus);
}

/** Wraps a tab's content; blocks every touch while the tab is Klar. */
export function StepLock({ tab, gap, children }: { tab: StepTab; gap: number; children: ReactNode }) {
  const locked = useStepLocked(tab);
  return (
    <View pointerEvents={locked ? 'none' : 'auto'} style={{ gap, opacity: locked ? 0.4 : 1 }}>
      {children}
    </View>
  );
}

/** Grey "Låst" strip under a tab's header while the tab is Klar. */
export function LockedBanner({ tab, style }: { tab: StepTab; style?: StyleProp<ViewStyle> }) {
  if (!useStepLocked(tab)) return null;
  return (
    <View style={[styles.banner, style]}>
      <Ionicons name="lock-closed" size={12} color={colors.text} />
      <Text style={styles.bannerText}>LÅST · LÅS UPP LÄNGST NER</Text>
    </View>
  );
}

/** Marks a tab Klar (true) or unlocks it (false) by moving the job's status. */
export function useSetStepDone(tab: StepTab) {
  const { order, currentStatus, setCurrentStatus } = useOrderContext();
  const jobId = order.bookingId;
  return (done: boolean): Promise<void> => {
    if (!jobId) return Promise.resolve();
    const previous = currentStatus;
    const next = done ? STEP_STATUS[tab].done : STEP_STATUS[tab].undo;
    setCurrentStatus(next);
    return setJobStatus(jobId, next).catch((err) => {
      setCurrentStatus(previous);
      throw err;
    });
  };
}

/** Klar / Lås upp at the bottom of a tab: moves the job's status on or back. */
/** alignRight: on wider screens the fitted button sits at the right edge instead of centred. */
export function DoneButton({ tab, alignRight = false }: { tab: StepTab; alignRight?: boolean }) {
  const { order, goToInspection, goToJobList } = useOrderContext();
  const [error, setError] = useState('');
  const done = useStepLocked(tab);
  const setStepDone = useSetStepDone(tab);
  const jobId = order.bookingId;
  const { width } = useWindowDimensions();

  const toggle = () => {
    setError('');
    // Klar moves on to the next step: Mottagning → Besiktning → Jobblista.
    if (!done) {
      if (tab === 'note') goToInspection();
      if (tab === 'inspect') goToJobList();
    }
    setStepDone(!done).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
    });
  };

  return (
    <View style={[styles.wrap, alignRight && width >= PHONE_MAX_WIDTH && styles.wrapRight]}>
      <FitPressable
        onPress={toggle}
        disabled={!jobId}
        style={({ pressed }) => [
          styles.button,
          done ? styles.buttonUnlock : styles.buttonDone,
          !jobId && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
      >
        <Ionicons
          name={done ? 'lock-open-outline' : 'checkmark'}
          size={18}
          color={done ? colors.text : colors.onAccent}
        />
        <Text style={[styles.text, done ? styles.textUnlock : styles.textDone]}>
          {done ? 'Lås upp' : 'Klar'}
        </Text>
      </FitPressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
