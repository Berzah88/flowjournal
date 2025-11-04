// components/Motive.js
import React, { memo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const Motive = ({ 
  visible = false, 
  onClose = () => {},
  type = 'welcome',
  title = '',
  message = '',
  color = '#667eea'
}) => {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto close removed - user must manually close
    } else {
      // Slide out animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose && onClose();
    });
  }, [onClose, slideAnim, opacityAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
          borderColor: theme.name === 'dark' ? '#2C2C2E' : 'rgba(0, 0, 0, 0.1)',
          shadowColor: theme.name === 'dark' ? '#000000' : '#000',
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        }
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handleClose}
        activeOpacity={0.9}
        accessible
        accessibilityRole="button"
        accessibilityLabel={title || 'notification'}
      >
        <View style={styles.leftSection}>
          <View style={styles.textContainer}>
            <Text style={[
              styles.title,
              { color: theme.name === 'dark' ? '#FF6B6B' : theme.colors.text }
            ]}>
              {title}
            </Text>
            <Text style={[
              styles.message,
              { color: theme.name === 'dark' ? '#8E8E93' : '#666' }
            ]}>
              {message}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60, // Below status bar
    left: 12,
    right: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    lineHeight: 22,
  },
});

export default memo(Motive);
