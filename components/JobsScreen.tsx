import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchEstimates,
  setEstimateStatus,
  updateEstimateJobs,
} from '../lib/supabase';
import { colors, gutter, radius } from '../lib/theme';
import { Estimate, Job, JobStatus, jobsTotal } from '../lib/types';
import { EstimateCard } from './EstimateCard';
import { EstimateDetailModal } from './EstimateDetailModal';

type Props = {
  active: boolean;
  onStartCheckIn: (estimate: Estimate) => void;
  onStartInspection: (estimate: Estimate) => void;
  onSelectBike: (estimate: Estimate) => void;
};

type Filter = 'active' | 'ready' | 'all';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'active', label: 'Aktiva' },
  { key: 'ready', label: 'Klara' },
  { key: 'all', label: 'Alla' },
];

function matchesFilter(estimate: Estimate, filter: Filter): boolean {
  if (filter === 'active') {
    return estimate.status !== 'ready' && estimate.status !== 'delivered';
  }
  if (filter === 'ready') return estimate.status === 'ready';
  return true;
}

/** Lowercased text of customer, bike and jobs, for the free-text search. */
function searchText(estimate: Estimate): string {
  const parts: string[] = [];
  const customer = estimate.customer;
  if (customer) {
    parts.push(customer.firstName, customer.lastName, customer.phone, customer.email);
  }
  const bike = estimate.bike?.bike;
  if (bike) {
    parts.push(bike.brand, bike.bike_type, bike.color);
  }
  for (const job of estimate.jobs) parts.push(job.title);
  return parts.join(' ').toLowerCase();
}

export function JobsScreen({ active, onStartCheckIn, onStartInspection, onSelectBike }: Props) {
  const insets = useSafeAreaInsets();
  const [estimates, setEstimates] = useState<Estimate[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('active');
  const [query, setQuery] = useState('');
  const [tagQuery, setTagQuery] = useState('');

  const visible = useMemo(() => {
    if (!estimates) return [];
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const tag = tagQuery.trim();
    return estimates.filter((estimate) => {
      if (!matchesFilter(estimate, filter)) return false;
      if (tag && estimate.bikeNumber !== tag) return false;
      if (words.length === 0) return true;
      const text = searchText(estimate);
      // Phone numbers are matched without spaces or dashes too.
      const digits = text.replace(/[\s-]/g, '');
      return words.every((word) => text.includes(word) || digits.includes(word));
    });
  }, [estimates, filter, query, tagQuery]);

  const load = useCallback(async () => {
    try {
      setError('');
      setEstimates(await fetchEstimates());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const changeStatus = useCallback(
    (id: string, status: JobStatus) => {
      setEstimates((current) =>
        current
          ? current.map((e) => (e.id === id ? { ...e, status } : e))
          : current
      );
      setEstimateStatus(id, status).catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        void load();
      });
    },
    [load]
  );

  const updateJobs = useCallback(
    (id: string, jobs: Job[]) => {
      setEstimates((current) =>
        current
          ? current.map((e) =>
              e.id === id ? { ...e, jobs, total: jobsTotal(jobs) } : e
            )
          : current
      );
      updateEstimateJobs(id, jobs).catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        void load();
      });
    },
    [load]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Estimate>) => (
      <EstimateCard
        estimate={item}
        onChangeStatus={changeStatus}
        onPress={setOpenId}
      />
    ),
    [changeStatus]
  );

  const openEstimate =
    estimates?.find((estimate) => estimate.id === openId) ?? null;

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.titleRow,
          { paddingTop: Platform.OS === 'android' ? insets.top + 16 : insets.top + 8 },
        ]}
      >
        <Text style={styles.title}>Jobb</Text>
        <Text style={styles.subtitle}>
          {estimates ? `${visible.length} st` : ''}
        </Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((item) => {
          const selected = filter === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={[styles.filterChip, selected && styles.filterChipActive]}
            >
              <Text
                style={[styles.filterText, selected && styles.filterTextActive]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchBox, styles.searchMain]}>
          <Ionicons name="search" size={16} color={colors.textFaint} />
          <TextInput
            style={styles.searchInput}
            placeholder="Namn, telefon, cykel…"
            placeholderTextColor={colors.textFaint}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <View style={[styles.searchBox, styles.searchTag]}>
          <Ionicons name="pricetag-outline" size={16} color={colors.textFaint} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tag"
            placeholderTextColor={colors.textFaint}
            value={tagQuery}
            onChangeText={(text) => setTagQuery(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            returnKeyType="search"
          />
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="warning-outline" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {estimates === null && !error ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.accent}
            />
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bicycle-outline" size={36} color={colors.textFaint} />
              <Text style={styles.emptyText}>
                {estimates?.length ? 'Inga jobb matchar' : 'Inga sparade jobb ännu'}
              </Text>
            </View>
          }
        />
      )}

      <EstimateDetailModal
        estimate={openEstimate}
        onClose={() => setOpenId(null)}
        onChangeStatus={changeStatus}
        onUpdateJobs={updateJobs}
        onStartCheckIn={onStartCheckIn}
        onStartInspection={onStartInspection}
        onSelectBike={onSelectBike}
      />
    </View>
  );
}

function keyExtractor(item: Estimate): string {
  return item.id;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingHorizontal: gutter,
    paddingBottom: 14,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textFaint,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: gutter,
    paddingBottom: 10,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  filterTextActive: {
    color: colors.onAccent,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: gutter,
    paddingBottom: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  searchMain: {
    flex: 7,
  },
  searchTag: {
    flex: 3,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    paddingVertical: 10,
    fontSize: 15,
  },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginHorizontal: gutter,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 90, 95, 0.1)',
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 95, 0.35)',
    padding: 12,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: gutter,
    paddingBottom: 24,
    gap: 12,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 80,
  },
  emptyText: {
    color: colors.textFaint,
  },
});
