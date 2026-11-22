import { StyleSheet } from 'react-native';
import { colors, shadow, fontSize, fonts } from '../lib/theme';

export const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 12,
  },
  buttonArea: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(229, 72, 77, 0.25)',
  },
  haloHidden: {
    opacity: 0,
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    ...shadow.button,
  },
  buttonRecording: {
    backgroundColor: colors.recording,
    boxShadow: '0 6px 20px rgba(229, 72, 77, 0.35)',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
});
