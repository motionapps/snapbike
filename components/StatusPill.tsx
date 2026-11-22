import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActionSheetIOS,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { colors, statusColors } from '../lib/theme';
import { JOB_STATUSES, JobStatus, STATUS_LABELS } from '../lib/types';
import { styles } from './StatusPill.styles';

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
                  <Ionicons name="checkmark" size={17} color={colors.accentLight} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
