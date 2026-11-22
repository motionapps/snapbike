import { StyleSheet } from 'react-native';
import { colors, radius, fontSize, fonts } from '../lib/theme';

export const styles = StyleSheet.create({
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
  },
  buttonText: {
    fontSize: fontSize.body,
    color: colors.accentLight,
    fontFamily: fonts.semiBold,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardPressed: {
    opacity: 0.6,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: fontSize.body,
    color: colors.text,
    fontFamily: fonts.bold,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: fontSize.small, fontFamily: fonts.regular,
  },
  iconButton: {
    padding: 4,
  },
});
