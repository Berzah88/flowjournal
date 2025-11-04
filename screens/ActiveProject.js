import React, { useState, useContext, useEffect, useCallback, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, BackHandler, Animated, PanResponder, Vibration, Easing, InteractionManager } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import logger from '../utils/logger';
import { Helpers, Typography } from '../constants';
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { useTasks, useTaskActions } from "../hooks/useTaskContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
// Education removed from ActiveProject
import EditModal from "../components/EditModal";
import ActiveTaskMenu from "../components/ActiveTaskMenu";
import Journal from "./Journal";
import AddTaskModal from "../components/AddTaskModal";
import ActiveProjectHeader from "../components/ActiveProjectHeader";
import ActiveProjectTasks from "../components/ActiveProjectTasks";
import ProjectJourney from "../components/ProjectJourney";
import AITaskSuggestion from "../components/AITaskSuggestion";
// Education removed from ActiveProject
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing as ReanimatedEasing,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

const { width, height } = Dimensions.get("window");


export default function ActiveProject({ selectedCard, onClose, setMainActiveTab, navigation }) {
  const tasks = useTasks();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const {
    deleteTask,
    completeTask,
    addMilestone,
    updateMilestone,
    completeMilestone,
    setActiveMilestone,
    deleteMilestone,
    updateTask,
    attachMilestone,
    detachMilestone,
  } = useTaskActions();
  // Education: Removed - no education in ActiveProject

  const [menuVisible, setMenuVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [selectedJournalMilestone, setSelectedJournalMilestone] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0 = milestones, 1 = journey
  const [addMilestoneModalVisible, setAddMilestoneModalVisible] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // For refresh after journal entry
  // forceUpdate kaldırıldı - refreshKey yeterli
  
  // AI Milestone Suggestion states
  const [aiSuggestionVisible, setAiSuggestionVisible] = useState(false);
  const [hasAnalyzedJournals, setHasAnalyzedJournals] = useState(false);
  
  // Performance: Delay heavy computations until animation completes
  const [isReady, setIsReady] = useState(false);

  // Horizontal tab switching animations (like MainScreen)
  const panX = useRef(new Animated.Value(0)).current;
  const offsetRef = useRef(0);
  // Header collapse animated value (0..1) driven by inner scroll
  const headerCollapse = useRef(new Animated.Value(0)).current;
  
  // Use ref for isModalOpen to avoid closure issues in PanResponder
  const isModalOpenRef = useRef(false);

  // Reset editing milestone when modal closes
  useEffect(() => {
    if (!addMilestoneModalVisible) {
      setEditingMilestone(null);
    }
  }, [addMilestoneModalVisible]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      if (panX) {
        panX.stopAnimation();
      }
    };
  }, [panX]);

  // Education: Removed - no education in ActiveProject

  // Refresh data when screen comes into focus (e.g., returning from JournalDetailScreen)
  useFocusEffect(
    useCallback(() => {
      // Increment refreshKey to trigger re-render of JournalCards with updated data
      setRefreshKey(prev => prev + 1);
    }, [])
  );

  // Memoized animate to tab index (0 or 1)
  const animateToTab = useCallback((index) => {
    const target = -index * width;

    // ensure no leftover offset/animation
    panX.stopAnimation();
    try {
      panX.flattenOffset();
    } catch (e) {
      // some RN versions may throw if no offset - ignore
    }

    // Use a spring for a more natural, smooth feel
    Animated.spring(panX, {
      toValue: target,
      useNativeDriver: true,
      stiffness: 200,
      damping: 25,
      mass: 1,
      overshootClamping: true,
    }).start(() => {
      // commit final state-cleanly
      offsetRef.current = target;
      setActiveTab(index);
      panX.setValue(target);
      panX.setOffset(0);
    });
  }, [panX]);
  
  

  // Memoize current task for performance
  const currentTask = useMemo(() => 
    tasks.find((t) => t.id === selectedCard?.id) || selectedCard,
    [tasks, selectedCard?.id]
  );
  
  if (!currentTask) return null;

  const isCompleted = currentTask?.done;
  const isModalOpen = !!(editVisible || selectedMilestone || selectedJournalMilestone || addMilestoneModalVisible);
  
  // Update ref when modal state changes
  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);



  const translateY = useSharedValue(height);
  const scale = useSharedValue(0.96);
  const opacity = useSharedValue(0);
  const dragY = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const isModalOpenShared = useSharedValue(false);
  
  // Update shared value when modal state changes
  useEffect(() => {
    isModalOpenShared.value = isModalOpen;
  }, [isModalOpen, isModalOpenShared]);
  
  // Cleanup refs for memory leak prevention
  const animationCleanupRef = useRef([]);

  // PanResponder for horizontal tab switching
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        // only start when horizontal movement dominant and no modals open
        // Lower threshold for quick swipes (milestone swipes have delay)
        return !isModalOpenRef.current && Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
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
        const threshold = width * 0.25; // 25% of screen width - more responsive

        // If user flicked quickly, use velocity to decide
        const vx = gesture.vx || 0;
        if (Math.abs(vx) > 0.5) {
          // fast flick
          if (vx < 0 && currentOffset === 0) {
            animateToTab(1);
            return;
          }
          if (vx > 0 && currentOffset === -width) {
            animateToTab(0);
            return;
          }
        }

        // Otherwise use distance threshold
        if (gesture.dx <= -threshold && currentOffset === 0) {
          animateToTab(1);
        } else if (gesture.dx >= threshold && currentOffset === -width) {
          animateToTab(0);
        } else {
          // snap back to the current page
          animateToTab(currentOffset === 0 ? 0 : 1);
        }
      },
      onPanResponderTerminate: () => {
        // cancel -> snap back
        animateToTab(offsetRef.current === 0 ? 0 : 1);
      },
      onShouldBlockNativeResponder: () => false,
    })
  ).current;

  useEffect(() => {
    // ULTRA-OPTIMIZED: Use requestAnimationFrame for smoother start
    requestAnimationFrame(() => {
      // Fast, staggered animations for smoothness
      backdropOpacity.value = withTiming(1, {
        duration: 200,
        easing: ReanimatedEasing.out(ReanimatedEasing.ease)
      });
      
      opacity.value = withTiming(1, { 
        duration: 150, // Fastest - immediate visibility
        easing: ReanimatedEasing.out(ReanimatedEasing.ease)
      });
      
      translateY.value = withTiming(0, { 
        duration: 320, // Smooth slide
        easing: ReanimatedEasing.bezier(0.25, 0.1, 0.25, 1)
      });
      
      scale.value = withTiming(1, { 
        duration: 320,
        easing: ReanimatedEasing.bezier(0.25, 0.1, 0.25, 1)
      });
    });
    
    // PERFORMANCE: Delay heavy computations until animation completes
    // Animation duration is 320ms, add small buffer for smooth transition
    const handle = InteractionManager.runAfterInteractions(() => {
      // Add small delay to ensure backdrop animation completes smoothly
      setTimeout(() => {
        setIsReady(true);
      }, 50); // Minimal delay just to ensure paint completes
    });
    
    return () => handle.cancel();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (selectedJournalMilestone) {
        setSelectedJournalMilestone(null);
        return true;
      }
      if (selectedMilestone) {
        setSelectedMilestone(null);
        return true;
      }
      if (menuVisible) {
        setMenuVisible(false);
        return true;
      }
      if (editVisible) {
        setEditVisible(false);
        return true;
      }
      handleClose();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => sub.remove();
  }, [menuVisible, editVisible, selectedMilestone, selectedJournalMilestone]);

  // Cleanup animations on unmount - DEPENDENCY-FREE
  useEffect(() => {
    return () => {
      // Stop all running animations - shared values referansları sabit
      translateY.value = 0;
      scale.value = 1;
      opacity.value = 0;
      dragY.value = 0;
      
      // PanX cleanup - ref stable
      panX.stopAnimation();
      if (panX.removeAllListeners) {
        panX.removeAllListeners();
      }
      panX.setValue(0);
      try {
        panX.flattenOffset();
      } catch (e) {
        // Ignore errors during cleanup
      }
      
      // Clear any pending animation callbacks
      if (animationCleanupRef.current) {
        animationCleanupRef.current.forEach(cleanup => {
          if (typeof cleanup === 'function') {
            cleanup();
          }
        });
        animationCleanupRef.current = [];
      }
    };
  }, []); // Empty deps - sadece mount/unmount'ta çalış

  const handleClose = useCallback(() => {
    backdropOpacity.value = withTiming(0, {
      duration: 200,
      easing: ReanimatedEasing.in(ReanimatedEasing.ease)
    });
    translateY.value = withTiming(height, { 
      duration: 300,
      easing: ReanimatedEasing.bezier(0.4, 0, 0.6, 1)
    });
    opacity.value = withTiming(0, { 
      duration: 300,
      easing: ReanimatedEasing.bezier(0.4, 0, 0.6, 1)
    }, () => {
      if (onClose) runOnJS(onClose)();
    });
  }, [onClose, backdropOpacity, translateY, opacity]);

  const handleDelete = useCallback(() => {
    if (!currentTask?.id) return;
    deleteTask(currentTask.id);
    setMenuVisible(false);
    handleClose();
  }, [currentTask?.id, deleteTask, handleClose]);

  const handleToggleComplete = useCallback(() => {
    if (!currentTask?.id) return;
    
    if (isCompleted) {
      updateTask(currentTask.id, { done: false });
      setMainActiveTab && setMainActiveTab("active");
    } else {
      completeTask(currentTask.id);
      setMainActiveTab && setMainActiveTab("completed");
    }
    setMenuVisible(false);
    handleClose();
  }, [isCompleted, currentTask?.id, updateTask, completeTask, setMainActiveTab, handleClose]);

  const handleAddMilestone = useCallback(() => {
    setAddMilestoneModalVisible(true);
  }, []);

  // Pre-create dummy milestone for better performance
  const dummyMilestone = useMemo(() => ({
    id: 'project-journal',
    title: t('projectJournal'),
    taskId: currentTask?.id,
    projectTitle: currentTask?.title,
    isProjectBased: true
  }), [currentTask?.id, currentTask?.title, t]);

  const handleOpenJournal = useCallback((milestoneOrEntry) => {
    if (milestoneOrEntry) {
      // Check if it's a journal entry (has text, createdAt, etc.) or a milestone
      if (milestoneOrEntry.text || milestoneOrEntry.createdAt) {
        // It's a journal entry - editing existing entry
        setSelectedJournalMilestone(milestoneOrEntry);
      } else {
        // It's a milestone - create milestone data
        const milestoneData = {
          ...milestoneOrEntry,
          taskId: currentTask.id,
          projectTitle: currentTask.title,
        };
        setSelectedJournalMilestone(milestoneData);
      }
    } else {
      // Creating new journal entry - use pre-created dummy milestone
      setSelectedJournalMilestone(dummyMilestone);
    }
  }, [currentTask?.id, currentTask?.title, dummyMilestone]);

  // Inner scroll handler from child ScrollViews to drive header collapse
  const handleInnerScroll = useCallback((y) => {
    try {
      const max = 120; // collapse after 120px
      const clamped = Math.max(0, Math.min(y, max));
      Animated.timing(headerCollapse, {
        toValue: clamped / max,
        duration: 120,
        useNativeDriver: true,
      }).start();
    } catch (e) {
      // ignore
    }
  }, [headerCollapse]);

  const handleSaveMilestone = useCallback((milestoneData) => {
    if (!currentTask?.id) return;
    
    // Check if we're editing by looking at milestoneData.id - SAFE CHECK
    // Milestone ID can be either string (milestone_xxx) or number (legacy)
    if (milestoneData.id && (typeof milestoneData.id === 'string' || typeof milestoneData.id === 'number')) {
      // Edit existing milestone
      updateMilestone(currentTask.id, milestoneData.id, milestoneData);
    } else {
      // Add new milestone
      const newMilestoneId = `milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const milestoneWithId = { ...milestoneData, id: newMilestoneId };
      addMilestone(currentTask.id, milestoneWithId);

      // Education: Removed - no education tracking in milestones
    }
    
    // Refresh trigger for milestone updates
    setRefreshKey(prev => prev + 1);
    
    // Close modal and clear state
    setAddMilestoneModalVisible(false);
    setEditingMilestone(null);
  }, [currentTask?.id, addMilestone, updateMilestone]);

  const handleEdit = useCallback(() => {
    setMenuVisible(false);
    setEditVisible(true);
  }, []);

  const handleSaveEdit = useCallback(
    (updates) => {
      if (!updates || !currentTask?.id) return;
      updateTask(currentTask.id, updates);
      setEditVisible(false);
    },
    [currentTask?.id, updateTask]
  );

  // Memoize the EditModal close handler to prevent recreation
  const handleEditClose = useCallback(() => {
    setEditVisible(false);
  }, []);

  // Memoize the project prop for EditModal to prevent unnecessary re-renders
  const editModalProject = useMemo(() => {
    if (!editVisible) return null;
    // Return only necessary fields
    return {
      id: currentTask?.id,
      title: currentTask?.title,
      startDate: currentTask?.startDate,
      endDate: currentTask?.endDate
    };
  }, [editVisible, currentTask?.id, currentTask?.title, currentTask?.startDate, currentTask?.endDate]);




  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (!isModalOpenShared.value && e.translationY > 0 && e.y <= 120) {
        dragY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (isModalOpenShared.value) {
        dragY.value = withTiming(0, { duration: 150 });
        return;
      }
      if (e.translationY > 120 && e.y <= 120) {
        dragY.value = withTiming(height, { duration: 200 }, () => {
          runOnJS(handleClose)();
        });
      } else {
        dragY.value = withTiming(0, { duration: 150 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value + dragY.value },
      { scale: scale.value }
    ],
    opacity: opacity.value,
  }));



  // Tab switching with horizontal animation
  const handleTabSwitch = useCallback((newTab) => {
    if (newTab === activeTab) return;
    // set activeIndex immediately so header animates right away
    setActiveTab(newTab);
    // set offsetRef immediately so panResponderGrant later uses correct offset
    offsetRef.current = -newTab * width;
    animateToTab(newTab);
  }, [activeTab, animateToTab]);

  // Memoize milestone calculations for performance - OPTIMIZED
  const allMilestones = useMemo(() => 
    [...(currentTask?.milestones || [])].sort((a, b) => a.id - b.id),
    [currentTask?.milestones] // refreshKey kaldırıldı - currentTask.milestones değişimi yeterli
  );
  
  const completedMilestones = useMemo(() => {
    // Completed section: 
    // 1. Completed parent milestones (standalone)
    // 2. Children whose parent is completed
    return allMilestones.filter((m) => {
      // Standalone milestone that is completed
      if (!m.parentId && m.completed) return true;
      
      // Child milestone whose parent is completed
      if (m.parentId) {
        const parent = allMilestones.find(p => p.id === m.parentId);
        return parent?.completed || false;
      }
      
      return false;
    });
  }, [allMilestones]);
  
  const activeMilestones = useMemo(() => {
    // Active section:
    // 1. Active parent milestones (standalone)
    // 2. All children whose parent is active (even if child is completed - shown in grey)
    return allMilestones.filter((m) => {
      // Standalone milestone that is active
      if (!m.parentId && !m.completed) return true;
      
      // Child milestone whose parent is active
      if (m.parentId) {
        const parent = allMilestones.find(p => p.id === m.parentId);
        return parent && !parent.completed;
      }
      
      return false;
    });
  }, [allMilestones]);

  return (
    <AnimatedReanimated.View style={[
      styles.modernContainer,
      Helpers.container,
      {
        // Üst boşluk sabit kalıyor (kartlar efekti için)
        // Alt boşluk yok (bottom: 0 ile ekranın en altına kadar iniyor)
        bottom: 0,
        backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
      },
      isCompleted && {
        backgroundColor: theme.name === 'dark' ? '#1A1A1A' : '#1A1A1A',
      }, 
      activeTab === 1 && {
        backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
      },
      animatedStyle
    ]}>
      <View style={styles.contentWrapper}>
        {/* Modern Header */}
        <ActiveProjectHeader
          currentTask={currentTask}
          isCompleted={isCompleted}
          activeTab={activeTab}
          onTabSwitch={handleTabSwitch}
          onMenuPress={() => setMenuVisible((s) => !s)}
          isModalOpen={isModalOpen}
          panGesture={panGesture}
          headerCollapse={headerCollapse}
        />

        {/* Menu Button - Visible in both tabs */}
          {!isModalOpen && (
            <TouchableOpacity 
              onPress={async () => {
                try {
                  // Try Expo Haptics first - Medium for more noticeable feedback
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  logger.debug('Expo Haptic triggered (MEDIUM)');
                } catch (error) {
                  logger.error('Expo Haptic error:', error);
                  // Fallback to native Vibration
                  try {
                    Vibration.vibrate(50); // 50ms vibration - more noticeable
                    logger.debug('Native Vibration triggered (STRONGER)');
                  } catch (vibError) {
                    logger.error('Native Vibration error:', vibError);
                  }
                }
                setMenuVisible((s) => !s);
              }} 
              style={[
                styles.menuButton,
                {
                  backgroundColor: theme.name === 'dark' 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : 'rgba(0, 0, 0, 0.03)',
                  borderRadius: 18,
                  padding: 6,
                  borderWidth: 1,
                  borderColor: theme.name === 'dark' 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(0, 0, 0, 0.06)',
                }
              ]}
              activeOpacity={0.6}
            >
              <Ionicons 
                name="ellipsis-vertical" 
                size={18} 
                color={theme.name === 'dark' ? '#AEAEB2' : '#8E8E93'} 
              />
            </TouchableOpacity>
          )}

          <View style={{ flex: 1, minHeight: 400 }}>
            {/* Horizontal tab container */}
            <Animated.View
              {...panResponder.panHandlers}
              style={[
                styles.tabContainer,
                { width: width * 2, transform: [{ translateX: panX }] },
              ]}
            >
              {/* Milestones Tab (left) */}
              <View style={{ width, flex: 1 }}>
                {/* PERFORMANCE: Only render milestones after animation completes */}
                {isReady ? (
                  <ActiveProjectTasks
                    key={refreshKey} // Refresh trigger
                    currentTask={currentTask}
                    allMilestones={allMilestones}
                    activeMilestones={activeMilestones}
                    completedMilestones={completedMilestones}
                    onUpdateMilestone={updateMilestone}
                    onCompleteMilestone={completeMilestone}
                    onDeleteMilestone={deleteMilestone}
                    onSetActiveMilestone={setActiveMilestone}
                    onOpenMilestoneDetail={setSelectedMilestone}
                    onOpenJournalEditor={setSelectedJournalMilestone}
                    onEditToggle={(milestone) => {
                      setEditingMilestone(milestone);
                      setAddMilestoneModalVisible(true);
                    }}
                    onAddMilestone={handleAddMilestone}
                    onOpenJournal={handleOpenJournal}
                    onAttachMilestone={attachMilestone}
                    navigation={navigation}
                    refreshKey={refreshKey}
                    onInnerScroll={handleInnerScroll}
                  />
                ) : (
                  <LoadingPlaceholder theme={theme} />
                )}
              </View>

              {/* Journey Tab (right) */}
              <View style={{ width, flex: 1 }}>
                {/* PERFORMANCE: Only render journey after animation completes */}
                {isReady ? (
                  <ProjectJourney 
                    currentTask={currentTask}
                    onOpenJournal={handleOpenJournal}
                    navigation={navigation}
                    availableMilestones={allMilestones}
                    refreshKey={refreshKey}
                  />
                ) : (
                  <LoadingPlaceholder theme={theme} />
                )}
              </View>
            </Animated.View>
          </View>

          {/* Menus and Modals - Works in both tabs */}
          <ActiveTaskMenu
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDelete}
                onEdit={handleEdit}
                isCompleted={isCompleted}
              />
              <EditModal visible={editVisible} onClose={handleEditClose} project={editModalProject} onSave={handleSaveEdit} />
              {selectedJournalMilestone && <Journal 
                visible={!!selectedJournalMilestone} 
                milestone={selectedJournalMilestone} 
                onSave={() => {
                  // Refresh trigger when journal is saved
                  setRefreshKey(prev => prev + 1);
                }}
                onClose={() => {
                  setSelectedJournalMilestone(null);
                }}
                fromActiveProject={true}
                // NEW: Project-based journal support
                currentTask={currentTask}
                isProjectBased={true}
              />}
              <AddTaskModal 
                visible={addMilestoneModalVisible} 
                onClose={() => {
                  setAddMilestoneModalVisible(false);
                  setEditingMilestone(null);
                }} 
                onSave={handleSaveMilestone}
                editingTask={editingMilestone}
                existingTasks={allMilestones}
              />

          {/* Education: Removed - no education overlay in ActiveProject */}
          
        </View>
    </AnimatedReanimated.View>
  );
}

const styles = StyleSheet.create({
  // Modern Container Styles
  modernContainer: { 
    position: "absolute", 
    top: 40, // Sabit - kartlar efekti için
    // bottom: 0 inline style ile ekleniyor (ekranın en altına kadar)
    width: width, 
    zIndex: 100, 
    elevation: 10, 
    overflow: "hidden",
    borderTopLeftRadius: 20, // Round top corners
    borderTopRightRadius: 20,
  },
  completedContainer: { 
  },
  calendarContainer: { 
  },
  contentWrapper: {
    flex: 1, // allow inner content to stretch and let children with flex:1 fill remaining space
    paddingTop: 12, // Minimal padding for header
    paddingBottom: 12,
  },
  menuButton: { 
    position: "absolute", 
    top: 12, 
    right: 20, 
    zIndex: 110,
  },
  tabContainer: { 
    flexDirection: "row", 
    flex: 1 
  },
  // Milestone Styles - Modern
  milestoneHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'rgba(248, 251, 255, 0.5)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  milestoneTitle: { 
    fontFamily: Typography.fonts.semiBold, 
    fontSize: 18, 
    color: "#1D1D1F",
    letterSpacing: -0.5,
  },
  addText: { 
    fontSize: 24, 
    fontFamily: Typography.fonts.bold, 
    color: "#007AFF", 
    padding: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 16,
    width: 40,
    height: 40,
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyHint: { 
    color: "#8E8E93", 
    fontStyle: "italic", 
    marginVertical: 24, 
    padding: 20,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: Typography.fonts.regular,
  },
  completedHeader: { 
    fontFamily: Typography.fonts.semiBold, 
    marginTop: 24, 
    marginBottom: 12, 
    fontSize: 16, 
    color: "#1D1D1F", 
    marginHorizontal: 24,
    letterSpacing: -0.3,
  },
});

// Minimalist Circle Loading Animation
const LoadingPlaceholder = ({ theme }) => {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinAnim]);

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 3,
          borderColor: 'transparent',
          borderTopColor: theme.name === 'dark' ? '#FFFFFF' : '#000000',
          transform: [{ rotate }],
        }}
      />
    </View>
  );
};
