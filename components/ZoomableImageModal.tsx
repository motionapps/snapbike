import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  /** Image to show full screen; null hides the viewer. */
  uri: string | null;
  onClose: () => void;
};

/** Full-screen photo viewer. Pinch to zoom in on details. */
export function ZoomableImageModal({ uri, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  return (
    <Modal
      visible={uri !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <ScrollView
        style={styles.backdrop}
        contentContainerStyle={{ width, height }}
        maximumZoomScale={5}
        minimumZoomScale={1}
        centerContent
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width, height }} contentFit="contain" />
        ) : null}
      </ScrollView>
      <Pressable
        onPress={onClose}
        hitSlop={8}
        style={[styles.close, { top: insets.top + 12 }]}
      >
        <Ionicons name="close" size={22} color="#fff" />
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  close: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});
