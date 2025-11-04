// components/ParentDateNotificationModal.js
import React, { useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';


const ParentDateNotificationModal = ({
  visible = false,
  onClose = () => {},
  notifications = [],
  theme: propTheme,
}) => {
  const { theme: contextTheme } = useTheme();
  const { t } = useLanguage();
  const theme = propTheme || contextTheme;

  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // PanResponder for swipe to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 50) { // Swipe down
          handleClose();
        }
      },
    })
  ).current;

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
      ]).start(() => {
          try { onClose && onClose(); } catch (e) { if (__DEV__) console.debug('ParentDateNotificationModal onClose error', e); }
      });
    }
  }, [visible]);

  const handleClose = () => {
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
      try { onClose && onClose(); } catch (e) { if (__DEV__) console.debug('ParentDateNotificationModal onClose error', e); }
    });
  };

  if (!visible) return null;

  // İlk notification'dan parent milestone ismini al
  const firstNotification = notifications[0];
  const parentMilestoneName = firstNotification?.parentMilestoneName || 'Parent Milestone';

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
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleClose}
        accessibilityLabel={t('close') || 'Close'}
        accessibilityRole="button"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={[styles.closeButtonText, { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }]}>✕</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.content}
        onPress={handleClose}
        activeOpacity={0.9}
      >
        <View style={styles.leftSection}>
          <View style={styles.textContainer}>
            <Text style={[
              styles.title,
              { color: theme.name === 'dark' ? '#FF6B6B' : theme.colors.text }
            ]}>
              📅 {t('dateChangeWarning')}
            </Text>
            <Text style={[
              styles.message,
              { color: theme.name === 'dark' ? '#8E8E93' : '#666' }
            ]}>
              {t('parentDateAffectedMessage').replace('{parentMilestoneName}', parentMilestoneName)}
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
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    lineHeight: 20,
  },
  closeButton: {
    position: 'absolute',
    right: 12,
    top: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1010,
  },
  closeButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
});

ParentDateNotificationModal.displayName = 'ParentDateNotificationModal';
export default memo(ParentDateNotificationModal);
