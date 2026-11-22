import { StyleSheet } from 'react-native';
import { colors } from '../lib/theme';

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  headerText: {
    flex: 1,
    color: colors.text,
    fontWeight: '600',
  },
  headerFaint: {
    flex: 1,
    color: colors.textSecondary,
  },
  errorText: {
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
  rowPressed: {
    backgroundColor: colors.cardRaised,
  },
  rowLabel: {
    width: 130,
    color: colors.textSecondary,
    fontSize: 16,
  },
  rowValue: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
