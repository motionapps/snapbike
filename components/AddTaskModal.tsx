import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { taskImageUrl } from '../lib/taskImages';
import { ImagePreviewModal } from './ImagePreviewModal';
import { colors } from '../lib/theme';
import { PriceItem } from '../lib/types';
import { styles } from './AddTaskModal.styles';
import { webPage } from '../lib/webEdge';
import { PriceTree, rowAction, rowDetail } from './PriceTree';

type Props = {
  visible: boolean;
  /** The price rows that apply to the current item (see pricesFor). */
  prices: PriceItem[];
  onClose: () => void;
  onPick: (item: PriceItem) => void;
};

export function AddTaskModal({ visible, prices, onClose, onPick }: Props) {
  const [query, setQuery] = useState('');
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.sheet, webPage]}>
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
        <PriceTree
          items={prices}
          query={query}
          renderRow={(item) => {
            const isJob = item.kind === 'job';
            const detail = isJob ? rowDetail(item) : '';
            const image = taskImageUrl(item.title, item.partId);
            return (
              <Pressable
                onPress={() => {
                  onPick(item);
                  setQuery('');
                }}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Pressable onPress={() => setPreviewUri(image)} style={styles.rowImageButton}>
                  <Image source={{ uri: image }} style={styles.rowImage} contentFit="contain" transition={150} />
                </Pressable>
                <Text style={styles.rowTitle}>
                  {isJob ? rowAction(item) : item.title}
                  {detail ? <Text style={styles.rowDetail}>{`  ${detail}`}</Text> : null}
                </Text>
                <Text style={styles.rowPrice}>{item.price} kr</Text>
              </Pressable>
            );
          }}
        />
      </View>
      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
    </Modal>
  );
}

