import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { jobImageUrl } from '../lib/supabase';
import { colors, radius, shadow } from '../lib/theme';
import { Job, JobStatus, jobTotal } from '../lib/types';
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
  const [expanded, setExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const customerName = job.customer
    ? `${job.customer.firstName} ${job.customer.lastName}`.trim()
    : '';
  // Mottagning plus Jobblista, without tasks the customer denied.
  const allTasks = [...job.tasks, ...job.inspectionTasks.filter((t) => t.approval !== 'nekad')];

  // Same expand/collapse animation as Mer information in BikeDetails.
  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.timing(progress, {
      toValue: next ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const onContentLayout = (event: LayoutChangeEvent) => {
    setContentHeight(event.nativeEvent.layout.height);
  };

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Pressable
      onPress={() => onPress(job.id)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <StatusPill
        status={job.status}
        onChange={(status) => onChangeStatus(job.id, status)}
      />

      <View style={styles.top}>
        <View style={styles.imageColumn}>
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
          <Text style={styles.name} numberOfLines={1}>
            {customerName || 'Okänd kund'}
          </Text>
        </View>
        <View style={styles.info}>
          {job.bikeNumber ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>#{job.bikeNumber}</Text>
            </View>
          ) : null}
          <Text style={styles.date}>
            {dateFormat.format(new Date(job.createdAt))}
          </Text>
          <Text style={styles.total}>
            {jobTotal(job.tasks, job.inspectionTasks).toLocaleString('sv-SE')} kr
          </Text>
        </View>
      </View>

      <View>
        <Pressable onPress={toggle} style={styles.tasksHeader} hitSlop={4}>
          <Text style={styles.tasksHeaderText}>
            {allTasks.length ? `Att göra (${allTasks.length})` : 'Inga jobb'}
          </Text>
          {allTasks.length ? (
            <Animated.View style={[styles.chevron, { transform: [{ rotate }] }]}>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </Animated.View>
          ) : null}
        </Pressable>
        <Animated.View
          style={[
            styles.tasksBody,
            {
              height: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, contentHeight],
              }),
              opacity: progress,
            },
          ]}
          pointerEvents="none"
        >
          {/* Absolutely positioned so it lays out at its natural height. */}
          <View style={styles.tasksContent} onLayout={onContentLayout}>
            {allTasks.map((task, index) => (
              <Text
                key={task.id}
                style={[styles.task, index > 0 && styles.taskDivider]}
              >
                {task.title}
              </Text>
            ))}
          </View>
        </Animated.View>
      </View>

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
  imageColumn: {
    width: 200,
    gap: 10,
  },
  thumb: {
    width: 200,
    height: 200,
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
  tasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  tasksHeaderText: {
    flex: 1,
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  chevron: {
    width: 18,
    height: 18,
  },
  tasksBody: {
    overflow: 'hidden',
  },
  tasksContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  task: {
    color: colors.text,
    fontSize: 16,
    paddingVertical: 10,
  },
  taskDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  total: {
    marginTop: 4,
    color: colors.text,
    fontWeight: '700',
    fontSize: 18,
  },
});
