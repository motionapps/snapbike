import { StyleSheet } from 'react-native';
import { colors, inset, radius, fontSize, fonts } from '../lib/theme';

const CHIP_HEIGHT = 40;

export const styles = StyleSheet.create({
  chipScroll: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 2,
  },
  chipRow: {
    alignItems: 'center',
    gap: 8,
  },
  /** Browser: all chips visible on as many lines as needed. */
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  /** 20% larger than the old chips; the photo fills the rounded left end. */
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: CHIP_HEIGHT,
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 17,
  },
  chipImage: {
    width: CHIP_HEIGHT - 2,
    height: CHIP_HEIGHT - 2,
    marginLeft: -17,
    borderRadius: (CHIP_HEIGHT - 2) / 2,
    backgroundColor: '#fff',
  },
  chipText: {
    color: colors.textSecondary,
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
  chipTextActive: {
    color: colors.bg,
  },
  list: {
    paddingHorizontal: inset,
    paddingBottom: 40,
    gap: 10,
  },
  group: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  groupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  groupName: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.emphasis,
    fontFamily: fonts.displayBold,
  },
  groupCount: {
    color: colors.textFaint,
    fontSize: fontSize.small,
    fontFamily: fonts.semiBold,
  },
  groupBody: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  child: {
    marginLeft: 6,
    paddingLeft: 14,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  partName: {
    marginTop: 10,
    marginBottom: 2,
    color: colors.textSoft,
    fontSize: fontSize.body,
    fontFamily: fonts.semiBold,
  },
  empty: {
    color: colors.textFaint,
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginTop: 30,
  },
});
