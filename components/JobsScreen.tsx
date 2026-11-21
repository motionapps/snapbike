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
  deleteJob,
  fetchJobs,
  setJobStatus,
  updateJobTasks,
} from '../lib/supabase';
import { colors, gutter, radius } from '../lib/theme';
import { Job, Task, JobStatus, tasksTotal } from '../lib/types';
import { JobCard } from './JobCard';
import { JobDetailModal } from './JobDetailModal';

type Props = {
  active: boolean;
  onStartCheckIn: (job: Job) => void;
  onEditBikeDetails: (job: Job) => void;
  onEditCustomer: (job: Job) => void;
  onStartInspection: (job: Job) => void;
  onSelectBike: (job: Job) => void;
  onNewJob: () => void;
  onJobDeleted: (id: string) => void;
  /** Opens that job's modal; the nonce lets the same job be opened again. */
  openRequest: { id: string; nonce: number } | null;
};

type Filter = 'active' | 'ready' | 'all';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'active', label: 'Aktiva' },
  { key: 'ready', label: 'Klara' },
  { key: 'all', label: 'Alla' },
];

function matchesFilter(job: Job, filter: Filter): boolean {
  if (filter === 'active') {
    return job.status !== 'ready' && job.status !== 'delivered';
  }
  if (filter === 'ready') return job.status === 'ready';
  return true;
}

/** Lowercased text of customer, bike and tasks, for the free-text search. */
function searchText(job: Job): string {
  const parts: string[] = [];
  const customer = job.customer;
  if (customer) {
    parts.push(customer.firstName, customer.lastName, customer.phone, customer.email);
  }
  const bike = job.bike?.bike;
  if (bike) {
    parts.push(bike.brand, bike.bike_type, bike.color);
  }
  for (const task of job.tasks) parts.push(task.title);
  return parts.join(' ').toLowerCase();
}

export function JobsScreen({
  active,
  onStartCheckIn,
  onEditBikeDetails,
  onEditCustomer,
  onStartInspection,
  onSelectBike,
  onNewJob,
  onJobDeleted,
  openRequest,
}: Props) {
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('active');
  const [query, setQuery] = useState('');
  const [tagQuery, setTagQuery] = useState('');

  const visible = useMemo(() => {
    if (!jobs) return [];
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const tag = tagQuery.trim();
    return jobs.filter((job) => {
      if (!matchesFilter(job, filter)) return false;
      if (tag && job.bikeNumber !== tag) return false;
      if (words.length === 0) return true;
      const text = searchText(job);
      // Phone numbers are matched without spaces or dashes too.
      const digits = text.replace(/[\s-]/g, '');
      return words.every((word) => text.includes(word) || digits.includes(word));
    });
  }, [jobs, filter, query, tagQuery]);

  const load = useCallback(async () => {
    try {
      setError('');
      setJobs(await fetchJobs());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  useEffect(() => {
    if (openRequest) setOpenId(openRequest.id);
  }, [openRequest]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const changeStatus = useCallback(
    (id: string, status: JobStatus) => {
      setJobs((current) =>
        current
          ? current.map((e) => (e.id === id ? { ...e, status } : e))
          : current
      );
      setJobStatus(id, status).catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        void load();
      });
    },
    [load]
  );

  const updateTasks = useCallback(
    (id: string, tasks: Task[]) => {
      setJobs((current) =>
        current
          ? current.map((e) =>
              e.id === id ? { ...e, tasks, total: tasksTotal(tasks) } : e
            )
          : current
      );
      updateJobTasks(id, tasks).catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        void load();
      });
    },
    [load]
  );

  const removeJob = useCallback(
    (id: string) => {
      setJobs((current) => (current ? current.filter((e) => e.id !== id) : current));
      deleteJob(id)
        .then(() => onJobDeleted(id))
        .catch((err) => {
          setError(err instanceof Error ? err.message : String(err));
          void load();
        });
    },
    [load, onJobDeleted]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Job>) => (
      <JobCard
        job={item}
        onChangeStatus={changeStatus}
        onPress={setOpenId}
      />
    ),
    [changeStatus]
  );

  const openJob =
    jobs?.find((job) => job.id === openId) ?? null;

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
          {jobs ? `${visible.length} st` : ''}
        </Text>
        <Pressable onPress={onNewJob} style={styles.newJob} hitSlop={8}>
          <Ionicons name="add" size={16} color={colors.onAccent} />
          <Text style={styles.newJobText}>Nytt jobb</Text>
        </Pressable>
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

      {jobs === null && !error ? (
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
                {jobs?.length ? 'Inga jobb matchar' : 'Inga sparade jobb ännu'}
              </Text>
            </View>
          }
        />
      )}

      <JobDetailModal
        job={openJob}
        onClose={() => setOpenId(null)}
        onChangeStatus={changeStatus}
        onUpdateTasks={updateTasks}
        onStartCheckIn={onStartCheckIn}
        onEditBikeDetails={onEditBikeDetails}
        onEditCustomer={onEditCustomer}
        onStartInspection={onStartInspection}
        onSelectBike={onSelectBike}
        onDelete={removeJob}
      />
    </View>
  );
}

function keyExtractor(item: Job): string {
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
  newJob: {
    marginLeft: 'auto',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  newJobText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 13,
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
