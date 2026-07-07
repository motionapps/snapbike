import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchEstimates,
  setEstimateStatus,
  updateEstimateJobs,
} from '../lib/supabase';
import { colors } from '../lib/theme';
import { Estimate, Job, JobStatus, jobsTotal } from '../lib/types';
import { EstimateCard } from './EstimateCard';
import { EstimateDetailModal } from './EstimateDetailModal';

type Props = {
  active: boolean;
};

export function JobsScreen({ active }: Props) {
  const insets = useSafeAreaInsets();
  const [estimates, setEstimates] = useState<Estimate[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

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
          {estimates ? `${estimates.length} st` : ''}
        </Text>
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
          data={estimates ?? []}
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
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bicycle-outline" size={36} color={colors.textFaint} />
              <Text style={styles.emptyText}>Inga sparade jobb ännu</Text>
            </View>
          }
        />
      )}

      <EstimateDetailModal
        estimate={openEstimate}
        onClose={() => setOpenId(null)}
        onChangeStatus={changeStatus}
        onUpdateJobs={updateJobs}
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
    paddingHorizontal: 20,
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
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginHorizontal: 20,
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
    paddingHorizontal: 20,
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
