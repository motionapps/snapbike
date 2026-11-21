import { Dimensions } from 'react-native';

export const colors = {
  bg: '#0B0F14',
  card: '#151C24',
  cardRaised: '#1B2430',
  border: '#242F3D',
  text: '#F2F5F7',
  textSecondary: '#8A96A3',
  textFaint: '#5A6672',
  accent: '#B9F13C',
  accentDark: '#8FBF1F',
  onAccent: '#0B0F14',
  danger: '#FF5A5F',
  warning: '#FFC53D',
  recording: '#FF453A',
};

export const statusColors = {
  booked: '#8A96A3',
  checked_in: '#5AC8FA',
  received: '#64D2FF',
  inspected: '#FFB340',
  awaiting_customer: '#FF6482',
  customer_approved: '#BF5AF2',
  in_progress: '#FF9F0A',
  ready: '#B9F13C',
  delivered: '#8FBF1F',
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
};

export const shadow = {
  card: { boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)' },
  button: { boxShadow: '0 6px 20px rgba(185, 241, 60, 0.25)' },
};

/** Side margin of screens: tight on phones, roomier on tablets/desktop. */
export const gutter = Dimensions.get('window').width < 500 ? 4 : 20;
