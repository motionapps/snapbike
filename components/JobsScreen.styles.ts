import { StyleSheet } from 'react-native';
import { colors, gutter, radius } from '../lib/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingHorizontal: gutter,
    paddingBottom: 14,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textFaint,
  },
  newJob: {
    marginLeft: 'auto',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  newJobText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: gutter,
    paddingBottom: 10,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  filterTextActive: {
    color: colors.onAccent,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: gutter,
    paddingBottom: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  searchMain: {
    flex: 7,
  },
  searchTag: {
    flex: 3,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    paddingVertical: 10,
    fontSize: 15,
  },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginHorizontal: gutter,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 90, 95, 0.1)',
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 95, 0.35)',
    padding: 12,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: gutter,
    paddingBottom: 24,
    gap: 12,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 80,
  },
  emptyText: {
    color: colors.textFaint,
  },
});
