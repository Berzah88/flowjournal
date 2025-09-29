// screens/CompletedProjectsScreen.js
import React, { useState, useRef, useMemo, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useCompletedTasks, useTaskActions } from "../hooks/useTaskContext";
import { usePerformanceMonitor } from "../hooks/usePerformanceMonitor";
import { SWIPE_THRESHOLDS, ANIMATION_DURATIONS } from "../constants";
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

  // Memoized handlers to prevent unnecessary re-renders
  const openCard = useCallback((card) => setSelectedCard(card), []);
  const closeCard = useCallback(() => setSelectedCard(null), []);



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

  // Additional safety check
  if (!completedTasksReversed) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
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
        
        <Text style={styles.headerTitle}>Completed Projects</Text>
        
        <View style={styles.headerSpacer} />
      </View>

      {/* Statistics Bar */}
      {completedTasksReversed.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <Text style={styles.statNumber}>{completedTasksReversed.length}</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Ionicons name="flag" size={20} color="#FF9500" />
            <Text style={styles.statNumber}>
              {completedTasksReversed.reduce((total, task) => 
                total + (task.milestones?.filter(m => m.completed).length || 0), 0
              )}
            </Text>
            <Text style={styles.statLabel}>Milestones</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Ionicons name="journal" size={20} color="#007AFF" />
            <Text style={styles.statNumber}>
              {completedTasksReversed.reduce((total, task) => 
                total + (task.milestones?.reduce((milestoneTotal, milestone) => 
                  milestoneTotal + (milestone.journalEntries?.length || 0), 0
                ) || 0), 0
              )}
            </Text>
            <Text style={styles.statLabel}>Entries</Text>
          </View>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {completedTasksReversed.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No Completed Projects</Text>
            <Text style={styles.emptySubtitle}>
              Your completed projects will appear here
            </Text>
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

    </View>
  );
});

export default CompletedProjectsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0, 0, 0, 0.04)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#1D1D1F",
    letterSpacing: -0.2,
  },
  headerSpacer: {
    width: 40,
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statNumber: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#1D1D1F",
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#8E8E93",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5E5E5",
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContainer: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Poppins_600SemiBold",
    color: "#1D1D1F",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
  },
});

