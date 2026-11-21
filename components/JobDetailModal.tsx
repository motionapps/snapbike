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
import { colors, gutter, radius } from '../lib/theme';
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
  onStartCheckIn: (estimate: Estimate) => void;
  onStartInspection: (estimate: Estimate) => void;
  onSelectBike: (estimate: Estimate) => void;
};

/** The next step for each status: a label and what it does. */
type NextAction = { label: string; icon: string; run: () => void };

/** Identifies the price being edited: a job's own price or one of its products. */
type EditTarget = { jobId: string; productId: string | null };

export function EstimateDetailModal({
  estimate,
  onClose,
  onChangeStatus,
  onUpdateJobs,
  onStartCheckIn,
  onStartInspection,
  onSelectBike,
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

  const nextAction = ((): NextAction | null => {
    if (!estimate) return null;
    switch (estimate.status) {
      case 'booked':
        return {
          label: 'Starta mottagningen',
          icon: 'mic',
          run: () => {
            close();
            onStartCheckIn(estimate);
          },
        };
      case 'checked_in':
        return {
          label: 'Starta besiktningen',
          icon: 'clipboard',
          run: () => {
            close();
            onStartInspection(estimate);
          },
        };
      case 'inspected':
        return {
          label: 'Markera klar',
          icon: 'checkmark-circle',
          run: () => onChangeStatus(estimate.id, 'ready'),
        };
      case 'ready':
        return {
          label: 'Lämna ut',
          icon: 'exit',
          run: () => onChangeStatus(estimate.id, 'delivered'),
        };
      default:
        return null;
    }
  })();

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
            {nextAction ? (
              <Pressable
                onPress={nextAction.run}
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.actionButtonPressed,
                ]}
              >
                <Ionicons
                  name={nextAction.icon as never}
                  size={18}
                  color={colors.onAccent}
                />
                <Text style={styles.actionButtonText}>{nextAction.label}</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => {
                close();
                onSelectBike(estimate);
              }}
              style={({ pressed }) => [
                styles.selectButton,
                pressed && styles.selectButtonPressed,
              ]}
            >
              <Ionicons name="bicycle" size={18} color={colors.text} />
              <Text style={styles.selectButtonText}>Välj den här cykeln</Text>
            </Pressable>

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
    paddingHorizontal: gutter,
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
    paddingHorizontal: gutter,
    paddingBottom: 40,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingVertical: 14,
  },
  actionButtonPressed: {
    backgroundColor: colors.accentDark,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 12,
  },
  selectButtonPressed: {
    backgroundColor: colors.cardRaised,
  },
  selectButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  actionButtonText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 15,
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
