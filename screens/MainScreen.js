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
  useAnimatedScrollHandler,
  Easing,
} from "react-native-reanimated";
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
  
  
  // MyDay screen states
  const [myDaySelectedCard, setMyDaySelectedCard] = useState(null);
  const [myDaySelectedMilestone, setMyDaySelectedMilestone] = useState(null);
  const [myDayAddMilestoneModalVisible, setMyDayAddMilestoneModalVisible] = useState(false);
  const [myDaySelectedProjectForMilestone, setMyDaySelectedProjectForMilestone] = useState(null);

  // Optimized scroll values - reduced complexity
  const scrollY = useSharedValue(0);
  const moodHeight = useSharedValue(120); // Default height, measured later
  const statusTabsOffset = useSharedValue(0); // StatusTabs'ın header'dan uzaklığı
  const collapseProgress = useSharedValue(0);

  // Optimized scroll handler - reduced calculations
  const onScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset?.y ?? 0;
      const thr = statusTabsOffset.value; // StatusTabs offset'i kullan
      const clamped = Math.max(0, Math.min(y, thr));
      scrollY.value = clamped;
      
      // Direct progress calculation - no separate reaction needed
      const progress = thr > 0 ? clamped / thr : 0;
      collapseProgress.value = withTiming(progress, {
        duration: 150, // Biraz daha yumuşak geçiş
        easing: Easing.out(Easing.cubic),
      });
    },
  });

  // Simplified header animation - single style with reduced calculations
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const p = collapseProgress.value;
    const marginBottom = 8 * (1 - p);
    return { 
      marginBottom,
    };
  });

  // Logo and menu button animation
  const headerElementsStyle = useAnimatedStyle(() => {
    const p = collapseProgress.value;
    const scale = 1 - 0.25 * p;
    const translateY = -2 * p;
    return { 
      transform: [{ scale }, { translateY }],
    };
  });

  // Title animation - separate and more conservative
  const titleAnimatedStyle = useAnimatedStyle(() => {
    const p = collapseProgress.value;
    const scale = 1 - 0.12 * p;
    const translateY = -1.5 * p;
    return { 
      transform: [{ scale }, { translateY }],
    };
  });

  // Simplified MoodStatement animation
  const moodStatementAnimatedStyle = useAnimatedStyle(() => {
    const p = collapseProgress.value;
    const height = moodHeight.value * (1 - p);
    const opacity = 1 - p;
    return {
      height,
      opacity,
      overflow: 'hidden',
    };
  });

  // Simplified StatusTabs - static positioning
  const statusTabsAnimatedStyle = useAnimatedStyle(() => ({
    zIndex: 10,
    position: 'relative',
  }));

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
  const myDayScrollRef = useRef(null);
  const activeListScrollRef = useRef(null);

  // Memoized tab press handler (preserve scroll positions and header state)
  const handleTabPress = useCallback((index) => {
    if (index === activeIndex) return;
    setActiveIndex(index);
  }, [activeIndex]);


  // Celebration için global trigger sistemi
  useEffect(() => {
    global.triggerCelebration = (completion) => {
      if (!celebrationDataRef.current || celebrationDataRef.current.completedAt !== completion.completedAt) {
        celebrationDataRef.current = completion;
        setCelebrationData(completion);
        setCelebrationVisible(true);
      }
    };
    
    return () => {
      global.triggerCelebration = null;
    };
  }, []);


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
          onMenuPress={() => setMainMenuVisible(true)}
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

        {/* Status Tabs - Konumunu ölç */}
        <AnimatedReanimated.View 
          style={statusTabsAnimatedStyle}
          onLayout={(e) => {
            const y = e.nativeEvent.layout.y;
            // StatusTabs'ın header'dan uzaklığını kaydet
            if (y && statusTabsOffset.value === 0) {
              statusTabsOffset.value = y;
            }
          }}
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
          collapseProgress={collapseProgress}
          myDayScrollRef={myDayScrollRef}
          activeListScrollRef={activeListScrollRef}
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


