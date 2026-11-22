import { StyleSheet } from 'react-native';
import { colors, radius } from '../lib/theme';

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
    fontWeight: '700',
    fontSize: 18,
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
    fontSize: 12,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tagInput: {
    width: 90,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },
  inputError: {
    borderColor: colors.danger,
  },
  hint: {
    color: colors.danger,
    fontSize: 12,
  },
  input: {
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
    flex: 1,
    color: colors.text,
    fontWeight: '600',
  },
  suggestionPhone: {
    color: colors.textSecondary,
    fontSize: 13,
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
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveText: {
    color: colors.onAccent,
    fontWeight: '700',
  },
});
