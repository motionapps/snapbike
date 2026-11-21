import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { STEP_STATUS, StepTab, stepDone } from '../lib/jobSteps';
import { useOrderContext } from '../lib/orderContext';
import { setJobStatus } from '../lib/supabase';
import { colors, radius } from '../lib/theme';

/** Whether the tab is marked Klar for the current job, i.e. read-only. */
export function useStepLocked(tab: StepTab): boolean {
  return stepDone(tab, useOrderContext().currentStatus);
}

/** Wraps a tab's content; blocks every touch while the tab is Klar. */
export function StepLock({ tab, gap, children }: { tab: StepTab; gap: number; children: ReactNode }) {
  const locked = useStepLocked(tab);
  return (
    <View pointerEvents={locked ? 'none' : 'auto'} style={{ gap }}>
      {children}
    </View>
  );
}

/** Klar / Lås upp at the bottom of a tab: moves the job's status on or back. */
export function DoneButton({ tab }: { tab: StepTab }) {
  const { order, currentStatus, setCurrentStatus } = useOrderContext();
  const [error, setError] = useState('');
  const done = stepDone(tab, currentStatus);
  const jobId = order.bookingId;

  const toggle = () => {
    if (!jobId) return;
    const previous = currentStatus;
    const next = done ? STEP_STATUS[tab].undo : STEP_STATUS[tab].done;
    setError('');
    setCurrentStatus(next);
    setJobStatus(jobId, next).catch((err) => {
      setCurrentStatus(previous);
      setError(err instanceof Error ? err.message : String(err));
    });
  };

  return (
    <View style={styles.wrap}>
      <Pressable
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
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    paddingVertical: 14,
  },
  buttonDone: {
    backgroundColor: colors.accent,
  },
  buttonUnlock: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
  textDone: {
    color: colors.onAccent,
  },
  textUnlock: {
    color: colors.text,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
});
