import { StyleSheet } from 'react-native';
import { colors, radius } from '../lib/theme';

/** Fixed card height, so the square image always matches it. */
const ROW_HEIGHT = 76;

export const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  heading: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
    fontSize: 18,
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
  },
  search: {
    flex: 1,
    color: colors.text,
    paddingVertical: 11,
  },
  chipScroll: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 12,
  },
  chipRow: {
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.onAccent,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    height: ROW_HEIGHT,
    paddingRight: 14,
  },
  rowPressed: {
    backgroundColor: colors.cardRaised,
  },
  // The image fills the full card height, square, flush with the card edge.
  rowImageButton: {
    width: ROW_HEIGHT - 2, // card height minus its 1px top and bottom border
    alignSelf: 'stretch',
    backgroundColor: '#fff',
  },
  rowImage: {
    flex: 1,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowCategory: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 1,
  },
  rowTitle: {
    color: colors.text,
  },
  rowPrice: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
