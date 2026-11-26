import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomerView } from './CustomerView';
import { styles } from './CustomerPreviewModal.styles';

type Props = {
  /** Share token of the job to preview; null hides the modal. */
  token: string | null;
  onClose: () => void;
};

/** Full-screen in-app preview of the customer page, showing the current draft Jobblista. */
export function CustomerPreviewModal({ token, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={token !== null}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {token ? <CustomerView token={token} preview /> : null}
        <Pressable
          onPress={onClose}
          hitSlop={8}
          accessibilityLabel="Stäng förhandsgranskning"
          style={[styles.close, { top: insets.top + 10 }]}
        >
          <Ionicons name="close" size={22} color="#16202A" />
        </Pressable>
      </View>
    </Modal>
  );
}
