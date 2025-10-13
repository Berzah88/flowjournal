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
        {/* Celebration Emoji - Center */}
        <Text style={styles.celebrationEmoji}>🎉</Text>

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

        {/* Action Button - Full Width */}
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
          <Ionicons name="create-outline" size={18} color="#FFFFFF" />
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
    top: 45, // Daha yukarıda açılsın
    left: 12,
    right: 12,
    zIndex: 1000,
  },
  content: {
    borderRadius: 16,
    paddingVertical: 16, // 20 → 16 (daha compact)
    paddingHorizontal: 24,
    borderWidth: 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center', // Center aligned
  },
  celebrationEmoji: {
    fontSize: 28, // 36 → 28 (daha küçük)
    marginBottom: 6, // 8 → 6 (daha compact)
  },
  title: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 3, // 4 → 3 (daha compact)
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  completionName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 8, // 10 → 8 (daha compact)
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  aiMessage: {
    fontSize: 14, // 15 → 14 (biraz daha küçük)
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20, // 22 → 20 (daha compact)
    fontStyle: 'italic',
    marginBottom: 12, // 16 → 12 (daha compact)
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  journalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  journalButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});

export default CelebrationModal;

