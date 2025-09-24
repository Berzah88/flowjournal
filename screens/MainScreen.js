// screens/MainScreen.js
import React, { useContext, useState, useRef, useMemo, useEffect } from "react";
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
import { TaskContext } from "../context/TaskContext";
import StatusBarComponent from "../components/StatusBar";
import StatusTabs from "../components/StatusTabs";
import Card from "../components/Card";
import AddProjectScreen from "./AddProjectScreen";
import ActiveProject from "./ActiveProject";
import ActiveMilestone from "./ActiveMilestone";
import LoadingSpinner from "../components/LoadingSpinner";

const { width } = Dimensions.get("window");

export default function MainScreen({ navigation }) {
  const { tasks, isLoading, clearStorage } = useContext(TaskContext);

  const [activeIndex, setActiveIndex] = useState(0); // 0 = active, 1 = completed
  const [addVisible, setAddVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);

  // horizontal pan value (translateX)
  const panX = useRef(new Animated.Value(0)).current;
  // committed offset in px (either 0 or -width)
  const offsetRef = useRef(0);

  // Memoized filtered tasks to prevent unnecessary re-computations
  const { activeTasks, completedTasks } = useMemo(() => ({
    activeTasks: tasks.filter((t) => !t.done),
    completedTasks: tasks.filter((t) => t.done),
  }), [tasks]);

  const openCard = (card) => setSelectedCard(card);
  const closeCard = () => setSelectedCard(null);

  const openMilestone = (milestone, project) => {
    const milestoneData = {
      ...milestone,
      taskId: project.id,
      projectTitle: project.title,
      autoOpenJournal: true // Journal'ı otomatik aç
    };
    setSelectedMilestone(milestoneData);
  };

  const closeMilestone = () => setSelectedMilestone(null);

  const threshold = width * 0.25; // swipe threshold

  // Cleanup animations on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      panX.stopAnimation();
    };
  }, []);

  // animate to page index (0 or 1)
  const animateToIndex = (index) => {
    const target = -index * width;

    // ensure no leftover offset/animation
    panX.stopAnimation();
    try {
      panX.flattenOffset();
    } catch (e) {
      // some RN versions may throw if no offset - ignore
    }

    Animated.spring(panX, {
      toValue: target,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start(() => {
      // commit final state-cleanly
      offsetRef.current = target;
      setActiveIndex(index);
      panX.setValue(target);
      panX.setOffset(0);
    });
  };

  // PanResponder: clamp dx so combined (offset + dx) is always within [-width, 0]
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        // only start when horizontal movement dominant
        return Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },
      onPanResponderGrant: () => {
        // prepare to track delta relative to committed offset
        panX.stopAnimation();
        panX.setOffset(offsetRef.current);
        panX.setValue(0);
      },
      onPanResponderMove: (_, gesture) => {
        // compute allowed dx range so offset + dx ∈ [-width, 0]
        const offset = offsetRef.current;
        const minDx = -width - offset; // lowest allowed dx
        const maxDx = -offset; // highest allowed dx
        const clampedDx = Math.max(Math.min(gesture.dx, maxDx), minDx);
        panX.setValue(clampedDx);
      },
      onPanResponderRelease: (_, gesture) => {
        // merge offset and value
        try {
          panX.flattenOffset();
        } catch (e) {}
        const currentOffset = offsetRef.current; // either 0 or -width

        // Decide navigation based on gesture.dx (not clamped) and current offset
        if (gesture.dx <= -threshold && currentOffset === 0) {
          // swipe left enough from left page -> go to completed (index 1)
          animateToIndex(1);
        } else if (gesture.dx >= threshold && currentOffset === -width) {
          // swipe right enough from right page -> go to active (index 0)
          animateToIndex(0);
        } else {
          // snap back to the current page
          animateToIndex(currentOffset === 0 ? 0 : 1);
        }
      },
      onPanResponderTerminate: () => {
        // cancel -> snap back
        animateToIndex(offsetRef.current === 0 ? 0 : 1);
      },
      onShouldBlockNativeResponder: () => false,
    })
  ).current;

  // when user taps tabs
  const handleTabPress = (index) => {
    if (index === activeIndex) return;
    // set activeIndex immediately so StatusTabs animates right away
    setActiveIndex(index);
    // set offsetRef immediately so panResponderGrant later uses correct offset
    offsetRef.current = -index * width;
    animateToIndex(index);
  };

  // Show loading spinner while data is loading
  if (isLoading) {
    return <LoadingSpinner message="Loading your projects..." />;
  }

  // Additional safety check
  if (!tasks || !Array.isArray(tasks)) {
    return <LoadingSpinner message="Initializing..." />;
  }

  try {
    return (
      <LinearGradient
        colors={['#f8f9fa', '#e9ecef', '#dee2e6']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Flow Journal</Text>
          <Text style={styles.subHeader}>Manage and track your progress</Text>
        </View>

      <StatusBarComponent activeCount={activeTasks.length} doneCount={completedTasks.length} />

      <StatusTabs activeIndex={activeIndex} onTabPress={handleTabPress} />

      <View style={styles.viewport}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.panContainer,
            { width: width * 2, transform: [{ translateX: panX }] },
          ]}
        >
          {/* Active list (left) */}
          <View style={{ width }}>
            <FlatList
              data={[...activeTasks].reverse()}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140, paddingTop: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => openCard(item)} activeOpacity={1}>
                  <Card
                    title={item.title}
                    startDate={item.startDate}
                    endDate={item.endDate}
                    completed={item.done}
                    activeMilestones={item.milestones?.filter((m) => !m.completed) ?? []}
                    onMilestonePress={(milestone) => openMilestone(milestone, item)}
                    style={{ marginBottom: 15 }}
                  />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateIcon}>📋</Text>
                  <Text style={styles.emptyStateTitle}>No Active Projects</Text>
                  <Text style={styles.emptyStateSubtitle}>Start your journey by creating your first project</Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          </View>

          {/* Completed list (right) */}
          <View style={{ width }}>
            <FlatList
              data={[...completedTasks].reverse()}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140, paddingTop: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => openCard(item)} activeOpacity={1}>
                  <Card
                    title={item.title}
                    startDate={item.startDate}
                    endDate={item.endDate}
                    completed={item.done}
                    activeMilestones={item.milestones?.filter((m) => !m.completed) ?? []}
                    onMilestonePress={null} // Completed cards don't allow milestone taps
                    style={{ marginBottom: 15 }}
                  />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateIcon}>🎯</Text>
                  <Text style={styles.emptyStateTitle}>No Completed Projects</Text>
                  <Text style={styles.emptyStateSubtitle}>Complete your active projects to see them here</Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          </View>
        </Animated.View>
      </View>

      {/* Modern FAB */}
      <TouchableOpacity style={styles.addButton} onPress={() => setAddVisible(true)} activeOpacity={0.8}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.addButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.addButtonText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      <AddProjectScreen visible={addVisible} onClose={() => setAddVisible(false)} />

      {selectedCard && <ActiveProject selectedCard={selectedCard} onClose={closeCard} navigation={navigation} />}
      
      {selectedMilestone && <ActiveMilestone milestone={selectedMilestone} onClose={closeMilestone} />}
      </LinearGradient>
    );
  } catch (error) {
    console.error('🚨 MainScreen rendering error:', error);
    console.error('🚨 MainScreen error stack:', error.stack);
    console.error('🚨 MainScreen state:', { tasks, isLoading, activeTasks, completedTasks });
    return <LoadingSpinner message="Error occurred in MainScreen..." />;
  }
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: 60 
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  header: {
    fontSize: 32,
    fontFamily: "Poppins_700Bold",
    color: "#2c3e50",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subHeader: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#7f8c8d",
    marginBottom: 8,
  },
  viewport: { 
    flex: 1, 
    overflow: "hidden" 
  },
  panContainer: { 
    flexDirection: "row", 
    flex: 1 
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: "Poppins_600SemiBold",
    color: "#34495e",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#7f8c8d",
    textAlign: "center",
    lineHeight: 20,
  },
  addButton: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 70,
    height: 70,
    borderRadius: 35,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addButtonGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: { 
    color: "#fff", 
    fontSize: 36, 
    textAlign: "center", 
    fontFamily: "Poppins_300Light",
    lineHeight: 36,
  },
});
