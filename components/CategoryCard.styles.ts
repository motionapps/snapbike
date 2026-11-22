import { StyleSheet } from 'react-native';
import { colors, fontSize, fonts, radius, shadow } from '../lib/theme';

export const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    marginRight: 6,
  },
  depth: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    right: -6,
    width: 20,
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 2,
    padding: 16,
    paddingTop: 20,
    gap: 10,
    ...shadow.card,
  },
  tag: {
    position: 'absolute',
    top: -12,
    left: 14,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  tagText: {
    color: colors.card,
    fontSize: fontSize.small,
    fontFamily: fonts.bold,
  },
});
