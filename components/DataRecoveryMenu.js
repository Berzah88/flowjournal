// components/DataRecoveryMenu.js
import React, { useCallback, useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from "react-native-reanimated";

export default function DataRecoveryMenu({ 
  visible, 
  onClose, 
  onRecoverData, 
  onCreateBackup,
  onLanguageSettings
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  // Smooth animasyon değerleri
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);

  // Keep component mounted during close animation so the closing
  // animation can run before unmounting. Use an internal render flag.
  const [shouldRender, setShouldRender] = useState(visible);
  const hideTimeout = useRef(null);
  const CLOSE_DELAY = 260; // slightly longer than the withTiming close duration

  useEffect(() => {
    if (visible) {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
        hideTimeout.current = null;
      }
      setShouldRender(true);
    }

    // Start animations for open/close
    if (visible) {
      // Apple-like entrance: larger overshoot then softer spring settle
      scale.value = withSequence(
        withTiming(1.08, { duration: 180 }),
        withSpring(1, { damping: 10, stiffness: 120, mass: 0.9 })
      );
      opacity.value = withTiming(1, { duration: 220 });
      translateY.value = withSequence(
        withTiming(-12, { duration: 160 }),
        withSpring(0, { damping: 10, stiffness: 120 })
      );
    } else {
      // Gentle close: smoother squeeze then disappear
      scale.value = withSequence(
        withTiming(0.96, { duration: 160 }),
        withTiming(0, { duration: 180 })
      );
      opacity.value = withTiming(0, { duration: 170 });
      translateY.value = withTiming(-24, { duration: 170 });

      // Delay unmount until animation completes
      hideTimeout.current = setTimeout(() => {
        setShouldRender(false);
        hideTimeout.current = null;
      }, CLOSE_DELAY);
    }

    return () => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
        hideTimeout.current = null;
      }
    };
  }, [visible]);

  // Animasyonlu style'lar
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value }
    ],
    opacity: opacity.value,
  }));

  // Memoized handlers to prevent unnecessary re-renders
  const handleRecoverData = useCallback(() => {
    onRecoverData?.();
    onClose?.();
  }, [onRecoverData, onClose]);

  const handleCreateBackup = useCallback(() => {
    onCreateBackup?.();
    onClose?.();
  }, [onCreateBackup, onClose]);

  const handleLanguageSettings = useCallback(() => {
    onLanguageSettings?.();
    onClose?.();
  }, [onLanguageSettings, onClose]);



  if (!shouldRender) return null;

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
          {/* Language Settings */}
          <TouchableOpacity
            style={[
              styles.item,
              {
                backgroundColor: 'transparent',
              }
            ]}
            onPress={handleLanguageSettings}
            accessible={true}
            accessibilityLabel="Language settings"
            accessibilityRole="button"
          >
            <View style={styles.itemContent}>
              <Ionicons 
                name="language-outline" 
                size={20} 
                color={theme.name === 'dark' ? '#FF6B6B' : '#FFA726'} 
              />
              <Text style={[
                styles.itemText,
                { color: theme.name === 'dark' ? '#FFFFFF' : '#2c3e50' }
              ]}>{t('language')}</Text>
            </View>
          </TouchableOpacity>


          {/* Create Backup */}
          <TouchableOpacity
            style={[
              styles.item,
              {
                backgroundColor: 'transparent',
              }
            ]}
            onPress={handleCreateBackup}
            accessible={true}
            accessibilityLabel="Create manual backup"
            accessibilityRole="button"
          >
            <View style={styles.itemContent}>
              <Ionicons 
                name="save-outline" 
                size={20} 
                color={theme.name === 'dark' ? '#34C759' : '#4ECDC4'} 
              />
              <Text style={[
                styles.itemText,
                { color: theme.name === 'dark' ? '#34C759' : '#4ECDC4' }
              ]}>{t('createBackup')}</Text>
            </View>
          </TouchableOpacity>

          {/* Recover Data */}
          <TouchableOpacity
            style={[
              styles.item,
              {
                backgroundColor: 'transparent',
              }
            ]}
            onPress={handleRecoverData}
            accessible={true}
            accessibilityLabel="Recover lost data"
            accessibilityRole="button"
          >
            <View style={styles.itemContent}>
              <Ionicons 
                name="refresh-outline" 
                size={20} 
                color={theme.name === 'dark' ? '#FF6B6B' : '#FF6B6B'} 
              />
              <Text style={[
                styles.itemText,
                { color: theme.name === 'dark' ? '#FF6B6B' : '#FF6B6B' }
              ]}>{t('recoverData')}</Text>
            </View>
          </TouchableOpacity>
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
  itemText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    marginLeft: 12,
  },
});
