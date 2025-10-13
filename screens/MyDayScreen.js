// screens/MyDayScreen.js
import React, { useState, useMemo, useEffect, useCallback, memo } from "react";
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
} from "react-native";
import { useActiveTasks, useCompletedTasks, useTaskActions } from "../hooks/useTaskContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { MOODS, EXTENDED_MOODS } from '../utils/AIMoodPredictor';
import HorizontalCalendar from "../components/HorizontalCalendar";
import JourneyOverview from "../components/JourneyOverview";
import MoodTrend from "../components/MoodTrend";
import ActivityTimeline from "../components/ActivityTimeline";
import MoodCalendar from "../components/MoodCalendar";
import TodaysSummary from "../components/TodaysSummary";
import ProjectCard from "../components/ProjectCard";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from "@expo/vector-icons";

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
  const { completeMilestone, setActiveMilestone } = useTaskActions();
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  // Performance monitoring (only in development) - temporarily disabled
  // usePerformanceMonitor('MyDayScreen');

  const [completingMilestones, setCompletingMilestones] = useState(new Set());
  const [focusedProjects, setFocusedProjects] = useState(new Set());

  // Save focused projects to AsyncStorage
  const saveFocusedProjects = useCallback(async (projects) => {
    try {
      const projectIds = [...projects];
      await AsyncStorage.setItem('myDayFocusedProjects', JSON.stringify(projectIds));
    } catch (error) {
      console.error('Focused projeler kaydedilirken hata:', error);
    }
  }, []);

  // Load focused projects from AsyncStorage on mount only
  useEffect(() => {
    const loadFocusedProjects = async () => {
      try {
        const stored = await AsyncStorage.getItem('myDayFocusedProjects');
        if (stored) {
          const projectIds = JSON.parse(stored);
          // Enforce single focused project
          const firstId = Array.isArray(projectIds) && projectIds.length > 0 ? projectIds[0] : null;
          setFocusedProjects(firstId ? new Set([firstId]) : new Set());
        }
      } catch (error) {
        console.error('Focused projeler yuklenirken hata:', error);
      }
    };
    
    loadFocusedProjects();
  }, []);

  // Clean up deleted projects from focused list (only on activeTasks.length change)
  useEffect(() => {
    if (activeTasks.length === 0 || focusedProjects.size === 0) return;
    
    const activeProjectIds = activeTasks.map(task => task.id);
    const currentFocusedIds = [...focusedProjects];
    const validProjectIds = currentFocusedIds.filter(id => activeProjectIds.includes(id));
    
    if (validProjectIds.length !== currentFocusedIds.length) {
      // Keep only the first valid focused id (single selection)
      const newSet = validProjectIds.length > 0 ? new Set([validProjectIds[0]]) : new Set();
      setFocusedProjects(newSet);
      saveFocusedProjects(newSet);
    }
  }, [activeTasks.length, saveFocusedProjects]);

  // Toggle project focus
  const handleProjectLongPress = useCallback((project) => {
    setFocusedProjects(prev => {
      const wasFocused = prev.has(project.id);
      let newSet;
      if (wasFocused) {
        // Unfocus if already focused
        newSet = new Set();
        console.log(`Focused kaldırıldı: "${project.title}"`);
      } else {
        // Focus only this project (single selection)
        newSet = new Set([project.id]);
        console.log(`Focused eklendi: "${project.title}"`);
      }
      saveFocusedProjects(newSet);
      return newSet;
    });
  }, [saveFocusedProjects]);


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
    // SADECE BUGÃœN Ä°Ã‡Ä°N complete/uncomplete yapÄ±labilir
    const today = new Date();
    const selected = new Date(selectedDate);
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    
    if (today.getTime() !== selected.getTime()) {
      // BugÃ¼n deÄŸilse iÅŸlem yapma - KullanÄ±cÄ±ya bilgi ver
      const isPast = selected < today;
      Alert.alert(
        isPast ? 'â®ï¸ ' + (t('pastDateRestriction') || 'GeÃ§miÅŸ Tarih') : 'â­ï¸ ' + (t('futureDateRestriction') || 'Gelecek Tarih'),
        isPast 
          ? (t('cannotModifyPast') || 'GeÃ§miÅŸteki milestone\'larÄ± deÄŸiÅŸtiremezsiniz. Sadece bugÃ¼n iÃ§in complete/uncomplete yapabilirsiniz.')
          : (t('cannotModifyFuture') || 'Gelecekteki milestone\'larÄ± ÅŸimdiden complete edemezsiniz. Sadece bugÃ¼n iÃ§in iÅŸlem yapabilirsiniz.'),
        [{ text: 'Tamam', style: 'default' }]
      );
      return;
    }
    
    const milestoneKey = `${project.id}-${milestone.id}`;
    
    // EÄŸer milestone completed ise â†’ uncomplete yap (direkt, animasyonsuz)
    if (milestone.completed) {
      setActiveMilestone(project.id, milestone.id);
      return;
    }
    
    // EÄŸer milestone active ise â†’ complete yap (animasyonlu)
    // Milestone'u completing state'e ekle
    setCompletingMilestones(prev => new Set([...prev, milestoneKey]));
    
    // Complete milestone after 1.5 seconds and remove from completing state
    setTimeout(() => {
      try {
        completeMilestone(project.id, milestone.id);
        
        // Celebration'Ä± tetikle
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

  // Get mood info helper
  const getMoodInfo = useCallback((moodKey) => {
    const mood = MOODS.find(m => m.key === moodKey) || 
                 EXTENDED_MOODS.find(m => m.key === moodKey) || 
                 { key: moodKey, label: moodKey, icon: 'sentiment-neutral', color: '#8E8E93', category: 'neutral' };
    
    if (!mood.category) {
      mood.category = 'neutral';
    }
    
    return mood;
  }, []);

  // Mood rengini solid hale getir
  const getSolidMoodColor = useCallback((originalColor) => {
    const colorMap = {
      '#C8E6C9': '#4CAF50', '#FFE0B2': '#FF9800', '#E1BEE7': '#9C27B0',
      '#FFCDD2': '#F44336', '#FFAB91': '#FF5722', '#FFCCBC': '#FF7043',
      '#FFF3E0': '#FFB74D', '#E8F5E8': '#66BB6A', '#E1F5FE': '#42A5F5',
      '#FFF8E1': '#FFCA28', '#F3E5F5': '#BA68C8', '#FFEBEE': '#EF5350',
      '#E0E0E0': '#90A4AE', '#DCEDC8': '#8BC34A', '#F5F5F5': '#BDBDBD',
      '#FFE0E6': '#F48FB1', '#E8EAF6': '#7986CB', '#E0F2F1': '#4DB6AC',
      '#FFFDE7': '#FFF176', '#FAFAFA': '#E0E0E0', '#FFF9C4': '#FFF59D',
      '#FCE4EC': '#F06292', '#CFD8DC': '#90A4AE',
    };
    return colorMap[originalColor] || originalColor;
  }, []);

  // Project emotional progress hesaplama
  const getProjectEmotionalProgress = useCallback((project) => {
    if (!project.journalEntries || project.journalEntries.length === 0) {
      return null;
    }

    const projectMoods = [];
    const moodCounts = {};
    
    project.journalEntries.forEach(entry => {
      if (entry.mood) {
        const moodInfo = getMoodInfo(entry.mood);
        projectMoods.push({ mood: entry.mood, moodInfo, date: new Date(entry.createdAt) });
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
      }
    });
    
    if (projectMoods.length === 0) return null;
    
    const sortedMoods = Object.entries(moodCounts).sort(([,a], [,b]) => b - a);
    const dominantMoodKey = sortedMoods[0][0];
    const dominantMoodCount = sortedMoods[0][1];
    const dominantMoodInfo = getMoodInfo(dominantMoodKey);
    
    let totalMoodScore = 0;
    projectMoods.forEach(mood => {
      const score = mood.moodInfo.category === 'positive' ? 1 : 
                   mood.moodInfo.category === 'negative' ? -1 : 0;
      totalMoodScore += score;
    });
    
    const averageScore = totalMoodScore / projectMoods.length;
    let progressType = 'neutral';
    let progressColor = dominantMoodInfo ? getSolidMoodColor(dominantMoodInfo.color) : '#9E9E9E';
    
    if (dominantMoodInfo && dominantMoodInfo.category) {
      progressType = dominantMoodInfo.category;
    } else if (averageScore > 0.2) {
      progressType = 'positive';
      progressColor = '#4CAF50';
    } else if (averageScore < -0.2) {
      progressType = 'negative';
      progressColor = '#F44336';
    }
    
    const moodMessages = {
      happy: { msg: t('projectHappy'), icon: 'sentiment-satisfied' },
      excited: { msg: t('projectExcited'), icon: 'celebration' },
      grateful: { msg: t('projectGrateful'), icon: 'favorite' },
      motivated: { msg: t('projectMotivated'), icon: 'trending-up' },
      peaceful: { msg: t('projectPeaceful'), icon: 'spa' },
      sad: { msg: t('projectSad'), icon: 'sentiment-dissatisfied' },
      tired: { msg: t('projectTired'), icon: 'bedtime' },
      frustrated: { msg: t('projectFrustrated'), icon: 'psychology' },
      anxious: { msg: t('projectAnxious'), icon: 'warning' },
    };
    
    const moodMsg = moodMessages[dominantMoodInfo?.key] || { msg: t('projectDefault'), icon: 'trending-flat' };
    
    return {
      progressType,
      progressMessage: moodMsg.msg,
      progressIcon: moodMsg.icon,
      progressColor,
      averageScore,
      moodCount: projectMoods.length,
      dominantMood: dominantMoodKey,
      dominantMoodCount,
      dominantMoodInfo
    };
  }, [getMoodInfo, getSolidMoodColor, t]);

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
      // Focused project should come first
      const aIsFocused = focusedProjects.has(a.id);
      const bIsFocused = focusedProjects.has(b.id);
      if (aIsFocused && !bIsFocused) return -1;
      if (!aIsFocused && bIsFocused) return 1;

      // Then by last activity (desc)
      const dateA = new Date(a.lastMilestoneActivity);
      const dateB = new Date(b.lastMilestoneActivity);
      return dateB - dateA;
    });

    return sorted;
  }, [activeTasks, selectedDate, focusedProjects]);

  return (
    <View style={styles.container}>
        {/* Horizontal Calendar */}
        <HorizontalCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />
        
        {/* Journey Overview - Sadece bugün için göster */}
        {(() => {
          const today = new Date();
          const selected = new Date(selectedDate);
          today.setHours(0, 0, 0, 0);
          selected.setHours(0, 0, 0, 0);
          
          if (selected.getTime() === today.getTime()) {
            return (
              <JourneyOverview 
                activeTasks={activeTasks}
                completedTasks={completedTasks}
                selectedDate={selectedDate}
              />
            );
          }
          return null;
        })()}
        
        {/* Today's Summary */}
        <TodaysSummary
          selectedDateActiveTasks={selectedDateActiveTasks}
          selectedDate={selectedDate}
          activeTasks={activeTasks}
          completedTasks={completedTasks}
          navigation={navigation}
          onAddProject={onAddProject}
          ProjectCard={ProjectCard}
          setSelectedCard={setSelectedCard}
          setSelectedProjectForMilestone={setSelectedProjectForMilestone}
          setAddMilestoneModalVisible={setAddMilestoneModalVisible}
          completingMilestones={completingMilestones}
          isMilestoneActiveToday={isMilestoneActiveToday}
          isMilestoneOverdue={isMilestoneOverdue}
          isMilestoneLastDay={isMilestoneLastDay}
          openMilestone={openMilestone}
          handleMilestoneToggle={handleMilestoneToggle}
          onOpenJournal={onOpenJournal}
          isMilestoneCompletedToday={isMilestoneCompletedToday}
          focusedProjects={focusedProjects}
          handleProjectLongPress={handleProjectLongPress}
          getProjectEmotionalProgress={getProjectEmotionalProgress}
        />

        {/* Mood Trend - Sadece bugün için göster */}
        {(() => {
          const today = new Date();
          const selected = new Date(selectedDate);
          today.setHours(0, 0, 0, 0);
          selected.setHours(0, 0, 0, 0);
          
          if (selected.getTime() === today.getTime()) {
            return (
              <MoodTrend 
                activeTasks={activeTasks}
                completedTasks={completedTasks}
              />
            );
          }
          return null;
        })()}

        {/* Activity Timeline - Sadece bugün için göster */}
        {(() => {
          const today = new Date();
          const selected = new Date(selectedDate);
          today.setHours(0, 0, 0, 0);
          selected.setHours(0, 0, 0, 0);
          
          if (selected.getTime() === today.getTime()) {
            return (
              <ActivityTimeline 
                activeTasks={activeTasks}
                completedTasks={completedTasks}
              />
            );
          }
          return null;
        })()}

        {/* Mood Calendar - Sadece bugün için göster */}
        {(() => {
          const today = new Date();
          const selected = new Date(selectedDate);
          today.setHours(0, 0, 0, 0);
          selected.setHours(0, 0, 0, 0);
          
          if (selected.getTime() === today.getTime()) {
            return <MoodCalendar />;
          }
          return null;
        })()}

        {/* Add Project Button - Page bottom */}
        <View style={{ paddingHorizontal: 38, paddingTop: 12, paddingBottom: 24 }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: theme.name === 'dark' ? '#1976D2' : '#1976D2',
            }}
            activeOpacity={0.8}
            onPress={onAddProject}
          >
            <Ionicons name="add-circle" size={18} color="#FFFFFF" />
            <Text style={{
              color: '#FFFFFF',
              fontFamily: 'Poppins_600SemiBold',
              fontSize: 14,
              marginLeft: 8,
            }}>{t('addProject')}</Text>
          </TouchableOpacity>
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
});
