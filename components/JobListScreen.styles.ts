import { StyleSheet } from 'react-native';
import { colors, gutter, radius } from '../lib/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingHorizontal: gutter,
    paddingBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
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
    color: colors.text,
    fontWeight: '600',
  },
  lockedBanner: {
    marginHorizontal: gutter,
    marginBottom: 8,
  },
  content: {
    paddingHorizontal: gutter,
    paddingTop: 8,
    gap: 16,
  },
  empty: {
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
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  sectionSum: {
    color: colors.textSecondary,
    fontWeight: '600',
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
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  rowProduct: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  rowBadge: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  badgeApproved: {
    color: colors.accentDark,
  },
  badgeRejected: {
    color: colors.textFaint,
  },
  rowPrice: {
    color: colors.text,
    fontWeight: '600',
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
    color: colors.accent,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 4,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  errorText: {
    color: colors.danger,
    flex: 1,
  },
  actions: {
    gap: 10,
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
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 15,
    fontWeight: '600',
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
  },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifyText: {
    color: colors.text,
    fontWeight: '600',
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
    fontSize: 15,
    fontWeight: '700',
  },
  readyError: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
