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
  Vibration,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useActiveTasks, useCompletedTasks, useTaskActions } from "../hooks/useTaskContext";
import { getMilestoneColor } from "../utils/milestoneColors";
import { usePerformanceMonitor } from "../hooks/usePerformanceMonitor";
import { ANIMATION_DURATIONS } from "../constants";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ActiveProject from "./ActiveProject";
import AddTaskModal from "../components/AddTaskModal";
import MoodTrend from "../components/MoodTrend";
import MoodCalendar from "../components/MoodCalendar";
import HorizontalCalendar from "../components/HorizontalCalendar";
import ProjectCard from "../components/ProjectCard";
import JourneyOverview from "../components/JourneyOverview";
import TodaysSummary from "../components/TodaysSummary";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Helpers, Typography } from '../constants';
import { MOODS, EXTENDED_MOODS } from '../utils/AIMoodPredictor';
import AnimatedReanimated from 'react-native-reanimated';
import { useAnimatedProps } from 'react-native-reanimated';
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
  , headerFullyCollapsed
  , headerShouldHandleJS
  , parentHandlesVertical
  , myDayContentScrollHandler
}) {
  const activeTasks = useActiveTasks();
  const completedTasks = useCompletedTasks();
  const { addMilestone, updateMilestone, completeMilestone, setActiveMilestone } = useTaskActions();
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  // Performance monitoring (only in development) - temporarily disabled
  // usePerformanceMonitor('MyDayScreen');

  const [completingMilestones, setCompletingMilestones] = useState(new Set());
  const [focusedProject, setFocusedProject] = useState(null); // Single project focus

  // Load focused project from AsyncStorage
  useEffect(() => {
    const loadFocusedProject = async () => {
      try {
        const stored = await AsyncStorage.getItem('myDayFocusedProject');
        if (stored) {
          const projectId = JSON.parse(stored);
          setFocusedProject(projectId);
        } else {
          // no focused project stored
        }
      } catch (error) {
        // ignore storage load errors here
      }
    };
    loadFocusedProject();
  }, []);

  // Save focused project to AsyncStorage
  const saveFocusedProject = useCallback(async (projectId) => {
    try {
      if (projectId) {
        await AsyncStorage.setItem('myDayFocusedProject', JSON.stringify(projectId));
      } else {
        await AsyncStorage.removeItem('myDayFocusedProject');
      }
    } catch (error) {
      // ignore storage save errors
    }
  }, []);

  // Toggle project focus (only one at a time)
  const handleProjectLongPress = useCallback((project) => {
    setFocusedProject(prev => {
      const wasFocused = prev === project.id;
      
      if (wasFocused) {
        saveFocusedProject(null);
        return null;
      } else {
        saveFocusedProject(project.id);
        return project.id;
      }
    });
  }, [saveFocusedProject]);

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
    
    // Eğer milestone active ise → complete yap (anında celebration ile)
    // Milestone'u completing state'e ekle
    setCompletingMilestones(prev => new Set([...prev, milestoneKey]));
    
    // Complete milestone immediately and trigger celebration
    try {
      completeMilestone(project.id, milestone.id);
      
      // Celebration'ı anında tetikle
      if (global.triggerCelebration) {
        // Pass only a small, serializable payload to the global trigger
        // to avoid moving large/circular project objects around which could
        // be accidentally captured by worklets.
        global.triggerCelebration({
          type: 'milestone',
          name: milestone.title,
          projectId: project.id,
          projectTitle: project.title,
          completedAt: Date.now(),
          project: { id: project.id, title: project.title }
        });
      }
      
      // Completing state'i kısa bir süre sonra temizle (sadece UI için)
      setTimeout(() => {
        setCompletingMilestones(prev => {
          const newSet = new Set(prev);
          newSet.delete(milestoneKey);
          return newSet;
        });
      }, 300);
    } catch (error) {
      // Hata durumunda completing state'i temizle
      setCompletingMilestones(prev => {
        const newSet = new Set(prev);
        newSet.delete(milestoneKey);
        return newSet;
      });
    }
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

  // Helper function to get mood info
  const getMoodInfo = useCallback((moodKey) => {
    const mood = MOODS.find(m => m.key === moodKey) || 
                 EXTENDED_MOODS.find(m => m.key === moodKey) || 
                 { key: moodKey, label: moodKey, icon: 'sentiment-neutral', color: '#8E8E93', category: 'neutral' };
    
    // Ensure category is set
    if (!mood.category) {
      mood.category = 'neutral';
    }
    
    return mood;
  }, []);

  const getSolidMoodColor = useCallback((originalColor) => {
    // Convert pale colors to more solid ones
    const colorMap = {
      // Basic MOODS (Updated colors)
      '#C8E6C9': '#4CAF50', // Happy - Light green
      '#FFE0B2': '#FF9800', // Excited - Light orange
      '#E1BEE7': '#9C27B0', // Tired - Light purple
      '#FFCDD2': '#F44336', // Sad - Light red
      '#FFAB91': '#FF5722', // Angry - Light deep orange
      
      // EXTENDED_MOODS (AI mood'ları) - Updated colors
      '#FFCCBC': '#FF7043', // Frustrated - Light brown
      '#FFF3E0': '#FFB74D', // Anxious - Light amber
      '#E8F5E8': '#66BB6A', // Grateful - Light mint green
      '#E1F5FE': '#42A5F5', // Hopeful - Light blue
      '#FFF8E1': '#FFCA28', // Proud - Light yellow
      '#F3E5F5': '#BA68C8', // Relieved - Light lavender
      '#FFEBEE': '#EF5350', // Overwhelmed - Light pink
      '#E0E0E0': '#90A4AE', // Lonely - Light gray
      '#DCEDC8': '#8BC34A', // Motivated - Light lime green
      '#F5F5F5': '#BDBDBD', // Confused - Very light gray
      '#FFE0E6': '#F48FB1', // Disappointed - Light rose
      '#E8EAF6': '#7986CB', // Nostalgic - Light indigo
      '#E0F2F1': '#4DB6AC', // Peaceful - Light teal
      '#FFFDE7': '#FFF176', // Curious - Light cream
      '#FAFAFA': '#E0E0E0', // Bored - Very light gray
      '#FFF9C4': '#FFF59D', // Surprised - Light yellow
      '#FCE4EC': '#F06292', // Worried - Light magenta
      '#CFD8DC': '#90A4AE', // Natural - Light gray
    };
    
    return colorMap[originalColor] || originalColor;
  }, []);

  // AI-powered motivation sentence generator - Mood-based
  const generateMotivationSentence = useCallback((project, progressType, dominantMood) => {
    const moodKey = dominantMood?.key || 'default';
    const randomIndex = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
    const translationKey = `motivation${moodKey.charAt(0).toUpperCase() + moodKey.slice(1)}${randomIndex}`;
    
    return t(translationKey);
  }, [t]);

  // Project emotional progress analysis - Mood-based evaluation (Sadece aktif projeler)
  const getProjectEmotionalProgress = useCallback((project) => {
    const projectProgress = [];
    
    if (project.journalEntries && project.journalEntries.length > 0) {
      const projectMoods = [];
      const moodCounts = {};
      
      // Collect all moods from this project (proje bazlı sistem)
      project.journalEntries.forEach(entry => {
        if (entry.mood) {
          const moodInfo = getMoodInfo(entry.mood);
          projectMoods.push({
            mood: entry.mood,
            moodInfo,
            date: new Date(entry.createdAt)
          });
          
          // Count each mood
          moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
        }
      });
      
      // Only show projects that have actual mood entries
      if (projectMoods.length > 0) {
        // Find the most frequent mood in the entire project
        const sortedMoods = Object.entries(moodCounts)
          .sort(([,a], [,b]) => b - a);
        
        const dominantMoodKey = sortedMoods[0][0];
        const dominantMoodCount = sortedMoods[0][1];
        const dominantMoodInfo = getMoodInfo(dominantMoodKey);
        
        // Calculate total mood score for progress type
        let totalMoodScore = 0;
        projectMoods.forEach(mood => {
          const score = mood.moodInfo.category === 'positive' ? 1 : 
                       mood.moodInfo.category === 'negative' ? -1 : 0;
          totalMoodScore += score;
        });
        
        const averageScore = totalMoodScore / projectMoods.length;
        let progressType = 'neutral';
        
        // ✨ YENİ: Dominant mood rengini kullan (active projects)
        let progressColor = dominantMoodInfo ? getSolidMoodColor(dominantMoodInfo.color) : '#9E9E9E';
        
        // Progress type'ı dominant mood category'sine göre belirle
        if (dominantMoodInfo && dominantMoodInfo.category) {
          progressType = dominantMoodInfo.category;
        } else if (averageScore > 0.2) {
          progressType = 'positive';
          progressColor = '#4CAF50';
        } else if (averageScore < -0.2) {
          progressType = 'negative';
          progressColor = '#F44336';
        }
        
        // Mood-specific project evaluation messages
        let progressMessage = '';
        let progressIcon = '';
        
        switch (dominantMoodInfo?.key) {
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
        
        // Generate AI motivation sentence based on dominant mood
        const motivationSentence = generateMotivationSentence(project, progressType, dominantMoodInfo);
        
        return {
          projectId: project.id,
          projectTitle: project.title,
          progressType,
          progressMessage,
          progressIcon,
          progressColor,
          averageScore,
          moodCount: projectMoods.length,
          dominantMood: dominantMoodKey,
          dominantMoodCount,
          dominantMoodInfo,
          motivationSentence
        };
      }
    }
    
    return null;
  }, [getMoodInfo, getSolidMoodColor, generateMotivationSentence, t]);

  const closeMilestone = useCallback(() => setSelectedMilestone(null), [setSelectedMilestone]);



  // selectedDate için default değer
  const safeSelectedDate = selectedDate ? new Date(selectedDate) : new Date();

  const handleJourneyOverviewPress = useCallback(() => {
    if (!navigation) {
      return;
    }

    const isoSelectedDate = (() => {
      try {
        return new Date(safeSelectedDate).toISOString();
      } catch (error) {
        return new Date().toISOString();
      }
    })();

    navigation.navigate('Overview', {
      selectedDate: isoSelectedDate,
    });
  }, [navigation, safeSelectedDate]);

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
      // Focused project always comes first
      const aIsFocused = focusedProject === a.id;
      const bIsFocused = focusedProject === b.id;
      
      if (aIsFocused && !bIsFocused) return -1;
      if (!aIsFocused && bIsFocused) return 1;
      
      // If both focused or both not focused, sort by last activity
      const dateA = new Date(a.lastMilestoneActivity);
      const dateB = new Date(b.lastMilestoneActivity);
      return dateB - dateA; // Most recent first
    });

    return sorted;
  }, [activeTasks, safeSelectedDate, focusedProject]);

  // Calculate milestones for today's summary - based on milestones active on that day
  const todaySummary = useMemo(() => {
    const totalMilestones = selectedDateActiveTasks.reduce((total, project) => {
      return total + (project.milestones?.filter(m => !m.completed && isMilestoneActiveToday(m, safeSelectedDate)).length || 0);
    }, 0);

    const completedMilestones = selectedDateActiveTasks.reduce((total, project) => {
      // Count milestones completed TODAY
      return total + (project.milestones?.filter(m => isMilestoneCompletedToday(m, safeSelectedDate)).length || 0);
    }, 0);

    const activeMilestones = totalMilestones;

    return {
      totalProjects: selectedDateActiveTasks.length,
      totalMilestones,
      completedMilestones,
      activeMilestones,
    };
  }, [selectedDateActiveTasks, safeSelectedDate, isMilestoneCompletedToday]);






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

  // Child scroll is handled natively; header collapse is driven by the
  // shared `globalCollapseProgress` via MainScreen's scroll handlers.

  const scrollRef = useRef(null);

  // header-expand auto-scroll registration removed — header no longer
  // programmatically scrolls child lists when it expands.

  return (
    <AnimatedReanimated.ScrollView
      ref={scrollRef}
      style={[styles.container, Helpers.container]}
      onScroll={myDayContentScrollHandler}
      scrollEventThrottle={16}
      scrollEnabled={true}
    >
        {/* Horizontal Calendar */}
        <HorizontalCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />
        
        {/* Today's Summary with Progress and Projects */}
          <TodaysSummary
          selectedDateActiveTasks={selectedDateActiveTasks}
          selectedDate={safeSelectedDate}
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
          focusedProjects={new Set(focusedProject ? [focusedProject] : [])}
          handleProjectLongPress={handleProjectLongPress}
          getProjectEmotionalProgress={getProjectEmotionalProgress}
          headerFullyCollapsed={headerFullyCollapsed}
          headerShouldHandleJS={headerShouldHandleJS}
          parentHandlesVertical={parentHandlesVertical}
        />
        
        {/* Journey Overview */}
        <View style={styles.componentSpacing}>
          <JourneyOverview
            activeTasks={activeTasks}
            completedTasks={completedTasks}
            selectedDate={safeSelectedDate}
            onPress={handleJourneyOverviewPress}
          />
        </View>
        
        {/* Mood Trend */}
        <View style={styles.componentSpacing}>
          <MoodTrend
            activeTasks={activeTasks}
            completedTasks={completedTasks}
            selectedDate={selectedDate}
          />
        </View>
        
        {/* Mood Calendar */}
        <View style={styles.componentSpacing}>
          <MoodCalendar />
        </View>
        
        {/* Bottom Add Project Button */}
        <View style={styles.bottomAddButtonContainer}>
          <TouchableOpacity 
            style={[
              styles.bottomAddProjectButton,
              {
                backgroundColor: theme.name === 'dark' ? '#FF6B6B' : '#007AFF',
              }
            ]}
            onPress={onAddProject}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="add" 
              size={24} 
              color="#FFFFFF" 
            />
            <Text style={styles.bottomAddProjectText}>
              {t('addProject')}
            </Text>
          </TouchableOpacity>
        </View>
    </AnimatedReanimated.ScrollView>
  );
});

