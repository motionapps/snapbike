import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { BikeData } from '../lib/bikeAnalysis';
import { colors } from '../lib/theme';
import { BikeFieldRows } from './BikeDetails';
import { styles } from './ManualBikeModal.styles';
import { webPage, webScroll, webScrollContent } from '../lib/webEdge';
import { FitPressable } from './FitPressable';

const EMPTY_BIKE: BikeData = {
  bike: {
    brand: '',
    bike_type: 'city bike',
    color: 'black',
    gears: { front: 'none', back: 'hub' },
    brakes: { front: 'mechanical disc', back: 'foot brake' },
    dampers: { front: false, back: false },
    electric: false,
  },
};

type Props = {
  visible: boolean;
  /** Prefills the fields; null starts from a blank bike. */
  initial: BikeData | null;
  onClose: () => void;
  onSave: (bike: BikeData) => void;
};

/** Enter the bike's details by hand instead of from a photo. */
export function ManualBikeModal({ visible, initial, onClose, onSave }: Props) {
  const [data, setData] = useState<BikeData>(initial ?? EMPTY_BIKE);

  useEffect(() => {
    if (visible) setData(initial ?? EMPTY_BIKE);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.sheet, webPage]}>
        <View style={styles.header}>
          <Text style={styles.heading}>Lägg till cykel</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
        <ScrollView
          style={webScroll}
          contentContainerStyle={[styles.content, webScrollContent]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <BikeFieldRows bike={data.bike} onChange={(bike) => setData({ ...data, bike })} />
          </View>
          <FitPressable
            onPress={() => {
              onSave(data);
              onClose();
            }}
            style={({ pressed }) => [styles.save, pressed && styles.pressed]}
          >
            <Text style={styles.saveText}>Spara</Text>
          </FitPressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
