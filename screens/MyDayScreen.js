// screens/MyDayScreen.js
import React, { useState, useMemo, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from 'expo-notifications';
import { MOODS, EXTENDED_MOODS } from '../utils/AIMoodPredictor';
import { useActiveTasks, useCompletedTasks, useTaskActions } from "../hooks/useTaskContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import HorizontalCalendar from "../components/HorizontalCalendar";
import ProjectCard from "../components/ProjectCard";
import MoodTrend from "../components/MoodTrend";
import MoodCalendar from "../components/MoodCalendar";
import TodaysSummary from "../components/TodaysSummary";
import JourneyOverview from "../components/JourneyOverview";
import ActivityTimeline from "../components/ActivityTimeline";
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  // Helper to map mood key to mood info (aligned with EmotionalJournal)
  const getMoodInfo = useCallback((moodKey) => {
    const mood = MOODS.find(m => m.key === moodKey) ||
                 EXTENDED_MOODS.find(m => m.key === moodKey) ||
                 { key: moodKey, label: moodKey, icon: 'sentiment-neutral', color: '#8E8E93', category: 'neutral' };
    if (!mood.category) mood.category = 'neutral';
    return mood;
  }, []);

  // Helper to solidify soft mood colors (same mapping as EmotionalJournal)
  const getSolidMoodColor = useCallback((originalColor) => {
    const colorMap = {
      '#C8E6C9': '#4CAF50',
      '#FFE0B2': '#FF9800',
      '#E1BEE7': '#9C27B0',
      '#FFCDD2': '#F44336',
      '#FFAB91': '#FF5722',
      '#FFCCBC': '#FF7043',
      '#FFF3E0': '#FFB74D',
      '#E8F5E8': '#66BB6A',
      '#E1F5FE': '#42A5F5',
      '#FFF8E1': '#FFCA28',
      '#F3E5F5': '#BA68C8',
      '#FFEBEE': '#EF5350',
      '#E0E0E0': '#90A4AE',
      '#DCEDC8': '#8BC34A',
      '#F5F5F5': '#BDBDBD',
      '#FFE0E6': '#F48FB1',
      '#E8EAF6': '#7986CB',
      '#E0F2F1': '#4DB6AC',
      '#FFFDE7': '#FFF176',
      '#FAFAFA': '#E0E0E0',
      '#FFF9C4': '#FFF59D',
      '#FCE4EC': '#F06292',
      '#CFD8DC': '#90A4AE',
    };
    return colorMap[originalColor] || originalColor;
  }, []);

  // Get project emotional progress for display (aligned with EmotionalJournal)
  const getProjectEmotionalProgress = useCallback((project) => {
    if (!project?.journalEntries || project.journalEntries.length === 0) return null;

    // Count moods across all entries for this project
    const moodCounts = {};
    project.journalEntries.forEach(entry => {
      if (entry?.mood) {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
      }
    });

    const sortedMoods = Object.entries(moodCounts).sort(([,a], [,b]) => b - a);
    if (sortedMoods.length === 0) return null;

    const dominantMoodKey = sortedMoods[0][0];
    const dominantMoodInfo = getMoodInfo(dominantMoodKey);

    // Color: use solid version of the mood color
    let progressColor = getSolidMoodColor(dominantMoodInfo.color) || '#9E9E9E';

    // Message & icon mapping exactly like EmotionalJournal active projects
    let progressMessage = '';
    let progressIcon = '';
    switch (dominantMoodInfo.key) {
      // Positive moods
      case 'happy':
        progressMessage = t('projectHappy');
        progressIcon = 'sentiment-satisfied';
        break;
      case 'excited':
        progressMessage = t('projectExcited');
        progressIcon = 'celebration';
        break;
      case 'grateful':
        progressMessage = t('projectGrateful');
        progressIcon = 'favorite';
        break;
      case 'hopeful':
        progressMessage = t('projectHopeful');
        progressIcon = 'wb-sunny';
        break;
      case 'proud':
        progressMessage = t('projectProud');
        progressIcon = 'emoji-events';
        break;
      case 'relieved':
        progressMessage = t('projectRelieved');
        progressIcon = 'spa';
        break;
      case 'motivated':
        progressMessage = t('projectMotivated');
        progressIcon = 'trending-up';
        break;
      case 'peaceful':
        progressMessage = t('projectPeaceful');
        progressIcon = 'spa';
        break;
      case 'content':
        progressMessage = t('projectContent');
        progressIcon = 'sentiment-satisfied';
        break;
      case 'confident':
        progressMessage = t('projectConfident');
        progressIcon = 'self-improvement';
        break;

      // Negative moods
      case 'sad':
        progressMessage = t('projectSad');
        progressIcon = 'sentiment-dissatisfied';
        break;
      case 'angry':
        progressMessage = t('projectAngry');
        progressIcon = 'mood-bad';
        break;
      case 'tired':
        progressMessage = t('projectTired');
        progressIcon = 'bedtime';
        break;
      case 'frustrated':
        progressMessage = t('projectFrustrated');
        progressIcon = 'psychology';
        break;
      case 'anxious':
        progressMessage = t('projectAnxious');
        progressIcon = 'warning';
        break;
      case 'overwhelmed':
        progressMessage = t('projectOverwhelmed');
        progressIcon = 'psychology';
        break;
      case 'lonely':
        progressMessage = t('projectLonely');
        progressIcon = 'person-off';
        break;
      case 'confused':
        progressMessage = t('projectConfused');
        progressIcon = 'help';
        break;
      case 'disappointed':
        progressMessage = t('projectDisappointed');
        progressIcon = 'sentiment-dissatisfied';
        break;
      case 'worried':
        progressMessage = t('projectWorried');
        progressIcon = 'psychology';
        break;
      case 'bored':
        progressMessage = t('projectBored');
        progressIcon = 'sentiment-neutral';
        break;
      case 'stressed':
        progressMessage = t('projectStressed');
        progressIcon = 'psychology';
        break;
      case 'exhausted':
        progressMessage = t('projectExhausted');
        progressIcon = 'bedtime';
        break;

      // Neutral moods
      case 'calm':
        progressMessage = t('projectCalm');
        progressIcon = 'spa';
        break;
      case 'curious':
        progressMessage = t('projectCurious');
        progressIcon = 'explore';
        break;
      case 'nostalgic':
        progressMessage = t('projectNostalgic');
        progressIcon = 'history';
        break;
      case 'surprised':
        progressMessage = t('projectSurprised');
        progressIcon = 'surprise';
        break;
      case 'focused':
        progressMessage = t('projectFocused');
        progressIcon = 'center-focus-strong';
        break;
      case 'neutral':
        progressMessage = t('projectNeutral');
        progressIcon = 'trending-flat';
        break;

      default:
        progressMessage = t('projectDefault');
        progressIcon = 'trending-flat';
    }

    return {
      progressColor,
      progressIcon,
      progressMessage,
      lastEntry: null,
    };
  }, [getMoodInfo, getSolidMoodColor, t]);




  // selectedDate için default değer
  const safeSelectedDate = selectedDate ? new Date(selectedDate) : new Date();

  // String format of selected date
  const selectedDateString = safeSelectedDate.toDateString();

  // Filter tasks for selected date (by date range)
  const selectedDateActiveTasks = useMemo(() => {
     if (!activeTasks || activeTasks.length === 0) {
       return [];
     }
    
    const filtered = activeTasks.filter(task => {
      const startDate = new Date(task.startDate);
      const endDate = new Date(task.endDate);
      const selectedDateObj = new Date(safeSelectedDate);
      
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
      const selectedDateObj = new Date(safeSelectedDate);
      
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
  }, [activeTasks, safeSelectedDate, focusedProjects]);










  return (
    <View style={styles.container}>
        {/* Horizontal Calendar */}
        <HorizontalCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />
        
        
        <View style={styles.componentContainer}>
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
        </View>

        <View style={styles.componentContainer}>
          <JourneyOverview
            activeTasks={activeTasks}
            completedTasks={completedTasks}
            selectedDate={selectedDate}
            navigation={navigation}
          />
        </View>

        <View style={styles.componentContainer}>
          <MoodTrend 
            activeTasks={activeTasks}
            completedTasks={completedTasks}
            selectedDate={selectedDate}
          />
        </View>

        <View style={styles.componentContainer}>
          <ActivityTimeline
            activeTasks={activeTasks}
            completedTasks={completedTasks}
          />
        </View>

        <View style={styles.componentContainer}>
          <MoodCalendar
            activeTasks={activeTasks}
            completedTasks={completedTasks}
            selectedDate={selectedDate}
          />
        </View>

        {/* Add Project Button */}
        <View style={styles.addProjectButtonContainer}>
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
    letterSpacing: -0.5,
  },
  summaryContainer: {
    marginHorizontal: 30,
    marginTop: 8, // 16'dan 8'e düşürdüm - header'ı yukarıya aldım
  },
  componentContainer: {
    marginTop: 4,
    marginBottom: 0,
  },
  addProjectButtonContainer: {
    marginTop: 4,
    marginBottom: 0,
    alignItems: 'flex-end',
    paddingRight: 38,
  },
  addProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 130,
  },
  addProjectButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    marginLeft: 6,
  },
});
