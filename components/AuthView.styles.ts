import { StyleSheet } from 'react-native';
import { fontSize, fonts } from '../lib/theme';

const BLUE = '#1976d2';
export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  // Centred while it fits; scrolls once a small screen, large text or the
  // keyboard leaves less room than the form needs.
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 24 },
  // Links on the left (wrapping onto more lines when they don't fit), close
  // button on the right in its own column so nothing overlaps it.
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingLeft: 28,
    paddingRight: 20,
  },
  topLinks: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    columnGap: 16,
    rowGap: 10,
  },
  linkText: { color: BLUE, fontSize: fontSize.body, fontFamily: fonts.semiBold },
  closeBtn: { marginLeft: 16 },
  title: { fontSize: 28, fontFamily: fonts.displayBold, color: '#1f2329' },
  subtitle: { fontSize: fontSize.body, fontFamily: fonts.regular, color: '#6b7280', marginTop: 6, marginBottom: 28 },
  label: { fontSize: fontSize.small, fontFamily: fonts.semiBold, color: '#3c4043', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#dcdee2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: fontSize.emphasis, fontFamily: fonts.regular,
    color: '#1f2329',
    backgroundColor: '#fafafa',
  },
  // The confirmation code: large and spaced so six digits read at a glance.
  codeInput: { fontSize: 22, fontFamily: fonts.displayBold, letterSpacing: 6, textAlign: 'center' },
  resendBtn: { alignSelf: 'center', marginTop: 18, padding: 6 },
  error: { color: '#d32f2f', fontSize: fontSize.body, fontFamily: fonts.regular, marginTop: 14 },
  notice: { color: '#2e7d32', fontSize: fontSize.body, fontFamily: fonts.regular, marginTop: 14 },
  button: {
    backgroundColor: BLUE,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    minHeight: 52,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: fontSize.emphasis, fontFamily: fonts.bold },

});
