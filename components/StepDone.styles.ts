import { StyleSheet } from 'react-native';
import { colors, radius, fontSize, fonts } from '../lib/theme';

export const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.textFaint,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    paddingVertical: 6,
  },
  bannerText: {
    color: colors.text,
    fontSize: fontSize.small,
    fontFamily: fonts.bold,
    letterSpacing: 1.5,
  },
  wrap: {
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    paddingVertical: 14,
  },
  buttonDone: {
    backgroundColor: colors.accent,
  },
  buttonUnlock: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  text: {
    fontSize: fontSize.emphasis,
    fontFamily: fonts.bold,
  },
  textDone: {
    color: colors.onAccent,
  },
  textUnlock: {
    color: colors.text,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.small, fontFamily: fonts.regular,
    textAlign: 'center',
  },
});
