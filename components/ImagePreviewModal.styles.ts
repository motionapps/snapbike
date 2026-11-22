import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
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
