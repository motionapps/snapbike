import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
  Text,
  View,
} from 'react-native';
import { jobImageUrl } from '../lib/supabase';
import { colors } from '../lib/theme';
import { bikeLabel } from '../lib/bikeLabels';
import { Job, JobStatus, jobTotal } from '../lib/types';
import { bikeColorHex, textColorOnBike } from './CurrentBikeBar';
import { StatusPill } from './StatusPill';
import { styles } from './JobCard.styles';

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
  // No photo: the placeholder takes the bike's colour and names brand and type.
  const bike = job.bike?.bike ?? null;
  const placeholderText = bike ? textColorOnBike(bike.color) : colors.textFaint;
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
            <View
              style={[
                styles.thumb,
                styles.thumbEmpty,
                bike && { backgroundColor: bikeColorHex(bike.color) },
              ]}
            >
              <Ionicons name="bicycle" size={96} color={placeholderText} />
              {bike?.brand ? (
                <Text style={[styles.thumbBrand, { color: placeholderText }]} numberOfLines={1}>
                  {bike.brand}
                </Text>
              ) : null}
              {bike ? (
                <Text style={[styles.thumbType, { color: placeholderText }]} numberOfLines={1}>
                  {bikeLabel(bike.bike_type)}
                </Text>
              ) : null}
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
