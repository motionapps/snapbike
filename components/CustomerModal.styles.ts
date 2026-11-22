import { StyleSheet } from 'react-native';
import { colors, radius, fontSize, fonts } from '../lib/theme';

export const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
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
  form: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 14,
  },
  field: {
    gap: 6,
  },
  label: {
    color: colors.textFaint,
    fontSize: fontSize.small,
    fontFamily: fonts.semiBold,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tagInput: {
    width: 90,
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: fontSize.emphasis,
  },
  inputError: {
    borderColor: colors.danger,
  },
  hint: {
    color: colors.danger,
    fontSize: fontSize.small, fontFamily: fonts.regular,
  },
  input: {
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  slot: {
    position: 'relative',
  },
  slotActive: {
    zIndex: 10,
    elevation: 10,
  },
  suggestions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.45)',
    backgroundColor: colors.cardRaised,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestionName: {
    fontSize: fontSize.body,
    flex: 1,
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  suggestionPhone: {
    color: colors.textSecondary,
    fontSize: fontSize.small, fontFamily: fonts.regular,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    paddingVertical: 15,
    marginTop: 6,
  },
  saveButtonWarning: {
    backgroundColor: colors.warning,
  },
  warningText: {
    color: colors.warning,
    fontSize: fontSize.small,
    fontFamily: fonts.semiBold,
    textAlign: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveText: {
    fontSize: fontSize.body,
    color: colors.onAccent,
    fontFamily: fonts.bold,
  },
});
