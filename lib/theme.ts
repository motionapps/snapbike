import { Dimensions } from 'react-native';

/** BikeOffice dark palette (../bikeoffice-sf-be/new-design/dark-mode.md). */
export const colors = {
  bg: '#1F2937',
  card: '#151B24',
  cardRaised: '#374151',
  border: '#374151',
  borderStrong: '#4B5563',
  text: '#F2F2F0',
  /** Near-white for quiet labels and idle icons that should still read clearly. */
  textSoft: '#D1D5DB',
  textSecondary: '#A2A7AD',
  textFaint: '#6B7177',
  /** Brand blue: button fills, with white text on top. */
  accent: '#2563EB',
  accentDark: '#1D4ED8',
  /** Brand blue for text, icons and outlines on dark surfaces. */
  accentLight: '#60A5FA',
  onAccent: '#FFFFFF',
  success: '#49A868',
  danger: '#C44F5B',
  warning: '#C4A14F',
  recording: '#E5484D',
};

export const statusColors = {
  booked: '#6B7177',
  checked_in: '#4FB8C4',
  received: '#4F89C4',
  inspected: '#C4A14F',
  awaiting_customer: '#C44F89',
  customer_approved: '#724FC4',
  in_progress: '#C4724F',
  ready: '#49A868',
  delivered: '#4FC472',
};

/** The four standard text sizes. Hero numbers may go larger. */
export const fontSize = {
  small: 13,
  body: 15,
  emphasis: 17,
  title: 20,
};

/** Each weight is its own family; set fontFamily instead of fontWeight. */
export const fonts = {
  regular: 'IBMPlexSans_400Regular',
  semiBold: 'IBMPlexSans_600SemiBold',
  bold: 'IBMPlexSans_700Bold',
  displayBold: 'Archivo_700Bold',
  displayExtraBold: 'Archivo_800ExtraBold',
};

/** Card accent per price-list category, from the BikeOffice 15-color palette. */
const CATEGORY_GROUPS: [string, string[]][] = [
  ['#4F89C4', ['hjulservice', 'hjulriktning']],
  ['#C4A14F', ['servicepaket', 'elcykel', 'försäkring']],
  ['#4FC4A1', ['drivlina']],
  ['#C4724F', ['bromsservice']],
  ['#89C44F', ['växelservice']],
  ['#724FC4', ['däck och slang']],
  ['#C44F5B', ['montering', 'tillägg', 'byte']],
];

export function categoryColor(category: string): string {
  const key = category.trim().toLowerCase();
  return CATEGORY_GROUPS.find(([, names]) => names.includes(key))?.[0] ?? colors.textFaint;
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 20,
};

export const shadow = {
  card: { boxShadow: '0 8px 20px rgba(0, 0, 0, 0.35)' },
  button: { boxShadow: '0 6px 16px rgba(37, 99, 235, 0.3)' },
};

const isPhone = Dimensions.get('window').width < 500;

/** Side margin of screens (cards, lists): tight on phones, roomier on tablets/desktop. */
export const gutter = isPhone ? 4 : 20;

/** Side margin for headers, text and buttons that sit directly at the screen edge. */
export const inset = isPhone ? 12 : 20;
