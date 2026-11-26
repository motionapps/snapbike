import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { jobCardColumns } from '../lib/cardColumns';
import {
  deleteJob,
  fetchJobs,
  setJobStatus,
  updateJobComments,
} from '../lib/supabase';
import { useScrollToTop } from '../lib/scrollToTop';
import { colors } from '../lib/theme';
import { Job, JobStatus } from '../lib/types';
import { JobCard } from './JobCard';
import { useOrderContext } from '../lib/orderContext';
import { CommentField } from './JobNotesModal';
import { JobDetailModal } from './JobDetailModal';
import { DropdownAnchor, measureAnchor, OptionDropdown } from './OptionDropdown';
import { styles } from './JobsScreen.styles';
import { webScroll, webScrollContent } from '../lib/webEdge';

type Props = {
  active: boolean;
  onStartCheckIn: (job: Job) => void;
  onEditBikeDetails: (job: Job) => void;
  onEditCustomer: (job: Job) => void;
  onStartInspection: (job: Job) => void;
  onOpenJobList: (job: Job) => void;
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

type SortKey = 'createdDesc' | 'createdAsc' | 'sentToCustomer' | 'customerResponded';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'createdDesc', label: 'Skapad – nyast först' },
  { value: 'createdAsc', label: 'Skapad – äldst först' },
  { value: 'sentToCustomer', label: 'Senast skickad till kund' },
  { value: 'customerResponded', label: 'Senast kundsvar' },
];

const SORT_DROPDOWN_WIDTH = 240;

/** Newest first by the chosen date; jobs without that date last, newest created first. */
function sortJobs(jobs: Job[], sort: SortKey): Job[] {
  const byCreated = (a: Job, b: Job) => b.createdAt.localeCompare(a.createdAt);
  if (sort === 'createdDesc') return [...jobs].sort(byCreated);
  if (sort === 'createdAsc') return [...jobs].sort((a, b) => byCreated(b, a));
  const date = (job: Job) =>
    sort === 'sentToCustomer' ? job.sentToCustomerAt : job.customerRespondedAt;
  return [...jobs].sort((a, b) => {
    const da = date(a);
    const db = date(b);
    if (da && db) return db.localeCompare(da);
    if (da) return -1;
    if (db) return 1;
    return byCreated(a, b);
  });
}

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
  for (const task of [...job.tasks, ...job.inspectionTasks]) parts.push(task.title);
  return parts.join(' ').toLowerCase();
}

