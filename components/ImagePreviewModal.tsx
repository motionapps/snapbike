import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './ImagePreviewModal.styles';

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
