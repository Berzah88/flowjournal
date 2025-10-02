// components/LanguageSettings.js
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const LANGUAGES = [
  {
    code: 'en',
    name: 'English',
    flag: '🇺🇸',
    nativeName: 'English'
  },
  {
    code: 'tr',
    name: 'Turkish',
    flag: '🇹🇷',
    nativeName: 'Türkçe'
  }
];

export default function LanguageSettings({ 
  visible, 
  onClose, 
  onLanguageChange 
}) {
  const { theme } = useTheme();
  const { language, changeLanguage, t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  
  // Smooth animasyon değerleri
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);

  // Mevcut dil ayarını yükle
  useEffect(() => {
    setSelectedLanguage(language);
  }, [language, visible]);

  // Menu açılma/kapanma animasyonu
  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, {
        damping: 25,
        stiffness: 300,
        mass: 0.5,
      });
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, {
        damping: 25,
        stiffness: 300,
      });
    } else {
      scale.value = withTiming(0, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(-20, { duration: 150 });
    }
  }, [visible]);

  // Animasyonlu style'lar
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value }
    ],
    opacity: opacity.value,
  }));

  // Dil seçimi handler
  const handleLanguageSelect = useCallback(async (languageCode) => {
    try {
      setSelectedLanguage(languageCode);
      await changeLanguage(languageCode);
      
      // Parent component'e dil değişikliğini bildir
      onLanguageChange?.(languageCode);
      
      // Kısa bir gecikme sonra modal'ı kapat
      setTimeout(() => {
        onClose?.();
      }, 300);
    } catch (error) {
      console.error('Language save error:', error);
    }
  }, [changeLanguage, onLanguageChange, onClose]);

  if (!visible) return null;

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[
          styles.container,
          {
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : 'rgba(255, 255, 255, 0.95)',
            borderColor: theme.name === 'dark' ? '#000000' : 'rgba(255, 255, 255, 0.2)',
            shadowColor: theme.name === 'dark' ? '#000000' : '#000',
            shadowOpacity: theme.name === 'dark' ? 0.3 : 0.15,
            shadowRadius: theme.name === 'dark' ? 20 : 16,
            elevation: theme.name === 'dark' ? 12 : 12,
          },
          animatedContainerStyle
        ]}>
          {/* Language Options */}
          {LANGUAGES.map((language) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.item,
                {
                  backgroundColor: 'transparent',
                }
              ]}
              onPress={() => handleLanguageSelect(language.code)}
              accessible={true}
              accessibilityLabel={`Select ${language.name}`}
              accessibilityRole="button"
            >
              <View style={styles.itemContent}>
                <Text style={styles.flag}>{language.flag}</Text>
                <Text style={[
                  styles.itemText,
                  { 
                    color: selectedLanguage === language.code 
                      ? (theme.name === 'dark' ? '#FF6B6B' : '#FFA726')
                      : (theme.name === 'dark' ? '#FFFFFF' : '#2c3e50')
                  }
                ]}>{language.nativeName}</Text>
                {selectedLanguage === language.code && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={16} 
                    color={theme.name === 'dark' ? '#FF6B6B' : '#FFA726'} 
                    style={styles.checkIcon}
                  />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000,
  },
  container: {
    position: "absolute",
    top: 40,
    right: 18,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 200,
    shadowOffset: { width: 0, height: 8 },
    backdropFilter: "blur(20px)",
    borderWidth: 1,
  },
  item: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  flag: {
    fontSize: 20,
    marginRight: 12,
  },
  itemText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    flex: 1,
  },
  checkIcon: {
    marginLeft: 8,
  },
});
