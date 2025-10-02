// components/ActiveProjectHeader.js
import React, { useCallback, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

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
  progress,
  progressStyle,
  panGesture
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const start = currentTask?.startDate ? new Date(currentTask.startDate) : null;
  const end = currentTask?.endDate ? new Date(currentTask.endDate) : null;

  const handleTabSwitch = useCallback((newTab) => {
    if (newTab === activeTab) return;
    onTabSwitch(newTab);
  }, [activeTab, onTabSwitch]);

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
          
          {/* Tab Switcher */}
          <View style={[
            styles.tabSwitcher,
            {
              backgroundColor: theme.name === 'dark' ? '#2C2C2E' : 'rgba(0, 0, 0, 0.05)',
            }
          ]}>
            <TouchableOpacity 
              style={[
                styles.tabButton, 
                activeTab === 0 && [
                  styles.activeTabButton,
                  { backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF' }
                ]
              ]} 
              onPress={() => handleTabSwitch(0)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabButtonText, 
                { color: theme.name === 'dark' ? '#AEAEB2' : '#8E8E93' },
                activeTab === 0 && {
                  color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F',
                  fontFamily: 'Poppins_600SemiBold',
                }
              ]}>
                Milestones
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.tabButton, 
                activeTab === 1 && [
                  styles.activeTabButton,
                  { backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF' }
                ]
              ]} 
              onPress={() => handleTabSwitch(1)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabButtonText, 
                { color: theme.name === 'dark' ? '#AEAEB2' : '#8E8E93' },
                activeTab === 1 && {
                  color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F',
                  fontFamily: 'Poppins_600SemiBold',
                }
              ]}>
                Calendar
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modern Progress Section - Her iki tab'da da görünür */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[
              styles.progressLabel, 
              { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' },
              isCompleted && styles.completedProgressText
            ]}>
              Progress
            </Text>
            <Text style={[
              styles.progressPercentage, 
              { color: theme.name === 'dark' ? '#FF6B6B' : '#007AFF' },
              isCompleted && styles.completedProgressText
            ]}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <View style={[
            styles.progressBarContainer, 
            {
              backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            },
            isCompleted && styles.completedProgressBarContainer
          ]}>
            <Animated.View style={[
              styles.progressBar, 
              { 
                width: `${progress * 100}%`,
                backgroundColor: theme.name === 'dark' ? '#FF6B6B' : '#007AFF'
              }
            ]} />
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
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
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
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  dateRange: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    letterSpacing: -0.2,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
  },
  activeTabButtonText: {
  },
  completedText: { 
    color: "#FFFFFF" 
  },
  completedDateText: {
    color: "#A0A0A0",
  },
  // Modern Progress Styles
  progressSection: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    letterSpacing: -0.2,
  },
  progressPercentage: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  completedProgressText: {
    color: "#A0A0A0",
  },
  completedProgressBarContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
