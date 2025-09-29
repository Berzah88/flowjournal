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
  TouchableWithoutFeedback,
  Image,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useActiveTasks, useCompletedTasks, useTaskActions, useTaskSaving, useDataRecovery } from "../hooks/useTaskContext";
import { useDataRecoveryOperations } from "../hooks/useDataRecoveryOperations";
import { usePerformanceMonitor } from "../hooks/usePerformanceMonitor";
import { SWIPE_THRESHOLDS, ANIMATION_DURATIONS } from "../constants";
import StatusTabs from "../components/StatusTabs";
import StatusBarComponent from "../components/StatusBar";
import Card from "../components/Card";
import AddProjectScreen from "./AddProjectScreen";
import ActiveProject from "./ActiveProject";
import Journal from "./Journal";
import LoadingSpinner from "../components/LoadingSpinner";
import DataRecoveryMenu from "../components/DataRecoveryMenu";
import MyDayScreen from "./MyDayScreen";
import AddMilestoneModal from "../components/AddMilestoneModal";
import MoodStatement from "../components/MoodStatement";
import DailyMoodSummary from "../components/DailyMoodSummary";
import HorizontalCalendar from "../components/HorizontalCalendar";

const { width, height } = Dimensions.get("window");

const MainScreen = memo(function MainScreen({ navigation }) {
  const activeTasks = useActiveTasks();
  const completedTasks = useCompletedTasks();
  const isSaving = useTaskSaving();
  const { clearStorage, addMilestone } = useTaskActions();
  const { recoverData, createManualBackup, getDataStatus } = useDataRecovery();
  const { handleDataRecovery, handleCreateBackup, handleCheckDataStatus } = useDataRecoveryOperations();
  
  // Performance monitoring (only in development) - temporarily disabled
  // usePerformanceMonitor('MainScreen');

  const [activeIndex, setActiveIndex] = useState(0); // 0 = my day, 1 = active
  const [addVisible, setAddVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [dataRecoveryMenuVisible, setDataRecoveryMenuVisible] = useState(false);
  const [mainMenuVisible, setMainMenuVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Menu animation values
  const menuScale = useSharedValue(0);
  const menuOpacity = useSharedValue(0);
  const menuTranslateY = useSharedValue(-20);
  
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


  // Function to open journal for MyDay screen
  const handleMyDayOpenJournal = useCallback((milestoneData) => {
    setMyDaySelectedMilestone(milestoneData);
  }, []);

  // Function to add project for MyDay screen
  const handleMyDayAddProject = useCallback(() => {
    setAddVisible(true);
  }, []);


  // Data recovery menu handlers
  const openDataRecoveryMenu = useCallback(() => setDataRecoveryMenuVisible(true), []);
  const closeDataRecoveryMenu = useCallback(() => setDataRecoveryMenuVisible(false), []);

  const threshold = width * SWIPE_THRESHOLDS.NAVIGATE;

  // Menu open/close animation
  useEffect(() => {
    if (mainMenuVisible) {
      menuScale.value = withSpring(1, {
        damping: 25,
        stiffness: 300,
        mass: 0.5,
      });
      menuOpacity.value = withTiming(1, { duration: 200 });
      menuTranslateY.value = withSpring(0, {
        damping: 25,
        stiffness: 300,
      });
    } else {
      menuScale.value = withTiming(0, { duration: 150 });
      menuOpacity.value = withTiming(0, { duration: 150 });
      menuTranslateY.value = withTiming(-20, { duration: 150 });
    }
  }, [mainMenuVisible]);

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
      tension: 300,
      friction: 30,
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
      onMilestonePress={(milestone) => {
        const milestoneData = {
          ...milestone,
          taskId: item.id,
          projectTitle: item.title,
          autoOpenJournal: true
        };
        setMyDaySelectedMilestone(milestoneData);
      }}
      onPress={() => openCard(item)}
      style={{ marginBottom: 15 }}
    />
  ), [openCard]);

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

  // Menu animasyonlu style
  const menuAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: menuScale.value },
      { translateY: menuTranslateY.value }
    ],
    opacity: menuOpacity.value,
  }));

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
            <View style={styles.headerLeft}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../assets/Logo.png')} 
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.header}>Flow Journal</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.menuButton} 
                onPress={() => setMainMenuVisible(true)}
                accessible={true}
                accessibilityLabel="Menu options"
                accessibilityRole="button"
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#667eea" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

      {/* Mood Statement - Status Tabs'ın üstünde */}
      <MoodStatement 
        activeTasks={activeTasks} 
        selectedDate={selectedDate}
      />

      {/* Status Tabs - Swipe alanı dışında */}
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
            {/* Horizontal Calendar */}
            <HorizontalCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              tasksByDate={{}}
              milestones={[]}
            />
            
            {/* Today's Summary Section */}
            <View style={styles.summaryHeaderContainer}>
              <Text style={styles.summaryHeaderTitle}>Today's Summary</Text>
            </View>
            
            {/* Scrollable Content */}
            <ScrollView 
              style={styles.myDayScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.myDayScrollContent}
            >
              {/* Daily Mood Summary with Progress - MyDay'de */}
              <DailyMoodSummary
                activeTasks={activeTasks}
                selectedDate={selectedDate}
              />
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
                selectedDate={selectedDate}
                onOpenJournal={handleMyDayOpenJournal}
                onAddProject={handleMyDayAddProject}
              />
            </ScrollView>
          </View>

          {/* Active list (right) */}
          <View style={{ width }}>
            {/* Status Bar */}
            <StatusBarComponent activeCount={activeTasks.length} doneCount={completedTasks.length} />
            
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


      {/* Main Menu - ActiveTaskMenu Style */}
      {mainMenuVisible && (
        <TouchableWithoutFeedback onPress={() => setMainMenuVisible(false)}>
          <View style={styles.menuOverlay}>
            <AnimatedReanimated.View style={[styles.menuContainer, menuAnimatedStyle]}>
              {/* Add New Project */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMainMenuVisible(false);
                  setAddVisible(true);
                }}
                accessible={true}
                accessibilityLabel="Add new project"
                accessibilityRole="button"
              >
                <View style={styles.menuItemContent}>
                  <Ionicons name="add-circle-outline" size={20} color="#4A90E2" />
                  <Text style={styles.menuItemText}>Add New Project</Text>
                </View>
              </TouchableOpacity>

              {/* Completed Projects */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMainMenuVisible(false);
                  navigation.navigate('CompletedProjects');
                }}
                accessible={true}
                accessibilityLabel="View completed projects"
                accessibilityRole="button"
              >
                <View style={styles.menuItemContent}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#4ECDC4" />
                  <Text style={styles.menuItemText}>Completed Projects</Text>
                </View>
              </TouchableOpacity>

              {/* Settings & Data */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMainMenuVisible(false);
                  setDataRecoveryMenuVisible(true);
                }}
                accessible={true}
                accessibilityLabel="Settings and data management"
                accessibilityRole="button"
              >
                <View style={styles.menuItemContent}>
                  <Ionicons name="settings-outline" size={20} color="#667eea" />
                  <Text style={styles.menuItemText}>Settings & Data</Text>
                </View>
              </TouchableOpacity>

            </AnimatedReanimated.View>
          </View>
        </TouchableWithoutFeedback>
      )}

      <AddProjectScreen visible={addVisible} onClose={() => setAddVisible(false)} />

      {selectedCard && <ActiveProject selectedCard={selectedCard} onClose={closeCard} navigation={navigation} />}
      
      {/* MyDay modals */}
      {myDaySelectedCard && <ActiveProject selectedCard={myDaySelectedCard} onClose={() => setMyDaySelectedCard(null)} navigation={navigation} />}
      
      {myDaySelectedMilestone && <Journal 
        visible={!!myDaySelectedMilestone} 
        milestone={myDaySelectedMilestone} 
        onClose={() => setMyDaySelectedMilestone(null)}
        onSave={() => {
          // Refresh trigger when journal is saved
          setRefreshKey(prev => prev + 1);
          setForceUpdate(prev => prev + 1);
        }}
        fromMainScreen={true}
      />}

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
    paddingVertical: 20,
    marginBottom: 8,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logoContainer: {
    marginRight: 16,
  },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  header: {
    fontSize: 26,
    fontFamily: "Poppins_700Bold",
    color: "#1a1a1a",
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.15)',
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  
  // Main Menu Styles - ActiveTaskMenu Style
  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  menuContainer: {
    position: "absolute",
    top: 20,
    right: 18,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    backdropFilter: "blur(20px)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemText: {
    fontSize: 16,
    color: "#2c3e50",
    fontFamily: "Poppins_600SemiBold",
    marginLeft: 12,
  },
  deleteText: { 
    color: "#E74C3C" 
  },
  // Summary Header Styles
  summaryHeaderContainer: {
    marginHorizontal: 30,
    marginTop: 16,
    marginBottom: 0,
  },
  summaryHeaderTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#1D1D1F",
    marginBottom: 0,
  },
  // My Day ScrollView Styles
  myDayScrollView: {
    flex: 1,
  },
  myDayScrollContent: {
    paddingBottom: 40,
  },
});

export default MainScreen;