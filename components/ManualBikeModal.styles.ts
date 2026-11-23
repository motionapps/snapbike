import { StyleSheet } from 'react-native';
import { colors, radius, fontSize, fonts } from '../lib/theme';

export const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  heading: {
    color: colors.text,
    fontSize: fontSize.title,
    fontFamily: fonts.displayBold,
  },
  close: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  save: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.accent,
  },
  saveText: {
    color: colors.onAccent,
    fontSize: fontSize.emphasis,
    fontFamily: fonts.bold,
  },
  pressed: {
    opacity: 0.7,
  },
});
