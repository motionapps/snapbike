import { StyleSheet } from 'react-native';
import { colors, radius, shadow, fonts, fontSize } from '../lib/theme';

export const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: fontSize.emphasis,
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  emptyHint: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    color: colors.textFaint,
  },
  manualLink: {
    marginTop: 4,
    fontSize: fontSize.body,
    fontFamily: fonts.semiBold,
    color: colors.accentLight,
    textDecorationLine: 'underline',
  },
  retakeBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(21, 27, 36, 0.65)',
  },
  retakeText: {
    fontSize: fontSize.body,
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
});
