// components/EducationOverlay.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEducation } from '../context/EducationContext';
import { EDUCATION_STEPS } from '../context/EducationContext';
import { getStepConfig, calculateProgress } from '../utils/EducationManager';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function EducationOverlay({ onAddProject, onAddMilestone, hideOverlay }) {
  const { 
    isEducationActive, 
    currentStep, 
    nextStep, 
    skipEducation,
    completeEducation,
  } = useEducation();
  const { language } = useLanguage();
  const { theme } = useTheme();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  const [config, setConfig] = useState(null);

  // Load step configuration with language support
  useEffect(() => {
    if (currentStep) {
      const stepConfig = getStepConfig(currentStep, language);
      console.log('🎓 Education config loaded:', { 
        currentStep, 
        language, 
        title: stepConfig?.title,
        buttonText: stepConfig?.buttonText 
      });
      setConfig(stepConfig);
    }
  }, [currentStep, language]);

  // Entrance animation
  useEffect(() => {
    if (isEducationActive && currentStep) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      slideAnim.setValue(50);
      
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isEducationActive, currentStep]);

  const handleContinue = () => {
    if (currentStep === EDUCATION_STEPS.CREATE_PROJECT) {
      // Open AddProject modal
      if (onAddProject) {
        onAddProject();
      }
    } else if (currentStep === EDUCATION_STEPS.MY_DAY_INFO) {
      // Open AddMilestone modal for created project
      if (onAddMilestone) {
        onAddMilestone();
      }
    } else if (currentStep === EDUCATION_STEPS.MY_DAY_FEATURES) {
      // User understood features - complete education
      console.log('🎓 User acknowledged My Day features, completing education');
      completeEducation();
    }
  };

  const handleSkip = () => {
    skipEducation();
  };

  if (!isEducationActive || !currentStep) {
    return null;
  }

  if (hideOverlay) {
    console.log('🎓 Overlay hidden temporarily');
    return null;
  }

  if (!config) {
    console.log('🎓 Config not loaded yet');
    return null;
  }

  console.log('🎓 Rendering overlay:', { 
    currentStep,
    hasConfig: !!config,
    buttonText: config?.buttonText,
    position: 'top'
  });

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
        }
      ]}
      pointerEvents="box-none"
    >
      {/* No overlay background - clean tooltip only */}

      {/* Content Card - Always at Top (Header Area) */}
      <Animated.View
        style={[
          styles.tooltipContent,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim }
            ],
            opacity: fadeAnim,
          }
        ]}
      >
        <View style={[
          styles.tooltipCard,
          {
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
          }
        ]}>
          {/* Icon */}
          <View style={[styles.tooltipIconContainer, { backgroundColor: config.color + '20' }]}>
            <Ionicons name={config.icon} size={24} color={config.color} />
          </View>

          {/* Title */}
          <Text style={[
            styles.tooltipTitle,
            { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
          ]}>
            {config.title}
          </Text>

          {/* Description */}
          <Text style={[
            styles.tooltipDescription,
            { color: theme.name === 'dark' ? '#8E8E93' : '#7f8c8d' }
          ]}>
            {config.description}
          </Text>

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.tooltipButton, { backgroundColor: config.color }]}
            onPress={handleContinue}
          >
            <Text style={styles.tooltipButtonText}>{config.buttonText}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999, // Çok yüksek z-index - her şeyin üstünde
  },
  tooltipContent: {
    position: 'absolute',
    top: 100, // Daha yukarı - header'a daha yakın
    left: 16,
    right: 16,
    zIndex: 100000, // En üstte
  },
  tooltipCard: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
    width: '100%', // Tam genişlik
    minHeight: 160, // Sabit minimum yükseklik
  },
  tooltipIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  tooltipTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 6,
    lineHeight: 24,
  },
  tooltipDescription: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 18,
    marginBottom: 16,
  },
  tooltipButton: {
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 20,
    alignItems: 'center',
  },
  tooltipButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: 'white',
  },
});

