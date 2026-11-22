import { StyleSheet } from 'react-native';
import { colors, gutter, radius, fontSize, fonts } from '../lib/theme';

export const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  back: {
    marginLeft: -4,
  },
  heading: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: fontSize.title,
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },
  input: {
    flex: 1,
    marginHorizontal: gutter,
    marginBottom: 24,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: fontSize.emphasis, fontFamily: fonts.regular,
  },
  emptyText: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    color: colors.textFaint,
  },
  textContent: {
    paddingHorizontal: gutter,
    paddingBottom: 40,
  },
  text: {
    color: colors.text,
    fontSize: fontSize.emphasis, fontFamily: fonts.regular,
    lineHeight: 23,
  },
  list: {
    paddingHorizontal: gutter,
    paddingBottom: 40,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.cardRaised,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: fontSize.emphasis,
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  rowPreview: {
    color: colors.textSecondary,
    fontSize: fontSize.small, fontFamily: fonts.regular,
  },
});
