import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { taskImageUrl } from '../lib/taskImages';
import { ImagePreviewModal } from './ImagePreviewModal';
import { colors } from '../lib/theme';
import { PriceItem } from '../lib/types';
import { styles } from './AddTaskModal.styles';

type Props = {
  visible: boolean;
  /** The price rows that apply to the current item (see pricesFor). */
  prices: PriceItem[];
  onClose: () => void;
  onPick: (item: PriceItem) => void;
};

export function AddTaskModal({ visible, prices, onClose, onPick }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const categories = useMemo(
    () =>
      [...new Set(prices.map((item) => item.category))].sort((a, b) =>
        a.localeCompare(b, 'sv')
      ),
    [prices]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prices.filter((item) => {
      if (category && item.category !== category) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [query, category, prices]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.heading}>Lägg till jobb</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.close}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={17} color={colors.textFaint} />
          <TextInput
            style={styles.search}
            placeholder="Sök i prislistan…"
            placeholderTextColor={colors.textFaint}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          keyboardShouldPersistTaps="handled"
          style={styles.chipScroll}
        >
          <Pressable
            onPress={() => setCategory(null)}
            style={[styles.chip, category === null && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, category === null && styles.chipTextActive]}
            >
              Alla
            </Text>
          </Pressable>
          {categories.map((item) => {
            const isActive = category === item;
            return (
              <Pressable
                key={item}
                onPress={() => setCategory(isActive ? null : item)}
                style={[styles.chip, isActive && styles.chipActive]}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.category}-${item.title}`}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onPick(item);
                setQuery('');
              }}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Pressable
                onPress={() => setPreviewUri(taskImageUrl(item.title))}
                style={styles.rowImageButton}
              >
                <Image
                  source={{ uri: taskImageUrl(item.title) }}
                  style={styles.rowImage}
                  contentFit="contain"
                  transition={150}
                />
              </Pressable>
              <View style={styles.rowText}>
                <Text style={styles.rowCategory} numberOfLines={1}>
                  {item.category.toUpperCase()}
                </Text>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {item.title}
                </Text>
              </View>
              <Text style={styles.rowPrice}>{item.price} kr</Text>
            </Pressable>
          )}
        />
      </View>
      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
    </Modal>
  );
}

