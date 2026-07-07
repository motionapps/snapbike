import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActionSheetIOS,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radius, statusColors } from '../lib/theme';
import { JOB_STATUSES, JobStatus, STATUS_LABELS } from '../lib/types';

type Props = {
  status: JobStatus;
  onChange: (status: JobStatus) => void;
};

/**
 * Tappable status chip with a lifecycle progress track. Opens the native
 * action sheet on iOS and a themed modal sheet on Android.
 */
export function StatusPill({ status, onChange }: Props) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const stepIndex = JOB_STATUSES.indexOf(status);

  const open = useCallback(() => {
    if (Platform.OS === 'ios') {
      const labels = JOB_STATUSES.map((s) =>
        s === status ? `${STATUS_LABELS[s]} ✓` : STATUS_LABELS[s]
      );
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Ändra status',
          options: [...labels, 'Avbryt'],
          cancelButtonIndex: labels.length,
        },
        (index) => {
          const next = JOB_STATUSES[index];
          if (next && next !== status) onChange(next);
        }
      );
    } else {
      setSheetVisible(true);
    }
  }, [status, onChange]);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={open}
        hitSlop={6}
        style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
      >
        <View style={[styles.dot, { backgroundColor: statusColors[status] }]} />
        <Text style={styles.pillText}>{STATUS_LABELS[status]}</Text>
        <Ionicons name="chevron-expand" size={13} color={colors.textFaint} />
      </Pressable>

      <View style={styles.track}>
        {JOB_STATUSES.map((s, index) => (
          <View
            key={s}
            style={[
              styles.segment,
              index <= stepIndex && { backgroundColor: statusColors[status] },
            ]}
          />
        ))}
      </View>

      <Modal
        visible={sheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSheetVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setSheetVisible(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Ändra status</Text>
            {JOB_STATUSES.map((s) => (
              <Pressable
                key={s}
                onPress={() => {
                  setSheetVisible(false);
                  if (s !== status) onChange(s);
                }}
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.optionPressed,
                ]}
              >
                <View style={[styles.dot, { backgroundColor: statusColors[s] }]} />
                <Text style={styles.optionText}>{STATUS_LABELS[s]}</Text>
                {s === status ? (
                  <Ionicons name="checkmark" size={17} color={colors.accent} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.cardRaised,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillPressed: {
    opacity: 0.7,
  },
  pillText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  track: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.cardRaised,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 2,
  },
  sheetTitle: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    padding: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  optionPressed: {
    backgroundColor: colors.cardRaised,
  },
  optionText: {
    flex: 1,
    color: colors.text,
    fontWeight: '600',
  },
});
