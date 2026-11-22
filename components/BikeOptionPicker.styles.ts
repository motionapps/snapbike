import { StyleSheet } from 'react-native';
import { colors, radius } from '../lib/theme';

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
    fontSize: 20,
    fontWeight: '700',
  },
  close: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 8,
  },
  option: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  optionSelected: {
    borderColor: colors.accent,
  },
  optionText: {
    color: colors.text,
    fontSize: 17,
  },
  optionTextSelected: {
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
  input: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 17,
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
    fontSize: 17,
    fontWeight: '700',
  },
});
