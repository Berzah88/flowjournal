import { StyleSheet, Platform } from 'react-native';

const Colors = {
  primary: '#4F46E5',
  accent: '#06B6D4',
  background: '#FFFFFF',
  surface: '#F8FAFC',
  text: '#0F172A',
  muted: '#94A3B8',
  danger: '#EF4444',
};

const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const Typography = {
  // Use system font on iOS, use Poppins on Android as requested. Note: ensure
  // Poppins font files (or expo-google-fonts/poppins) are loaded at app start.
  fontFamily: Platform.select({ ios: 'System', android: 'Poppins_400Regular', default: 'System' }),
  sizes: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
  },
  weights: {
    normal: '400',
    medium: '500',
    bold: '700',
  },
};

const Helpers = StyleSheet.create({
  rowCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  // Keep container helper minimal and avoid forcing a background color here
  // so dark/light themes controlled by screen-level theming are not overridden.
  container: { flex: 1 },
});

export default {
  Colors,
  Spacing,
  Typography,
  Helpers,
};

export { Colors, Spacing, Typography, Helpers };
