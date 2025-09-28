// screens/MainScreen.js
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
import { useActiveTasks, useCompletedTasks, useTaskActions, useTaskSaving, useDataRecovery } from "../hooks/useTaskContext";
import { useDataRecoveryOperations } from "../hooks/useDataRecoveryOperations";
import { usePerformanceMonitor } from "../hooks/usePerformanceMonitor";
import { SWIPE_THRESHOLDS, ANIMATION_DURATIONS } from "../constants";
import StatusBarComponent from "../components/StatusBar";
import StatusTabs from "../components/StatusTabs";
import Card from "../components/Card";
import AddProjectScreen from "./AddProjectScreen";
import ActiveProject from "./ActiveProject";
import ActiveMilestone from "./ActiveMilestone";
import LoadingSpinner from "../components/LoadingSpinner";
import DataRecoveryMenu from "../components/DataRecoveryMenu";
import MyDayScreen from "./MyDayScreen";
import AddMilestoneModal from "../components/AddMilestoneModal";

const { width, height } = Dimensions.get("window");

const MainScreen = memo(function MainScreen({ navigation }) {
  const activeTasks = useActiveTasks();
  const completedTasks = useCompletedTasks();
  const isSaving = useTaskSaving();
  const { clearStorage, addMilestone } = useTaskActions();
  const { recoverData, createManualBackup, getDataStatus } = useDataRecovery();
  const { handleDataRecovery, handleCreateBackup, handleCheckDataStatus } = useDataRecoveryOperations();
  
  // Performance monitoring (sadece development'ta) - geçici olarak devre dışı
  // usePerformanceMonitor('MainScreen');

  const [activeIndex, setActiveIndex] = useState(0); // 0 = my day, 1 = active
  const [addVisible, setAddVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [dataRecoveryMenuVisible, setDataRecoveryMenuVisible] = useState(false);
  const [mainMenuVisible, setMainMenuVisible] = useState(false);
  
  // MyDay screen states
  const [myDaySelectedCard, setMyDaySelectedCard] = useState(null);
  const [myDaySelectedMilestone, setMyDaySelectedMilestone] = useState(null);
  const [myDayAddMilestoneModalVisible, setMyDayAddMilestoneModalVisible] = useState(false);
  const [myDaySelectedProjectForMilestone, setMyDaySelectedProjectForMilestone] = useState(null);

  // horizontal pan value (translateX)
  const panX = useRef(new Animated.Value(0)).current;
  // committed offset in px (either 0 or -width)
  const offsetRef = useRef(0);

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

  // Data recovery menu handlers
  const openDataRecoveryMenu = useCallback(() => setDataRecoveryMenuVisible(true), []);
  const closeDataRecoveryMenu = useCallback(() => setDataRecoveryMenuVisible(false), []);

  const threshold = width * SWIPE_THRESHOLDS.NAVIGATE;

  // Cleanup animations on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (panX) {
        panX.stopAnimation();
      }
    };
  }, [panX]);

  // Memoized animate to page index (0 or 1)
  const animateToIndex = useCallback((index) => {
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
  }, [panX]);

  // PanResponder: clamp dx so combined (offset + dx) is always within [-width, 0]
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        // only start when horizontal movement dominant
        return Math.abs(gesture.dx) > SWIPE_THRESHOLDS.PAN_RESPONDER && Math.abs(gesture.dx) > Math.abs(gesture.dy);
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

  // Memoized tab press handler
  const handleTabPress = useCallback((index) => {
    if (index === activeIndex) return;
    // set activeIndex immediately so StatusTabs animates right away
    setActiveIndex(index);
    // set offsetRef immediately so panResponderGrant later uses correct offset
    offsetRef.current = -index * width;
    animateToIndex(index);
  }, [activeIndex, animateToIndex]);

  // Memoized render functions for FlatList
  const renderActiveItem = useCallback(({ item }) => (
    <Card
      title={item.title}
      startDate={item.startDate}
      endDate={item.endDate}
      completed={item.done}
      activeMilestones={item.milestones?.filter((m) => !m.completed) ?? []}
      onMilestonePress={(milestone) => openMilestone(milestone, item)}
      onPress={() => openCard(item)}
      style={{ marginBottom: 15 }}
    />
  ), [openCard, openMilestone]);

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
  const activeTasksReversed = useMemo(() => {
    return [...activeTasks].reverse();
  }, [activeTasks.length, activeTasks.map(t => `${t.id}-${t.title}-${t.done}-${t.milestones?.length || 0}-${t.milestones?.map(m => `${m.id}-${m.title}-${m.completed}-${m.journalEntries?.length || 0}-${m.journalEntries?.map(e => `${e.id}-${e.mood}-${e.moodIcon}-${e.moodColor}`).join(',') || ''}`).join(',') || ''}`).join(',')]);
  
  const completedTasksReversed = useMemo(() => {
    return [...completedTasks].reverse();
  }, [completedTasks.length, completedTasks.map(t => `${t.id}-${t.title}-${t.done}-${t.milestones?.length || 0}-${t.milestones?.map(m => `${m.id}-${m.title}-${m.completed}-${m.journalEntries?.length || 0}-${m.journalEntries?.map(e => `${e.id}-${e.mood}-${e.moodIcon}-${e.moodColor}`).join(',') || ''}`).join(',') || ''}`).join(',')]);

  // Additional safety check
  if (!activeTasks || !completedTasks || !Array.isArray(activeTasks) || !Array.isArray(completedTasks)) {
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
          <View style={styles.headerTop}>
            <Text style={styles.header}>Flow Journal</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.dataRecoveryButton} 
                onPress={openDataRecoveryMenu}
                accessible={true}
                accessibilityLabel="Data recovery options"
                accessibilityRole="button"
              >
                <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
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
          {/* My Day Screen (left) */}
          <View style={{ width }}>
            <MyDayScreen 
              navigation={navigation}
              selectedCard={myDaySelectedCard}
              setSelectedCard={setMyDaySelectedCard}
              selectedMilestone={myDaySelectedMilestone}
              setSelectedMilestone={setMyDaySelectedMilestone}
              addMilestoneModalVisible={myDayAddMilestoneModalVisible}
              setAddMilestoneModalVisible={setMyDayAddMilestoneModalVisible}
              selectedProjectForMilestone={myDaySelectedProjectForMilestone}
              setSelectedProjectForMilestone={setMyDaySelectedProjectForMilestone}
            />
          </View>

          {/* Active list (right) */}
          <View style={{ width }}>
            <FlatList
              data={activeTasksReversed}
              keyExtractor={keyExtractor}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140, paddingTop: 8 }}
              renderItem={renderActiveItem}
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
        </Animated.View>
      </View>

      {/* Modern FAB with Menu */}
      <TouchableOpacity 
        style={styles.addButton} 
        onPress={() => setMainMenuVisible(true)} 
        activeOpacity={0.8}
        accessible={true}
        accessibilityLabel="Main menu"
        accessibilityHint="Opens main menu with project options"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.addButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.addButtonText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Main Menu Modal */}
      {mainMenuVisible && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity 
            style={styles.menuBackdrop}
            onPress={() => setMainMenuVisible(false)}
            activeOpacity={1}
          />
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>
              <TouchableOpacity 
                onPress={() => setMainMenuVisible(false)}
                style={styles.menuCloseButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.menuItems}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setMainMenuVisible(false);
                  setAddVisible(true);
                }}
              >
                <View style={styles.menuItemIcon}>
                  <Ionicons name="add-circle" size={24} color="#4A90E2" />
                </View>
                <Text style={styles.menuItemText}>Add New Project</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setMainMenuVisible(false);
                  navigation.navigate('CompletedProjects');
                }}
              >
                <View style={styles.menuItemIcon}>
                  <Ionicons name="checkmark-circle" size={24} color="#28a745" />
                </View>
                <Text style={styles.menuItemText}>Completed Projects</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setMainMenuVisible(false);
                  setDataRecoveryMenuVisible(true);
                }}
              >
                <View style={styles.menuItemIcon}>
                  <Ionicons name="settings" size={24} color="#6c757d" />
                </View>
                <Text style={styles.menuItemText}>Settings & Data</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setMainMenuVisible(false);
                  // Clear storage functionality
                  clearStorage();
                }}
              >
                <View style={styles.menuItemIcon}>
                  <Ionicons name="trash" size={24} color="#dc3545" />
                </View>
                <Text style={styles.menuItemText}>Clear All Data</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <AddProjectScreen visible={addVisible} onClose={() => setAddVisible(false)} />

      {selectedCard && <ActiveProject selectedCard={selectedCard} onClose={closeCard} navigation={navigation} />}
      
      {selectedMilestone && <ActiveMilestone milestone={selectedMilestone} onClose={closeMilestone} navigation={navigation} />}
      
      {/* MyDay modals */}
      {myDaySelectedCard && <ActiveProject selectedCard={myDaySelectedCard} onClose={() => setMyDaySelectedCard(null)} navigation={navigation} />}
      
      {myDaySelectedMilestone && <ActiveMilestone milestone={myDaySelectedMilestone} onClose={() => setMyDaySelectedMilestone(null)} navigation={navigation} />}

      {/* MyDay AddMilestoneModal */}
      <AddMilestoneModal
        visible={myDayAddMilestoneModalVisible}
        onClose={() => {
          setMyDayAddMilestoneModalVisible(false);
          setMyDaySelectedProjectForMilestone(null);
        }}
        project={myDaySelectedProjectForMilestone}
        onSave={(milestoneData) => {
          if (myDaySelectedProjectForMilestone) {
            addMilestone(myDaySelectedProjectForMilestone.id, milestoneData);
            setMyDayAddMilestoneModalVisible(false);
            setMyDaySelectedProjectForMilestone(null);
          }
        }}
      />

      {/* Data Recovery Menu */}
      <DataRecoveryMenu
        visible={dataRecoveryMenuVisible}
        onClose={closeDataRecoveryMenu}
        onRecoverData={async () => {
          const result = await handleDataRecovery();
          alert(result.message);
        }}
        onCreateBackup={async () => {
          const result = await handleCreateBackup();
          alert(result.message);
        }}
        onViewCompleted={() => {
          navigation.navigate('CompletedProjects');
        }}
      />
      </LinearGradient>
    );
  } catch (error) {
    console.error('🚨 MainScreen rendering error:', error);
    console.error('🚨 MainScreen error stack:', error.stack);
    console.error('🚨 MainScreen state:', { activeTasks, completedTasks });
    return <LoadingSpinner message="Error occurred in MainScreen..." />;
  }
});

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: 60 
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  header: {
    fontSize: 32,
    fontFamily: "Poppins_700Bold",
    color: "#2c3e50",
    letterSpacing: -0.5,
    paddingBottom: 8,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  dataRecoveryButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
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
  
  // Main Menu Styles
  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  menuContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: height * 0.6,
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuTitle: {
    fontSize: 20,
    fontFamily: "Poppins_600SemiBold",
    color: "#1D1D1F",
  },
  menuCloseButton: {
    padding: 4,
  },
  menuItems: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#1D1D1F",
  },
});

export default MainScreen;