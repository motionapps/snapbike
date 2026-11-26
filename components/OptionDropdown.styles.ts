import { StyleSheet } from 'react-native';
import { colors, fontSize, fonts, radius, shadow } from '../lib/theme';

export const styles = StyleSheet.create({
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
  },
  dropdownFilterRowDivider: {
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
  // Pressed or arrow-key highlighted; the dropdown itself is cardRaised.
  dropdownOptionPressed: {
    backgroundColor: colors.borderStrong,
  },
  // Lighter than a row divider, which disappears against the dropdown's background.
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
  dropdownDetail: {
    color: colors.textSecondary,
    fontSize: fontSize.small,
    fontFamily: fonts.regular,
  },
  dropdownTextSelected: {
    fontFamily: fonts.bold,
  },
  suggestWrap: {
    flex: 1,
  },
  // Under SuggestInput's field: past the row's bottom padding, option text in line with the typed text.
  suggestList: {
    top: '100%',
    marginTop: 12,
    left: -16,
    right: 0,
    zIndex: 10,
    elevation: 10,
  },
});
