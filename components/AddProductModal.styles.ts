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
  commonScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  commonContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipText: {
    color: colors.text,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
  },
  search: {
    flex: 1,
    color: colors.text,
    paddingVertical: 11,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  checkLabel: {
    color: colors.text,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  form: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  inputName: {
    flex: 1,
  },
  inputPrice: {
    width: 90,
    textAlign: 'right',
  },
  addButton: {
    marginHorizontal: 20,
    marginBottom: 14,
    alignItems: 'center',
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: colors.accent,
    paddingVertical: 12,
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    color: colors.onAccent,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  rowPressed: {
    backgroundColor: colors.cardRaised,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
  },
  rowMeta: {
    color: colors.textFaint,
    fontSize: 11,
  },
  rowPrice: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
