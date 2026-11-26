import { StyleSheet } from 'react-native';
import { colors, radius, fontSize, fonts } from '../lib/theme';

export const styles = StyleSheet.create({
  rowWrap: {},
  behind: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  behindSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  behindText: {
    color: colors.textSecondary,
    fontFamily: fonts.bold,
    fontSize: fontSize.small,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: fontSize.emphasis,
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  rowTitleDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  rowTextDone: {
    textDecorationLine: 'line-through',
  },
  rowProduct: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
  },
  rowNote: {
    color: colors.textFaint,
    fontSize: fontSize.small, fontFamily: fonts.regular,
    fontStyle: 'italic',
  },
  rowPrice: {
    fontSize: fontSize.emphasis,
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  heading: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: fontSize.title,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  lineLabel: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    flex: 1,
  },
  lineValue: {
    fontSize: fontSize.body,
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  product: {
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  productName: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    color: colors.text,
    flex: 1,
  },
  productMeta: {
    color: colors.textFaint,
    fontSize: fontSize.small, fontFamily: fonts.regular,
  },
  label: {
    color: colors.textFaint,
    fontSize: fontSize.small,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
    marginTop: 6,
  },
  input: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    minHeight: 90,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 12,
    textAlignVertical: 'top',
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    paddingVertical: 14,
    backgroundColor: colors.accent,
    marginTop: 8,
  },
  undoButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  doneText: {
    color: colors.onAccent,
    fontSize: fontSize.emphasis,
    fontFamily: fonts.bold,
  },
  undoText: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    color: colors.text,
  },
});
