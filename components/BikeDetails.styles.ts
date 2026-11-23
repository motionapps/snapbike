import { StyleSheet } from 'react-native';
import { colors, fontSize, fonts, radius, shadow } from '../lib/theme';

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  headerText: {
    fontSize: fontSize.body,
    flex: 1,
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  headerFaint: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    flex: 1,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    flex: 1,
    color: colors.danger,
  },
  editButton: {
    paddingHorizontal: 4,
  },
  chevron: {
    width: 18,
    height: 18,
  },
  body: {
    overflow: 'hidden',
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 8,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  // Ja/Nej: a 10% green or red tint over the normal background.
  rowYes: {
    backgroundColor: 'rgba(73, 168, 104, 0.1)',
  },
  rowNo: {
    backgroundColor: 'rgba(196, 79, 91, 0.1)',
  },
  rowPressed: {
    backgroundColor: colors.cardRaised,
  },
  rowLabel: {
    width: 130,
    color: colors.textSecondary,
    fontSize: fontSize.emphasis, fontFamily: fonts.regular,
  },
  rowValue: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.emphasis,
    fontFamily: fonts.semiBold,
  },
  rowValueWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowInput: {
    paddingVertical: 0,
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  dropdownBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  dropdown: {
    position: 'absolute',
    backgroundColor: colors.cardRaised,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
    ...shadow.card,
  },
  dropdownFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderStrong,
  },
  dropdownFilter: {
    flex: 1,
    minHeight: 44,
    color: colors.text,
    fontSize: fontSize.emphasis,
    fontFamily: fonts.regular,
  },
  dropdownOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  // Lighter than rowDivider, which disappears against the dropdown's background.
  dropdownDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
  },
  dropdownText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.emphasis,
    fontFamily: fonts.regular,
  },
  dropdownTextSelected: {
    fontFamily: fonts.bold,
  },
});
