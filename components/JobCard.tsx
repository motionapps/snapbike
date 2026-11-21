import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { jobImageUrl } from '../lib/supabase';
import { colors, radius, shadow } from '../lib/theme';
import { Job, JobStatus } from '../lib/types';
import { StatusPill } from './StatusPill';

const dateFormat = new Intl.DateTimeFormat('sv-SE', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

type Props = {
  job: Job;
  onChangeStatus: (id: string, status: JobStatus) => void;
  onPress: (id: string) => void;
};

export const JobCard = memo(function JobCard({
  job,
  onChangeStatus,
  onPress,
}: Props) {
  const imageUrl = jobImageUrl(job.imagePath);
  const taskTitles = job.tasks.map((task) => task.title).join(' · ');
  const customerName = job.customer
    ? `${job.customer.firstName} ${job.customer.lastName}`.trim()
    : '';

  return (
    <Pressable
      onPress={() => onPress(job.id)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.top}>
        {imageUrl ? (
          <Image
            source={imageUrl}
            style={styles.thumb}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Ionicons name="bicycle" size={96} color={colors.textFaint} />
          </View>
        )}
        <View style={styles.info}>
          {job.bikeNumber ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>#{job.bikeNumber}</Text>
            </View>
          ) : null}
          <Text style={styles.name} numberOfLines={1}>
            {customerName || 'Okänd kund'}
          </Text>
          <Text style={styles.date}>
            {dateFormat.format(new Date(job.createdAt))}
          </Text>
          <Text style={styles.tasks} numberOfLines={2}>
            {taskTitles || 'Inga jobb'}
          </Text>
          <Text style={styles.total}>
            {job.total.toLocaleString('sv-SE')} kr
          </Text>
        </View>
      </View>

      <StatusPill
        status={job.status}
        onChange={(status) => onChangeStatus(job.id, status)}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 16,
    ...shadow.card,
  },
  cardPressed: {
    backgroundColor: colors.cardRaised,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
  },
  thumb: {
    width: 300,
    height: 300,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: colors.cardRaised,
  },
  thumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 6,
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cardRaised,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginBottom: 4,
  },
  tagText: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 40,
    fontVariant: ['tabular-nums'],
  },
  name: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 19,
  },
  date: {
    color: colors.textFaint,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tasks: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  total: {
    marginTop: 4,
    color: colors.text,
    fontWeight: '700',
    fontSize: 18,
  },
});
