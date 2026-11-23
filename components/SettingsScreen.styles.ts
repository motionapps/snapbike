import { StyleSheet } from 'react-native';
import { colors, inset, fontSize, fonts } from '../lib/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: inset,
    gap: 16,
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
