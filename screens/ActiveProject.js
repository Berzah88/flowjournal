import React, { useState, useContext, useEffect, useCallback, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, BackHandler, Animated, PanResponder, Vibration, Easing } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { useTasks, useTaskActions } from "../hooks/useTaskContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import EditModal from "../components/EditModal";
import ActiveTaskMenu from "../components/ActiveTaskMenu";
import Journal from "./Journal";
import ProjectCalendar from "../components/ProjectCalendar";
import AddMilestoneModal from "../components/AddMilestoneModal";
import ActiveProjectHeader from "../components/ActiveProjectHeader";
import ActiveProjectMilestones from "../components/ActiveProjectMilestones";
import ProjectJourney from "../components/ProjectJourney";
import AIMilestoneSuggestion from "../components/AIMilestoneSuggestion";
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

  const [menuVisible, setMenuVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [selectedJournalMilestone, setSelectedJournalMilestone] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0 = milestones, 1 = journey
  const [addMilestoneModalVisible, setAddMilestoneModalVisible] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // For refresh after journal entry
  const [forceUpdate, setForceUpdate] = useState(0); // For force update
  
  // AI Milestone Suggestion states
  const [aiSuggestionVisible, setAiSuggestionVisible] = useState(false);
  const [hasAnalyzedJournals, setHasAnalyzedJournals] = useState(false);

  // Horizontal tab switching animations (like MainScreen)
  const panX = useRef(new Animated.Value(0)).current;
  const offsetRef = useRef(0);
  
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

    Animated.timing(panX, {
      toValue: target,
      useNativeDriver: true,
      duration: 300, // Faster, smoother transition
      easing: Easing.bezier(0.4, 0.0, 0.2, 1), // Material Design easing
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
        const threshold = width * 0.35; // 35% of screen width (increased for more deliberate swipes)

        // Decide navigation based on gesture.dx (not clamped) and current offset
        if (gesture.dx <= -threshold && currentOffset === 0) {
          // swipe left enough from milestones -> go to journey (index 1)
          animateToTab(1);
        } else if (gesture.dx >= threshold && currentOffset === -width) {
          // swipe right enough from journey -> go to milestones (index 0)
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
    // Fast, smooth opening animation - optimized for speed
    translateY.value = withTiming(0, { 
      duration: 250,
      easing: ReanimatedEasing.bezier(0.25, 0.1, 0.25, 1) // Smooth easing curve
    });
    scale.value = withTiming(1, { 
      duration: 250,
      easing: ReanimatedEasing.bezier(0.25, 0.1, 0.25, 1)
    });
    opacity.value = withTiming(1, { 
      duration: 250,
      easing: ReanimatedEasing.bezier(0.25, 0.1, 0.25, 1)
    });
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

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      // Stop all running animations
      if (translateY) translateY.value = 0;
      if (scale) scale.value = 1;
      if (opacity) opacity.value = 0;
      if (dragY) dragY.value = 0;
      
      // PanX cleanup
      if (panX) {
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
  }, [translateY, scale, opacity, dragY, panX]); // Dependencies eklendi

  const handleClose = useCallback(() => {
    translateY.value = withTiming(height, { 
      duration: 300,
      easing: ReanimatedEasing.bezier(0.4, 0, 0.6, 1) // Accelerated easing
    });
    opacity.value = withTiming(0, { 
      duration: 300,
      easing: ReanimatedEasing.bezier(0.4, 0, 0.6, 1)
    }, () => {
      if (onClose) runOnJS(onClose)();
    });
  }, [onClose]);

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

  const handleSaveMilestone = useCallback((milestoneData) => {
    if (!currentTask?.id) return;
    
    // Check if we're editing by looking at milestoneData.id - SAFE CHECK
    // Milestone ID can be either string (milestone_xxx) or number (legacy)
    if (milestoneData.id && (typeof milestoneData.id === 'string' || typeof milestoneData.id === 'number')) {
      // Edit existing milestone
      updateMilestone(currentTask.id, milestoneData.id, milestoneData);
    } else {
      // Add new milestone
      addMilestone(currentTask.id, milestoneData);
    }
    
    // Refresh trigger for milestone updates
    setRefreshKey(prev => prev + 1);
    setForceUpdate(prev => prev + 1);
    
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

  // Memoize milestone calculations for performance
  const allMilestones = useMemo(() => 
    [...(currentTask?.milestones || [])].sort((a, b) => a.id - b.id),
    [currentTask?.milestones, refreshKey]
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
      {
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
        />

        {/* Menu Button - Visible in both tabs */}
          {!isModalOpen && (
            <TouchableOpacity 
              onPress={async () => {
                try {
                  // Try Expo Haptics first - Medium for more noticeable feedback
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  console.log('✅ Expo Haptic triggered (MEDIUM)!');
                } catch (error) {
                  console.error('❌ Expo Haptic error:', error);
                  // Fallback to native Vibration
                  try {
                    Vibration.vibrate(50); // 50ms vibration - more noticeable
                    console.log('✅ Native Vibration triggered (STRONGER)!');
                  } catch (vibError) {
                    console.error('❌ Native Vibration error:', vibError);
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
              <View style={{ width }}>
                <ActiveProjectMilestones
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
                />
              </View>

              {/* Journey Tab (right) */}
              <View style={{ width }}>
                <ProjectJourney 
                  currentTask={currentTask}
                  onOpenJournal={handleOpenJournal}
                  navigation={navigation}
                  availableMilestones={allMilestones}
                  refreshKey={refreshKey}
                />
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
                  setForceUpdate(prev => prev + 1);
                }}
                onClose={() => {
                  setSelectedJournalMilestone(null);
                }}
                fromActiveProject={true}
                // NEW: Project-based journal support
                currentTask={currentTask}
                isProjectBased={true}
              />}
              <AddMilestoneModal 
                visible={addMilestoneModalVisible} 
                onClose={() => {
                  setAddMilestoneModalVisible(false);
                  setEditingMilestone(null);
                }} 
                onSave={handleSaveMilestone}
                editingMilestone={editingMilestone}
                existingMilestones={allMilestones}
              />
          
        </View>
    </AnimatedReanimated.View>
  );
}

const styles = StyleSheet.create({
  // Modern Container Styles
  modernContainer: { 
    position: "absolute", 
    top: 40, // Less spacing
    width: width, 
    height: height - 40, // Increase height
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
    flex: 1,
    paddingTop: 12, // Minimal padding for header
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
    fontFamily: "Poppins_600SemiBold", 
    fontSize: 18, 
    color: "#1D1D1F",
    letterSpacing: -0.5,
  },
  addText: { 
    fontSize: 24, 
    fontFamily: "Poppins_700Bold", 
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
    fontFamily: "Poppins_400Regular",
  },
  completedHeader: { 
    fontFamily: "Poppins_600SemiBold", 
    marginTop: 24, 
    marginBottom: 12, 
    fontSize: 16, 
    color: "#1D1D1F", 
    marginHorizontal: 24,
    letterSpacing: -0.3,
  },
});

