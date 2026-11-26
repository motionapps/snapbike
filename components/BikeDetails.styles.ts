import { StyleSheet } from 'react-native';
import { colors, fontSize, fonts, radius } from '../lib/theme';

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  headerText: {
    fontSize: fontSize.body,
    flex: 1,
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  headerFaint: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    flex: 1,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    flex: 1,
    color: colors.danger,
  },
  editButton: {
    paddingHorizontal: 4,
  },
  chevron: {
    width: 18,
    height: 18,
  },
  // Above what follows, so the brand suggestions float over it.
  root: {
    zIndex: 1,
  },
  body: {
    overflow: 'hidden',
  },
  bodyOpen: {
    overflow: 'visible',
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // Stretches so every cell in a line, and its Ja/Nej tint, gets the same height.
  cell: {
    flexDirection: 'column',
  },
  cellOnTop: {
    zIndex: 1,
  },
  row: {
    flexGrow: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.cardRaised,
  },
  rowLabel: {
    width: 130,
    color: colors.textSecondary,
    fontSize: fontSize.emphasis, fontFamily: fonts.regular,
  },
  rowValue: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.emphasis,
    fontFamily: fonts.semiBold,
  },
  rowValueWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowInput: {
    paddingVertical: 0,
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
});
