import React, { useState, useContext, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, BackHandler, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TaskContext } from "../context/TaskContext";
import MileStone from "../components/MileStone";
import EditModal from "../components/EditModal";
import ActiveMilestone from "./ActiveMilestone";
import ActiveTaskMenu from "../components/ActiveTaskMenu";
import Journal from "./Journal";
import ProjectCalendar from "../components/ProjectCalendar";
import AddMilestoneModal from "../components/AddMilestoneModal";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

const { width, height } = Dimensions.get("window");

// Format date range as "23 Mar 2025 - 24 Mar 2025"
const formatDateRange = (startDate, endDate) => {
  const formatDate = (date) => {
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

export default function ActiveProject({ selectedCard, onClose, setMainActiveTab }) {
  const {
    tasks,
    deleteTask,
    completeTask,
    addMilestone,
    updateMilestone,
    completeMilestone,
    setActiveMilestone,
    deleteMilestone,
    updateTask,
    setMilestoneWasEdited,
    clearMilestoneWasEdited,
  } = useContext(TaskContext);

  const [menuVisible, setMenuVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [selectedJournalMilestone, setSelectedJournalMilestone] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0 = milestones, 1 = calendar
  const [addMilestoneModalVisible, setAddMilestoneModalVisible] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  

  const currentTask = tasks.find((t) => t.id === selectedCard?.id) || selectedCard;
  if (!currentTask) return null;

  const isCompleted = currentTask?.done;
  const start = currentTask?.startDate ? new Date(currentTask.startDate) : null;
  const end = currentTask?.endDate ? new Date(currentTask.endDate) : null;
  const isModalOpen = !!(editVisible || selectedMilestone || selectedJournalMilestone || addMilestoneModalVisible);

  const progress = currentTask?.milestones?.length
    ? currentTask.milestones.filter((m) => m.completed).length /
      currentTask.milestones.length
    : 0;

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
  }, [translateY, scale, opacity, dragY, progressAnim]);

  const handleClose = useCallback(() => {
    translateY.value = withTiming(height, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      if (onClose) runOnJS(onClose)();
    });
  }, [onClose]);

  const handleDelete = useCallback(() => {
    deleteTask(currentTask.id);
    setMenuVisible(false);
    handleClose();
  }, [currentTask, deleteTask, handleClose]);

  const handleToggleComplete = useCallback(() => {
    if (isCompleted) {
      updateTask(currentTask.id, { done: false });
      setMainActiveTab && setMainActiveTab("active");
    } else {
      completeTask(currentTask.id);
      setMainActiveTab && setMainActiveTab("completed");
    }
    setMenuVisible(false);
    handleClose();
  }, [isCompleted, currentTask, updateTask, completeTask, setMainActiveTab, handleClose]);

  const handleAddMilestone = useCallback(() => {
    setAddMilestoneModalVisible(true);
  }, []);

  const handleSaveMilestone = useCallback((milestoneData) => {
    if (editingMilestone) {
      // Edit existing milestone
      updateMilestone(currentTask.id, milestoneData.id, milestoneData);
      // Set wasEdited flag for the edited milestone
      setMilestoneWasEdited(currentTask.id, milestoneData.id);
      setEditingMilestone(null);
    } else {
      // Add new milestone
      addMilestone(currentTask.id, milestoneData);
    }
  }, [currentTask, addMilestone, updateMilestone, editingMilestone, setMilestoneWasEdited]);

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
    [currentTask, updateTask]
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

  const allMilestones = [...(currentTask?.milestones || [])].sort((a, b) => a.id - b.id);
  const completedMilestones = allMilestones.filter((m) => m.completed);
  const activeMilestones = allMilestones.filter((m) => !m.completed);

  return (
    <Animated.View style={[
      styles.overlayCard, 
      isCompleted && styles.completedOverlay, 
      activeTab === 1 && styles.calendarOverlay,
      animatedStyle
    ]}>
      <View style={{ flex: 1 }}>
        {/* Card Header */}
        <GestureDetector gesture={panGesture}>
          <View style={styles.cardContent}>
            {/* Tab Başlıkları */}
            <View style={styles.headerTabs}>
              {/* Sol %50 - Milestones Tab */}
              <TouchableOpacity 
                style={[styles.projectHeaderTab, activeTab === 0 && styles.activeHeaderTab]} 
                onPress={() => setActiveTab(0)}
                activeOpacity={0.8}
              >
                <Text style={[styles.title, isCompleted && styles.completedText]}>{currentTask?.title}</Text>
              </TouchableOpacity>

              {/* Sağ %50 - Calendar Tab */}
              <TouchableOpacity 
                style={[styles.calendarHeaderTab, activeTab === 1 && styles.activeHeaderTab]} 
                onPress={() => setActiveTab(1)}
                activeOpacity={0.8}
              >
                <Text style={[styles.calendarTitle, isCompleted && styles.completedText]}>Calendar</Text>
              </TouchableOpacity>
            </View>

            {/* Date ve Progress Bar - Sadece Milestones tab'da görünür */}
            {activeTab === 0 && (
              <>
                {start && end && (
                  <Text style={[styles.dateText, isCompleted && styles.completedText]}>
                    {formatDateRange(start, end)}
                  </Text>
                )}
                <View style={{ marginTop: 0, width: "80%" }}>
                  <Text style={{ fontSize: 12, color: "#888", marginBottom: 6, fontFamily: "Poppins_400Regular" }}>Project Progress</Text>
                  <View style={{ height: 12, backgroundColor: "#E0E0E0", borderRadius: 8, overflow: "hidden", elevation: 2 }}>
                    <Animated.View style={[{ height: 12, backgroundColor: "#B1A5FF" }, progressStyle]} />
                  </View>
                </View>
              </>
            )}
          </View>
        </GestureDetector>

        {/* Menu Button - Sadece Milestones tab'da görünür */}
          {!isModalOpen && activeTab === 0 && (
            <TouchableOpacity onPress={() => setMenuVisible((s) => !s)} style={styles.menuButton}>
              <Ionicons name="ellipsis-vertical" size={22} color={isCompleted ? "#fff" : "#333"} />
            </TouchableOpacity>
          )}

          {/* Milestones List - Sadece Milestones tab'da görünür */}
          {activeTab === 0 && (
            <View style={styles.milestoneHeader}>
              <Text style={styles.milestoneTitle}>MileStones</Text>
              <TouchableOpacity onPress={handleAddMilestone}>
                <Text style={styles.addText}>+</Text>
              </TouchableOpacity>
            </View>
          )}

           <View style={{ flex: 1, minHeight: 400 }}>
             {activeTab === 0 ? (
               // Milestones Tab
               <>
                 {allMilestones.length === 0 && <Text style={styles.emptyHint}>No milestones yet — add one with +</Text>}
                 
                 {allMilestones.length > 0 && (
                   <ScrollView 
                     style={{ flex: 1 }} 
                     contentContainerStyle={{ paddingBottom: 40 }}
                     showsVerticalScrollIndicator={true}
                     bounces={true}
                     scrollEnabled={true}
                   >
                     {/* Active Milestones */}
                     {activeMilestones.map((milestone, index) => (
                       <MileStone
                         key={milestone.id}
                         milestone={milestone}
                         isLatest={index === activeMilestones.length - 1}
                         wasEdited={milestone.wasEdited || false}
                         onUpdate={(milestoneData) => {
                           updateMilestone(currentTask.id, milestone.id, milestoneData);
                         }}
                         onComplete={() => completeMilestone(currentTask.id, milestone.id)}
                         onDelete={() => deleteMilestone(currentTask.id, milestone.id)}
                         onOpenDetail={() => setSelectedMilestone({ ...milestone, isLatest: index === activeMilestones.length - 1, taskId: currentTask.id })}
                         onOpenEditor={(ms) => setSelectedJournalMilestone(ms)}
                         isCompleted={false}
                         onEditToggle={(milestone) => {
                           setEditingMilestone(milestone);
                           setAddMilestoneModalVisible(true);
                         }}
                       />
                     ))}

                     {/* Completed Milestones Section */}
                     {completedMilestones.length > 0 && (
                       <View style={{ marginTop: 20 }}>
                         <Text style={styles.completedHeader}>Completed Milestones</Text>
                         {completedMilestones.map((ms) => (
                           <MileStone
                             key={ms.id}
                             milestone={ms}
                             isLatest={false}
                             isCompleted={true}
                             onOpenDetail={() => setSelectedMilestone({ ...ms, isLatest: false, taskId: currentTask.id })}
                             onOpenEditor={(ms) => setSelectedJournalMilestone(ms)}
                             onDelete={() => deleteMilestone(currentTask.id, ms.id)}
                             onSetActive={() => setActiveMilestone(currentTask.id, ms.id)}
                           />
                         ))}
                       </View>
                     )}
                   </ScrollView>
                 )}
               </>
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
                onClose={() => {
                  setAddMilestoneModalVisible(false);
                  setEditingMilestone(null);
                }} 
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
  cardContent: { padding: 10, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: "#E5E5E5" },
  headerTabs: { flexDirection: "row" },
  headerTab: { padding: 5, justifyContent: "center" },
  projectHeaderTab: { flex: 0.5, padding: 5, justifyContent: "center", alignItems: "center" },
  calendarHeaderTab: { flex: 0.5, padding: 5, justifyContent: "center", alignItems: "center" },
  activeHeaderTab: { backgroundColor: "rgba(74, 144, 226, 0.1)", borderRadius: 12 },
  title: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#505050", paddingVertical: 8 },
  dateText: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#666666", paddingVertical: 25 },
  completedText: { color: "#fff" },
  calendarTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#505050", paddingVertical: 8 },
  menuButton: { position: "absolute", top: 18, right: 18, padding: 6, zIndex: 110 },
  milestoneHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20},
  milestoneTitle: { fontFamily: "Poppins_700Bold", marginTop: 10, fontSize: 16, color: "#505050" },
  addText: { fontSize: 30, fontFamily: "Poppins_700Bold", color: "#4A90E2", padding: 5 },
  emptyHint: { color: "#888", fontStyle: "italic", marginVertical: 8, padding: 10 },
  completedHeader: { fontFamily: "Poppins_700Bold", marginTop: 20, marginBottom: 6, fontSize: 16, color: "#505050", marginHorizontal: 20 },
});
