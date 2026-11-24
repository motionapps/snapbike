import { StyleSheet } from 'react-native';
import { colors, radius, fontSize, fonts } from '../lib/theme';

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
    fontFamily: fonts.displayBold,
    fontSize: fontSize.title,
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
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    flex: 1,
    color: colors.text,
    paddingVertical: 11,
  },
  /** A job row inside the tree: product photo, action + detail, price. */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
    paddingRight: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.cardRaised,
  },
  rowImageButton: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  rowImage: {
    flex: 1,
  },
  rowTitle: {
    flex: 1,
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  rowDetail: {
    color: colors.textSecondary,
    fontSize: fontSize.small,
  },
  rowPrice: {
    fontSize: fontSize.body,
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
});
