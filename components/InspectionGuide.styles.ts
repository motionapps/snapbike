import { StyleSheet } from 'react-native';
import { colors, radius } from '../lib/theme';

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
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  stepText: {
    color: colors.textFaint,
    fontSize: 11,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.onAccent,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 2,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 7,
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  itemTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  itemHint: {
    color: colors.textFaint,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  navButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
