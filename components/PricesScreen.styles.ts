import { StyleSheet } from 'react-native';
import { colors, inset, radius, fontSize, fonts } from '../lib/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: inset,
    marginBottom: 14,
  },
  back: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontFamily: fonts.displayExtraBold,
  },
  /** Search on the left, bike filter on the right. */
  controls: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: inset,
    marginBottom: 12,
    zIndex: 10,
  },
  field: {
    flex: 1,
  },
  filterWrap: {
    width: 300,
    flexShrink: 1,
  },
  /** Label above a field; "filter aktivt" joins it when the filter is set. */
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 20,
    marginBottom: 8,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },
  activeMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeMarkText: {
    color: colors.ok,
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },
  filterButtonActive: {
    borderColor: colors.ok,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
  },
  filterMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    paddingVertical: 6,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.35)',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  filterOptionHover: {
    backgroundColor: colors.cardRaised,
  },
  filterCheck: {
    width: 22,
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    paddingVertical: 11,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
  },
  rowDetail: {
    color: colors.textSecondary,
    fontSize: fontSize.small,
  },
  rowSmall: {
    color: colors.textFaint,
    fontSize: fontSize.small,
    fontFamily: fonts.regular,
  },
  rowPrice: {
    color: colors.text,
    fontSize: fontSize.body,
    fontFamily: fonts.semiBold,
  },
});
