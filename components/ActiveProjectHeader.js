// components/ActiveProjectHeader.js
import React, { useCallback, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

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
  const start = currentTask?.startDate ? new Date(currentTask.startDate) : null;
  const end = currentTask?.endDate ? new Date(currentTask.endDate) : null;

  const handleTabSwitch = useCallback((newTab) => {
    if (newTab === activeTab) return;
    onTabSwitch(newTab);
  }, [activeTab, onTabSwitch]);

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.modernHeader}>
        {/* Modern Header Content */}
        <View style={styles.headerContent}>
          {/* Project Title Section */}
          <View style={styles.titleSection}>
            <Text style={[styles.modernTitle, isCompleted && styles.completedText]}>
              {currentTask?.title || "Untitled"}
            </Text>
            {start && end && (
              <Text style={[styles.dateRange, isCompleted && styles.completedDateText]}>
                {formatDateRange(start, end)}
              </Text>
            )}
          </View>
          
          {/* Tab Switcher */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 0 && styles.activeTabButton]} 
              onPress={() => handleTabSwitch(0)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabButtonText, activeTab === 0 && styles.activeTabButtonText]}>
                Milestones
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 1 && styles.activeTabButton]} 
              onPress={() => handleTabSwitch(1)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabButtonText, activeTab === 1 && styles.activeTabButtonText]}>
                Calendar
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modern Progress Section - Her iki tab'da da görünür */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, isCompleted && styles.completedProgressText]}>
              Progress
            </Text>
            <Text style={[styles.progressPercentage, isCompleted && styles.completedProgressText]}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <View style={[styles.progressBarContainer, isCompleted && styles.completedProgressBarContainer]}>
            <Animated.View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
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
    color: "#1D1D1F",
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  dateRange: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#8E8E93",
    letterSpacing: -0.2,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
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
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#8E8E93",
  },
  activeTabButtonText: {
    color: "#1D1D1F",
    fontFamily: "Poppins_600SemiBold",
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
    color: "#8E8E93",
    letterSpacing: -0.2,
  },
  progressPercentage: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: "#007AFF",
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  completedProgressText: {
    color: "#A0A0A0",
  },
  completedProgressBarContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
