import { StyleSheet } from 'react-native';
import { colors, radius } from '../lib/theme';

export const styles = StyleSheet.create({
  rowWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
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
    fontWeight: '700',
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 10,
    backgroundColor: colors.card,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  rowTitleDone: {
    color: colors.textSecondary,
  },
  rowProduct: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  rowNote: {
    color: colors.textFaint,
    fontSize: 12,
    fontStyle: 'italic',
  },
  rowPrice: {
    color: colors.text,
    fontWeight: '600',
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
    fontWeight: '700',
    fontSize: 18,
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
    color: colors.textSecondary,
    flex: 1,
  },
  lineValue: {
    color: colors.text,
    fontWeight: '600',
  },
  product: {
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  productName: {
    color: colors.text,
    flex: 1,
  },
  productMeta: {
    color: colors.textFaint,
    fontSize: 12,
  },
  label: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  input: {
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
    fontSize: 16,
    fontWeight: '700',
  },
  undoText: {
    color: colors.text,
  },
});
