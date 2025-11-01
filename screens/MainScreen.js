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
  const statusTabsTop = useSharedValue(0);
  const globalCollapseProgress = useSharedValue(0);

  // Per-tab content scroll positions (worklet-safe)
  // Per-tab content scroll positions (worklet-safe)
  const myDayContentOffset = useSharedValue(0);
  const activeContentOffset = useSharedValue(0);

  // Expose snap configuration so the parent screen can tune snapping behavior
  // without editing the hook. These can be changed later (e.g. via debug UI)
  // to test different thresholds and durations.
  const [snapThreshold, setSnapThreshold] = useState(0.5);
  const [snapDuration, setSnapDuration] = useState(180);

  // Worklet-safe copy of the current tab index for other components
  const activeIndexShared = useSharedValue(activeIndex);
  useEffect(() => { activeIndexShared.value = activeIndex; }, [activeIndex]);

  // Derived value used to decide whether the header should handle vertical
  // gestures. With scrolling removed, header handles vertical gestures
  // based purely on collapse progress.
  // Guard against undefined shared-values (defensive): if a shared value is
  // unexpectedly undefined (hot-reload / revert mismatch), fall back to 0.
  const headerShouldHandle = useDerivedValue(() => {
    const g = (typeof globalCollapseProgress !== 'undefined' && globalCollapseProgress) ? globalCollapseProgress : { value: 0 };
    return g.value < 0.95;
  });

  // UI-thread flag indicating parent should handle vertical gestures.
  // 1 = parent handles (children should be disabled), 0 = children can scroll.
  const parentHandlesVertical = useDerivedValue(() => {
    const h = (typeof headerShouldHandle !== 'undefined' && headerShouldHandle) ? headerShouldHandle : { value: 0 };
    return h.value ? 1 : 0;
  });

  // Mirror header fully-collapsed state to JS so child JS components
  // (FlatList scrollEnabled props) can react synchronously.
  const [headerFullyCollapsed, setHeaderFullyCollapsed] = useState(false);
  const [headerShouldHandleJS, setHeaderShouldHandleJS] = useState(false);

  // Keep JS mirrors for debugging or gating actions
  const [collapseProgressJS, setCollapseProgressJS] = useState(0);
  const [statusTabsOffsetJS, setStatusTabsOffsetJS] = useState(0);
  const [statusTabsHeightJS, setStatusTabsHeightJS] = useState(0);
  const [headerHeightJS, setHeaderHeightJS] = useState(0);
  const [moodHeightJS, setMoodHeightJS] = useState(120);
  const loggedRef = React.useRef(false);

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

  // Mirror headerHeight and moodHeight to JS so we can log spacing diagnostics
  useAnimatedReaction(
    () => headerHeight.value,
    (val) => { try { runOnJS(setHeaderHeightJS)(val); } catch (e) {} }
  );

  useAnimatedReaction(
    () => moodHeight.value,
    (val) => { try { runOnJS(setMoodHeightJS)(val); } catch (e) {} }
  );

  // One-time diagnostic log when measurements are available
  useEffect(() => {
    if (!loggedRef.current && headerHeightJS > 0 && moodHeightJS > 0) {
      const spacing = 0; // header and mood are adjacent in layout; spacing is primarily internal header padding
      console.log('Layout measurements — headerHeight:', headerHeightJS, 'moodHeight:', moodHeightJS, 'estimated spacing (header->mood):', spacing);
      loggedRef.current = true;
    }
  }, [headerHeightJS, moodHeightJS]);

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
    snapThreshold,
    snapDuration,
  });

  // forward handlers and keep local refs for any other use
  const myDayContentScrollHandler = _myDayHandler;
  const activeContentScrollHandler = _activeHandler;

  // Simplified header animation - single style with reduced calculations
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const p = globalCollapseProgress.value;
    // Reduce vertical padding as header collapses to create a smaller header.
    // Make header area tighter when collapsed to remove the gap under
    // the shrunken logo/title.
    const paddingVertical = 10 - 7 * p; // 10 -> 3
    // Do not translate header vertically during collapse; keep position stable
    const translateY = 0;
    return {
      paddingVertical,
      transform: [{ translateY }],
    };
  });

  // Logo and menu button animation
  const headerElementsStyle = useAnimatedStyle(() => {
    const p = globalCollapseProgress.value;
    const scale = 1 - 0.32 * p; // stronger shrink
    // Start 20% lower (relative to measured headerHeight) and move up as p -> 1
    const base = (headerHeight.value && headerHeight.value > 0) ? headerHeight.value : 62;
    const startOffset = base * 0.2; // 20% of header height
    const translateY = startOffset * (1 - p);
    return {
      transform: [{ scale }, { translateY }],
    };
  });

  // Animate logo container margin so the gap between logo and title
  // shrinks as the header collapses (prevents large empty space when both scale)
  const logoContainerAnimatedStyle = useAnimatedStyle(() => {
    const p = globalCollapseProgress.value;
    // Reduce the right margin from 16 -> ~6 as p goes 0 -> 1
    const marginRight = 16 * (1 - 0.65 * p);
    return {
      marginRight,
    };
  });

  // Title animation - separate and more conservative
  const titleAnimatedStyle = useAnimatedStyle(() => {
    const p = globalCollapseProgress.value;
    const scale = 1 - 0.32 * p; // stronger shrink for title
    // Keep title vertically in-place while scaling
    const base = (headerHeight.value && headerHeight.value > 0) ? headerHeight.value : 62;
    const startOffset = base * 0.2; // 20% of header height
    const translateY = startOffset * (1 - p);
    // Move title to the left to close the gap, but less extremely than before.
    // Apply translateX before scale so the translation uses unscaled units.
    const translateX = -40 * p;
    return {
      transform: [{ translateX }, { scale }, { translateY }],
    };
  });

  // Menu button opacity animation (fades out like mood statement)
  const menuButtonStyle = useAnimatedStyle(() => {
    const p = globalCollapseProgress.value;
    // Immediate fade out - disappears as soon as scroll starts
    const opacity = p > 0.15 ? 0 : 1; // If scroll progress > 15%, completely invisible
    const base = (headerHeight.value && headerHeight.value > 0) ? headerHeight.value : 62;
    const startOffset = base * 0.2;
    const translateY = startOffset * (1 - p);
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // Combined logo and title animation for better spacing
  const logoTitleContainerStyle = useAnimatedStyle(() => {
    const p = globalCollapseProgress.value;
    // Move the combined logo+title container slightly left as collapse progresses
    // to gently nudge the pair together. Keep this smaller so the title
    // translation remains the dominant adjustment.
    const base = (headerHeight.value && headerHeight.value > 0) ? headerHeight.value : 62;
    const startOffset = base * 0.2;
    const translateX = -12 * p;
    const translateY = startOffset * (1 - p);
    return {
      transform: [{ translateX }, { translateY }],
    };
  });

  // Simplified MoodStatement animation
  const moodStatementAnimatedStyle = useAnimatedStyle(() => {
    const p = globalCollapseProgress.value;
    // Make MoodStatement fade and collapse faster than the header so it
    // disappears earlier during scroll. Scale factors tuned to be snappy.
    const fadeFactor = Math.min(1, p * 1.6); // fades out by ~p=0.625
    const heightFactor = Math.min(1, p * 1.25); // height collapses slightly faster
    const height = moodHeight.value * (1 - heightFactor);
    const opacity = 1 - fadeFactor;
    return {
      height,
      opacity,
      overflow: 'hidden',
    };
  });

  // StatusTabs will be rendered inside the header (see MainHeader.statusTabs)

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
          logoContainerStyle={logoContainerAnimatedStyle}
          menuButtonStyle={menuButtonStyle}
          onMenuPress={() => setMainMenuVisible(true)}
          globalCollapseProgress={globalCollapseProgress}
          globalScrollY={globalScrollY}
          statusTabsOffset={statusTabsOffset}
          statusTabsHeight={statusTabsHeight}
          statusTabs={<StatusTabs insideHeader={true} activeIndex={activeIndex} onTabPress={handleTabPress} />}
          headerShouldHandle={headerShouldHandle}
          headerFullyCollapsed={headerFullyCollapsed}
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

        {/* StatusTabs are rendered inside the header now — pass as prop */}

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
    paddingTop: 20
  },
});

export default MainScreen;
            // pass the central header eligibility flag so header pan can opt-in
