import React, { useState, useContext, useEffect, useCallback, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, BackHandler } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTasks, useTaskActions } from "../hooks/useTaskContext";
import EditModal from "../components/EditModal";
import ActiveMilestone from "./ActiveMilestone";
import ActiveTaskMenu from "../components/ActiveTaskMenu";
import Journal from "./Journal";
import ProjectCalendar from "../components/ProjectCalendar";
import AddMilestoneModal from "../components/AddMilestoneModal";
import ActiveProjectHeader from "../components/ActiveProjectHeader";
import ActiveProjectMilestones from "../components/ActiveProjectMilestones";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

const { width, height } = Dimensions.get("window");


export default function ActiveProject({ selectedCard, onClose, setMainActiveTab }) {
  const tasks = useTasks();
  const {
    deleteTask,
    completeTask,
    addMilestone,
    updateMilestone,
    completeMilestone,
    setActiveMilestone,
    deleteMilestone,
    updateTask,
  } = useTaskActions();

  const [menuVisible, setMenuVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [selectedJournalMilestone, setSelectedJournalMilestone] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0 = milestones, 1 = calendar
  const [addMilestoneModalVisible, setAddMilestoneModalVisible] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);

  // Reset editing milestone when modal closes
  useEffect(() => {
    if (!addMilestoneModalVisible) {
      setEditingMilestone(null);
    }
  }, [addMilestoneModalVisible]);
  
  

  // Get current task directly without memoization to ensure fresh data
  const currentTask = tasks.find((t) => t.id === selectedCard?.id) || selectedCard;
  
  if (!currentTask) return null;

  const isCompleted = currentTask?.done;
  const start = currentTask?.startDate ? new Date(currentTask.startDate) : null;
  const end = currentTask?.endDate ? new Date(currentTask.endDate) : null;
  const isModalOpen = !!(editVisible || selectedMilestone || selectedJournalMilestone || addMilestoneModalVisible);

  // Memoize progress calculation
  const progress = useMemo(() => {
    return currentTask?.milestones?.length
      ? currentTask.milestones.filter((m) => m.completed).length /
        currentTask.milestones.length
      : 0;
  }, [currentTask]);

  const translateY = useSharedValue(height);
  const scale = useSharedValue(0.96);
  const opacity = useSharedValue(0);
  const dragY = useSharedValue(0);
  const progressAnim = useSharedValue(0);
  
  // Cleanup refs for memory leak prevention
  const animationCleanupRef = useRef([]);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 320 });
    scale.value = withTiming(1, { duration: 320 });
    opacity.value = withTiming(1, { duration: 320 });
    progressAnim.value = withTiming(progress, { duration: 400 });
  }, [progress]);

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
      if (progressAnim) progressAnim.value = 0;
      
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
  }, []); // Dependency array'i boş bırak - sadece unmount'ta çalışsın

  const handleClose = useCallback(() => {
    translateY.value = withTiming(height, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
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

  const handleSaveMilestone = useCallback((milestoneData) => {
    if (!currentTask?.id) return;
    
    if (editingMilestone) {
      // Edit existing milestone
      updateMilestone(currentTask.id, milestoneData.id, milestoneData);
    } else {
      // Add new milestone
      addMilestone(currentTask.id, milestoneData);
    }
  }, [currentTask?.id, addMilestone, updateMilestone, editingMilestone]);

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



  const panGesture = Gesture.Pan()
    .enabled(!isModalOpen)
    .onUpdate((e) => {
      if (!isModalOpen && e.translationY > 0 && e.y <= 120) {
        dragY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (isModalOpen) {
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
    transform: [{ translateY: translateY.value + dragY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: progressAnim.value * 100 + "%",
  }));

  // Simple tab switching function without animation
  const handleTabSwitch = useCallback((newTab) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
  }, [activeTab]);

  // Memoize milestone calculations to prevent unnecessary re-renders
  const allMilestones = useMemo(() => {
    return [...(currentTask?.milestones || [])].sort((a, b) => a.id - b.id);
  }, [currentTask]);
  
  const completedMilestones = useMemo(() => {
    return allMilestones.filter((m) => m.completed);
  }, [allMilestones]);
  
  const activeMilestones = useMemo(() => {
    return allMilestones.filter((m) => !m.completed);
  }, [allMilestones]);

  return (
    <Animated.View style={[
      styles.overlayCard, 
      isCompleted && styles.completedOverlay, 
      activeTab === 1 && styles.calendarOverlay,
      animatedStyle
    ]}>
      <View style={{ flex: 1 }}>
        {/* Card Header */}
        <ActiveProjectHeader
          currentTask={currentTask}
          isCompleted={isCompleted}
          activeTab={activeTab}
          onTabSwitch={handleTabSwitch}
          onMenuPress={() => setMenuVisible((s) => !s)}
          isModalOpen={isModalOpen}
          progress={progress}
          progressStyle={progressStyle}
          panGesture={panGesture}
        />

        {/* Menu Button - Sadece Milestones tab'da görünür */}
          {!isModalOpen && activeTab === 0 && (
            <TouchableOpacity onPress={() => setMenuVisible((s) => !s)} style={styles.menuButton}>
              <Ionicons name="ellipsis-vertical" size={22} color={isCompleted ? "#fff" : "#333"} />
            </TouchableOpacity>
          )}

          <View style={{ flex: 1, minHeight: 400 }}>
            {activeTab === 0 ? (
              // Milestones Tab
              <ActiveProjectMilestones
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
              />
            ) : (
              // Calendar Tab - Tamamen ayrı ekran
              <ProjectCalendar 
                milestones={allMilestones}
                projectStartDate={currentTask?.startDate}
                projectEndDate={currentTask?.endDate}
              />
            )}
          </View>

          {/* Menüler ve Modallar - Sadece Milestones tab'da çalışır */}
          {activeTab === 0 && (
            <>
              <ActiveTaskMenu
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDelete}
                onEdit={handleEdit}
                isCompleted={isCompleted}
              />
              <EditModal visible={editVisible} onClose={() => setEditVisible(false)} project={currentTask} onSave={handleSaveEdit} />
              {selectedMilestone && <ActiveMilestone milestone={selectedMilestone} onClose={() => setSelectedMilestone(null)} />}
              {selectedJournalMilestone && <Journal visible={!!selectedJournalMilestone} milestone={selectedJournalMilestone} onClose={() => setSelectedJournalMilestone(null)} />}
              <AddMilestoneModal 
                visible={addMilestoneModalVisible} 
                onClose={() => setAddMilestoneModalVisible(false)} 
                onSave={handleSaveMilestone}
                editingMilestone={editingMilestone}
              />
            </>
          )}
          
        </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlayCard: { position: "absolute", top: 35, width: width, height: height - 35, backgroundColor: "#F5F1F1", borderRadius: 20, zIndex: 100, elevation: 10, overflow: "hidden" },
  completedOverlay: { backgroundColor: "#111111" },
  calendarOverlay: { backgroundColor: "#F8FBFF", },
  menuButton: { position: "absolute", top: 18, right: 18, padding: 6, zIndex: 110 },
  milestoneHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20},
  milestoneTitle: { fontFamily: "Poppins_700Bold", marginTop: 10, fontSize: 16, color: "#505050" },
  addText: { fontSize: 30, fontFamily: "Poppins_700Bold", color: "#4A90E2", padding: 5 },
  emptyHint: { color: "#888", fontStyle: "italic", marginVertical: 8, padding: 10 },
  completedHeader: { fontFamily: "Poppins_700Bold", marginTop: 20, marginBottom: 6, fontSize: 16, color: "#505050", marginHorizontal: 20 },
});
