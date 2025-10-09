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
  Alert,
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
import { usePerformanceOptimization } from "../utils/PerformanceOptimizer";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { SWIPE_THRESHOLDS, ANIMATION_DURATIONS } from "../constants";
import AsyncStorage from '@react-native-async-storage/async-storage';
import StatusTabs from "../components/StatusTabs";
import StatusBarComponent from "../components/StatusBar";
import Card from "../components/Card";
import AddProjectScreen from "./AddProjectScreen";
import ActiveProject from "./ActiveProject";
import Journal from "./Journal";
import LoadingSpinner from "../components/LoadingSpinner";
import DataRecoveryMenu from "../components/DataRecoveryMenu";
import NotificationMenu from "../components/NotificationMenu";
import MyDayScreen from "./MyDayScreen";
import AddMilestoneModal from "../components/AddMilestoneModal";
import ThemeToggle from "../components/ThemeToggle";
import MoodStatement from "../components/MoodStatement";
import Motive from "../components/Motive";
import ProjectAnalyzer from "../utils/ProjectAnalyzer";
import LanguageSettings from "../components/LanguageSettings";
import notificationService from "../services/NotificationService";
import fcmService from "../services/FCMService";

const { width, height } = Dimensions.get("window");

const MainScreen = memo(function MainScreen({ navigation }) {
  const activeTasks = useActiveTasks();
  const completedTasks = useCompletedTasks();
  const isSaving = useTaskSaving();
  const { clearStorage, addMilestone } = useTaskActions();
  const { recoverData, createManualBackup, getDataStatus } = useDataRecovery();
  const { handleDataRecovery, handleCreateBackup, handleCheckDataStatus } = useDataRecoveryOperations();
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  // Performance monitoring (only in development) - temporarily disabled
  // Performance monitoring - daha az agresif
  const performanceData = usePerformanceMonitor('MainScreen', {
    trackFPS: false, // FPS tracking'i kapat
    warnThreshold: 100, // 100ms'den az render frequency için uyar
    criticalThreshold: 50 // 50ms'den az için kritik uyarı
  });
  
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
  const [forceUpdate, setForceUpdate] = useState(0);
  const [dailyAnalysisVisible, setDailyAnalysisVisible] = useState(false);
  const [dailyAnalysis, setDailyAnalysis] = useState(null);
  
  // Menu animation values
  const menuScale = useSharedValue(0);
  const menuOpacity = useSharedValue(0);
  const menuTranslateY = useSharedValue(-20);
  
  // MyDay screen states
  const [myDaySelectedCard, setMyDaySelectedCard] = useState(null);
  const [myDaySelectedMilestone, setMyDaySelectedMilestone] = useState(null);
  const [myDayAddMilestoneModalVisible, setMyDayAddMilestoneModalVisible] = useState(false);
  const [myDaySelectedProjectForMilestone, setMyDaySelectedProjectForMilestone] = useState(null);
  const [welcomePopupVisible, setWelcomePopupVisible] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState(null);

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
  
  // Notification menu handlers
  const openNotificationMenu = useCallback(() => setNotificationMenuVisible(true), []);
  const closeNotificationMenu = useCallback(() => setNotificationMenuVisible(false), []);
  
  // Language settings handlers
  const openLanguageSettings = useCallback(() => setLanguageSettingsVisible(true), []);
  const closeLanguageSettings = useCallback(() => setLanguageSettingsVisible(false), []);


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
        // Remove all listeners to prevent memory leaks
        if (panX.removeAllListeners) {
          panX.removeAllListeners();
        }
        // Reset animation values
        panX.setValue(0);
        try {
          panX.flattenOffset();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, [panX]);

  // Advanced AI-powered feedback system using ProjectAnalyzer
  const getAIFeedback = useCallback(async () => {
    try {
      const analysis = await ProjectAnalyzer.analyzeProjects(activeTasks || [], completedTasks || []);
      
      if (!analysis.shouldShow) {
        // AI feedback not shown
        return {
          type: 'no_feedback',
          title: '',
          message: '',
          icon: '',
          color: '',
          priority: 'none',
          shouldShow: false,
          reason: analysis.reason
        };
      }
      
      // AI feedback should be shown
      return analysis.feedback;
    } catch (error) {
      console.error('Error getting AI feedback:', error);
      return {
        type: 'error',
        title: 'Analysis Error',
        message: 'Unable to analyze your progress right now.',
        icon: 'warning',
        color: '#FF3B30',
        priority: 'none',
        shouldShow: false
      };
    }
  }, [activeTasks.length, completedTasks.length]);

  // Load AI feedback and check if should be shown - only once per session
  const [aiFeedbackLoaded, setAiFeedbackLoaded] = useState(false);
  
  useEffect(() => {
    if (aiFeedbackLoaded) return; // Prevent multiple calls
    
    const loadAIFeedback = async () => {
      try {
        const feedback = await getAIFeedback();
        
        // Only proceed if feedback should be shown
        if (!feedback.shouldShow) {
          setAiFeedbackLoaded(true);
          return;
        }
        
        
        const lastFeedbackDate = await AsyncStorage.getItem('lastAIFeedbackDate');
        const lastSessionTime = await AsyncStorage.getItem('lastSessionTime');
        const today = new Date().toDateString();
        const now = Date.now();
        
        // Calculate session time (if user has been active for more than 2 minutes)
        const sessionTime = lastSessionTime ? now - parseInt(lastSessionTime) : 0;
        const hasBeenActive = sessionTime > 120000; // 2 minutes
        
        
        // Show popup if:
        // 1. Never seen before, OR
        // 2. Last seen was more than 1 day ago, OR
        // 3. High priority feedback (celebration, motivation, emotional support), OR
        // 4. User has been active for more than 2 minutes and medium priority
        const shouldShow = !lastFeedbackDate || 
                          lastFeedbackDate !== today ||
                          feedback.priority === 'high' ||
                          (hasBeenActive && feedback.priority === 'medium');
        
        if (shouldShow) {
          // Ensure feedback has required properties
          const safeFeedback = {
            type: feedback.type || 'welcome',
            title: feedback.title || 'AI Feedback',
            message: feedback.message || 'No message available',
            color: feedback.color || '#667eea',
            priority: feedback.priority || 'medium'
          };
          
          setCurrentFeedback(safeFeedback);
          
          // Show with 1 second delay
          setTimeout(() => {
            setWelcomePopupVisible(true);
          }, 1000);
        }
        
        // Update session time
        await AsyncStorage.setItem('lastSessionTime', now.toString());
      } catch (error) {
        console.error('Error loading AI feedback:', error);
      } finally {
        setAiFeedbackLoaded(true);
      }
    };

    // Only run if we have tasks to analyze
    if (activeTasks.length > 0 || completedTasks.length > 0) {
      loadAIFeedback();
    }
  }, [activeTasks.length, completedTasks.length, aiFeedbackLoaded]);

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

  // Daily analysis effect - runs when component mounts or tasks change
  useEffect(() => {
    const checkDailyAnalysis = async () => {
      try {
        // Use static method - production ready
        const analysis = await ProjectAnalyzer.getDailyAnalysis(activeTasks, completedTasks, false);
        
        if (analysis.shouldShow && analysis.feedback) {
          setDailyAnalysis(analysis.feedback);
          setDailyAnalysisVisible(true);
        }
      } catch (error) {
        console.error('Daily analysis error:', error);
      }
    };

    // Check daily analysis when component mounts or when tasks change
    if (activeTasks && activeTasks.length > 0) {
      checkDailyAnalysis();
    }
  }, [activeTasks, completedTasks, refreshKey]);


  // Daily analysis close handler
  const handleDailyAnalysisClose = useCallback(() => {
    setDailyAnalysisVisible(false);
    setDailyAnalysis(null);
  }, []);

  // AI feedback close handler
  const handleAIFeedbackClose = useCallback(async () => {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem('lastAIFeedbackDate', today);
      setWelcomePopupVisible(false);
    } catch (error) {
      console.error('Error saving AI feedback state:', error);
      setWelcomePopupVisible(false);
    }
  }, []);

  // Force AI feedback reload (for testing)
  const forceReloadAIFeedback = useCallback(() => {
    setAiFeedbackLoaded(false);
  }, []);

  // Global fonksiyonu override et
  useEffect(() => {
    global.forceReloadAIFeedback = forceReloadAIFeedback;
    return () => {
      global.forceReloadAIFeedback = () => {};
    };
  }, [forceReloadAIFeedback]);

  // Memoized render functions for FlatList
  const renderActiveItem = useCallback(({ item }) => (
    <Card
      title={item.title}
      startDate={item.startDate}
      endDate={item.endDate}
      completed={item.done}
      activeMilestones={item.milestones?.filter((m) => !m.completed) ?? []}
      onMilestonePress={() => {
        // Project-based journal system - open journal for the entire project
        const projectData = {
          id: 'project-journal',
          title: t('projectJournal'),
          taskId: item.id,
          projectTitle: item.title,
          isProjectBased: true
        };
        setMyDaySelectedMilestone(projectData);
      }}
      onPress={() => openCard(item)}
      style={{ marginBottom: 15 }}
      task={item}
    />
  ), [openCard]);

  const renderCompletedItem = useCallback(({ item }) => (
    <Card
      title={item.title}
      startDate={item.startDate}
      endDate={item.endDate}
      completed={item.done}
      activeMilestones={item.milestones ?? []} // Show all milestones (both completed and active)
      onMilestonePress={null} // Completed cards don't allow milestone taps
      onPress={() => openCard(item)}
      style={{ marginBottom: 15 }}
      task={item}
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
  }, [activeTasks.length, activeTasks.map(t => `${t.id}-${t.title}-${t.done}-${t.milestones?.length || 0}-${t.journalEntries?.length || 0}-${t.journalEntries?.map(e => `${e.id}-${e.mood}-${e.moodIcon}-${e.moodColor}`).join(',') || ''}`).join(',')]);
  
  const completedTasksReversed = useMemo(() => {
    return [...completedTasks].reverse();
  }, [completedTasks.length, completedTasks.map(t => `${t.id}-${t.title}-${t.done}-${t.milestones?.length || 0}-${t.journalEntries?.length || 0}-${t.journalEntries?.map(e => `${e.id}-${e.mood}-${e.moodIcon}-${e.moodColor}`).join(',') || ''}`).join(',')]);

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
        
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.logoContainer}>
                <Image 
                  source={theme.name === 'dark' 
                    ? require('../assets/logo-yeni.png') 
                    : require('../assets/logo-yeni.png')
                  } 
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={[styles.header, { color: theme.colors.text }]}>Flow Journal</Text>
              </View>
            </View>
            <View style={styles.headerActions}>

              <TouchableOpacity 
                style={[
                  styles.menuButton,
                  {
                    backgroundColor: theme.name === 'dark' ? '#FF6B6B' : 'rgba(255, 255, 255, 0.8)',
                    borderColor: theme.name === 'dark' ? '#FF6B6B' : 'rgba(102, 126, 234, 0.15)',
                    shadowColor: theme.name === 'dark' ? '#FF6B6B' : '#667eea',
                  }
                ]} 
                onPress={() => setMainMenuVisible(true)}
                accessible={true}
                accessibilityLabel="Menu options"
                accessibilityRole="button"
              >
                <Ionicons 
                  name="menu" 
                  size={20} 
                  color={theme.name === 'dark' ? '#FFFFFF' : theme.colors.primary} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>


      {/* Mood Statement - StatusTabs üstünde */}
      <MoodStatement 
        activeTasks={activeTasks} 
        selectedDate={new Date()}
        onPress={() => navigation.navigate('EmotionalJournal')}
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
            {/* Scrollable Content */}
            <ScrollView 
              style={styles.myDayScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.myDayScrollContent}
            >
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
                setSelectedDate={setSelectedDate}
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
              extraData={`${refreshKey}-${activeTasks.map(t => 
                `${t.id}-${t.milestones?.map(m => `${m.id}:${m.parentId || 'none'}`).join(',')}`
              ).join('|')}`}
              ListEmptyComponent={
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateIcon}>📋</Text>
                  <Text style={styles.emptyStateTitle}>{t('noActiveProjects')}</Text>
                  <Text style={styles.emptyStateSubtitle}>{t('startYourJourney')}</Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
              {...flatListProps}
            />
          </View>
        </Animated.View>
      </View>


      {/* Main Menu - ActiveTaskMenu Style */}
      {mainMenuVisible && (
        <TouchableWithoutFeedback onPress={() => setMainMenuVisible(false)}>
          <View style={styles.menuOverlay}>
            <AnimatedReanimated.View style={[
              styles.menuContainer, 
              { 
                backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
                borderColor: theme.name === 'dark' ? '#000000' : 'rgba(255, 255, 255, 0.2)',
                shadowColor: theme.name === 'dark' ? '#000000' : '#000',
                shadowOpacity: theme.name === 'dark' ? 0.3 : 0.15,
                shadowRadius: theme.name === 'dark' ? 12 : 16,
                elevation: theme.name === 'dark' ? 8 : 12,
              },
              menuAnimatedStyle
            ]}>

              {/* Tutorial - Test Button */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMainMenuVisible(false);
                  navigation.navigate('Tutorial');
                }}
                accessible={true}
                accessibilityLabel="View tutorial"
                accessibilityRole="button"
              >
                <View style={styles.menuItemContent}>
                  <Ionicons name="help-circle-outline" size={20} color="#8B5CF6" />
                  <Text style={[styles.menuItemText, { color: theme.colors.text }]}>Tutorial</Text>
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
                  <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.success} />
                  <Text style={[styles.menuItemText, { color: theme.colors.text }]}>{t('completedProjects')}</Text>
                </View>
              </TouchableOpacity>

              {/* Mood Tracker */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMainMenuVisible(false);
                  navigation.navigate('EmotionalJournal');
                }}
                accessible={true}
                accessibilityLabel="Open emotional journal"
                accessibilityRole="button"
              >
                <View style={styles.menuItemContent}>
                  <Ionicons name="heart-outline" size={20} color="#FF6B6B" />
                  <Text style={[styles.menuItemText, { color: theme.colors.text }]}>{t('journal')}</Text>
                </View>
              </TouchableOpacity>

              {/* Theme Toggle */}
              <ThemeToggle />



              {/* Notifications */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMainMenuVisible(false);
                  setNotificationMenuVisible(true);
                }}
                accessible={true}
                accessibilityLabel="Notification settings"
                accessibilityRole="button"
              >
                <View style={styles.menuItemContent}>
                  <Ionicons name="notifications-outline" size={20} color={theme.colors.secondary} />
                  <Text style={[styles.menuItemText, { color: theme.colors.text }]}>Bildirimler</Text>
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
                  <Ionicons name="settings-outline" size={20} color={theme.colors.secondary} />
                  <Text style={[styles.menuItemText, { color: theme.colors.text }]}>{t('settings')}</Text>
                </View>
              </TouchableOpacity>


            </AnimatedReanimated.View>
          </View>
        </TouchableWithoutFeedback>
      )}



      <AddProjectScreen visible={addVisible} onClose={() => setAddVisible(false)} />

      {selectedCard && <ActiveProject 
        selectedCard={selectedCard} 
        onClose={() => {
          closeCard();
          setRefreshKey(prev => prev + 1); // Force refresh after attach/detach operations
        }} 
        navigation={navigation} 
      />}
      
      {/* MyDay modals */}
      {myDaySelectedCard && <ActiveProject 
        selectedCard={myDaySelectedCard} 
        onClose={() => {
          setMyDaySelectedCard(null);
          setRefreshKey(prev => prev + 1); // Force refresh after attach/detach operations
        }} 
        navigation={navigation} 
      />}
      
      {myDaySelectedMilestone && <Journal 
        visible={!!myDaySelectedMilestone} 
        milestone={myDaySelectedMilestone}
        existingEntry={myDaySelectedMilestone?.editEntry || null}
        onClose={() => setMyDaySelectedMilestone(null)}
        onSave={() => {
          // Refresh trigger when journal is saved
          setRefreshKey(prev => prev + 1);
          setForceUpdate(prev => prev + 1);
        }}
        fromMainScreen={true}
        // Project-based journal support
        currentTask={activeTasks.find(t => t.id === myDaySelectedMilestone?.taskId)}
        isProjectBased={myDaySelectedMilestone?.isProjectBased || false}
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
        existingMilestones={myDaySelectedProjectForMilestone?.milestones || []}
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
        onLanguageSettings={openLanguageSettings}
      />

      {/* Notification Menu */}
      <NotificationMenu
        visible={notificationMenuVisible}
        onClose={closeNotificationMenu}
      />

      {/* Language Settings Modal */}
      <LanguageSettings
        visible={languageSettingsVisible}
        onClose={closeLanguageSettings}
        onLanguageChange={(languageCode) => {
          // Language change is handled by LanguageContext
        }}
      />


      {/* Daily Analysis */}
      {dailyAnalysisVisible && dailyAnalysis && (
        <Motive
          visible={dailyAnalysisVisible}
          onClose={handleDailyAnalysisClose}
          type="daily_analysis"
          title={dailyAnalysis.title}
          message={dailyAnalysis.message}
          color={dailyAnalysis.color}
        />
      )}

      {/* AI Feedback */}
      {welcomePopupVisible && (
        <Motive
          visible={welcomePopupVisible}
          onClose={handleAIFeedbackClose}
          type={currentFeedback?.type || 'welcome'}
          title={currentFeedback?.title || 'AI Feedback'}
          message={currentFeedback?.message || 'No message available'}
          color={currentFeedback?.color || '#667eea'}
        />
      )}
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
    paddingTop: 40 // 30'dan 40'a çıkardım - header'ı biraz aşağıya aldım
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12, // 20'den 12'ye düşürdüm - header'ı daha kompakt yaptım
    marginBottom: 8, // 4'ten 8'e çıkardım - MoodStatement ile arasındaki boşluğu artırdım
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15, // 10'dan 15'e çıkardım - header'ı biraz aşağıya aldım
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
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
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
    top: 60,
    right: 18,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 200,
    shadowOffset: { width: 0, height: 8 },
    backdropFilter: "blur(20px)",
    borderWidth: 1,
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
  // My Day ScrollView Styles
  myDayScrollView: {
    flex: 1,
  },
  myDayScrollContent: {
    paddingBottom: 40,
  },
  // Debug Panel Styles
  debugPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 1000,
  },
  closeDebugPanel: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  testButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  testButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MainScreen;