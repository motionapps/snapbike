import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  /** Image to show enlarged; null hides the preview. */
  uri: string | null;
  onClose: () => void;
};

/** Full-screen enlarged product image. Tap anywhere to close. */
export function ImagePreviewModal({ uri, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={uri !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.frame}>
          {uri ? (
            <Image source={{ uri }} style={styles.image} contentFit="contain" />
          ) : null}
        </View>
        <View style={[styles.close, { top: insets.top + 12 }]}>
          <Ionicons name="close" size={22} color="#fff" />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  frame: {
    width: '100%',
    maxWidth: 520,
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  image: {
    flex: 1,
  },
  close: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});
