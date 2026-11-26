import { StyleSheet } from 'react-native';
import { colors, fontSize, fonts, radius } from '../lib/theme';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: {
    opacity: 0.6,
  },
  label: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSize.body,
  },
  value: {
    flex: 1,
    textAlign: 'right',
    color: colors.text,
    fontFamily: fonts.semiBold,
    fontSize: fontSize.body,
  },
  placeholder: {
    color: colors.accentLight,
  },
  error: {
    marginTop: 6,
    color: colors.danger,
    fontFamily: fonts.regular,
    fontSize: fontSize.small,
  },
});
