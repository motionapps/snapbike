import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { estimateImageUrl } from '../lib/supabase';
import { colors, radius } from '../lib/theme';
import { Estimate, Job, JobStatus, jobsTotal } from '../lib/types';
import { StatusPill } from './StatusPill';

const dateFormat = new Intl.DateTimeFormat('sv-SE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

type Props = {
  estimate: Estimate | null;
  onClose: () => void;
  onChangeStatus: (id: string, status: JobStatus) => void;
  onUpdateJobs: (id: string, jobs: Job[]) => void;
};

/** Identifies the price being edited: a job's own price or one of its products. */
type EditTarget = { jobId: string; productId: string | null };

export function EstimateDetailModal({
  estimate,
  onClose,
  onChangeStatus,
  onUpdateJobs,
}: Props) {
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (target: EditTarget, price: number) => {
    setEditing(target);
    setEditValue(price > 0 ? String(price) : '');
  };

  const commitEdit = () => {
    if (editing && estimate) {
      const price = Number(editValue.replace(',', '.')) || 0;
      const jobs = estimate.jobs.map((job) => {
        if (job.id !== editing.jobId) return job;
        if (editing.productId === null) return { ...job, price };
        return {
          ...job,
          products: job.products.map((product) =>
            product.id === editing.productId ? { ...product, price } : product
          ),
        };
      });
      onUpdateJobs(estimate.id, jobs);
    }
    setEditing(null);
    setEditValue('');
  };

  const close = () => {
    setEditing(null);
    setEditValue('');
    onClose();
  };

  const priceInput = (
    <TextInput
      style={styles.priceInput}
      placeholder="kr"
      placeholderTextColor={colors.textFaint}
      value={editValue}
      onChangeText={setEditValue}
      keyboardType="numeric"
      returnKeyType="done"
      autoFocus
      onSubmitEditing={commitEdit}
      onBlur={commitEdit}
    />
  );

  return (
    <Modal
      visible={estimate !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      {estimate ? (
        <KeyboardAvoidingView
          style={styles.sheet}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.heading}>Jobb</Text>
              <Text style={styles.date}>
                {dateFormat.format(new Date(estimate.createdAt))}
              </Text>
            </View>
            <Pressable onPress={close} hitSlop={8} style={styles.close}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <StatusPill
              status={estimate.status}
              onChange={(status) => onChangeStatus(estimate.id, status)}
            />

            {estimate.imagePath ? (
              <Image
                source={estimateImageUrl(estimate.imagePath)}
                style={styles.photo}
                contentFit="cover"
                transition={200}
              />
            ) : null}

            <View style={styles.jobList}>
              {estimate.jobs.map((job) => (
                <View key={job.id} style={styles.jobCard}>
                  <View style={styles.jobRow}>
                    <View style={styles.jobText}>
                      <Text style={styles.jobCategory}>
                        {job.category.toUpperCase()}
                      </Text>
                      <Text style={styles.jobTitle}>{job.title}</Text>
                    </View>
                    {editing?.jobId === job.id && editing.productId === null ? (
                      priceInput
                    ) : (
                      <Pressable
                        onPress={() =>
                          startEdit({ jobId: job.id, productId: null }, job.price)
                        }
                        hitSlop={6}
                      >
                        <Text style={styles.jobPrice}>{job.price} kr</Text>
                      </Pressable>
                    )}
                  </View>
                  {job.products.map((product) => (
                    <View key={product.id} style={styles.productRow}>
                      <Ionicons
                        name="cube-outline"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.productName}>{product.name}</Text>
                      {editing?.jobId === job.id &&
                      editing.productId === product.id ? (
                        priceInput
                      ) : (
                        <Pressable
                          onPress={() =>
                            startEdit(
                              { jobId: job.id, productId: product.id },
                              product.price
                            )
                          }
                          hitSlop={6}
                          style={product.price > 0 ? undefined : styles.priceMissing}
                        >
                          <Text
                            style={[
                              styles.productPrice,
                              product.price <= 0 && styles.priceMissingText,
                            ]}
                          >
                            {product.price > 0 ? `${product.price} kr` : '– kr'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              ))}
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Totalt</Text>
              <Text style={styles.totalValue}>
                {jobsTotal(estimate.jobs).toLocaleString('sv-SE')} kr
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.sheet} />
      )}
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
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  heading: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 18,
  },
  date: {
    color: colors.textFaint,
    fontSize: 13,
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.cardRaised,
  },
  jobList: {
    gap: 10,
  },
  jobCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  jobText: {
    flex: 1,
    gap: 3,
  },
  jobCategory: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
  },
  jobTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  jobPrice: {
    color: colors.text,
    fontWeight: '700',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 6,
  },
  productName: {
    flex: 1,
    color: colors.textSecondary,
  },
  productPrice: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  priceMissing: {
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  priceMissingText: {
    color: colors.accent,
  },
  priceInput: {
    backgroundColor: colors.cardRaised,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 4,
    width: 76,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  totalValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
});
