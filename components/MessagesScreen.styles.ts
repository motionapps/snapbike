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
    paddingBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    flexShrink: 1,
  },
  subtitle: {
    color: colors.textFaint,
    flex: 1,
  },
  back: {
    alignSelf: 'center',
  },
  empty: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: gutter + 12,
  },
  loader: {
    paddingVertical: 24,
  },
  list: {
    paddingHorizontal: gutter,
    gap: 8,
  },
  row: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    padding: 14,
    gap: 4,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  rowName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  rowTime: {
    color: colors.textFaint,
    fontSize: 12,
  },
  rowBody: {
    color: colors.textSecondary,
  },
  thread: {
    paddingHorizontal: gutter + 8,
    paddingVertical: 8,
    gap: 6,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 2,
  },
  bubbleOut: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
  },
  bubbleIn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cardRaised,
  },
  bubbleText: {
    color: colors.text,
    fontSize: 15,
  },
  bubbleTextOut: {
    color: colors.onAccent,
    fontSize: 15,
  },
  bubbleTime: {
    color: colors.textFaint,
    fontSize: 11,
  },
  bubbleTimeOut: {
    color: colors.onAccent,
    opacity: 0.6,
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  sendError: {
    color: colors.danger,
    paddingHorizontal: gutter + 8,
    paddingBottom: 4,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: gutter + 4,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 140,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
});
