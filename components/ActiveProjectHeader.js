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
      <View style={styles.cardContent}>
        {/* Tab Başlıkları */}
        <View style={styles.headerTabs}>
          {/* Sol %50 - Milestones Tab */}
          <TouchableOpacity 
            style={[styles.projectHeaderTab, activeTab === 0 && styles.activeHeaderTab]} 
            onPress={() => handleTabSwitch(0)}
            activeOpacity={0.8}
          >
            <Text style={[styles.title, isCompleted && styles.completedText]}>
              {currentTask?.title}
            </Text>
          </TouchableOpacity>

          {/* Sağ %50 - Calendar Tab */}
          <TouchableOpacity 
            style={[styles.calendarHeaderTab, activeTab === 1 && styles.activeHeaderTab]} 
            onPress={() => handleTabSwitch(1)}
            activeOpacity={0.8}
          >
            <Text style={[styles.calendarTitle, isCompleted && styles.completedText]}>
              Calendar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date ve Progress Bar - Sadece Milestones tab'da görünür */}
        {activeTab === 0 && (
          <>
            {start && end && (
              <Text style={[styles.dateText, isCompleted && styles.completedText]}>
                {formatDateRange(start, end)}
              </Text>
            )}
            <View style={{ marginTop: 0, width: "80%" }}>
              <Text style={{ fontSize: 12, color: "#888", marginBottom: 6, fontFamily: "Poppins_400Regular" }}>
                Project Progress
              </Text>
              <View style={{ height: 12, backgroundColor: "#E0E0E0", borderRadius: 8, overflow: "hidden", elevation: 2 }}>
                <Animated.View style={[{ height: 12, backgroundColor: "#B1A5FF" }, progressStyle]} />
              </View>
            </View>
          </>
        )}
      </View>
    </GestureDetector>
  );
});

export default ActiveProjectHeader;

const styles = StyleSheet.create({
  cardContent: { 
    padding: 10, 
    paddingBottom: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: "#E5E5E5" 
  },
  headerTabs: { 
    flexDirection: "row" 
  },
  projectHeaderTab: { 
    flex: 0.5, 
    padding: 5, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  calendarHeaderTab: { 
    flex: 0.5, 
    padding: 5, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  activeHeaderTab: { 
    backgroundColor: "rgba(177, 165, 255, 0.15)", 
    borderRadius: 12 
  },
  title: { 
    fontSize: 18, 
    fontFamily: "Poppins_700Bold", 
    color: "#505050", 
    paddingVertical: 8 
  },
  dateText: { 
    fontSize: 12, 
    fontFamily: "Poppins_500Medium", 
    color: "#666666", 
    paddingVertical: 25 
  },
  completedText: { 
    color: "#fff" 
  },
  calendarTitle: { 
    fontSize: 18, 
    fontFamily: "Poppins_700Bold", 
    color: "#505050", 
    paddingVertical: 8 
  },
});
