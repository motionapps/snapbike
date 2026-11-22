import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { fetchJobs } from '../lib/supabase';
import { colors } from '../lib/theme';
import { Job } from '../lib/types';
import { styles } from './BookingPickerModal.styles';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (booking: Job) => void;
};

/** Lists jobs with status "Bokad" so one can be imported into the order. */
export function BookingPickerModal({ visible, onClose, onPick }: Props) {
  const [bookings, setBookings] = useState<Job[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setBookings(null);
    setError('');
    fetchJobs('booked')
      .then(setBookings)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.heading}>Hämta bokning</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.close}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {bookings === null && !error ? (
          <ActivityIndicator color={colors.accentLight} style={styles.loading} />
        ) : (
          <FlatList
            data={bookings ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.empty}>Inga bokningar just nu</Text>
            }
            renderItem={({ item }) => {
              const c = item.customer;
              const name = c
                ? [c.firstName, c.lastName].filter(Boolean).join(' ')
                : 'Utan kund';
              return (
                <Pressable
                  onPress={() => onPick(item)}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{name}</Text>
                    <Text style={styles.rowMeta}>
                      {[
                        c?.phone,
                        new Date(item.createdAt).toLocaleDateString('sv-SE'),
                        `${item.tasks.length} jobb`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}
