import React, { useState, useContext, useEffect, useCallback, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, BackHandler, Animated, PanResponder, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTasks, useTaskActions } from "../hooks/useTaskContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import EditModal from "../components/EditModal";
import ActiveTaskMenu from "../components/ActiveTaskMenu";
import Journal from "./Journal";
import AddTaskModal from "../components/AddTaskModal";
import ActiveProjectHeader from "../components/ActiveProjectHeader";
import ActiveProjectTasks from "../components/ActiveProjectTasks";
import JournalCard from "../components/JournalCard";
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

const { width, height } = Dimensions.get("window");


export default function CompletedActiveProject({ selectedCard, onClose, setMainActiveTab, navigation }) {
  const tasks = useTasks();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const locale = language === 'tr' ? 'tr-TR' : (language || 'en-US');
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
  const [addMilestoneModalVisible, setAddMilestoneModalVisible] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // For refresh after journal entry
  const [forceUpdate, setForceUpdate] = useState(0); // For force update
  const [contentLoaded, setContentLoaded] = useState(false); // Lazy load content

  // Reset editing milestone when modal closes
  useEffect(() => {
    if (!addMilestoneModalVisible) {
      setEditingMilestone(null);
    }
  }, [addMilestoneModalVisible]);

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
  }, [translateY, scale, opacity, dragY, progressAnim]); // Dependencies eklendi

  // Get current task - NO MEMOIZATION to ensure updates
  const currentTask = tasks.find((t) => t.id === selectedCard?.id) || selectedCard;
  
  if (!currentTask) return null;

  const isCompleted = currentTask?.done;
  const start = currentTask?.startDate ? new Date(currentTask.startDate) : null;
  const end = currentTask?.endDate ? new Date(currentTask.endDate) : null;
  const isModalOpen = !!(editVisible || selectedMilestone || selectedJournalMilestone || addMilestoneModalVisible);

  // Progress calculation with proper memoization
  const progress = useMemo(() => {
    return currentTask?.milestones?.length
      ? currentTask.milestones.filter((m) => m.completed).length /
        currentTask.milestones.length
      : 0;
  }, [currentTask?.milestones?.length, currentTask?.milestones?.filter(m => m.completed).length]);

  const translateY = useSharedValue(height);
  const scale = useSharedValue(0.96);
  const opacity = useSharedValue(0);
  const dragY = useSharedValue(0);
  const progressAnim = useSharedValue(0);
  
  // Cleanup refs for memory leak prevention
  const animationCleanupRef = useRef([]);

  useEffect(() => {
    console.log('🎬 CompletedActiveProject MOUNTED');
    console.log('   Initial values - translateY:', translateY.value, 'scale:', scale.value, 'opacity:', opacity.value);
    
    // Faster, snappier opening animation
    translateY.value = withTiming(0, { 
      duration: 300,
      easing: Easing.out(Easing.cubic)
    });
    scale.value = withTiming(1, { 
      duration: 300,
      easing: Easing.out(Easing.cubic)
    });
    opacity.value = withTiming(1, { 
      duration: 250
    });
    
    console.log('   Animation started - duration: 300ms (faster!)');
    
    // PERFORMANCE: Load content after animation starts (immediate - no delay!)
    setContentLoaded(true);
    console.log('📦 Content loading enabled immediately');
    
    return () => {
      console.log('🎬 CompletedActiveProject UNMOUNTED');
    };
  }, []); // Same as ActiveProject - mount only
  
  // Separate effect for progress animation
  useEffect(() => {
    progressAnim.value = withTiming(progress, { duration: 600 });
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

  const handleClose = useCallback(() => {
    console.log('🚪 Closing CompletedActiveProject');
    // Faster closing animation
    translateY.value = withTiming(height, { 
      duration: 250,
      easing: Easing.in(Easing.cubic)
    });
    opacity.value = withTiming(0, { 
      duration: 200
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

  const handleOpenJournal = useCallback((milestone) => {
    const milestoneData = {
      ...milestone,
      taskId: currentTask.id,
      projectTitle: currentTask.title,
    };
    setSelectedJournalMilestone(milestoneData);
  }, [currentTask]);

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
    .enabled(!isModalOpen)
    .activeOffsetY(10)
    .onUpdate((e) => {
      if (!isModalOpen && e.translationY > 0) {
        dragY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (isModalOpen) {
        dragY.value = withTiming(0, { duration: 200 });
        return;
      }
      if (e.translationY > 150 && e.velocityY > 0) {
        dragY.value = withTiming(height, { 
          duration: 350,
          easing: Easing.bezier(0.4, 0, 0.6, 1)
        }, () => {
          runOnJS(handleClose)();
        });
      } else {
        dragY.value = withTiming(0, { duration: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + dragY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: progressAnim.value * 100 + "%",
  }));

  // Milestone calculations - NO MEMOIZATION to ensure updates
  const allMilestones = [...(currentTask?.milestones || [])].sort((a, b) => a.id - b.id);
  
  const completedMilestones = allMilestones.filter((m) => m.completed);
  const activeMilestones = allMilestones.filter((m) => !m.completed);

  // PERFORMANCE: Memoize milestone list for faster rendering
  const visibleMilestones = useMemo(() => {
    if (!contentLoaded || !allMilestones || allMilestones.length === 0) {
      return [];
    }
    // Show ALL milestones (limit removed)
    return allMilestones;
  }, [contentLoaded, allMilestones]);



  return (
    <GestureDetector gesture={panGesture}>
      <AnimatedReanimated.View style={[
        styles.modernContainer, 
        animatedStyle
      ]}>
        <LinearGradient
          colors={['#E8E8E8', '#E0E0E0']}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={styles.gradientContainer}
        >
        <View style={styles.contentWrapper}>
          {/* Custom Header for Completed Projects */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.projectTitle}>{currentTask.title}</Text>
              <View style={styles.dateFrame}>
                <Text style={styles.dateRange}>
                  {new Date(currentTask.startDate).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date(currentTask.endDate).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={() => setMenuVisible(true)}
              accessible={true}
              accessibilityLabel="Project menu"
              accessibilityRole="button"
            >
              <Ionicons name="ellipsis-vertical" size={22} color="#1D1D1F" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
            scrollEventThrottle={16}
            nestedScrollEnabled={true}
          >
            {/* Project Journals Section - MILESTONE BAŞLIKLARI ALTINDA */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('projectJournals')}</Text>
              
              {!contentLoaded ? (
                // Loading placeholder
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading journals...</Text>
                </View>
              ) : currentTask.journalEntries && currentTask.journalEntries.length > 0 ? (
                <View style={styles.milestonesList}>
                  {(() => {
                    // Grup journal'ları milestone'lara göre (kaydedilmiş etiketlere göre)
                    const milestoneGroups = {};
                    const ungroupedJournals = [];
                    
                    currentTask.journalEntries.forEach(entry => {
                      const milestoneId = entry.originalMilestoneId;
                      const milestoneTitle = entry.originalMilestoneTitle;
                      
                      if (milestoneId && milestoneTitle) {
                        if (!milestoneGroups[milestoneId]) {
                          milestoneGroups[milestoneId] = {
                            id: milestoneId,
                            title: milestoneTitle,
                            entries: []
                          };
                        }
                        milestoneGroups[milestoneId].entries.push(entry);
                      } else {
                        ungroupedJournals.push(entry);
                      }
                    });
                    
                    // Milestone başlıkları altında journal'ları göster
                    return (
                      <>
                        {Object.values(milestoneGroups).map((milestoneGroup) => {
                          // Bu milestone için journal'ları tarihe göre grupla
                          const dateGroups = {};
                          milestoneGroup.entries.forEach(entry => {
                            const date = new Date(entry.createdAt);
                            const dateKey = date.toLocaleDateString(locale, {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            });
                            
                            if (!dateGroups[dateKey]) {
                              dateGroups[dateKey] = [];
                            }
                            dateGroups[dateKey].push(entry);
                          });
                          
                          const dayGroups = Object.keys(dateGroups)
                            .sort((a, b) => {
                              const dateA = new Date(dateGroups[a][0].createdAt);
                              const dateB = new Date(dateGroups[b][0].createdAt);
                              return dateB - dateA;
                            })
                            .map(dateKey => ({
                              date: dateKey,
                              allEntries: dateGroups[dateKey]
                            }));
                          
                          return (
                            <View key={milestoneGroup.id} style={styles.milestoneItem}>
                              <View style={styles.milestoneHeader}>
                                <View style={styles.milestoneIconContainer}>
                                  <Ionicons 
                                    name="ellipse" 
                                    size={20} 
                                    color="#8E7DBE" 
                                  />
                                </View>
                                <View style={styles.milestoneContent}>
                                  <Text style={styles.milestoneTitle}>
                                    {milestoneGroup.title}
                                  </Text>
                                </View>
                              </View>
                              
                              {/* Bu milestone'a ait journal'lar */}
                              <View style={styles.journalCardsContainer}>
                                {dayGroups.slice(0, 3).map((dayGroup) => (
                                  <JournalCard 
                                    key={`${milestoneGroup.id}-${dayGroup.date}`}
                                    dayGroup={dayGroup}
                                    navigation={navigation}
                                    taskId={currentTask.id}
                                    milestoneId={milestoneGroup.id}
                                    isCompleted={isCompleted}
                                  />
                                ))}
                              </View>
                            </View>
                          );
                        })}
                        
                        {/* Etiketlenmemiş journal'lar (varsa) */}
                        {ungroupedJournals.length > 0 && (
                          <View style={styles.milestoneItem}>
                            <View style={styles.milestoneHeader}>
                              <View style={styles.milestoneIconContainer}>
                                <Ionicons 
                                  name="help-circle-outline" 
                                  size={20} 
                                  color="#8E8E93" 
                                />
                              </View>
                              <View style={styles.milestoneContent}>
                                <Text style={[styles.milestoneTitle, { color: '#8E8E93' }]}>
                                  {t('uncategorized') || 'Uncategorized'}
                                </Text>
                              </View>
                            </View>
                            
                            <View style={styles.journalCardsContainer}>
                              {(() => {
                                const dateGroups = {};
                                ungroupedJournals.forEach(entry => {
                                  const date = new Date(entry.createdAt);
                                  const dateKey = date.toLocaleDateString(locale, {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric'
                                  });
                                  
                                  if (!dateGroups[dateKey]) {
                                    dateGroups[dateKey] = [];
                                  }
                                  dateGroups[dateKey].push(entry);
                                });
                                
                                return Object.keys(dateGroups)
                                  .sort((a, b) => {
                                    const dateA = new Date(dateGroups[a][0].createdAt);
                                    const dateB = new Date(dateGroups[b][0].createdAt);
                                    return dateB - dateA;
                                  })
                                  .map(dateKey => ({
                                    date: dateKey,
                                    allEntries: dateGroups[dateKey]
                                  }))
                                  .slice(0, 3)
                                  .map((dayGroup) => (
                                    <JournalCard 
                                      key={`uncategorized-${dayGroup.date}`}
                                      dayGroup={dayGroup}
                                      navigation={navigation}
                                      taskId={currentTask.id}
                                      milestoneId={null}
                                      isCompleted={isCompleted}
                                    />
                                  ));
                              })()}
                            </View>
                          </View>
                        )}
                      </>
                    );
                  })()}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="journal-outline" size={48} color="#8E8E93" />
                  <Text style={styles.emptyTitle}>{t('noJournals')}</Text>
                  <Text style={styles.emptySubtitle}>{t('noJournalEntries')}</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Menus and Modals */}
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
        </View>
        </LinearGradient>
      </AnimatedReanimated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // Modern Container Styles
  modernContainer: { 
    position: "absolute", 
    top: 40, // Less spacing
    width: width, 
    height: height - 40, // Increase height
    backgroundColor: "transparent", 
    zIndex: 100, 
    elevation: 10, 
    overflow: "hidden",
    borderTopLeftRadius: 20, // Round top corners
    borderTopRightRadius: 20,
  },
  gradientContainer: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  contentWrapper: {
    flex: 1,
    paddingTop: 12, // Minimal padding for header
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: "transparent",
  },
  titleContainer: {
    flex: 1,
    alignItems: "flex-start",
    marginRight: 16,
  },
  projectTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#1D1D1F",
    textAlign: "left",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  dateFrame: {
    backgroundColor: '#D1D1D6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  dateRange: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#636366",
    textAlign: "left",
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
    minHeight: '100%',
  },
  section: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#1D1D1F",
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  milestonesList: {
    gap: 12,
  },
  milestoneItem: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 16,
  },
  milestoneHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
  },
  milestoneIconContainer: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneContent: {
    flex: 1,
    marginLeft: 12,
  },
  milestoneTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#1D1D1F",
  },
  journalCardsContainer: {
    marginTop: 12,
    marginLeft: 16,
    gap: 8,
  },
  projectJournalsContainer: {
    gap: 12,
    marginTop: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#1D1D1F",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#8E8E93",
    textAlign: "center",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#8E8E93",
  },
  moreIndicator: {
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  moreText: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#8E7DBE",
  },
});