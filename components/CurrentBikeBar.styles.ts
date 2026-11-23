import { StyleSheet } from 'react-native';
import { colors, fontSize, fonts } from '../lib/theme';

export const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 6,
  },
  // Browser: pushed to the right end of the top nav.
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
    flexShrink: 1,
    minWidth: 0,
  },
  compactChip: {
    flexShrink: 1,
    minWidth: 0,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  compactBike: {
    fontFamily: fonts.regular,
    opacity: 0.85,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(21, 27, 36, 0.85)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  commentButtonPressed: {
    opacity: 0.7,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto',
    backgroundColor: 'rgba(21, 27, 36, 0.85)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: fontSize.small,
  },
  commentButtonText: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: fontSize.small,
  },
  tag: {
    fontFamily: fonts.bold,
    fontSize: fontSize.body,
  },
  name: {
    flexShrink: 1,
    fontFamily: fonts.bold,
    fontSize: fontSize.body,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    backgroundColor: 'rgba(21, 27, 36, 0.85)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  warningText: {
    flexShrink: 1,
    color: colors.danger,
    fontFamily: fonts.bold,
    fontSize: fontSize.small,
  },
  bike: {
    // Pulls the bike line up toward the name row above (bar gap is 6).
    marginTop: -7,
    fontSize: fontSize.body, fontFamily: fonts.regular,
    opacity: 0.85,
  },
});
