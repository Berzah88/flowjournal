// components/MainMenu.js
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedReanimated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming 
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

  // Menu animation
  useEffect(() => {
    if (visible) {
      menuScale.value = withSpring(1, {
        damping: 25,
        stiffness: 300,
        mass: 0.5,
      });
      menuOpacity.value = withTiming(1, { duration: 200 });
      menuTranslateY.value = withSpring(0, {
        damping: 25,
        stiffness: 300,
      });
    } else {
      menuScale.value = withTiming(0, { duration: 150 });
      menuOpacity.value = withTiming(0, { duration: 150 });
      menuTranslateY.value = withTiming(-20, { duration: 150 });
    }
  }, [visible, menuScale, menuOpacity, menuTranslateY]);

  // Menu animated style
  const menuAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: menuScale.value },
      { translateY: menuTranslateY.value }
    ],
    opacity: menuOpacity.value,
  }));

  if (!visible) return null;

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

          {/* Mood Tracker */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              navigation.navigate('EmotionalJournal');
            }}
            accessible={true}
            accessibilityLabel="Open emotional journal"
            accessibilityRole="button"
          >
            <View style={styles.menuItemContent}>
              <Ionicons name="heart-outline" size={20} color="#FF6B6B" />
              <Text style={[styles.menuItemText, { color: theme.colors.text }]}>{t('journal')}</Text>
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