export default MyDayScreen;

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  componentSpacing: {
    marginTop: 6,
  },
  todaysSummaryContainer: {
    marginTop: 6,
  },
  reducedSpacing: {
    marginTop: 8,
  },
  summaryHeaderContainer: {
    marginHorizontal: 30,
    marginTop: 12,
    marginBottom: 4,
  },
  summaryHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryHeaderTitle: {
    fontSize: 16,
    fontFamily: Typography.fonts.semiBold,
    letterSpacing: -0.5,
  },
  counterBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    padding: 0,
  },
  counterText: {
    fontSize: 12,
    fontFamily: Typography.fonts.semiBold,
    textAlign: 'center',
    // Better vertical centering on Android
    textAlignVertical: 'center',
    includeFontPadding: false,
    // Remove letter spacing to avoid visual offset
    letterSpacing: 0,
    lineHeight: 14,
  },
  summaryContainer: {
    marginHorizontal: 30,
  },
  emptyState: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 32,
    marginTop: 6,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Typography.fonts.semiBold,
    color: '#1D1D1F',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Typography.fonts.regular,
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
    marginHorizontal: 24, // Proje kartlarıyla aynı margin
  },
  addProjectButtonText: {
    fontSize: 14,
    fontFamily: Typography.fonts.medium,
    marginLeft: 6,
  },
  projectSummaryCard: {
    borderRadius: 16,
    padding: 20,
    marginTop: 6, // 12'den 6'ya düşürdüm - daha kompakt
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    marginHorizontal: 0,
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
    fontFamily: Typography.fonts.semiBold,
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
    fontFamily: Typography.fonts.semiBold,
    color: '#FFFFFF',
  },
  projectDateRange: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 12,
    fontFamily: Typography.fonts.medium,
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
    fontFamily: Typography.fonts.regular,
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
    fontFamily: Typography.fonts.medium,
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
    fontFamily: Typography.fonts.medium,
    color: '#007AFF',
  },
  // Mood sticker styles removed
  noMilestonesText: {
    fontSize: 14,
    fontFamily: Typography.fonts.regular,
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
    fontFamily: Typography.fonts.medium,
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
    fontFamily: Typography.fonts.medium,
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
    fontFamily: Typography.fonts.semiBold,
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
    fontFamily: Typography.fonts.semiBold,
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
    fontFamily: Typography.fonts.medium,
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
    fontFamily: Typography.fonts.semiBold,
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
  // Minimal Add Project Button Styles
  minimalAddProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  minimalAddContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  minimalAddIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  minimalAddText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  // Bottom Add Project Button Styles
  bottomAddButtonContainer: {
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 30,
  },
  bottomAddProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    alignSelf: 'center',
  },
  bottomAddProjectText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  // Progress Status Styles
  progressStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    marginTop: 4,
    marginHorizontal: 30,
    marginBottom: 8,
  },
  progressIconContainer: {
    marginRight: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContent: {
    flex: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
  progressPercentage: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  progressBarContainer: {
    marginBottom: 0,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
    borderRadius: 2,
  },
});
