import { StyleSheet } from 'react-native';
import { colors } from '../lib/theme';

export const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 6,
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
    backgroundColor: 'rgba(11, 15, 20, 0.85)',
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
    backgroundColor: 'rgba(11, 15, 20, 0.85)',
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
    fontWeight: '700',
    fontSize: 12,
  },
  commentButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  tag: {
    fontWeight: '800',
    fontSize: 14,
  },
  name: {
    flexShrink: 1,
    fontWeight: '700',
    fontSize: 14,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    backgroundColor: 'rgba(11, 15, 20, 0.85)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  warningText: {
    flexShrink: 1,
    color: colors.danger,
    fontWeight: '700',
    fontSize: 13,
  },
  bike: {
    fontSize: 14,
    opacity: 0.85,
  },
});
