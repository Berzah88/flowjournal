// screens/MyDayScreen.js
import React, { useState, useRef, useMemo, useEffect, useCallback, memo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Dimensions,
  TextInput,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useActiveTasks, useCompletedTasks, useTaskActions } from "../hooks/useTaskContext";
import { getMilestoneColor } from "../utils/milestoneColors";
import { usePerformanceMonitor } from "../hooks/usePerformanceMonitor";
import { ANIMATION_DURATIONS } from "../constants";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ActiveProject from "./ActiveProject";
import AddMilestoneModal from "../components/AddMilestoneModal";
import DailyMoodSummary from "../components/DailyMoodSummary";
import HorizontalCalendar from "../components/HorizontalCalendar";
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const completedTasks = useCompletedTasks();
  const { addMilestone, updateMilestone, completeMilestone, setActiveMilestone } = useTaskActions();
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  // Performance monitoring (only in development) - temporarily disabled
  // usePerformanceMonitor('MyDayScreen');

  const [completingMilestones, setCompletingMilestones] = useState(new Set());
  const [focusedProjects, setFocusedProjects] = useState(new Set());

  // Load focused projects from AsyncStorage
  useEffect(() => {
    const loadFocusedProjects = async () => {
      try {
        const stored = await AsyncStorage.getItem('myDayFocusedProjects');
        if (stored) {
          const projectIds = JSON.parse(stored);
          setFocusedProjects(new Set(projectIds));
          console.log('✅ Focused projeler yüklendi:', projectIds);
        } else {
          console.log('ℹ️ Henüz focused proje yok');
        }
      } catch (error) {
        console.error('❌ Focused projeler yüklenirken hata:', error);
      }
    };
    loadFocusedProjects();
  }, []);

  // Save focused projects to AsyncStorage
  const saveFocusedProjects = useCallback(async (projects) => {
    try {
      const projectIds = [...projects];
      await AsyncStorage.setItem('myDayFocusedProjects', JSON.stringify(projectIds));
      console.log('💾 Focused projeler kaydedildi:', projectIds);
    } catch (error) {
      console.error('❌ Focused projeler kaydedilirken hata:', error);
    }
  }, []);

  // Toggle project focus
  const handleProjectLongPress = useCallback((project) => {
    setFocusedProjects(prev => {
      const newSet = new Set(prev);
      const wasFocused = newSet.has(project.id);
      
      if (wasFocused) {
        newSet.delete(project.id);
        console.log(`🔄 "${project.title}" artık focused değil`);
      } else {
        newSet.add(project.id);
        console.log(`⭐ "${project.title}" focused oldu`);
      }
      
      saveFocusedProjects(newSet);
      return newSet;
    });
  }, [saveFocusedProjects]);

  // Memoized handlers to prevent unnecessary re-renders
     const openCard = useCallback((card) => {
       setSelectedCard(card);
     }, [setSelectedCard]);
     const closeCard = useCallback(() => {
       setSelectedCard(null);
     }, [setSelectedCard]);

  const openMilestone = useCallback((milestone, project) => {
    // Project-based journal system - open journal for the entire project
    const projectData = {
      id: 'project-journal',
      title: t('projectJournal'),
      taskId: project.id,
      projectTitle: project.title || '',
      isProjectBased: true
    };
    onOpenJournal(projectData);
  }, [onOpenJournal]);

  const handleMilestoneToggle = useCallback((milestone, project, selectedDate) => {
    // SADECE BUGÜN İÇİN complete/uncomplete yapılabilir
    const today = new Date();
    const selected = new Date(selectedDate);
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    
    if (today.getTime() !== selected.getTime()) {
      // Bugün değilse işlem yapma - Kullanıcıya bilgi ver
      const isPast = selected < today;
      Alert.alert(
        isPast ? '⏮️ ' + (t('pastDateRestriction') || 'Geçmiş Tarih') : '⏭️ ' + (t('futureDateRestriction') || 'Gelecek Tarih'),
        isPast 
          ? (t('cannotModifyPast') || 'Geçmişteki milestone\'ları değiştiremezsiniz. Sadece bugün için complete/uncomplete yapabilirsiniz.')
          : (t('cannotModifyFuture') || 'Gelecekteki milestone\'ları şimdiden complete edemezsiniz. Sadece bugün için işlem yapabilirsiniz.'),
        [{ text: 'Tamam', style: 'default' }]
      );
      return;
    }
    
    const milestoneKey = `${project.id}-${milestone.id}`;
    
    // Eğer milestone completed ise → uncomplete yap (direkt, animasyonsuz)
    if (milestone.completed) {
      setActiveMilestone(project.id, milestone.id);
      return;
    }
    
    // Eğer milestone active ise → complete yap (animasyonlu)
    // Milestone'u completing state'e ekle
    setCompletingMilestones(prev => new Set([...prev, milestoneKey]));
    
    // Complete milestone after 1.5 seconds and remove from completing state
    setTimeout(() => {
      try {
        completeMilestone(project.id, milestone.id);
        
        // Celebration'ı tetikle
        if (global.triggerCelebration) {
          setTimeout(() => {
            global.triggerCelebration({
              type: 'milestone',
              name: milestone.title,
              projectId: project.id,
              projectTitle: project.title,
              completedAt: Date.now(),
              project: project
            });
          }, 100); // Complete animasyonundan sonra
        }
        
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
  }, [completeMilestone, setActiveMilestone, t]);

  // Check if milestone was completed today
  const isMilestoneCompletedToday = useCallback((milestone, selectedDate) => {
    if (!milestone.completed || !milestone.completedAt) return false;
    
    const completedDate = new Date(milestone.completedAt);
    const selected = new Date(selectedDate);
    
    completedDate.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    
    return completedDate.getTime() === selected.getTime();
  }, []);

  // Check if milestone is suitable for today - SHOW OVERDUE MILESTONES
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
    
    // REMOVED: End date check - now show overdue milestones too
    // Milestones will be shown until they are completed, regardless of end date
    
    return true; // Show all milestones that have started (including overdue ones)
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
      
      // NEW LOGIC: Show project if:
      // 1. Project is not completed AND
      // 2. Start date is before or equal to selected date
      // This means projects will continue to show until they are completed
      const isNotCompleted = !task.completed;
      const hasStarted = selectedDateObj >= startDate;
      
      return isNotCompleted && hasStarted;
    }).map(task => {
      // Mark projects on their last day
      const endDate = new Date(task.endDate);
      const selectedDateObj = new Date(selectedDate);
      
      endDate.setHours(0, 0, 0, 0);
      selectedDateObj.setHours(0, 0, 0, 0);
      
      const isLastDay = selectedDateObj.getTime() === endDate.getTime();
      
      // Check if project is overdue (past end date but not completed)
      const isOverdue = selectedDateObj > endDate && !task.completed;
      
      // Calculate days overdue
      const daysOverdue = isOverdue ? Math.ceil((selectedDateObj - endDate) / (1000 * 60 * 60 * 24)) : 0;
      
      // Get the most recent milestone activity timestamp
      const getLastMilestoneActivity = (task) => {
        // Start with task creation date
        let lastActivity = task.createdAt || task.startDate || 0;
        
        // Check milestone activities
        if (task.milestones && task.milestones.length > 0) {
          task.milestones.forEach(milestone => {
            // Check milestone creation date
            if (milestone.createdAt && new Date(milestone.createdAt) > new Date(lastActivity)) {
              lastActivity = milestone.createdAt;
            }
            
            // Check milestone completion date
            if (milestone.completedAt && new Date(milestone.completedAt) > new Date(lastActivity)) {
              lastActivity = milestone.completedAt;
            }
          });
        }
        
        // Check project-based journal entries (NEW SYSTEM)
        if (task.journalEntries && task.journalEntries.length > 0) {
          task.journalEntries.forEach(entry => {
            if (entry.createdAt && new Date(entry.createdAt) > new Date(lastActivity)) {
              lastActivity = entry.createdAt;
            }
          });
        }
        
        // Check legacy milestone-based journal entries (OLD SYSTEM - for backward compatibility)
        if (task.milestones && task.milestones.length > 0) {
          task.milestones.forEach(milestone => {
            if (milestone.journalEntries && milestone.journalEntries.length > 0) {
              milestone.journalEntries.forEach(entry => {
                if (entry.createdAt && new Date(entry.createdAt) > new Date(lastActivity)) {
                  lastActivity = entry.createdAt;
                }
              });
            }
          });
        }
        
        return lastActivity;
      };
      
      return {
        ...task,
        isLastDay: isLastDay,
        isOverdue: isOverdue,
        daysOverdue: daysOverdue,
        lastMilestoneActivity: getLastMilestoneActivity(task),
      };
    });
    
    // Sort by focused status first, then by last milestone activity
    const sorted = filtered.sort((a, b) => {
      // Focused projects always come first
      const aIsFocused = focusedProjects.has(a.id);
      const bIsFocused = focusedProjects.has(b.id);
      
      if (aIsFocused && !bIsFocused) return -1;
      if (!aIsFocused && bIsFocused) return 1;
      
      // If both focused or both not focused, sort by last activity
      const dateA = new Date(a.lastMilestoneActivity);
      const dateB = new Date(b.lastMilestoneActivity);
      return dateB - dateA; // Most recent first
    });

    return sorted;
  }, [activeTasks, selectedDate, focusedProjects]);

  // Calculate milestones for today's summary - based on milestones active on that day
  const todaySummary = useMemo(() => {
    const totalMilestones = selectedDateActiveTasks.reduce((total, project) => {
      return total + (project.milestones?.filter(m => !m.completed && isMilestoneActiveToday(m, selectedDate)).length || 0);
    }, 0);

    const completedMilestones = selectedDateActiveTasks.reduce((total, project) => {
      // Count milestones completed TODAY
      return total + (project.milestones?.filter(m => isMilestoneCompletedToday(m, selectedDate)).length || 0);
    }, 0);

    const activeMilestones = totalMilestones;

    return {
      totalProjects: selectedDateActiveTasks.length,
      totalMilestones,
      completedMilestones,
      activeMilestones,
    };
  }, [selectedDateActiveTasks, selectedDate, isMilestoneCompletedToday]);






  const keyExtractor = useCallback((item) => item.id.toString(), []);

  // Organize tasks by date (for calendar)
  const tasksByDate = useMemo(() => {
    const tasks = {};
    if (activeTasks) {
      activeTasks.forEach(task => {
        const startDate = new Date(task.startDate);
        const endDate = new Date(task.endDate);
        
        // Her gün için task'i ekle
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateString = d.toDateString();
          if (!tasks[dateString]) {
            tasks[dateString] = [];
          }
          if (!tasks[dateString].find(t => t.id === task.id)) {
            tasks[dateString].push(task);
          }
        }
      });
    }
    return tasks;
  }, [activeTasks]);


  return (
    <View style={styles.container}>
        {/* Horizontal Calendar */}
        <HorizontalCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />
        
        {/* Today's Summary Header */}
        <View style={styles.summaryHeaderContainer}>
          <Text style={[
            styles.summaryHeaderTitle,
            { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
          ]}>{t('todaysSummary')}</Text>
        </View>
        
        {/* Daily Mood Summary with Progress */}
        <DailyMoodSummary
          activeTasks={activeTasks}
          completedTasks={completedTasks}
          selectedDate={selectedDate}
          navigation={navigation}
        />
        
        {/* Today's Summary Section */}
        <View style={styles.summaryContainer}>
        {selectedDateActiveTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#8E8E93" />
            <Text style={styles.emptyTitle}>{t('noProjectOnThisDate')}</Text>
            <Text style={styles.emptyText}>
              {(() => {
                const today = new Date();
                const selected = new Date(selectedDate);
                today.setHours(0, 0, 0, 0);
                selected.setHours(0, 0, 0, 0);
                
                if (selected < today) {
                  return t('noProjectOnThisDate');
                } else {
                  return t('noActiveProjectOnSelectedDate');
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
                    style={[
                      styles.addProjectButton,
                      {
                        backgroundColor: theme.name === 'dark' ? '#2C2C2E' : '#F0F8FF',
                        borderColor: theme.name === 'dark' ? '#636366' : '#1976D2',
                      }
                    ]}
                    onPress={onAddProject}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name="add-circle" 
                      size={20} 
                      color={theme.name === 'dark' ? '#FF6B6B' : '#1976D2'} 
                    />
                    <Text style={[
                      styles.addProjectButtonText,
                      { color: theme.name === 'dark' ? '#FF6B6B' : '#1976D2' }
                    ]}>{t('addProject')}</Text>
                  </TouchableOpacity>
                );
              }
              return null;
            })()}
          </View>
        ) : (
          selectedDateActiveTasks.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={index}
                isLastProject={index >= selectedDateActiveTasks.length - 1}
                theme={theme}
                t={t}
                setSelectedCard={setSelectedCard}
                setSelectedProjectForMilestone={setSelectedProjectForMilestone}
                setAddMilestoneModalVisible={setAddMilestoneModalVisible}
                completingMilestones={completingMilestones}
                selectedDate={selectedDate}
                isMilestoneActiveToday={isMilestoneActiveToday}
                isMilestoneOverdue={isMilestoneOverdue}
                isMilestoneLastDay={isMilestoneLastDay}
                openMilestone={openMilestone}
                handleMilestoneToggle={handleMilestoneToggle}
                onOpenJournal={onOpenJournal}
                isMilestoneCompletedToday={isMilestoneCompletedToday}
                isFocused={focusedProjects.has(project.id)}
                onProjectLongPress={handleProjectLongPress}
              />
            ))
        )}

        {/* Add Project Button - Always visible when there are active projects */}
        {selectedDateActiveTasks.length > 0 && (
          <TouchableOpacity 
            style={[
              styles.addProjectButton,
              {
                backgroundColor: theme.name === 'dark' ? '#2C2C2E' : '#F0F8FF',
                borderColor: theme.name === 'dark' ? '#FF6B6B' : '#1976D2',
              }
            ]}
            onPress={onAddProject}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="add-circle" 
              size={18} 
              color={theme.name === 'dark' ? '#FF6B6B' : '#1976D2'} 
            />
            <Text style={[
              styles.addProjectButtonText,
              { color: theme.name === 'dark' ? '#FF6B6B' : '#1976D2' }
            ]}>{t('addProject')}</Text>
          </TouchableOpacity>
        )}

      </View>
    </View>
  );
});