export function JobsScreen({
  active,
  onStartCheckIn,
  onEditBikeDetails,
  onEditCustomer,
  onStartInspection,
  onOpenJobList,
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
  const [sort, setSort] = useState<SortKey>('createdDesc');
  const [sortAnchor, setSortAnchor] = useState<DropdownAnchor | null>(null);
  const sortButtonRef = useRef<View>(null);
  const columns = jobCardColumns(useWindowDimensions().width);
  const listRef = useRef<FlatList<Job | null>>(null);
  useScrollToTop('jobs', () => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
  const [query, setQuery] = useState('');
  const [tagQuery, setTagQuery] = useState('');

  const visible = useMemo(() => {
    if (!jobs) return [];
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const tag = tagQuery.trim();
    const matching = jobs.filter((job) => {
      if (!matchesFilter(job, filter)) return false;
      if (tag && job.bikeNumber !== tag) return false;
      if (words.length === 0) return true;
      const text = searchText(job);
      // Phone numbers are matched without spaces or dashes too.
      const digits = text.replace(/[\s-]/g, '');
      return words.every((word) => text.includes(word) || digits.includes(word));
    });
    return sortJobs(matching, sort);
  }, [jobs, filter, query, tagQuery, sort]);

  // Empty cells fill the last row, so a lone card keeps its column width.
  const cells = useMemo<(Job | null)[]>(() => {
    const rest = visible.length % columns;
    return rest ? [...visible, ...Array<null>(columns - rest).fill(null)] : visible;
  }, [visible, columns]);

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

  // Opened from the bar on any tab: the list may not be loaded (or may lack the job) yet.
  useEffect(() => {
    if (!openRequest) return;
    setOpenId(openRequest.id);
    void load();
  }, [openRequest, load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const { order, setComments, currentStatus, setCurrentStatus } = useOrderContext();

  // The current job's status is shared app state (Klar / Lås upp on any tab);
  // the list follows it at once instead of waiting for the next reload.
  useEffect(() => {
    const id = order.bookingId;
    if (!id || !currentStatus) return;
    setJobs((current) =>
      current?.some((job) => job.id === id && job.status !== currentStatus)
        ? current.map((job) => (job.id === id ? { ...job, status: currentStatus } : job))
        : current
    );
  }, [order.bookingId, currentStatus]);

  const changeStatus = useCallback(
    (id: string, status: JobStatus) => {
      // Keep the Klar marks of the current job in step.
      if (id === order.bookingId) setCurrentStatus(status);
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
    [load, order.bookingId, setCurrentStatus]
  );

  const updateComment = useCallback(
    (id: string, field: CommentField, text: string) => {
      const job = jobs?.find((e) => e.id === id);
      if (!job) return;
      const updated = { ...job, [field]: text };
      // The current job auto-saves its own comments: keep them in step so the
      // next auto-save doesn't write the old text back.
      if (order.bookingId === id) {
        setComments((current) => ({ ...current, [field]: text }));
      }
      setJobs((current) =>
        current ? current.map((e) => (e.id === id ? updated : e)) : current
      );
      updateJobComments(id, {
        customerComment: updated.customerComment,
        mechanicComment: updated.mechanicComment,
      }).catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        void load();
      });
    },
    [jobs, load, order.bookingId, setComments]
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
    ({ item }: ListRenderItemInfo<Job | null>) => {
      if (!item) return <View style={styles.gridCell} />;
      const card = <JobCard job={item} onChangeStatus={changeStatus} onPress={setOpenId} />;
      return columns > 1 ? <View style={styles.gridCell}>{card}</View> : card;
    },
    [changeStatus, columns]
  );

  const openSort = () =>
    measureAnchor(sortButtonRef, (anchor) =>
      setSortAnchor({
        x: Math.max(8, anchor.x + anchor.width - SORT_DROPDOWN_WIDTH),
        y: anchor.y + 4,
        width: SORT_DROPDOWN_WIDTH,
      })
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
          <Ionicons name="add" size={20} color={colors.onAccent} />
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
        <Pressable ref={sortButtonRef} onPress={openSort} style={styles.sortButton} hitSlop={4}>
          <Ionicons name="swap-vertical" size={16} color={colors.textSecondary} />
          <Text style={styles.filterText} numberOfLines={1}>
            {SORTS.find((item) => item.value === sort)?.label}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </Pressable>
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
          <ActivityIndicator color={colors.accentLight} />
        </View>
      ) : (
        // Wrapped: with a refreshControl, react-native-web puts the list's
        // style on both the refresh wrapper and the list.
        <View style={[styles.listWrap, webScroll]}>
        <FlatList
          ref={listRef}
          // numColumns can't change on a mounted list.
          key={columns}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
          data={cells}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, webScrollContent]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.accentLight}
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
        </View>
      )}

      <OptionDropdown
        anchor={sortAnchor}
        options={SORTS}
        value={sort}
        onPick={(value) => {
          setSort(value as SortKey);
          setSortAnchor(null);
        }}
        onClose={() => setSortAnchor(null)}
      />

      <JobDetailModal
        job={openJob}
        onClose={() => setOpenId(null)}
        onChangeStatus={changeStatus}
        onUpdateComment={updateComment}
        onStartCheckIn={onStartCheckIn}
        onEditBikeDetails={onEditBikeDetails}
        onEditCustomer={onEditCustomer}
        onStartInspection={onStartInspection}
        onOpenJobList={onOpenJobList}
        onSelectBike={onSelectBike}
        onDelete={removeJob}
      />
    </View>
  );
}

function keyExtractor(item: Job | null, index: number): string {
  return item?.id ?? `empty-${index}`;
}
