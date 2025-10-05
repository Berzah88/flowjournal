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
                {t('milestones')}
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
                {t('journey')}
              </Text>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'column',
    gap: 16,
  },
  titleSection: {
    flexDirection: 'column',
    gap: 6,
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
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 10,
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
});
