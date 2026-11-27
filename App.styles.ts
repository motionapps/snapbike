import { StyleSheet } from 'react-native';
import { colors, inset, fontSize, fonts } from './lib/theme';

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
});
