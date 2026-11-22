import { StyleSheet } from 'react-native';
import { colors, gutter, radius } from './lib/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  noAccessText: {
    color: colors.text,
    textAlign: 'center',
  },
  signOutButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  signOutText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  flex: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  pageHidden: {
    display: 'none',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  // Klar: rounded square around the icon with a check badge in the corner.
  tabIcon: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabIconDone: {
    borderColor: colors.accent,
  },
  tabCheck: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: colors.accent,
  },
  content: {
    paddingHorizontal: gutter,
    gap: 20,
  },
  photoSection: {
    gap: 8,
  },
  itemKindText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    padding: 14,
  },
  bikeDetailsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  newOrder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  newOrderText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textFaint,
  },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 90, 95, 0.1)',
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 95, 0.35)',
    padding: 12,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
  },
  transcriptBox: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transcriptLabel: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  transcriptText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  tasksSection: {
    gap: 12,
  },
  sectionHeading: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
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
  footer: {
    gap: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  totalValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  totalStruck: {
    color: colors.textFaint,
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  totalValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  saveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  saveStatusText: {
    color: colors.textFaint,
    fontSize: 13,
    fontWeight: '600',
  },
  saveStatusError: {
    color: colors.danger,
  },
});
