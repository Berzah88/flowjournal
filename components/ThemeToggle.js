import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, BORDER_RADIUS } from '../constants';

export default function ThemeToggle({ style }) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.menuItem, style]}
      onPress={toggleTheme}
      accessible={true}
      accessibilityLabel={isDark ? "Switch to light theme" : "Switch to dark theme"}
      accessibilityRole="button"
    >
      <View style={styles.menuItemContent}>
        <Ionicons 
          name={isDark ? "moon" : "sunny"} 
          size={20} 
          color={theme.colors.primary} 
        />
        <Text style={[styles.menuItemText, { color: theme.colors.text }]}>
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Theme Settings Modal Component
export function ThemeSettingsModal({ visible, onClose }) {
  const { theme, setThemePreference, getCurrentThemeName } = useTheme();
  const [currentTheme, setCurrentTheme] = React.useState('light');

  React.useEffect(() => {
    if (visible) {
      getCurrentThemeName().then(setCurrentTheme);
    }
  }, [visible]);

  const themeOptions = [
    { key: 'light', label: 'Light', icon: 'sunny', description: 'Always use light theme' },
    { key: 'dark', label: 'Dark', icon: 'moon', description: 'Always use dark theme' },
    { key: 'system', label: 'System', icon: 'phone-portrait', description: 'Follow system setting' },
  ];

  const handleThemeSelect = async (themeKey) => {
    await setThemePreference(themeKey);
    setCurrentTheme(themeKey);
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            Theme Settings
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.optionsContainer}>
          {themeOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.optionItem,
                { 
                  backgroundColor: theme.colors.surfaceSecondary,
                  borderColor: currentTheme === option.key ? theme.colors.primary : theme.colors.border
                }
              ]}
              onPress={() => handleThemeSelect(option.key)}
            >
              <View style={styles.optionLeft}>
                <View style={[
                  styles.optionIcon,
                  { backgroundColor: currentTheme === option.key ? theme.colors.primary : theme.colors.gray[300] }
                ]}>
                  <Ionicons 
                    name={option.icon} 
                    size={20} 
                    color={currentTheme === option.key ? theme.colors.white : theme.colors.textSecondary} 
                  />
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                    {option.description}
                  </Text>
                </View>
              </View>
              {currentTheme === option.key && (
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: FONTS.SEMI_BOLD,
    marginLeft: 12,
  },
  
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FONTS.SEMI_BOLD,
  },
  closeButton: {
    padding: SPACING.SM,
  },
  optionsContainer: {
    gap: SPACING.MD,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 2,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.MD,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: FONTS.MEDIUM,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: FONTS.REGULAR,
  },
});
