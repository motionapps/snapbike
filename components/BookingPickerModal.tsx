import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchEstimates } from '../lib/supabase';
import { colors, radius } from '../lib/theme';
import { Estimate } from '../lib/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (booking: Estimate) => void;
};

/** Lists jobs with status "Bokad" so one can be imported into the order. */
export function BookingPickerModal({ visible, onClose, onPick }: Props) {
  const [bookings, setBookings] = useState<Estimate[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setBookings(null);
    setError('');
    fetchEstimates('booked')
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
          <ActivityIndicator color={colors.accent} style={styles.loading} />
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
                        `${item.jobs.length} jobb`,
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

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  heading: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
    fontSize: 18,
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },
  loading: {
    marginTop: 40,
  },
  error: {
    color: colors.danger,
    paddingHorizontal: 20,
  },
  empty: {
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: 40,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowPressed: {
    backgroundColor: colors.cardRaised,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  rowMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