// Separate ProjectCard component to avoid hook violations in map
const ProjectCard = memo(function ProjectCard({
  project,
  index,
  isLastProject,
  theme,
  t,
  setSelectedCard,
  setSelectedProjectForMilestone,
  setAddMilestoneModalVisible,
  completingMilestones,
  selectedDate,
  isMilestoneActiveToday,
  isMilestoneOverdue,
  isMilestoneLastDay,
  openMilestone,
  handleMilestoneToggle,
  onOpenJournal,
  isMilestoneCompletedToday,
  isFocused,
  onProjectLongPress,
}) {
  // Instant touch animation (same as Card.js)
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  return (
    <TouchableWithoutFeedback
      onPressIn={() => scaleAnim.setValue(0.97)}
      onPressOut={() => scaleAnim.setValue(1)}
      onPress={() => {
        scaleAnim.setValue(1);
        setSelectedCard(project);
      }}
      onLongPress={() => {
        scaleAnim.setValue(1);
        onProjectLongPress(project);
      }}
      delayLongPress={500}
    >
      <Animated.View
        style={[
          styles.projectSummaryCard,
          {
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
            borderColor: theme.name === 'dark' ? '#000000' : '#1976D2',
            shadowColor: theme.name === 'dark' ? '#000000' : '#000',
            shadowOpacity: theme.name === 'dark' ? 0.3 : 0.06,
            shadowRadius: theme.name === 'dark' ? 12 : 8,
            elevation: theme.name === 'dark' ? 8 : 2,
            marginBottom: isLastProject ? 0 : 20,
            transform: [{ scale: scaleAnim }],
          },
          isFocused && {
            borderColor: '#FF9500',
            borderWidth: 2,
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFF9F0',
            shadowColor: '#FF9500',
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 12,
          },
          !isFocused && project.isLastDay && {
            borderColor: '#8E7DBE',
            borderWidth: 1.5,
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#F8F6FF',
          },
          !isFocused && project.isOverdue && {
            borderColor: '#FF4444',
            borderWidth: 1.5,
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFF5F5',
          }
        ]}
      >
        <View style={styles.projectHeader}>
          <View style={styles.projectTitleContainer}>
            <Text style={[
              styles.projectTitle,
              {
                color: theme.name === 'dark' ? '#FF6B6B' : '#1B2951',
              },
              isFocused && {
                color: theme.name === 'dark' ? '#FF9500' : '#FF9500',
              },
              !isFocused && project.isLastDay && {
                color: theme.name === 'dark' ? '#A78BFA' : '#8E7DBE',
              },
              !isFocused && project.isOverdue && {
                color: theme.name === 'dark' ? '#FF6666' : '#FF4444',
              }
            ]}>
              {project.title || ''}
            </Text>
            {isFocused && (
              <View style={[
                styles.focusedBadge,
                { backgroundColor: theme.name === 'dark' ? '#FF9500' : '#FF9500' }
              ]}>
                <Ionicons name="star" size={12} color="#FFFFFF" />
                <Text style={styles.focusedBadgeText}>{t('focused') || 'Focused'}</Text>
              </View>
            )}
          </View>
          <View style={styles.dateContainer}>
            <View style={[
              styles.projectDateRange,
              {
                backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#E3F2FD',
                borderColor: theme.name === 'dark' ? '#2C2C2E' : 'transparent',
                borderWidth: theme.name === 'dark' ? 0.5 : 0,
              },
              project.isLastDay && {
                backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#F0EDFF',
                borderColor: '#8E7DBE',
                borderWidth: 0.5,
              },
              project.isOverdue && {
                backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFE5E5',
                borderColor: '#FF4444',
                borderWidth: 0.5,
              }
            ]}>
              <Text style={[
                styles.dateText,
                {
                  color: theme.name === 'dark' ? '#8E8E93' : '#1B2951',
                },
                project.isLastDay && {
                  color: theme.name === 'dark' ? '#A78BFA' : '#8E7DBE',
                },
                project.isOverdue && {
                  color: theme.name === 'dark' ? '#FF6666' : '#FF4444',
                }
              ]}>
                {new Date(project.startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })} - {new Date(project.endDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
              </Text>
            </View>
            {project.isLastDay && (
              <View style={styles.lastDayBadge}>
                <Ionicons name="warning" size={12} color="#FFFFFF" />
                <Text style={styles.lastDayText}>{t('lastDay')}</Text>
              </View>
            )}
            {project.isOverdue && (
              <View style={[
                styles.overdueBadge,
                {
                  backgroundColor: theme.name === 'dark' ? '#FF4444' : '#FF4444',
                }
              ]}>
                <Ionicons name="alert-circle" size={12} color="#FFFFFF" />
                <Text style={styles.overdueText}>
                  {project.daysOverdue === 1 ? t('overdue1Day') : t('overdueDays', { days: project.daysOverdue })}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Milestone button under date - show for all projects */}
        <TouchableOpacity 
          style={[
            styles.minimalAddMilestoneButton,
            {
              backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(34, 139, 34, 0.1)',
              borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(34, 139, 34, 0.2)',
              borderWidth: 0.5,
            }
          ]}
          onPress={() => {
            setSelectedProjectForMilestone(project);
            setAddMilestoneModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={14} color={theme.name === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(34, 139, 34, 0.7)'} />
          <Text style={[
            styles.minimalAddMilestoneText,
            { color: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(34, 139, 34, 0.7)' }
          ]}>{t('milestone')}</Text>
        </TouchableOpacity>
        
        {project.milestones && project.milestones.length > 0 && (
          <View style={styles.milestonesList}>
            {(() => {
              // NEW FILTERING LOGIC: Show active milestones + today's completed milestones
              const filteredMilestones = project.milestones.filter(m => {
                // Always show if completing
                if (completingMilestones.has(`${project.id}-${m.id}`)) return true;
                
                // Show completed milestones ONLY if completed today
                if (m.completed) {
                  return isMilestoneCompletedToday(m, selectedDate);
                }
                
                // If milestone is a child
                if (m.parentId) {
                  const parent = project.milestones.find(p => p.id === m.parentId);
                  // Show child only if parent is not completed (or completed today)
                  if (parent && (!parent.completed || isMilestoneCompletedToday(parent, selectedDate))) {
                    return isMilestoneActiveToday(m, selectedDate);
                  }
                  // Don't show child if parent is completed (and not today)
                  return false;
                }
                
                // If milestone is a parent or standalone
                // Show if active and within date range
                return isMilestoneActiveToday(m, selectedDate);
              });
              
              // Organize hierarchically
              const organized = [];
              const childrenMap = {};
              
              // Group children by parent
              filteredMilestones.forEach(ms => {
                if (ms.parentId) {
                  if (!childrenMap[ms.parentId]) {
                    childrenMap[ms.parentId] = [];
                  }
                  childrenMap[ms.parentId].push(ms);
                }
              });
              
              // Add parents and their children in hierarchical order
              filteredMilestones.forEach(ms => {
                if (!ms.parentId) {
                  organized.push(ms);
                  // Add children right after parent
                  if (childrenMap[ms.id]) {
                    organized.push(...childrenMap[ms.id]);
                  }
                }
              });
              
              return organized.map((milestone, index) => {
                const milestoneKey = `${project.id}-${milestone.id}`;
                const isCompleting = completingMilestones.has(milestoneKey);
                const isOverdue = isMilestoneOverdue(milestone, selectedDate);
                const isLastDay = isMilestoneLastDay(milestone, selectedDate);
                const isChild = !!milestone.parentId;
                const children = project.milestones.filter(m => m.parentId === milestone.id);
                const hasChildren = children.length > 0;
                const completedChildren = children.filter(m => m.completed).length;
                
                return (
                <TouchableOpacity 
                  key={milestone.id || index}
                  style={[
                    styles.milestoneItem,
                    { marginLeft: isChild ? 20 : 0 }
                  ]}
                  onPress={() => openMilestone(milestone, project)}
                  onLongPress={() => {
                    // Toggle milestone: complete ↔ active (sadece bugün)
                    handleMilestoneToggle(milestone, project, selectedDate);
                  }}
                  activeOpacity={0.7}
                  delayLongPress={500}
                >
                  <View style={styles.milestoneInfo}>
                    <Ionicons 
                      name={milestone.completed ? "checkmark-circle" : "ellipse"}
                      size={18} 
                      color={
                        milestone.completed 
                          ? (theme.name === 'dark' ? '#34C759' : '#34C759')
                          : getMilestoneColor(milestone, theme.name)
                      } 
                    />
                    <View style={styles.milestoneContent}>
                      <View style={styles.milestoneTextContainer}>
                        <Text style={[
                          styles.milestoneText,
                          {
                            color: theme.name === 'dark' ? '#FFFFFF' : '#1976D2',
                          },
                          milestone.completed && styles.completedMilestoneText,
                          isCompleting && styles.completingMilestoneText,
                          isOverdue && !milestone.completed && styles.overdueMilestoneText,
                          isLastDay && !milestone.completed && styles.lastDayMilestoneText
                        ]}>
                          {milestone.title || ''}
                        </Text>
                        {milestone.completed && isMilestoneCompletedToday(milestone, selectedDate) && (
                          <Text style={[
                            styles.completedTodayBadge,
                            { color: theme.name === 'dark' ? '#34C759' : '#34C759' }
                          ]}>
                            {' '}✓ {t('completedToday') || 'Bugün tamamlandı'}
                          </Text>
                        )}
                      </View>
                      {/* Mood stickers removed */}
                    </View>
                  </View>
                </TouchableOpacity>
                );
              });
            })()}
          </View>
        )}


        {/* Journal Preview Section */}
        {(() => {
          // En son eklenen 2 journal entry'yi al (tarih fark etmeksizin)
          let recentEntries = [];
          
          if (project.journalEntries && Array.isArray(project.journalEntries)) {
            // En yeni entry'leri al (ProjectJourney mantığı)
            recentEntries = project.journalEntries
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 2)
              .map(entry => ({
                ...entry,
                milestoneTitle: entry.originalMilestoneTitle || entry.milestoneTitle || 'General Entry',
                milestoneColor: getMilestoneColor({ title: entry.originalMilestoneTitle || entry.milestoneTitle }, theme.name)
              }));
          }
          
          
          if (recentEntries.length > 0) {
            return (
              <View style={styles.journalPreviewSection}>
                <View style={styles.journalPreviewHeader}>
                  <Text style={[
                    styles.journalPreviewTitle,
                    { color: theme.name === 'dark' ? '#FFFFFF' : '#1B2951' }
                  ]}>
                    {t('recentEntries')}
                  </Text>
                </View>
                
                {recentEntries.map((entry, index) => (
                  <TouchableOpacity 
                    key={`${entry.id || index}-${entry.createdAt}`}
                    style={[
                      styles.journalPreviewCard,
                      {
                        backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                        borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                      }
                    ]}
                    onPress={() => {
                      // Open journal with specific entry
                      const projectData = {
                        id: 'project-journal',
                        title: t('projectJournal'),
                        taskId: project.id,
                        projectTitle: project.title || '',
                        isProjectBased: true,
                        editEntry: entry
                      };
                      onOpenJournal(projectData);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.journalPreviewContent}>
                      {/* Text özeti kaldırıldı - sadece tarih ve mood gösterilecek */}
                      
                      <View style={styles.journalPreviewFooter}>
                        <Text style={[
                          styles.journalPreviewDate,
                          { color: theme.name === 'dark' ? '#8E8E93' : '#666666' }
                        ]}>
                          {new Date(entry.createdAt).toLocaleDateString('tr-TR', { 
                            day: '2-digit', 
                            month: 'short' 
                          })} • {new Date(entry.createdAt).toLocaleTimeString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                        
                        {/* Mood sticker - Tarih ile aynı satırda */}
                        {entry.mood && (
                          <View style={[
                            styles.moodTag,
                            { 
                              backgroundColor: entry.moodColor || '#CFD8DC',
                              borderColor: theme.name === 'dark' 
                                ? 'rgba(255, 255, 255, 0.2)' 
                                : 'rgba(0, 0, 0, 0.1)',
                            }
                          ]}>
                            <MaterialIcons
                              name={entry.moodIcon || entry.mood || 'sentiment-neutral'}
                              size={10}
                              color={theme.name === 'dark' ? '#000000' : '#333'}
                            />
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            );
          }
          return null;
        })()}


        {/* Journal Add Button and Badge - Bottom of each project card */}
        <View style={styles.journalActionsContainer}>
          {/* Journal Count Badge */}
          {(() => {
            // Projedeki journal card sayısını say (benzersiz gün sayısı)
            // ProjectJourney'deki gibi currentTask.journalEntries kullan
            let journalCardCount = 0;
            
            if (project.journalEntries && Array.isArray(project.journalEntries)) {
              // Tarihleri grupla (ProjectJourney mantığı)
              const uniqueDates = new Set();
              project.journalEntries.forEach(entry => {
                if (entry.createdAt) {
                  const date = new Date(entry.createdAt);
                  const dateKey = date.toLocaleDateString('en-US', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  });
                  uniqueDates.add(dateKey);
                }
              });
              journalCardCount = uniqueDates.size;
            }
            
            
            if (journalCardCount > 0) {
              return (
                <View style={[
                  styles.journalCountBadge,
                  {
                    backgroundColor: theme.name === 'dark' ? '#007AFF' : '#007AFF',
                  }
                ]}>
                  <Ionicons name="journal" size={10} color="white" />
                  <Text style={styles.journalCountText}>{journalCardCount}</Text>
                </View>
              );
            }
            return <View style={styles.journalBadgePlaceholder} />;
          })()}
          
          {/* Journal Add Button */}
          <TouchableOpacity 
            style={[
              styles.addJournalButton,
              {
                backgroundColor: theme.name === 'dark' ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 122, 255, 0.05)',
                borderColor: theme.name === 'dark' ? 'rgba(0, 122, 255, 0.3)' : 'rgba(0, 122, 255, 0.2)',
                borderWidth: 1,
              }
            ]}
            onPress={() => {
              const projectData = {
                id: 'project-journal',
                title: t('projectJournal'),
                taskId: project.id,
                projectTitle: project.title || '',
                isProjectBased: true
              };
              onOpenJournal(projectData);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="journal-outline" size={16} color={theme.name === 'dark' ? '#007AFF' : '#007AFF'} />
            <Text style={[
              styles.addJournalText,
              { color: theme.name === 'dark' ? '#007AFF' : '#007AFF' }
            ]}>{t('addJournal')}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
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
    marginLeft: 6,
  },
  projectSummaryCard: {
    borderRadius: 16,
    padding: 20,
    marginTop: 6, // 12'den 6'ya düşürdüm - daha kompakt
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    marginHorizontal: 2,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  projectTitleContainer: {
    flexDirection: 'column',
    flex: 1,
    gap: 6,
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  projectTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    flexShrink: 1,
  },
  focusedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
  },
  focusedBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  projectDateRange: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
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
  completedTodayBadge: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    marginTop: 2,
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
  // Mood sticker styles removed
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  addMilestoneText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    marginLeft: 6,
  },
  minimalAddMilestoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 0.5,
    alignSelf: 'flex-end',
    width: 85,
    height: 36,
  },
  minimalAddMilestoneText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    marginLeft: 4,
  },
  // Son gününde olan projeler için özel style'lar
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
  // Gecikmiş projeler için özel style'lar
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  overdueText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  // Journal Add Button
  addJournalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    width: 85,
    height: 36,
  },
  addJournalText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    marginLeft: 4,
  },
  
  // Journal Preview Styles
  journalActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  journalCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  journalCountText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: 'white',
    marginLeft: 3,
  },
  journalBadgePlaceholder: {
    width: 30, // Badge genişliği kadar boş alan
    height: 20,
  },
  journalPreviewSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  journalPreviewHeader: {
    marginBottom: 8,
  },
  journalPreviewTitle: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  journalPreviewCard: {
    borderRadius: 12,
    padding: 8,
    marginBottom: 4,
    borderWidth: 0.5,
  },
  journalPreviewContent: {
    flex: 1,
  },
  // journalPreviewText kaldırıldı - artık text özeti gösterilmiyor
  journalPreviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  journalPreviewDate: {
    fontSize: 9,
    fontFamily: 'Poppins_500Medium',
    marginRight: 6,
  },
  moodTag: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
