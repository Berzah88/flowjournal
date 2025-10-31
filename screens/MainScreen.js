// screens/MainScreen.js
import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useDerivedValue,
  useAnimatedReaction,
  runOnJS,
} from "react-native-reanimated";
import useHeaderCollapseCoordinator from '../hooks/useHeaderCollapseCoordinator';
import { useActiveTasks, useCompletedTasks, useTaskActions, useTaskSaving } from "../hooks/useTaskContext";
import { usePerformanceOptimization } from "../utils/PerformanceOptimizer";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useEducation } from "../context/EducationContext";
import { EDUCATION_STEPS } from "../context/EducationContext";
import LoadingSpinner from "../components/LoadingSpinner";
import MoodStatement from "../components/MoodStatement";
import EducationOverlay from "../components/EducationOverlay";
import MainHeader from "../components/MainHeader";
import MainTabNavigation from "../components/MainTabNavigation";
import MainModalManager from "../components/MainModalManager";
import MainMenu from "../components/MainMenu";
import StatusTabs from "../components/StatusTabs";

const { width, height } = Dimensions.get("window");

const MainScreen = memo(function MainScreen({ navigation }) {
  const activeTasks = useActiveTasks();
  const completedTasks = useCompletedTasks();
  const isSaving = useTaskSaving();
  const { addMilestone } = useTaskActions();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const {
    isEducationActive,
    currentStep,
    startEducation,
    nextStep,
    setEducationProjectId,
    createdProjectId,
    isLoading: educationLoading,
    resetEducation, // For testing
    completeEducation,
  } = useEducation();


  // Performance optimization
  const { flatListProps, runAfterInteractions } = usePerformanceOptimization();


  const [activeIndex, setActiveIndex] = useState(0); // 0 = my day, 1 = active
  const [addVisible, setAddVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [dataRecoveryMenuVisible, setDataRecoveryMenuVisible] = useState(false);
  const [notificationMenuVisible, setNotificationMenuVisible] = useState(false);
  const [languageSettingsVisible, setLanguageSettingsVisible] = useState(false);
  const [mainMenuVisible, setMainMenuVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationData, setCelebrationData] = useState(null);
  const celebrationDataRef = useRef(null);

  // Parent date notifications için state'ler
  const [parentDateNotificationVisible, setParentDateNotificationVisible] = useState(false);
  const [parentDateNotifications, setParentDateNotifications] = useState([]);


  // MyDay screen states
  const [myDaySelectedCard, setMyDaySelectedCard] = useState(null);
  const [myDaySelectedMilestone, setMyDaySelectedMilestone] = useState(null);
  const [myDayAddMilestoneModalVisible, setMyDayAddMilestoneModalVisible] = useState(false);
  const [myDaySelectedProjectForMilestone, setMyDaySelectedProjectForMilestone] = useState(null);

  // Shared values expected by MainHeader/MainTabNavigation
  const globalScrollY = useSharedValue(0);
  const headerHeight = useSharedValue(0);
  const moodHeight = useSharedValue(120); // Default height, measured later
  const statusTabsOffset = useSharedValue(0); // StatusTabs'ın header'dan uzaklığı
  const statusTabsHeight = useSharedValue(0);
  const globalCollapseProgress = useSharedValue(0);

  // Per-tab content scroll positions (worklet-safe)
  // Per-tab content scroll positions (worklet-safe)
  const myDayContentOffset = useSharedValue(0);
  const activeContentOffset = useSharedValue(0);

  // Worklet-safe copy of the current tab index for other components
  const activeIndexShared = useSharedValue(activeIndex);
  useEffect(() => { activeIndexShared.value = activeIndex; }, [activeIndex]);

  // Derived value used to decide whether the header should handle vertical
  // gestures. With scrolling removed, header handles vertical gestures
  // based purely on collapse progress.
  const headerShouldHandle = useDerivedValue(() => globalCollapseProgress.value < 0.95);

  // UI-thread flag indicating parent should handle vertical gestures.
  // 1 = parent handles (children should be disabled), 0 = children can scroll.
  const parentHandlesVertical = useDerivedValue(() => headerShouldHandle.value ? 1 : 0);

  // Mirror header fully-collapsed state to JS so child JS components
  // (FlatList scrollEnabled props) can react synchronously.
  const [headerFullyCollapsed, setHeaderFullyCollapsed] = useState(false);
  const [headerShouldHandleJS, setHeaderShouldHandleJS] = useState(false);

  // Keep JS mirrors for debugging or gating actions
  const [collapseProgressJS, setCollapseProgressJS] = useState(0);
  const [statusTabsOffsetJS, setStatusTabsOffsetJS] = useState(0);
  const [statusTabsHeightJS, setStatusTabsHeightJS] = useState(0);

  // forceParentHandle removed because child scrolls are disabled

  // Mirror numeric collapse progress for JS
  useAnimatedReaction(
    () => globalCollapseProgress.value,
    (val) => { try { runOnJS(setCollapseProgressJS)(val); } catch (e) {} }
  );

  // Mirror headerShouldHandle (worklet) to JS so non-worklet components can read it
  useAnimatedReaction(
    () => headerShouldHandle.value,
    (val) => { try { runOnJS(setHeaderShouldHandleJS)(!!val); } catch (e) {} }
  );

  // Mirror fully-collapsed boolean to JS for gating child scrollEnabled
  useAnimatedReaction(
    () => (globalCollapseProgress.value >= 0.95),
    (val) => { try { runOnJS(setHeaderFullyCollapsed)(!!val); } catch (e) {} }
  );

  // Mirror statusTabsOffset for JS
  useAnimatedReaction(
    () => statusTabsOffset.value,
    (val) => { try { runOnJS(setStatusTabsOffsetJS)(val); } catch (e) {} }
  );

  // Mirror statusTabsHeight for JS
  useAnimatedReaction(
    () => statusTabsHeight.value,
    (val) => { try { runOnJS(setStatusTabsHeightJS)(val); } catch (e) {} }
  );

  // NOTE: a dedicated global scroll handler was previously defined here
  // but removed to centralize scroll handling in the child ScrollViews
  // (MyDayScreen / Active list) and the header gestures. This avoids
  // duplicated control paths for `globalCollapseProgress` during the
  // upcoming refactor.

  // Use centralized coordinator to produce per-tab handlers that drive header
  const {
    myDayContentScrollHandler: _myDayHandler,
    activeContentScrollHandler: _activeHandler,
  } = useHeaderCollapseCoordinator({
    globalCollapseProgress,
    globalScrollY,
    statusTabsOffset,
    activeIndexShared,
    moodHeight,
  });

  // forward handlers and keep local refs for any other use
  const myDayContentScrollHandler = _myDayHandler;
  const activeContentScrollHandler = _activeHandler;

  // Simplified header animation - single style with reduced calculations
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const p = globalCollapseProgress.value;
    // Reduce vertical padding as header collapses to create a smaller header
    const paddingVertical = 12 - 8 * p; // 12 -> 4
    // Slight upward shift to tighten space
    const translateY = -6 * p;
    return {
      paddingVertical,
      transform: [{ translateY }],
    };
  });

  // Logo and menu button animation
  const headerElementsStyle = useAnimatedStyle(() => {
    const p = globalCollapseProgress.value;
    const scale = 1 - 0.32 * p; // stronger shrink
    const translateY = -4 * p;
    return {
      transform: [{ scale }, { translateY }],
    };
  });

  // Title animation - separate and more conservative
  const titleAnimatedStyle = useAnimatedStyle(() => {
    const p = globalCollapseProgress.value;
    const scale = 1 - 0.32 * p; // stronger shrink for title
    const translateY = -4 * p;
    // Move title to the left more aggressively to close the gap
    const translateX = -30 * p; // Increased from -20 to -30 for more aggressive movement
    return {
      transform: [{ scale }, { translateY }, { translateX }],
    };
  });

  // Menu button opacity animation (fades out like mood statement)
  const menuButtonStyle = useAnimatedStyle(() => {
    const p = globalCollapseProgress.value;
    // Immediate fade out - disappears as soon as scroll starts
    const opacity = p > 0.15 ? 0 : 1; // If scroll progress > 15%, completely invisible
    return {
      opacity,
    };
  });

  // Combined logo and title animation for better spacing
  const logoTitleContainerStyle = useAnimatedStyle(() => {
    const p = globalCollapseProgress.value;
    const scaleReduction = 0.12 * p;
    const originalMargin = 16;
    const translateX = -(scaleReduction * originalMargin * 0.8);
    return {
      transform: [{ translateX }],
    };
  });

  // Simplified MoodStatement animation
  const moodStatementAnimatedStyle = useAnimatedStyle(() => {
    const p = globalCollapseProgress.value;
    const height = moodHeight.value * (1 - p);
    const opacity = 1 - p;
    return {
      height,
      opacity,
      overflow: 'hidden',
    };
  });

  // Simplified StatusTabs - static positioning
  const statusTabsAnimatedStyle = useAnimatedStyle(() => {
    // Make StatusTabs an absolute overlay that stays above content and
    // follows content scroll until it becomes sticky under the header/logo.
    const margin = 6;
    // baseTop: prefer the measured spacer offset (content top). Fallback to header+ mood.
    const baseTop = (statusTabsOffset.value && statusTabsOffset.value > 0)
      ? statusTabsOffset.value
      : ((headerHeight.value || 0) + (moodHeight.value || 0));
    // maxUp: how far tabs may move up so they end up under the header/logo
    const maxUp = Math.max(0, (moodHeight.value || 0) - margin);
    // Use the clamped scroll distance (globalScrollY) to move tabs with content
    const scrollY = globalScrollY ? globalScrollY.value : 0;
    const move = Math.min(Math.max(0, scrollY), maxUp);
    const top = baseTop - move;
    return {
      zIndex: 50,
      position: 'absolute',
      left: 0,
      right: 0,
      top,
      // keep fully visible; tabs should not fade
      opacity: 1,
    };
  });

  // Header lock spacer removed - using scroll handler only for better performance




  // Memoized handlers to prevent unnecessary re-renders
  const openCard = useCallback((card) => setSelectedCard(card), []);
  const closeCard = useCallback(() => setSelectedCard(null), []);


  // Education: Handle AddProject opening from education overlay
  const handleEducationAddProject = useCallback(() => {
    setAddVisible(true);
  }, []);

  // Education: Handle AddMilestone opening from MY_DAY_INFO tooltip
  const handleEducationAddMilestone = useCallback(() => {
    // Find the created project (1. modal ile oluşturulan proje)
    const createdProject = activeTasks.find(t => t.id === createdProjectId);

    if (createdProject) {
      setMyDaySelectedProjectForMilestone(createdProject);
      setMyDayAddMilestoneModalVisible(true);
    }
  }, [activeTasks, createdProjectId]);




  // Function to open journal for MyDay screen
  const handleMyDayOpenJournal = useCallback((milestoneData) => {
    setMyDaySelectedMilestone(milestoneData);
  }, []);

  // Function to add project for MyDay screen
  const handleMyDayAddProject = useCallback(() => {
    setAddVisible(true);
  }, []);


  // Menu handlers
  const openDataRecoveryMenu = useCallback(() => setDataRecoveryMenuVisible(true), []);
  const closeDataRecoveryMenu = useCallback(() => setDataRecoveryMenuVisible(false), []);
  const openNotificationMenu = useCallback(() => setNotificationMenuVisible(true), []);
  const closeNotificationMenu = useCallback(() => setNotificationMenuVisible(false), []);
  const openLanguageSettings = useCallback(() => setLanguageSettingsVisible(true), []);
  const closeLanguageSettings = useCallback(() => setLanguageSettingsVisible(false), []);



  // ScrollView refs for manual scroll control
  // scroll refs removed (no child scrolling)

  // Memoized tab press handler (preserve scroll positions and header state)
  const handleTabPress = useCallback((index) => {
    if (index === activeIndex) return;
    setActiveIndex(index);
  }, [activeIndex]);


  // Parent date notifications için global trigger sistemi
  useEffect(() => {
    global.triggerParentDateNotification = (notifications) => {
      console.log('📢 Parent date notifications received:', notifications);
      // Modal'ı göster - MainModalManager'a state ekle
      setParentDateNotifications(notifications);
      setParentDateNotificationVisible(true);
    };

    return () => {
      global.triggerParentDateNotification = null;
    };
  }, []);

  // Global trigger for celebration modal (used by MyDayScreen when milestone completed)
  useEffect(() => {
    global.triggerCelebration = (data) => {
      try {
        // Store data and show modal
        setCelebrationData(data || null);
        setCelebrationVisible(true);
        // Keep a ref copy if other parts of app need it
        if (celebrationDataRef) celebrationDataRef.current = data || null;
      } catch (err) {
        console.warn('Failed to trigger celebration:', err);
      }
    };

    return () => {
      global.triggerCelebration = null;
    };
  }, [setCelebrationData, setCelebrationVisible]);


  // Additional safety check
  if (!activeTasks || !completedTasks || !Array.isArray(activeTasks) || !Array.isArray(completedTasks)) {
    return <LoadingSpinner message="Initializing..." />;
  }

  try {
    return (
      <LinearGradient
        colors={theme.name === 'dark'
          ? ['#4B5563', '#374151', '#1F2937']
          : ['#f8f9fa', '#e9ecef', '#dee2e6']
        }
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Header */}
        <MainHeader
          theme={theme}
          headerAnimatedStyle={headerAnimatedStyle}
          headerElementsStyle={headerElementsStyle}
          titleAnimatedStyle={titleAnimatedStyle}
          menuButtonStyle={menuButtonStyle}
          onMenuPress={() => setMainMenuVisible(true)}
          globalCollapseProgress={globalCollapseProgress}
          globalScrollY={globalScrollY}
          statusTabsOffset={statusTabsOffset}
          headerShouldHandle={headerShouldHandle}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h && headerHeight.value === 0) headerHeight.value = h;
          }}
        />

        {/* Mood Statement - Animasyonlu (yükseklik ölçümü) */}
        <AnimatedReanimated.View
          style={moodStatementAnimatedStyle}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            // Only set height once to avoid layout thrashing
            if (h && moodHeight.value === 120) {
              moodHeight.value = h;
            }
          }}
        >
          <MoodStatement
            activeTasks={activeTasks}
            completedTasks={completedTasks}
            onCreateFirstProject={() => setAddVisible(true)} // Proje yoksa AddProject aç
          />
        </AnimatedReanimated.View>

        {/* Status Tabs placeholder to keep layout flow (measured height/offset will be applied) */}
        <AnimatedReanimated.View
          style={{ height: statusTabsHeightJS || 56 }}
          onLayout={(e) => {
            const { y, height } = e.nativeEvent.layout;
            // Save measurements once from the spacer (this is the content top)
            if (height && statusTabsHeight.value === 0) {
              statusTabsHeight.value = height;
            }
            if ((y || y === 0) && statusTabsOffset.value === 0) {
              statusTabsOffset.value = y;
            }
          }}
        />

        {/* Status Tabs overlay - absolute so content scrolls under it. */}
        <AnimatedReanimated.View
          style={statusTabsAnimatedStyle}
          onLayout={(e) => {
            const { height } = e.nativeEvent.layout;
            // Save height if not already measured
            if (height && statusTabsHeight.value === 0) {
              statusTabsHeight.value = height;
            }
          }}
          pointerEvents="box-none"
        >
          <StatusTabs activeIndex={activeIndex} onTabPress={handleTabPress} />
        </AnimatedReanimated.View>

        {/* Main Tab Navigation */}
        <MainTabNavigation
          navigation={navigation}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          activeTasks={activeTasks}
          completedTasks={completedTasks}
          theme={theme}
          t={t}
          refreshKey={refreshKey}
          setRefreshKey={setRefreshKey}
          myDaySelectedCard={myDaySelectedCard}
          setMyDaySelectedCard={setMyDaySelectedCard}
          myDaySelectedMilestone={myDaySelectedMilestone}
          setMyDaySelectedMilestone={setMyDaySelectedMilestone}
          myDayAddMilestoneModalVisible={myDayAddMilestoneModalVisible}
          setMyDayAddMilestoneModalVisible={setMyDayAddMilestoneModalVisible}
          myDaySelectedProjectForMilestone={myDaySelectedProjectForMilestone}
          setMyDaySelectedProjectForMilestone={setMyDaySelectedProjectForMilestone}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          onMyDayOpenJournal={handleMyDayOpenJournal}
          onMyDayAddProject={handleMyDayAddProject}
          moodHeight={moodHeight}
          statusTabsOffset={statusTabsOffset}
          globalCollapseProgress={globalCollapseProgress}
          parentHandlesVertical={parentHandlesVertical}
          headerShouldHandleJS={headerShouldHandleJS}
          headerShouldHandle={headerShouldHandle}
          headerFullyCollapsed={headerFullyCollapsed}
          myDayContentScrollHandler={myDayContentScrollHandler}
          activeContentScrollHandler={activeContentScrollHandler}
          
          onOpenCard={openCard}
          onAddProject={() => setAddVisible(true)}
        />


        {/* Main Menu */}
        <MainMenu
          visible={mainMenuVisible}
          onClose={() => setMainMenuVisible(false)}
          theme={theme}
          t={t}
          language={language}
          navigation={navigation}
          onDataRecoveryPress={() => setDataRecoveryMenuVisible(true)}
          onNotificationPress={() => setNotificationMenuVisible(true)}
        />



        {/* Modal Manager */}
        <MainModalManager
          addVisible={addVisible}
          setAddVisible={setAddVisible}
          selectedCard={selectedCard}
          onCloseCard={closeCard}
          refreshKey={refreshKey}
          setRefreshKey={setRefreshKey}
          myDaySelectedCard={myDaySelectedCard}
          setMyDaySelectedCard={setMyDaySelectedCard}
          myDaySelectedMilestone={myDaySelectedMilestone}
          setMyDaySelectedMilestone={setMyDaySelectedMilestone}
          myDayAddMilestoneModalVisible={myDayAddMilestoneModalVisible}
          setMyDayAddMilestoneModalVisible={setMyDayAddMilestoneModalVisible}
          myDaySelectedProjectForMilestone={myDaySelectedProjectForMilestone}
          setMyDaySelectedProjectForMilestone={setMyDaySelectedProjectForMilestone}
          onMyDayMilestoneSave={(milestoneData) => {
            if (myDaySelectedProjectForMilestone) {
              const projectId = myDaySelectedProjectForMilestone.id;
              addMilestone(projectId, milestoneData);
              setMyDayAddMilestoneModalVisible(false);
              setMyDaySelectedProjectForMilestone(null);

              // Education: Move to MY_DAY_FEATURES after adding milestone to created project
              if (isEducationActive && currentStep === EDUCATION_STEPS.MY_DAY_INFO && projectId === createdProjectId) {
                setTimeout(() => {
                  nextStep();
                }, 300);
              }
            }
          }}
          dataRecoveryMenuVisible={dataRecoveryMenuVisible}
          closeDataRecoveryMenu={closeDataRecoveryMenu}
          openLanguageSettings={openLanguageSettings}
          notificationMenuVisible={notificationMenuVisible}
          closeNotificationMenu={closeNotificationMenu}
          languageSettingsVisible={languageSettingsVisible}
          closeLanguageSettings={closeLanguageSettings}
          celebrationVisible={celebrationVisible}
          setCelebrationVisible={setCelebrationVisible}
          celebrationData={celebrationData}
          setCelebrationData={setCelebrationData}
          onCelebrationJournalPress={() => {
            if (celebrationData) {
              const projectData = {
                id: 'project-journal-celebration',
                title: t('projectJournal'),
                taskId: celebrationData.projectId,
                projectTitle: celebrationData.projectTitle,
                isProjectBased: true,
                celebrationMode: true,
                completionInfo: celebrationData
              };
              setMyDaySelectedMilestone(projectData);
            }
          }}
          activeTasks={activeTasks}
          completedTasks={completedTasks}
          navigation={navigation}
          t={t}
          // Parent Date Notification props
          parentDateNotificationVisible={parentDateNotificationVisible}
          setParentDateNotificationVisible={setParentDateNotificationVisible}
          parentDateNotifications={parentDateNotifications}
          setParentDateNotifications={setParentDateNotifications}
        />

      {/* Education Overlay */}
      {isEducationActive && <EducationOverlay
        onAddProject={handleEducationAddProject}
        onAddMilestone={handleEducationAddMilestone}
        hideOverlay={
          (addVisible && currentStep === EDUCATION_STEPS.CREATE_PROJECT) ||
          (myDayAddMilestoneModalVisible && currentStep === EDUCATION_STEPS.MY_DAY_INFO)
        }
      />}
      </LinearGradient>
    );
  } catch (error) {
    console.error('MainScreen rendering error:', error);
    return <LoadingSpinner message="Error occurred in MainScreen..." />;
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40
  },
});

export default MainScreen;
            // pass the central header eligibility flag so header pan can opt-in
