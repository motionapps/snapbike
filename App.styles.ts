import { StyleSheet } from 'react-native';
import { colors, gutter, inset, radius, fontSize, fonts } from './lib/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  // Browser nav: mono uppercase labels, the active one underlined (BikeOffice style).
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
    paddingTop: 20,
    paddingBottom: 14,
    paddingHorizontal: inset,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  topNavItemActive: {
    borderBottomColor: colors.accentLight,
  },
  topNavLabel: {
    fontFamily: 'monospace',
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  // Without the bike bar, the settings cog takes the right edge itself.
  topNavPushRight: {
    marginLeft: 'auto',
  },
  topNavLabelActive: {
    color: colors.text,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  noAccessText: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
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
    fontSize: fontSize.body,
    color: colors.textSecondary,
    fontFamily: fonts.semiBold,
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
  // Hidden but still laid out, so its job modal can open from other tabs.
  pageCollapsed: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden',
    opacity: 0,
    pointerEvents: 'none',
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
  // Jobb is a short label, so its tab is narrower and the rest get more room.
  tabItemNarrow: {
    flex: 0.6,
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
    borderColor: colors.accentLight,
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
    fontSize: fontSize.small,
    fontFamily: fonts.semiBold,
  },
  tabLabelSmall: {
    fontSize: fontSize.small - 1,
  },
  tabLabelActive: {
    color: colors.accentLight,
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
    fontSize: fontSize.body,
    fontFamily: fonts.semiBold,
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
    color: colors.textSoft,
    fontFamily: fonts.semiBold,
    fontSize: fontSize.small,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontFamily: fonts.displayExtraBold,
  },
  subtitle: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    color: colors.textSoft,
  },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(196, 79, 91, 0.1)',
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(196, 79, 91, 0.35)',
    padding: 12,
  },
  errorText: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
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
    fontSize: fontSize.small,
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },
  transcriptText: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  tasksSection: {
    gap: 12,
  },
  sectionHeading: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: fontSize.emphasis,
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
    fontSize: fontSize.body,
    color: colors.textSecondary,
    fontFamily: fonts.semiBold,
  },
  totalValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  totalStruck: {
    color: colors.textFaint,
    fontSize: fontSize.body, fontFamily: fonts.regular,
    textDecorationLine: 'line-through',
  },
  totalValue: {
    color: colors.text,
    fontSize: fontSize.title,
    fontFamily: fonts.displayExtraBold,
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
    fontSize: fontSize.small,
    fontFamily: fonts.semiBold,
  },
  saveStatusError: {
    color: colors.danger,
  },
});
