import { StyleSheet } from 'react-native';
import { colors, inset, radius, fontSize, fonts } from '../lib/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 14,
    paddingHorizontal: inset,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontFamily: fonts.displayExtraBold,
  },
  email: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.body,
    fontFamily: fonts.semiBold,
  },
  signOutButton: {
    alignSelf: 'flex-start',
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
});
