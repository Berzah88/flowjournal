// components/CelebrationModal.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getContextualMessage } from '../utils/CelebrationMessages';

const CelebrationModal = ({ 
  visible = false, 
  onClose = () => {},
  onJournalPress = () => {},
  completion = null,
  activeTasks = [],
  completedTasks = []
}) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const panAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset pan animation
      panAnim.setValue(0);
      
      // Slide in animation - Motive ile TAM AYNI
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

      // Auto close after 10 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 10000);

      return () => clearTimeout(timer);
    } else {
      // Slide out animation - Motive ile TAM AYNI
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

  const handleClose = () => {
    // Motive ile TAM AYNI animasyon
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
      // Reset animations for next time
      panAnim.setValue(0);
      slideAnim.setValue(-100);
      opacityAnim.setValue(0);
      onClose();
    });
  };

  const handleJournalPress = () => {
    handleClose();
    // Small delay to let animation finish
    setTimeout(() => {
      onJournalPress();
    }, 250);
  };

  // PanResponder for swipe to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Activate if vertical swipe dominant
        return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow upward or downward swipe
        panAnim.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped more than 50px up or down, close
        if (Math.abs(gestureState.dy) > 50) {
          // Dismiss animation
          Animated.parallel([
            Animated.timing(panAnim, {
              toValue: gestureState.dy > 0 ? 300 : -300,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            panAnim.setValue(0);
            slideAnim.setValue(-100);
            opacityAnim.setValue(0);
            onClose();
          });
        } else {
          // Spring back to original position
          Animated.spring(panAnim, {
            toValue: 0,
            useNativeDriver: true,
            friction: 7,
            tension: 40,
          }).start();
        }
      },
    })
  ).current;

  if (!visible || !completion) return null;

  // AI destekli motivasyonel mesaj
  const aiMessage = getContextualMessage(
    completion, 
    activeTasks, 
    completedTasks, 
    language === 'tr' ? 'tr' : 'en'
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateY: slideAnim }
          ],
          opacity: opacityAnim,
        }
      ]}
    >
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.content,
          {
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
            borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
            shadowColor: theme.name === 'dark' ? '#000000' : '#000',
            transform: [
              { translateY: panAnim }
            ],
          }
        ]}
      >
        {/* Close Button */}
        <TouchableOpacity
          style={[
            styles.closeButton,
            {
              backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            }
          ]}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="close" 
            size={16} 
            color={theme.name === 'dark' ? '#8E8E93' : '#666'} 
          />
        </TouchableOpacity>

        {/* Celebration Emoji - Center */}
        <View style={styles.emojiContainer}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
        </View>

        {/* Title - Center */}
        <Text style={[
          styles.title,
          { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
        ]}>
          {t('congratulations') || 'Tebrikler'}!
        </Text>
        
        {/* Completion Name - Center */}
        <Text style={[
          styles.completionName,
          { color: theme.name === 'dark' ? '#667eea' : '#667eea' }
        ]}>
          "{completion.name}"
        </Text>
        
        {/* AI Motivational Message - Center */}
        <Text style={[
          styles.aiMessage,
          { color: theme.name === 'dark' ? '#8E8E93' : '#666' }
        ]}>
          {aiMessage}
        </Text>

        {/* Action Button - Compact */}
        <TouchableOpacity
          style={[
            styles.journalButton,
            {
              backgroundColor: theme.name === 'dark' ? '#667eea' : '#667eea',
            }
          ]}
          onPress={handleJournalPress}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={16} color="#FFFFFF" />
          <Text style={styles.journalButtonText}>
            {t('writeJournal') || 'Günlük Yaz'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50, // Biraz daha aşağı
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  content: {
    borderRadius: 20, // Daha modern rounded corners
    paddingVertical: 20, // Optimized padding
    paddingHorizontal: 20,
    borderWidth: 0,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
  },
  emojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  celebrationEmoji: {
    fontSize: 24, // Daha kompakt
  },
  title: {
    fontSize: 18, // Daha kompakt
    fontFamily: 'Poppins_700Bold',
    marginBottom: 4,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  completionName: {
    fontSize: 14, // Daha küçük
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 8,
    letterSpacing: -0.1,
    textAlign: 'center',
    maxWidth: '90%',
  },
  aiMessage: {
    fontSize: 12, // Daha kompakt
    fontFamily: 'Poppins_400Regular',
    lineHeight: 16, // Daha sıkı
    fontStyle: 'italic',
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 4,
    maxWidth: '95%',
  },
  journalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10, // Daha kompakt
    paddingHorizontal: 20,
    borderRadius: 16, // Daha modern
    gap: 6,
    minWidth: 140, // Fixed minimum width
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalButtonText: {
    fontSize: 13, // Daha kompakt
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});

export default CelebrationModal;

