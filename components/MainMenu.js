// components/MainMenu.js
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedReanimated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import ThemeToggle from './ThemeToggle';

const MainMenu = ({
  visible,
  onClose,
  theme,
  t,
  language,
  navigation,
  onDataRecoveryPress,
  onNotificationPress,
}) => {
  // Menu animation values
  const menuScale = useSharedValue(0);
  const menuOpacity = useSharedValue(0);
  const menuTranslateY = useSharedValue(-20);

  // Keep component mounted during close animation so closing animation runs
  const [shouldRender, setShouldRender] = useState(visible);
  const hideTimeout = useRef(null);
  const CLOSE_DELAY = 260;

  useEffect(() => {
    if (visible) {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
        hideTimeout.current = null;
      }
      setShouldRender(true);
    }

    if (visible) {
      // Apple-like open: larger overshoot then softer spring settle
      menuScale.value = withSequence(
        withTiming(1.08, { duration: 180 }),
        withSpring(1, { damping: 10, stiffness: 120, mass: 0.9 })
      );
      menuOpacity.value = withTiming(1, { duration: 220 });
      menuTranslateY.value = withSequence(
        withTiming(-12, { duration: 160 }),
        withSpring(0, { damping: 10, stiffness: 120 })
      );
    } else {
      menuScale.value = withSequence(
        withTiming(0.96, { duration: 160 }),
        withTiming(0, { duration: 180 })
      );
      menuOpacity.value = withTiming(0, { duration: 170 });
      menuTranslateY.value = withTiming(-24, { duration: 170 });

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
  }, [visible, menuScale, menuOpacity, menuTranslateY]);

  // Menu animated style
  const menuAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: menuScale.value },
      { translateY: menuTranslateY.value }
    ],
    opacity: menuOpacity.value,
  }));

  if (!shouldRender) return null;

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.menuOverlay}>
        <AnimatedReanimated.View style={[
          styles.menuContainer, 
          { 
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
            borderColor: theme.name === 'dark' ? '#000000' : 'rgba(255, 255, 255, 0.2)',
            shadowColor: theme.name === 'dark' ? '#000000' : '#000',
            shadowOpacity: theme.name === 'dark' ? 0.3 : 0.15,
            shadowRadius: theme.name === 'dark' ? 12 : 16,
            elevation: theme.name === 'dark' ? 8 : 12,
          },
          menuAnimatedStyle
        ]}>
          {/* Tutorial */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              navigation.navigate('Tutorial');
            }}
            accessible={true}
            accessibilityLabel="View tutorial"
            accessibilityRole="button"
          >
            <View style={styles.menuItemContent}>
              <Ionicons name="help-circle-outline" size={20} color="#8B5CF6" />
              <Text style={[styles.menuItemText, { color: theme.colors.text }]}>{t('tutorial')}</Text>
            </View>
          </TouchableOpacity>

          {/* Completed Projects */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              navigation.navigate('CompletedProjects');
            }}
            accessible={true}
            accessibilityLabel="View completed projects"
            accessibilityRole="button"
          >
            <View style={styles.menuItemContent}>
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.success} />
              <Text style={[styles.menuItemText, { color: theme.colors.text }]}>{t('completedProjects')}</Text>
            </View>
          </TouchableOpacity>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onNotificationPress();
            }}
            accessible={true}
            accessibilityLabel="Notification settings"
            accessibilityRole="button"
          >
            <View style={styles.menuItemContent}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.secondary} />
              <Text style={[styles.menuItemText, { color: theme.colors.text }]}>{t('notifications')}</Text>
            </View>
          </TouchableOpacity>

          {/* Settings & Data */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onDataRecoveryPress();
            }}
            accessible={true}
            accessibilityLabel="Settings and data management"
            accessibilityRole="button"
          >
            <View style={styles.menuItemContent}>
              <Ionicons name="settings-outline" size={20} color={theme.colors.secondary} />
              <Text style={[styles.menuItemText, { color: theme.colors.text }]}>{t('settings')}</Text>
            </View>
          </TouchableOpacity>
        </AnimatedReanimated.View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  menuContainer: {
    position: "absolute",
    top: 60,
    right: 18,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 200,
    shadowOffset: { width: 0, height: 8 },
    backdropFilter: "blur(20px)",
    borderWidth: 1,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemText: {
    fontSize: 16,
    color: "#2c3e50",
    fontFamily: "Poppins_600SemiBold",
    marginLeft: 12,
  },
});

export default MainMenu;

