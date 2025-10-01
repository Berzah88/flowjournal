import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

const ThemeContext = createContext();

// Tema tanımları
export const THEMES = {
  LIGHT: {
    name: 'light',
    colors: {
      // Background colors
      background: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceSecondary: '#F9FAFB',
      
      // Text colors
      text: '#000000',
      textSecondary: '#6B7280',
      textTertiary: '#9CA3AF',
      
      // Border colors
      border: '#E5E7EB',
      borderLight: '#F3F4F6',
      
      // Primary colors (mevcut renkler korunuyor)
      primary: '#8E7DBE',
      primaryLight: '#A78BC7',
      primaryDark: '#7A6BA8',
      
      // Secondary colors
      secondary: '#6C63FF',
      secondaryLight: '#8B82FF',
      secondaryDark: '#5A52E6',
      
      // Status colors
      success: '#4CAF50',
      error: '#FF4444',
      warning: '#FFD700',
      info: '#4A90E2',
      
      // Gray scale
      gray: {
        50: '#F9FAFB',
        100: '#F3F4F6',
        200: '#E5E7EB',
        300: '#D1D5DB',
        400: '#9CA3AF',
        500: '#6B7280',
        600: '#4B5563',
        700: '#374151',
        800: '#1F2937',
        900: '#111827',
      },
      
      // Special colors
      white: '#FFFFFF',
      black: '#000000',
      
      // Shadow colors
      shadow: 'rgba(0, 0, 0, 0.1)',
      shadowDark: 'rgba(0, 0, 0, 0.2)',
    }
  },
  DARK: {
    name: 'dark',
    colors: {
      // Background colors - Yumuşatılmış renkler
      background: '#2D3748', // Daha yumuşak koyu gri
      surface: '#4A5568', // Daha yumuşak orta gri
      surfaceSecondary: '#718096', // Daha yumuşak açık gri
      
      // Text colors - Daha yumuşak beyaz tonları
      text: '#F7FAFC', // Daha yumuşak beyaz
      textSecondary: '#E2E8F0', // Daha yumuşak gri-beyaz
      textTertiary: '#A0AEC0', // Daha yumuşak gri
      
      // Border colors - Daha yumuşak border renkleri
      border: '#718096', // Daha yumuşak border
      borderLight: '#A0AEC0', // Daha yumuşak açık border
      
      // Primary colors (mevcut renkler korunuyor)
      primary: '#8E7DBE',
      primaryLight: '#A78BC7',
      primaryDark: '#7A6BA8',
      
      // Secondary colors
      secondary: '#6C63FF',
      secondaryLight: '#8B82FF',
      secondaryDark: '#5A52E6',
      
      // Status colors
      success: '#4CAF50',
      error: '#FF4444',
      warning: '#FFD700',
      info: '#4A90E2',
      
      // Gray scale (dark mode için yumuşatılmış)
      gray: {
        50: '#2D3748', // Daha yumuşak en koyu
        100: '#4A5568', // Daha yumuşak koyu
        200: '#718096', // Daha yumuşak orta-koyu
        300: '#A0AEC0', // Daha yumuşak orta
        400: '#CBD5E0', // Daha yumuşak orta-açık
        500: '#E2E8F0', // Daha yumuşak açık
        600: '#EDF2F7', // Daha yumuşak çok açık
        700: '#F7FAFC', // Daha yumuşak beyaza yakın
        800: '#F7FAFC', // Yumuşak beyaz
        900: '#FFFFFF', // Saf beyaz
      },
      
      // Special colors - Yumuşatılmış
      white: '#2D3748', // Daha yumuşak koyu gri
      black: '#F7FAFC', // Daha yumuşak beyaz
      
      // Shadow colors
      shadow: 'rgba(0, 0, 0, 0.3)',
      shadowDark: 'rgba(0, 0, 0, 0.5)',
    }
  }
};

// Storage key
const THEME_STORAGE_KEY = '@theme_preference';

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(THEMES.LIGHT);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPreference, setCurrentPreference] = useState('system');

  // Tema tercihini yükle
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Sistem tema değişikliklerini dinle
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Sadece sistem teması kullanılıyorsa güncelle
      if (currentPreference === 'system') {
        setTheme(colorScheme === 'dark' ? THEMES.DARK : THEMES.LIGHT);
      }
    });

    return () => subscription?.remove();
  }, [currentPreference]);

  const loadThemePreference = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      
      if (storedTheme === 'dark') {
        setTheme(THEMES.DARK);
        setCurrentPreference('dark');
      } else if (storedTheme === 'light') {
        setTheme(THEMES.LIGHT);
        setCurrentPreference('light');
      } else {
        // Varsayılan olarak sistem teması kullan
        const systemTheme = Appearance.getColorScheme();
        setTheme(systemTheme === 'dark' ? THEMES.DARK : THEMES.LIGHT);
        
        // Sistem temasını storage'a kaydet
        await AsyncStorage.setItem(THEME_STORAGE_KEY, 'system');
        setCurrentPreference('system');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
      // Hata durumunda sistem temasını kullan
      const systemTheme = Appearance.getColorScheme();
      setTheme(systemTheme === 'dark' ? THEMES.DARK : THEMES.LIGHT);
      setCurrentPreference('system');
    } finally {
      setIsLoading(false);
    }
  };

  const setThemePreference = async (themeName) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, themeName);
      setCurrentPreference(themeName);
      
      if (themeName === 'dark') {
        setTheme(THEMES.DARK);
      } else if (themeName === 'light') {
        setTheme(THEMES.LIGHT);
      } else if (themeName === 'system') {
        const systemTheme = Appearance.getColorScheme();
        setTheme(systemTheme === 'dark' ? THEMES.DARK : THEMES.LIGHT);
      } else {
        // Varsayılan olarak sistem teması
        const systemTheme = Appearance.getColorScheme();
        setTheme(systemTheme === 'dark' ? THEMES.DARK : THEMES.LIGHT);
        await AsyncStorage.setItem(THEME_STORAGE_KEY, 'system');
        setCurrentPreference('system');
      }
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      // Mevcut tema durumuna göre direkt geçiş yap
      if (theme.name === 'light') {
        setThemePreference('dark');
      } else {
        setThemePreference('light');
      }
    } catch (error) {
      console.error('Error toggling theme:', error);
      // Fallback: basit toggle
      const newTheme = theme.name === 'light' ? 'dark' : 'light';
      setThemePreference(newTheme);
    }
  };

  const getCurrentThemeName = async () => {
    try {
      return await AsyncStorage.getItem(THEME_STORAGE_KEY) || 'system';
    } catch (error) {
      return 'system';
    }
  };

  // Storage'ı temizle ve sistem temasını zorla uygula
  const resetToSystemTheme = async () => {
    try {
      await AsyncStorage.removeItem(THEME_STORAGE_KEY);
      const systemTheme = Appearance.getColorScheme();
      
      setCurrentPreference('system');
      setTheme(systemTheme === 'dark' ? THEMES.DARK : THEMES.LIGHT);
    } catch (error) {
      console.error('Error resetting theme:', error);
    }
  };

  const value = {
    theme,
    setThemePreference,
    toggleTheme,
    getCurrentThemeName,
    resetToSystemTheme,
    isLoading,
    isDark: theme.name === 'dark',
    isSystemTheme: currentPreference === 'system',
    currentPreference,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
