// components/ActiveProjectHeader.js
import React, { useCallback, memo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated as RNAnimated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get("window");

// Format date range as "23 Mar 2025 - 24 Mar 2025"
const formatDateRange = (startDate, endDate) => {
  const formatDate = (date) => {
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

const ActiveProjectHeader = memo(function ActiveProjectHeader({
  currentTask,
  isCompleted,
  activeTab,
  onTabSwitch,
  onMenuPress,
  isModalOpen,
  panGesture
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const start = currentTask?.startDate ? new Date(currentTask.startDate) : null;
  const end = currentTask?.endDate ? new Date(currentTask.endDate) : null;

  // Animated progress: 0 = milestones, 1 = journey
  const progress = useRef(new RNAnimated.Value(activeTab === 0 ? 0 : 1)).current;

  useEffect(() => {
    RNAnimated.spring(progress, {
      toValue: activeTab === 0 ? 0 : 1,
      useNativeDriver: false, // color interpolation doesn't support native driver
      tension: 300,
      friction: 30,
    }).start();
  }, [activeTab, progress]);

  const handleTabSwitch = useCallback((newTab) => {
    if (newTab === activeTab) return;
    onTabSwitch(newTab);
  }, [activeTab, onTabSwitch]);

  // Interpolate colors for tabs
  const milestonesColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: theme.name === 'dark' 
      ? ["#FFFFFF", "#8E8E93"] 
      : ["#1D1D1F", "#8E8E93"],
  });
  const journeyColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: theme.name === 'dark'
      ? ["#8E8E93", "#FFFFFF"]
      : ["#8E8E93", "#1D1D1F"],
  });

  // Sliding indicator position
  const indicatorTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 136], // Half of maxWidth (280/2) 
  });

  return (
    <GestureDetector gesture={panGesture}>
      <View style={[
        styles.modernHeader,
        {
          backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
          borderBottomColor: theme.name === 'dark' ? '#2C2C2E' : 'rgba(0, 0, 0, 0.05)',
        }
      ]}>
        {/* Modern Header Content */}
        <View style={styles.headerContent}>
          {/* Project Title Section */}
          <View style={styles.titleSection}>
            <Text style={[
              styles.modernTitle, 
              { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' },
              isCompleted && styles.completedText
            ]}>
              {currentTask?.title || t('untitled')}
            </Text>
            {start && end && (
              <Text style={[
                styles.dateRange, 
                { color: theme.name === 'dark' ? '#AEAEB2' : '#8E8E93' },
                isCompleted && styles.completedDateText
              ]}>
                {formatDateRange(start, end)}
              </Text>
            )}
          </View>
          
          {/* Tab Switcher with Animated Indicator */}
          <View style={[
            styles.tabSwitcher,
            {
              backgroundColor: theme.name === 'dark' ? '#2C2C2E' : 'rgba(0, 0, 0, 0.08)',
              borderColor: theme.name === 'dark' ? '#636366' : 'rgba(0, 0, 0, 0.04)',
            }
          ]}>
            {/* Sliding Indicator */}
            <RNAnimated.View
              style={[
                styles.indicator,
                {
                  backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
                  shadowColor: theme.name === 'dark' ? '#000000' : '#000',
                  shadowOpacity: theme.name === 'dark' ? 0.2 : 0.1,
                  transform: [{ translateX: indicatorTranslate }],
                },
              ]}
            />
            
            <TouchableOpacity 
              style={styles.tabButton} 
              onPress={() => handleTabSwitch(0)}
              activeOpacity={0.8}
            >
              <RNAnimated.Text style={[styles.tabButtonText, { color: milestonesColor }]}>
                {t('milestones')}
              </RNAnimated.Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.tabButton} 
              onPress={() => handleTabSwitch(1)}
              activeOpacity={0.8}
            >
              <RNAnimated.Text style={[styles.tabButtonText, { color: journeyColor }]}>
                {t('journey')}
              </RNAnimated.Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </GestureDetector>
  );
});

export default ActiveProjectHeader;

const styles = StyleSheet.create({
  // Modern Header Styles
  modernHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'column',
    gap: 12,
  },
  titleSection: {
    flexDirection: 'column',
    gap: 4,
  },
  modernTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  dateRange: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    letterSpacing: -0.2,
    opacity: 0.7,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingHorizontal: 4,
    height: 42,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 0.5,
    overflow: 'hidden',
    maxWidth: 280,
    alignSelf: 'center',
  },
  indicator: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    width: 136, // Half of maxWidth (280/2) minus padding
    borderRadius: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: -0.1,
  },
  completedText: { 
    color: "#FFFFFF" 
  },
  completedDateText: {
    color: "#A0A0A0",
  },
});
