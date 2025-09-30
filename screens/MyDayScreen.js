// screens/MyDayScreen.js
import React, { useState, useRef, useMemo, useEffect, useCallback, memo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useActiveTasks, useTaskActions } from "../hooks/useTaskContext";
import { getMilestoneColor } from "../utils/milestoneColors";
import { usePerformanceMonitor } from "../hooks/usePerformanceMonitor";
import { ANIMATION_DURATIONS } from "../constants";
import LoadingSpinner from "../components/LoadingSpinner";
import ActiveProject from "./ActiveProject";
import AddMilestoneModal from "../components/AddMilestoneModal";
import DailyMoodSummary from "../components/DailyMoodSummary";
import MoodStatement from "../components/MoodStatement";
import HorizontalCalendar from "../components/HorizontalCalendar";
const { width } = Dimensions.get("window");

const MyDayScreen = memo(function MyDayScreen({ 
  navigation, 
  selectedCard, 
  setSelectedCard, 
  selectedMilestone, 
  setSelectedMilestone,
  addMilestoneModalVisible,
  setAddMilestoneModalVisible,
  selectedProjectForMilestone,
  setSelectedProjectForMilestone,
  selectedDate,
  setSelectedDate,
  onAddProject,
  onOpenJournal
}) {
  const activeTasks = useActiveTasks();
  const { addMilestone, updateMilestone, completeMilestone, addJournalEntry } = useTaskActions();
  
  // Performance monitoring (only in development) - temporarily disabled
  // usePerformanceMonitor('MyDayScreen');

  const [completingMilestones, setCompletingMilestones] = useState(new Set());


  // Memoized handlers to prevent unnecessary re-renders
     const openCard = useCallback((card) => {
       setSelectedCard(card);
     }, [setSelectedCard]);
     const closeCard = useCallback(() => {
       setSelectedCard(null);
     }, [setSelectedCard]);

  const openMilestone = useCallback((milestone, project) => {
    // Open journal directly when milestone is clicked
    const milestoneData = {
      ...milestone,
      taskId: project.id,
      projectTitle: project.title,
      autoOpenJournal: true // Auto open journal
    };
    onOpenJournal(milestoneData);
  }, [onOpenJournal]);

  const handleMilestoneComplete = useCallback((milestone, project) => {
    if (milestone.completed) return;
    
    const milestoneKey = `${project.id}-${milestone.id}`;
    
    // Milestone'u completing state'e ekle
    setCompletingMilestones(prev => new Set([...prev, milestoneKey]));
    
    // Complete milestone after 1.5 seconds and remove from completing state
    setTimeout(() => {
      try {
        completeMilestone(project.id, milestone.id);
        setCompletingMilestones(prev => {
          const newSet = new Set(prev);
          newSet.delete(milestoneKey);
          return newSet;
        });
      } catch (error) {
        // Hata durumunda completing state'i temizle
        setCompletingMilestones(prev => {
          const newSet = new Set(prev);
          newSet.delete(milestoneKey);
          return newSet;
        });
      }
    }, 1500);
  }, [completeMilestone]);

  // Check if milestone is suitable for today
  const isMilestoneActiveToday = useCallback((milestone, selectedDate) => {
    const today = new Date(selectedDate);
    today.setHours(0, 0, 0, 0); // Take only date part
    
    // Start date check
    if (milestone.startDate) {
      const milestoneStartDate = new Date(milestone.startDate);
      milestoneStartDate.setHours(0, 0, 0, 0);
      
      // Don't show if milestone hasn't started yet
      if (milestoneStartDate > today) {
        return false;
      }
    }
    
    // End date check
    if (milestone.endDate) {
      const milestoneEndDate = new Date(milestone.endDate);
      milestoneEndDate.setHours(23, 59, 59, 999); // Until end of day
      
      // Don't show if milestone is finished
      if (milestoneEndDate < today) {
        return false;
      }
    }
    
    return true; // Between start and end dates
  }, []);

  // Check if milestone is overdue
  const isMilestoneOverdue = useCallback((milestone, selectedDate) => {
    if (!milestone.endDate) return false; // Don't consider overdue if no end date
    
    const milestoneEndDate = new Date(milestone.endDate);
    const today = new Date(selectedDate);
    
    return milestoneEndDate < today;
  }, []);

  // Check if milestone is on its last day
  const isMilestoneLastDay = useCallback((milestone, selectedDate) => {
    if (!milestone.endDate) return false; // Not last day if no end date
    
    const milestoneEndDate = new Date(milestone.endDate);
    const today = new Date(selectedDate);
    
    return milestoneEndDate.toDateString() === today.toDateString();
  }, []);

  const closeMilestone = useCallback(() => setSelectedMilestone(null), [setSelectedMilestone]);



  // String format of selected date
  const selectedDateString = selectedDate.toDateString();

  // Filter tasks for selected date (by date range)
  const selectedDateActiveTasks = useMemo(() => {
     if (!activeTasks || activeTasks.length === 0) {
       return [];
     }
    
    const filtered = activeTasks.filter(task => {
      const startDate = new Date(task.startDate);
      const endDate = new Date(task.endDate);
      const selectedDateObj = new Date(selectedDate);
      
      // Take only date part for date comparison (remove time information)
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      selectedDateObj.setHours(0, 0, 0, 0);
      
      // Check if selected date is in project date range
      const isInRange = selectedDateObj >= startDate && selectedDateObj <= endDate;
      
      
      return isInRange;
    }).map(task => {
      // Mark projects on their last day
      const endDate = new Date(task.endDate);
      const selectedDateObj = new Date(selectedDate);
      
      endDate.setHours(0, 0, 0, 0);
      selectedDateObj.setHours(0, 0, 0, 0);
      
      const isLastDay = selectedDateObj.getTime() === endDate.getTime();
      
      return {
        ...task,
        isLastDay: isLastDay
      };
    });
    
    console.log('Filtered projects for date:', selectedDate.toDateString(), 'Count:', filtered.length);
    return filtered;
  }, [activeTasks, selectedDate]);

  // Calculate milestones for today's summary - based on milestones active on that day
  const todaySummary = useMemo(() => {
    const totalMilestones = selectedDateActiveTasks.reduce((total, project) => {
      return total + (project.milestones?.filter(m => !m.completed && isMilestoneActiveToday(m, selectedDate)).length || 0);
    }, 0);

    const completedMilestones = selectedDateActiveTasks.reduce((total, project) => {
      return total + (project.milestones?.filter(m => m.completed && isMilestoneActiveToday(m, selectedDate)).length || 0);
    }, 0);

    const activeMilestones = totalMilestones;

    return {
      totalProjects: selectedDateActiveTasks.length,
      totalMilestones,
      completedMilestones,
      activeMilestones,
    };
  }, [selectedDateActiveTasks]);






  const keyExtractor = useCallback((item) => item.id.toString(), []);

  // Organize tasks by date (for calendar)
  const tasksByDate = useMemo(() => {
    const tasks = {};
    return tasks;
  }, [selectedDateString]);


  return (
    <View style={styles.container}>
        {/* Horizontal Calendar */}
        <HorizontalCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          tasksByDate={{}}
          milestones={[]}
        />
        
        {/* Today's Summary Header */}
        <View style={styles.summaryHeaderContainer}>
          <Text style={styles.summaryHeaderTitle}>Today's Summary</Text>
        </View>
        
        {/* Mood Statement */}
        <MoodStatement 
          activeTasks={activeTasks} 
          selectedDate={selectedDate}
          onPress={() => navigation.navigate('EmotionalJournal')}
        />
        
        {/* Daily Mood Summary with Progress */}
        <DailyMoodSummary
          activeTasks={activeTasks}
          selectedDate={selectedDate}
        />
        
        {/* Today's Summary Section */}
        <View style={styles.summaryContainer}>
        {selectedDateActiveTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No project on this date</Text>
            <Text style={styles.emptyText}>
              {(() => {
                const today = new Date();
                const selected = new Date(selectedDate);
                today.setHours(0, 0, 0, 0);
                selected.setHours(0, 0, 0, 0);
                
                if (selected < today) {
                  return "No project on this date";
                } else {
                  return "No active project on selected date.\nWould you like to create a new project?";
                }
              })()}
            </Text>
            {(() => {
              const today = new Date();
              const selected = new Date(selectedDate);
              today.setHours(0, 0, 0, 0);
              selected.setHours(0, 0, 0, 0);
              
              // Show button for today or future dates, OR when there are active projects
              if (selected >= today || selectedDateActiveTasks.length > 0) {
                return (
                  <TouchableOpacity 
                    style={styles.addProjectButton}
                    onPress={onAddProject}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.addProjectButtonText}>Add Project</Text>
                  </TouchableOpacity>
                );
              }
              return null;
            })()}
          </View>
        ) : (
          selectedDateActiveTasks.map((project) => (
            <TouchableOpacity 
              key={project.id} 
              style={[
              styles.projectSummaryCard,
              project.isLastDay && styles.lastDayProjectCard
              ]}
              onPress={() => setSelectedCard(project)}
              activeOpacity={0.7}
            >
              <View style={styles.projectHeader}>
                <Text style={[
                  styles.projectTitle,
                  project.isLastDay && styles.lastDayProjectTitle
                ]}>
                  {project.title}
                </Text>
                <View style={styles.dateContainer}>
                  <View style={[
                    styles.projectDateRange,
                    project.isLastDay && styles.lastDayDateRange
                  ]}>
                    <Text style={[
                      styles.dateText,
                      project.isLastDay && styles.lastDayDateText
                    ]}>
                      {new Date(project.startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })} - {new Date(project.endDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                    </Text>
                  </View>
                  {project.isLastDay && (
                    <View style={styles.lastDayBadge}>
                      <Ionicons name="warning" size={12} color="#FFFFFF" />
                      <Text style={styles.lastDayText}>Last Day</Text>
                    </View>
                  )}
                </View>
              </View>
              
              {/* Plus symbol under date */}
              <TouchableOpacity 
                style={styles.minimalAddMilestoneButton}
                onPress={() => {
                  console.log('Add milestone button pressed for project:', project.title);
                  setSelectedProjectForMilestone(project);
                  setAddMilestoneModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color="#007AFF" />
              </TouchableOpacity>
              
              {project.milestones && (project.milestones.filter(m => !m.completed && isMilestoneActiveToday(m, selectedDate)).length > 0 || project.milestones.some(m => completingMilestones.has(`${project.id}-${m.id}`))) ? (
                <View style={styles.milestonesList}>
                  {project.milestones.filter(m => (!m.completed && isMilestoneActiveToday(m, selectedDate)) || completingMilestones.has(`${project.id}-${m.id}`)).map((milestone, index) => {
                    const milestoneKey = `${project.id}-${milestone.id}`;
                    const isCompleting = completingMilestones.has(milestoneKey);
                    const isOverdue = isMilestoneOverdue(milestone, selectedDate);
                    const isLastDay = isMilestoneLastDay(milestone, selectedDate);
                    
                    return (
                    <TouchableOpacity 
                      key={milestone.id || index}
                      style={styles.milestoneItem}
                      onPress={() => openMilestone(milestone, project)}
                      onLongPress={() => {
                        if (!milestone.completed) {
                          handleMilestoneComplete(milestone, project);
                        }
                      }}
                      activeOpacity={0.7}
                      delayLongPress={500}
                    >
                      <View style={styles.milestoneInfo}>
                        <Ionicons 
                          name="ellipse" 
                          size={18} 
                          color={getMilestoneColor(milestone)} 
                        />
                        <View style={styles.milestoneContent}>
                          <View style={styles.milestoneTextContainer}>
                            <Text style={[
                              styles.milestoneText,
                              milestone.completed && styles.completedMilestoneText,
                              isCompleting && styles.completingMilestoneText,
                              isOverdue && styles.overdueMilestoneText,
                              isLastDay && styles.lastDayMilestoneText
                            ]}>
                              {milestone.title}
                            </Text>
                          </View>
                          {/* Mood sticker - only for selected day */}
                          {milestone.journalEntries && milestone.journalEntries.length > 0 && (
                            <View style={styles.moodStickers}>
                              {milestone.journalEntries
                                .filter(entry => {
                                  // Show only moods for selected day
                                  const entryDate = new Date(entry.createdAt).toDateString();
                                  const selectedDateStr = selectedDate.toDateString();
                                  return entryDate === selectedDateStr && (entry.mood || entry.moodIcon || entry.moodColor);
                                })
                                .slice(0, 3) // Maximum 3 mood stickers
                                .map((entry, index) => (
                                  <View 
                                    key={index} 
                                    style={[
                                      styles.moodSticker, 
                                      { backgroundColor: entry.moodColor || '#8E7DBE' }
                                    ]}
                                  >
                                  <MaterialIcons
                                    name={entry.moodIcon || entry.mood || 'sentiment-satisfied'}
                                    size={10}
                                    color="#333"
                                  />
                                  </View>
                                ))
                              }
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.addMilestoneButton}
                  onPress={() => {
                    console.log('Add milestone button pressed for project:', project.title);
                    setSelectedProjectForMilestone(project);
                    setAddMilestoneModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={16} color="#007AFF" />
                  <Text style={styles.addMilestoneText}>Add Milestone</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}

        {/* Add Project Button - Always visible when there are active projects */}
        {selectedDateActiveTasks.length > 0 && (
          <TouchableOpacity 
            style={styles.addProjectButton}
            onPress={onAddProject}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={18} color="#1976D2" />
            <Text style={styles.addProjectButtonText}>Add Project</Text>
          </TouchableOpacity>
        )}

      </View>
    </View>
  );
});

export default MyDayScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  summaryHeaderContainer: {
    marginHorizontal: 30,
    marginTop: 0, // 8'den 0'a düşürdüm - progress status üstüne aldım
    marginBottom: 8,
    paddingTop: 10, // Today's Summary padding top
  },
  summaryHeaderTitle: {
    fontSize: 18, // 24'ten 18'e düşürdüm - eski haline getirdim
    fontFamily: 'Poppins_600SemiBold',
    color: '#1D1D1F',
    letterSpacing: -0.5,
  },
  summaryContainer: {
    marginHorizontal: 30,
    marginTop: 8, // 16'dan 8'e düşürdüm - header'ı yukarıya aldım
  },
  emptyState: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 32,
    marginTop: 6, // 12'den 6'ya düşürdüm - daha kompakt
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1D1D1F',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  addProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF', // Açık mavi arka plan
    borderColor: '#1976D2', // Mavi border
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
    marginHorizontal: 30, // Proje kartlarıyla aynı margin
  },
  addProjectButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#1976D2', // Mavi ton
    marginLeft: 6,
  },
  projectSummaryCard: {
    backgroundColor: '#F0F8FF', // Açık mavi arka plan
    borderRadius: 12,
    padding: 16,
    marginTop: 6, // 12'den 6'ya düşürdüm - daha kompakt
    borderColor: '#1976D2', // Solid mavi border
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginHorizontal: 2,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  projectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  projectTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1976D2', // Mavi ton
    flex: 1,
  },
  projectDateRange: {
    backgroundColor: '#E3F2FD', // Açık mavi arka plan
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#1976D2', // Mavi ton
  },
  milestonesList: {
    marginTop: 8,
    marginLeft: 16,
  },
  milestoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(25, 118, 210, 0.1)', // Mavi ton border
  },
  milestoneInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  milestoneContent: {
    flex: 1,
    marginLeft: 12,
  },
  milestoneText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#1976D2', // Mavi ton
    marginBottom: 4,
  },
  completedMilestoneText: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
  },
  milestoneTextContainer: {
    position: 'relative',
    flex: 1,
  },
  completingMilestoneText: {
    color: '#8E8E93',
    opacity: 0.7,
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    textDecorationColor: '#8E8E93',
  },
  journalCount: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  journalCountText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#007AFF',
  },
  moodStickers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  moodSticker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 20,
    minHeight: 20,
    marginRight: 4,
    elevation: 1,
  },
  noMilestonesText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#8E8E93',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  overdueMilestoneText: {
    color: '#FF3B30',
  },
  lastDayMilestoneText: {
    color: '#FF9500',
  },
  addMilestoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  addMilestoneText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#007AFF',
    marginLeft: 6,
  },
  minimalAddMilestoneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 122, 255, 0.2)',
    alignSelf: 'flex-end',
  },
  // Son gününde olan projeler için özel style'lar
  lastDayProjectCard: {
    borderColor: '#8E7DBE',
    borderWidth: 1.5,
    backgroundColor: '#F8F6FF',
  },
  lastDayProjectTitle: {
    color: '#8E7DBE',
  },
  lastDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8E7DBE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
  },
  lastDayText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  lastDayDateRange: {
    backgroundColor: '#F0EDFF',
    borderColor: '#8E7DBE',
    borderWidth: 0.5,
  },
  lastDayDateText: {
    color: '#8E7DBE',
  },
});
