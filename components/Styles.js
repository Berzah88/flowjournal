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
  // Map of the Poppins font variants used across the app. On iOS we fall back
  // to the system font. Make sure Poppins variants are loaded at app start
  // (eg. via expo-google-fonts/poppins or expo-font + assets).
  fonts: {
    regular: Platform.select({ ios: 'System', android: 'Poppins_400Regular', default: 'System' }),
    medium: Platform.select({ ios: 'System', android: 'Poppins_500Medium', default: 'System' }),
    semiBold: Platform.select({ ios: 'System', android: 'Poppins_600SemiBold', default: 'System' }),
    bold: Platform.select({ ios: 'System', android: 'Poppins_700Bold', default: 'System' }),
  },
  // Default fontFamily uses the regular variant for compatibility with existing code
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

// Basic text role helpers that use the centralized font mapping. Screens can
// opt to reference `Typography.fonts.*` directly or use these role styles.
const Text = StyleSheet.create({
  heading: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: Typography.sizes.lg,
  },
  body: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.md,
  },
  small: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.sm,
  },
});

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
  Text,
  Helpers,
};

export { Colors, Spacing, Typography, Text, Helpers };
