import { StyleSheet } from 'react-native';
import { colors, radius, shadow } from '../lib/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 16,
    ...shadow.card,
  },
  cardPressed: {
    backgroundColor: colors.cardRaised,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
  },
  imageColumn: {
    width: 200,
    gap: 10,
  },
  thumb: {
    width: 200,
    height: 200,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: colors.cardRaised,
  },
  thumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 6,
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cardRaised,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginBottom: 4,
  },
  tagText: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 40,
    fontVariant: ['tabular-nums'],
  },
  name: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 19,
  },
  date: {
    color: colors.textFaint,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  tasksHeaderText: {
    flex: 1,
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  chevron: {
    width: 18,
    height: 18,
  },
  tasksBody: {
    overflow: 'hidden',
  },
  tasksContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  task: {
    color: colors.text,
    fontSize: 16,
    paddingVertical: 10,
  },
  taskDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  total: {
    marginTop: 4,
    color: colors.text,
    fontWeight: '700',
    fontSize: 18,
  },
});
