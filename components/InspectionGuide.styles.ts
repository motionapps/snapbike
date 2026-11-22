import { StyleSheet } from 'react-native';
import { colors, radius, fontSize, fonts } from '../lib/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heading: {
    color: colors.textFaint,
    fontSize: fontSize.small,
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },
  stepText: {
    color: colors.textFaint,
    fontSize: fontSize.small, fontFamily: fonts.regular,
  },
  chips: {
    gap: 6,
  },
  chip: {
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    fontFamily: fonts.semiBold,
  },
  chipTextActive: {
    color: colors.onAccent,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: fontSize.body,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 2,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentLight,
    marginTop: 8,
  },
  itemText: {
    flex: 1,
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    lineHeight: 22,
  },
  itemTitle: {
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  itemHint: {
    fontFamily: fonts.regular,
    color: colors.textFaint,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navDisabled: {
    opacity: 0.35,
  },
});
