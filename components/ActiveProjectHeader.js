// components/ActiveProjectHeader.js
import React, { useCallback, memo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated as RNAnimated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// width not used directly; keep static indicator sizing for now

// Tab configuration with icons and labels
const tabs = [
  {
    id: 0,
    key: 'tasks',
    icon: 'list',
    label: 'Tasks',
    color: '#4A90E2'
  },
  {
    id: 1,
    key: 'journey',
    icon: 'analytics',
    label: 'Journey',
    color: '#50C878'
  }
];

// Format date range as "23 Mar 2025 - 24 Mar 2025" using a locale
const formatDateRange = (startDate, endDate, locale = 'en-US') => {
  const formatDate = (date) => {
    const day = date.getDate();
    const month = date.toLocaleDateString(locale, { month: 'short' });
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
  panGesture,
  headerCollapse // optional RN Animated.Value (0..1)
}) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const locale = language === 'tr' ? 'tr-TR' : (language || 'en-US');
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

  // Icon scale animation for active tab
  const iconScale = (tabIndex) => {
    return progress.interpolate({
      inputRange: [0, 1],
      outputRange: tabIndex === 0 ? [1.2, 1] : [1, 1.2],
    });
  };

  return (
    <GestureDetector gesture={panGesture}>
      <RNAnimated.View style={[
        styles.modernHeader,
        {
          backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
          borderBottomColor: theme.name === 'dark' ? '#2C2C2E' : 'rgba(0, 0, 0, 0.05)',
        }
      ]}>
        {/* Modern Header Content */}
        <RNAnimated.View style={styles.headerContent}>
          {/* If headerCollapse provided, animate title/menu */}
          {headerCollapse ? (
            <RNAnimated.View style={{
              transform: [{ scale: headerCollapse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) }],
              opacity: headerCollapse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.85] })
            }}>
            </RNAnimated.View>
          ) : null}
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
                {formatDateRange(start, end, locale)}
              </Text>
            )}
          </View>

          {/* Enhanced Tab Switcher with Icons and Better UX */}
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

            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabButton}
                onPress={() => handleTabSwitch(tab.id)}
                activeOpacity={0.8}
              >
                <RNAnimated.View style={[
                  styles.tabContent,
                  { transform: [{ scale: iconScale(tab.id) }] }
                ]}>
                  <RNAnimated.View style={styles.iconContainer}>
                    <Ionicons
                      name={tab.icon}
                      size={16}
                      color={
                        activeTab === tab.id
                          ? theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F'
                          : theme.name === 'dark' ? '#8E8E93' : '#8E8E93'
                      }
                    />
                  </RNAnimated.View>
                  <RNAnimated.Text style={[
                    styles.tabButtonText,
                    {
                      color: activeTab === tab.id
                        ? (theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F')
                        : (theme.name === 'dark' ? '#8E8E93' : '#8E8E93')
                    }
                  ]}>
                    {t(tab.key)}
                  </RNAnimated.Text>
                </RNAnimated.View>
              </TouchableOpacity>
            ))}
          </View>
        </RNAnimated.View>

      </RNAnimated.View>
    </GestureDetector>
  );
});

export default ActiveProjectHeader;

const styles = StyleSheet.create({
  // Modern Header Styles
  modernHeader: {
    paddingHorizontal: 20,
  paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'column',
    gap: 12, // Reduced gap since no hints
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
    height: 48, // Increased height for better touch target
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
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6, // Space between icon and text
  },
  iconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonText: {
    fontSize: 13, // Slightly smaller for icon + text
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
