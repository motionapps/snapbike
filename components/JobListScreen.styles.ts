import { StyleSheet } from 'react-native';
import { colors, gutter, inset, radius, fontSize, fonts } from '../lib/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingHorizontal: inset,
    paddingBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontFamily: fonts.displayExtraBold,
  },
  subtitle: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    color: colors.textFaint,
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    fontSize: fontSize.body,
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  lockedBanner: {
    marginHorizontal: inset,
    marginBottom: 8,
  },
  content: {
    paddingHorizontal: gutter,
    paddingTop: 8,
    gap: 16,
  },
  empty: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.body,
    fontFamily: fonts.bold,
    flex: 1,
  },
  sectionSum: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    fontFamily: fonts.semiBold,
  },
  sectionBody: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  rowRejected: {
    opacity: 0.55,
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
  rowProduct: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
  },
  rowBadge: {
    fontSize: fontSize.small,
    fontFamily: fonts.bold,
    marginTop: 2,
  },
  badgeApproved: {
    color: colors.success,
  },
  badgeRejected: {
    color: colors.textFaint,
  },
  rowPrice: {
    fontSize: fontSize.body,
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  struck: {
    textDecorationLine: 'line-through',
    color: colors.textFaint,
  },
  addTask: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    paddingVertical: 14,
  },
  addTaskText: {
    fontSize: fontSize.body,
    color: colors.accentLight,
    fontFamily: fonts.semiBold,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 4,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.emphasis,
    fontFamily: fonts.semiBold,
  },
  totalValue: {
    color: colors.text,
    fontSize: 22,
    fontFamily: fonts.displayExtraBold,
  },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  errorText: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    color: colors.danger,
    flex: 1,
  },
  actions: {
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionRowItem: {
    flex: 1,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 14,
  },
  primaryText: {
    color: colors.onAccent,
    fontSize: fontSize.emphasis,
    fontFamily: fonts.bold,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 13,
  },
  secondaryText: {
    color: colors.text,
    fontSize: fontSize.body,
    fontFamily: fonts.semiBold,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  readyWrap: {
    gap: 8,
    marginTop: 12,
  },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  notifyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifyText: {
    fontSize: fontSize.body,
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  readyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  readyButtonPressed: {
    opacity: 0.7,
  },
  readyButtonText: {
    color: colors.onAccent,
    fontSize: fontSize.body,
    fontFamily: fonts.bold,
  },
  readyError: {
    color: colors.danger,
    fontSize: fontSize.small, fontFamily: fonts.regular,
    textAlign: 'center',
  },
  cancelText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    fontFamily: fonts.semiBold,
  },
});
