import { StyleSheet } from 'react-native';
import { colors, fontSize, fonts, radius, shadow } from '../lib/theme';

export const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    padding: 20,
    gap: 14,
    backgroundColor: colors.bg,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: fontSize.title,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowSelected: {
    borderColor: colors.accentLight,
  },
  rowPressed: {
    backgroundColor: colors.cardRaised,
  },
  rowText: {
    color: colors.text,
    fontFamily: fonts.semiBold,
    fontSize: fontSize.emphasis,
  },
  empty: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSize.body,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 20,
  },
  cancel: {
    paddingVertical: 12,
  },
  cancelText: {
    color: colors.textSecondary,
    fontFamily: fonts.semiBold,
    fontSize: fontSize.body,
  },
  ok: {
    minWidth: 96,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
  okDisabled: {
    opacity: 0.4,
  },
  okPressed: {
    backgroundColor: colors.accentDark,
  },
  okText: {
    color: colors.onAccent,
    fontFamily: fonts.semiBold,
    fontSize: fontSize.body,
  },
});
