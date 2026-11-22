import { StyleSheet } from 'react-native';
import { colors, gutter, radius } from '../lib/theme';

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: gutter,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  edit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  editPressed: {
    opacity: 0.6,
  },
  tag: {
    backgroundColor: colors.cardRaised,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  tagText: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 32,
    fontVariant: ['tabular-nums'],
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 24,
  },
  bikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  detail: {
    flexShrink: 1,
    fontSize: 15,
    opacity: 0.85,
  },
  warningPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    backgroundColor: 'rgba(11, 15, 20, 0.85)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  warning: {
    flexShrink: 1,
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  close: {
    alignSelf: 'flex-start',
    marginRight: 5,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },
});
