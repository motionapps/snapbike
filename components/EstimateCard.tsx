import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { estimateImageUrl } from '../lib/supabase';
import { colors, radius, shadow } from '../lib/theme';
import { Estimate, JobStatus } from '../lib/types';
import { StatusPill } from './StatusPill';

const dateFormat = new Intl.DateTimeFormat('sv-SE', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

type Props = {
  estimate: Estimate;
  onChangeStatus: (id: string, status: JobStatus) => void;
  onPress: (id: string) => void;
};

export const EstimateCard = memo(function EstimateCard({
  estimate,
  onChangeStatus,
  onPress,
}: Props) {
  const imageUrl = estimateImageUrl(estimate.imagePath);
  const jobTitles = estimate.jobs.map((job) => job.title).join(' · ');

  return (
    <Pressable
      onPress={() => onPress(estimate.id)}
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
            <Ionicons name="bicycle" size={22} color={colors.textFaint} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.date}>
            {dateFormat.format(new Date(estimate.createdAt))}
          </Text>
          <Text style={styles.jobs} numberOfLines={2}>
            {jobTitles || 'Inga jobb'}
          </Text>
        </View>
        <Text style={styles.total}>
          {estimate.total.toLocaleString('sv-SE')} kr
        </Text>
      </View>

      <StatusPill
        status={estimate.status}
        onChange={(status) => onChangeStatus(estimate.id, status)}
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
    padding: 14,
    gap: 12,
    ...shadow.card,
  },
  cardPressed: {
    backgroundColor: colors.cardRaised,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 52,
    height: 52,
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
    gap: 3,
  },
  date: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  jobs: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  total: {
    color: colors.text,
    fontWeight: '700',
  },
});
