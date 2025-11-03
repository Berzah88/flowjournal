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
import { Helpers } from '../components/Styles';

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

  // Previously we exposed JS-side scroller registration so the header
  // could trigger a scroll-to-top when it expanded. That behavior was
  // removed to keep header/scroll interactions purely user-driven.

  // Expose snap configuration so the parent screen can tune snapping behavior
  // without editing the hook. These can be changed later (e.g. via debug UI)
  // to test different thresholds and durations. Defaults tuned for higher
  // sensitivity: less scroll required and snappier timing.
  const [snapThreshold, setSnapThreshold] = useState(0.05);
  // Use a slightly longer duration for smoother snap animations
  const [snapDuration, setSnapDuration] = useState(160);

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
    // Consider header handling a bit earlier to make the handoff to the
    // header more sensitive during quick gestures. Slightly higher value
    // makes the header take control a bit sooner.
    return g.value < 0.94;
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

  // Keep minimal JS mirrors for gating actions (avoid flooding JS thread)
  const [collapseProgressJS, setCollapseProgressJS] = useState(0);
  // NOTE: other layout mirrors (statusTabs/header/mood measurements) were
  // intentionally removed to reduce JS-thread traffic. If you need them for
  // debugging, re-introduce with a high-change threshold to avoid flooding.

  // forceParentHandle removed because child scrolls are disabled

  // Mirror numeric collapse progress for JS
  useAnimatedReaction(
    () => globalCollapseProgress.value,
    (val, prev) => {
      try {
        // Only mirror to JS when the progress changes sufficiently to
        // avoid flooding the JS thread on every frame. This reduces
        // jank during quick reverse scrolls.
        if (prev === undefined || Math.abs(val - prev) > 0.02) {
          runOnJS(setCollapseProgressJS)(val);
        }
      } catch (e) {}
    }
  );

  // Mirror headerShouldHandle (worklet) to JS so non-worklet components can read it
  useAnimatedReaction(
    () => headerShouldHandle.value,
    (val, prev) => { try { if (prev === undefined || val !== prev) runOnJS(setHeaderShouldHandleJS)(!!val); } catch (e) {} }
  );

  // Mirror fully-collapsed boolean to JS for gating child scrollEnabled
  useAnimatedReaction(
    () => (globalCollapseProgress.value >= 0.94),
    (val, prev) => { try { if (prev === undefined || val !== prev) runOnJS(setHeaderFullyCollapsed)(!!val); } catch (e) {} }
  );

  // Mirror statusTabsOffset for JS
  // Layout mirrors removed here to reduce JS thread work. Keep collapse
  // progress mirror (above) and header gating mirror (below).

  useAnimatedReaction(
    () => ({ p: globalCollapseProgress.value, ai: activeIndexShared ? activeIndexShared.value : 0 }),
    (val, prev) => { /* snapping/auto-expand behavior disabled */ }
  );

  // One-time diagnostic log when measurements are available
  // Note: layout measurement logging removed to avoid depending on JS-thread
  // mirrors. If you need to log measurements, either run a one-time
  // runOnJS from a worklet or use a larger mirror-threshold.

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
    // Disable automatic snapping/auto expand-collapse; keep header strictly
    // synced to scroll. This prevents the header from deciding to snap on
    // end-of-drag and avoids automatic expand/collapse side-effects.
    snapEnabled: false,
  });

  // forward handlers and keep local refs for any other use
  const myDayContentScrollHandler = _myDayHandler;
  const activeContentScrollHandler = _activeHandler;

  // Smooth the raw collapse progress slightly for cosmetic animations
  // (logo/title/menu). This prevents tiny frame-to-frame jumps from
  // producing visually choppy scale/translate changes while keeping
  // the header still tightly coupled to scroll.
  const smoothedCollapse = useDerivedValue(() => {
    // gentle timing for smoothing; tuned to be responsive but soft
    return withTiming(globalCollapseProgress.value, { duration: 260, easing: Easing.out(Easing.cubic) });
  });

  // Worklet-side flag to allow tab switching (used by MainTabNavigation's
  // gesture worklets). This avoids JS roundtrips: swipe is fully disabled
  // until smoothedCollapse passes the visibility threshold.
  const tabSwitchAllowedShared = useDerivedValue(() => {
    // status tabs become visible as collapse -> 1, use 0.9 as threshold
    return smoothedCollapse.value >= 0.9 ? 1 : 0;
  });

  // Simplified header animation - single style with reduced calculations
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const p = smoothedCollapse.value;
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
    const p = smoothedCollapse.value;
    // Slightly reduce the overall scale factor to keep the logo readable
    // when collapsed while making the interpolation softer.
    const scale = 1 - 0.28 * p; // tuned for smoother visual
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
    const p = smoothedCollapse.value;
    // Reduce the right margin from 16 -> ~6 as p goes 0 -> 1
    const marginRight = 16 * (1 - 0.65 * p);
    return {
      marginRight,
    };
  });

  // Title animation - separate and more conservative
  const titleAnimatedStyle = useAnimatedStyle(() => {
    const p = smoothedCollapse.value;
    const scale = 1 - 0.28 * p; // match logo smoothing for visual coherence
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
    const p = smoothedCollapse.value;
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
    const p = smoothedCollapse.value;
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
    // Drive mood statement visibility directly from the same collapse
    // progress used by the header so the motion is synchronized with
    // the logo/title and status tabs. Use a direct mapping so there is
    // no perceptual skew between components.
    const p = smoothedCollapse.value;
    const eff = p; // direct sync (0 = expanded, 1 = collapsed)
    const height = moodHeight.value * (1 - eff);
    const opacity = 1 - eff;
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
    // Prevent tab switching until the status tabs are visible. Use the
    // JS-mirrored `headerFullyCollapsed` boolean which indicates the
    // header is collapsed enough for the status tabs to be interactable.
    if (!headerFullyCollapsed) return;
    if (index === activeIndex) return;
    setActiveIndex(index);
  }, [activeIndex, headerFullyCollapsed]);


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
        style={[styles.container, Helpers.container]}
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
          smoothedCollapse={smoothedCollapse}
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
          tabSwitchAllowed={headerFullyCollapsed}
          tabSwitchAllowedShared={tabSwitchAllowedShared}
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
    paddingTop: 20
  },
});

export default MainScreen;
            // pass the central header eligibility flag so header pan can opt-in
