// screens/CompletedProjectsScreen.js
import React, { useState, useRef, useMemo, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useCompletedTasks, useTaskActions } from "../hooks/useTaskContext";
import { usePerformanceMonitor } from "../hooks/usePerformanceMonitor";
import { SWIPE_THRESHOLDS, ANIMATION_DURATIONS, FONTS, COLORS } from "../constants";
import Card from "../components/Card";
import ActiveProject from "./ActiveProject";
import LoadingSpinner from "../components/LoadingSpinner";

const { width } = Dimensions.get("window");

const CompletedProjectsScreen = memo(function CompletedProjectsScreen({ navigation }) {
  const completedTasks = useCompletedTasks();
  const { deleteTask, completeTask, addMilestone, updateMilestone, completeMilestone, setActiveMilestone, deleteMilestone, updateTask } = useTaskActions();
  
  // Performance monitoring (sadece development'ta) - geçici olarak devre dışı
  // usePerformanceMonitor('CompletedProjectsScreen');

  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Memoized handlers to prevent unnecessary re-renders
  const openCard = useCallback((card) => setSelectedCard(card), []);
  const closeCard = useCallback(() => setSelectedCard(null), []);

  const openMilestone = useCallback((milestone, project) => {
    const milestoneData = {
      ...milestone,
      taskId: project.id,
      projectTitle: project.title,
      autoOpenJournal: true // Journal'ı otomatik aç
    };
    setSelectedMilestone(milestoneData);
  }, []);

  const closeMilestone = useCallback(() => setSelectedMilestone(null), []);

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh - in real app, this would trigger data reload
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);


  // Memoized render functions for FlatList
  const renderCompletedItem = useCallback(({ item }) => (
    <Card
      title={item.title}
      startDate={item.startDate}
      endDate={item.endDate}
      completed={item.done}
      activeMilestones={item.milestones?.filter((m) => !m.completed) ?? []}
      onMilestonePress={null} // Completed cards don't allow milestone taps
      onPress={() => openCard(item)}
      style={{ marginBottom: 15 }}
    />
  ), [openCard]);

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  // Memoized data arrays with content-based dependencies
  const completedTasksReversed = useMemo(() => {
    return [...completedTasks].reverse();
  }, [completedTasks.length, completedTasks.map(t => `${t.id}-${t.title}-${t.done}-${t.milestones?.length || 0}-${t.milestones?.map(m => `${m.id}-${m.title}-${m.completed}-${m.journalEntries?.length || 0}-${m.journalEntries?.map(e => `${e.id}-${e.mood}-${e.moodIcon}-${e.moodColor}`).join(',') || ''}`).join(',') || ''}`).join(',')]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalMilestones = completedTasks.reduce((acc, task) => acc + (task.milestones?.length || 0), 0);
    const completedMilestones = completedTasks.reduce((acc, task) => 
      acc + (task.milestones?.filter(m => m.completed).length || 0), 0
    );
    const totalJournalEntries = completedTasks.reduce((acc, task) => 
      acc + (task.milestones?.reduce((msAcc, ms) => msAcc + (ms.journalEntries?.length || 0), 0) || 0), 0
    );
    
    return {
      totalProjects: completedTasks.length,
      totalMilestones,
      completedMilestones,
      totalJournalEntries,
      completionRate: totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0
    };
  }, [completedTasks]);

  // Additional safety check
  if (!completedTasksReversed) {
    return <LoadingSpinner />;
  }

  return (
    <LinearGradient
      colors={['#f8f9fa', '#e9ecef', '#dee2e6']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessible={true}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#1D1D1F" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Completed Projects</Text>
          <Text style={styles.headerSubtitle}>{stats.totalProjects} projects completed</Text>
        </View>
        
        <View style={styles.headerSpacer} />
      </View>

      {/* Statistics Cards */}
      {completedTasksReversed.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statsContent}>
          <View style={[styles.statCard, { borderTopColor: "#FFD700" }]}>
            <View style={styles.iconContainer}>
              <Ionicons name="trophy" size={18} color="#FFD700" />
            </View>
            <Text style={styles.statNumber}>{stats.totalProjects}</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
          
          <View style={[styles.statCard, { borderTopColor: "#4CAF50" }]}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
            </View>
            <Text style={styles.statNumber}>{stats.completedMilestones}</Text>
            <Text style={styles.statLabel}>Milestones</Text>
          </View>
          
          <View style={[styles.statCard, { borderTopColor: "#2196F3" }]}>
            <View style={styles.iconContainer}>
              <Ionicons name="journal" size={18} color="#2196F3" />
            </View>
            <Text style={styles.statNumber}>{stats.totalJournalEntries}</Text>
            <Text style={styles.statLabel}>Journal Entries</Text>
          </View>
          
          <View style={[styles.statCard, { borderTopColor: "#FF9800" }]}>
            <View style={styles.iconContainer}>
              <Ionicons name="trending-up" size={18} color="#FF9800" />
            </View>
            <Text style={styles.statNumber}>{stats.completionRate}%</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
          </View>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {completedTasksReversed.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              style={styles.emptyIconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="checkmark-circle" size={48} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No Completed Projects Yet</Text>
            <Text style={styles.emptySubtitle}>
              Complete your first project to see it here! 🎉
            </Text>
            <TouchableOpacity 
              style={styles.createProjectButton}
              onPress={() => navigation.navigate('Main')}
            >
              <Text style={styles.createProjectButtonText}>Start Your First Project</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={completedTasksReversed}
            renderItem={renderCompletedItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={5}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#4CAF50']}
                tintColor="#4CAF50"
              />
            }
            getItemLayout={(data, index) => ({
              length: 200, // Approximate card height
              offset: 200 * index,
              index,
            })}
          />
        )}
      </View>

      {/* Modals */}
      {selectedCard && (
        <ActiveProject
          selectedCard={selectedCard}
          onClose={closeCard}
          setMainActiveTab={() => {}} // Not needed in completed screen
          navigation={navigation}
        />
      )}

    </LinearGradient>
  );
});

export default CompletedProjectsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0, 0, 0, 0.04)",
    backdropFilter: "blur(20px)",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.04)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.SEMI_BOLD,
    color: "#1D1D1F",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.REGULAR,
    color: "#8E8E93",
    marginTop: 1,
  },
  viewModeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(74, 144, 226, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  statsContainer: {
    marginTop: 10,
    marginBottom: 2,
    height: '14%',
    minHeight: 54,
    paddingHorizontal: 15,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
  },
  statCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    flex: 1,
    height: '100%',
    minHeight: 49,
    marginHorizontal: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 0,
    // Modern gradient border effect
    borderTopWidth: 2,
    borderTopColor: "transparent",
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 16,
    fontFamily: FONTS.BOLD,
    color: "#1D1D1F",
    marginTop: 0,
    marginBottom: 4,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: FONTS.MEDIUM,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 0,
    opacity: 0.8,
    lineHeight: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    height: '80%',
  },
  listContainer: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  gridContainer: {
    paddingHorizontal: 10,
  },
  gridItem: {
    flex: 1,
    marginHorizontal: 5,
    marginBottom: 15,
  },
  listItem: {
    marginBottom: 15,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: FONTS.BOLD,
    color: "#1D1D1F",
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: FONTS.REGULAR,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  createProjectButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createProjectButtonText: {
    fontSize: 16,
    fontFamily: FONTS.SEMI_BOLD,
    color: "#FFFFFF",
    textAlign: "center",
  },
});

