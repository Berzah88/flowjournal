// screens/EmotionalJournalScreen.js
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useActiveTasks, useCompletedTasks } from '../hooks/useTaskContext';
import { MOODS, EXTENDED_MOODS } from '../utils/AIMoodPredictor';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, ELEVATION } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import MoodCalendar from '../components/MoodCalendar';

const { width, height } = Dimensions.get('window');

const EmotionalJournalScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const activeTasks = useActiveTasks();
  const completedTasks = useCompletedTasks();

  // Günün dominant mood'unu hesapla (Yeni proje bazlı sistem)
  const todayDominantMood = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayMoods = [];
    const moodCounts = {};
    
    // Tüm projelerdeki günlükleri tara (sadece proje bazlı sistem)
    [...activeTasks, ...completedTasks].forEach(task => {
      if (task.journalEntries) {
        task.journalEntries.forEach(entry => {
          const entryDate = new Date(entry.createdAt);
          entryDate.setHours(0, 0, 0, 0);
          
          // Bugünkü entry'leri filtrele
          if (entryDate.getTime() === today.getTime() && entry.mood) {
            todayMoods.push({
              mood: entry.mood,
              moodIcon: entry.moodIcon,
              moodColor: entry.moodColor,
            });
            
            // Mood sayısını artır
            moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
          }
        });
      }
    });
    
    // En çok tekrar eden mood'u bul
    let dominantMood = null;
    let maxCount = 0;
    
    Object.entries(moodCounts).forEach(([mood, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantMood = MOODS.find(m => m.key === mood) || 
                       EXTENDED_MOODS.find(m => m.key === mood) || {
          key: mood,
          label: mood,
          icon: 'sentiment-satisfied',
          color: '#8E7DBE'
        };
      }
    });
    
    return dominantMood;
  }, [activeTasks, completedTasks]);

  // Tüm mood verilerini topla (Sadece proje bazlı sistem)
  const allMoodData = useMemo(() => {
    const moodEntries = [];
    const allTasks = [...activeTasks, ...completedTasks];
    
    allTasks.forEach(task => {
      if (task.journalEntries) {
        task.journalEntries.forEach(entry => {
          if (entry.mood || entry.moodIcon || entry.moodColor) {
            moodEntries.push({
              id: entry.id,
              mood: entry.mood,
              moodIcon: entry.moodIcon,
              moodColor: entry.moodColor,
              text: entry.text,
              createdAt: entry.createdAt,
              projectTitle: task.title,
              milestoneTitle: entry.originalMilestoneTitle || entry.milestoneTitle || 'General Entry',
              taskId: task.id,
              milestoneId: entry.originalMilestoneId || entry.milestoneId
            });
          }
        });
      }
    });
    
    return moodEntries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [activeTasks, completedTasks]);

  // Mood istatistikleri - Genişletilmiş
  const moodStats = useMemo(() => {
    const stats = {};
    const moodCounts = {};
    let totalWords = 0;
    
    allMoodData.forEach(entry => {
      const moodKey = entry.mood || 'unknown';
      moodCounts[moodKey] = (moodCounts[moodKey] || 0) + 1;
      
      // Kelime sayısını hesapla
      if (entry.text) {
        const words = entry.text.trim().split(/\s+/).filter(word => word.length > 0);
        totalWords += words.length;
      }
    });
    
    // En sık hissedilen mood'lar
    const sortedMoods = Object.entries(moodCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    // Son 7 günün mood'ları
    const last7Days = allMoodData.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return entryDate >= weekAgo;
    });
    
    // Son 30 günün mood'ları
    const last30Days = allMoodData.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      return entryDate >= monthAgo;
    });
    
    // Proje istatistikleri
    const activeProjects = activeTasks.length;
    const completedProjects = completedTasks.length;
    
    // Günlük girişi yapılan gün sayısı
    const uniqueDays = new Set();
    allMoodData.forEach(entry => {
      const date = new Date(entry.createdAt).toDateString();
      uniqueDays.add(date);
    });
    
    return {
      totalEntries: allMoodData.length,
      topMoods: sortedMoods,
      last7Days: last7Days.length,
      last30Days: last30Days.length,
      totalWords: totalWords,
      moodCounts,
      // Yeni istatistikler
      activeProjects,
      completedProjects,
      journalDays: uniqueDays.size,
    };
  }, [allMoodData, activeTasks, completedTasks]);

  // Mood trend analizi
  const moodTrend = useMemo(() => {
    const last7Days = allMoodData.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return entryDate >= weekAgo;
    });
    
    if (last7Days.length < 2) return null;
    
    const firstHalf = last7Days.slice(0, Math.ceil(last7Days.length / 2));
    const secondHalf = last7Days.slice(Math.ceil(last7Days.length / 2));
    
    // Mood kategorileri
    const positiveMoods = ['happy', 'excited', 'grateful', 'confident', 'calm', 'peaceful'];
    const negativeMoods = ['sad', 'angry', 'anxious', 'overwhelmed', 'tired', 'frustrated', 'stressed', 'exhausted', 'worried', 'disappointed'];
    const neutralMoods = ['neutral', 'curious', 'focused'];
    
    // İlk yarı analizi
    const firstHalfPositive = firstHalf.filter(entry => {
      return positiveMoods.includes(entry.mood);
    }).length;
    
    const firstHalfNegative = firstHalf.filter(entry => {
      return negativeMoods.includes(entry.mood);
    }).length;
    
    // İkinci yarı analizi
    const secondHalfPositive = secondHalf.filter(entry => {
      return positiveMoods.includes(entry.mood);
    }).length;
    
    const secondHalfNegative = secondHalf.filter(entry => {
      return negativeMoods.includes(entry.mood);
    }).length;
    
    // Net mood skoru hesapla (pozitif - negatif)
    const firstHalfNetScore = firstHalfPositive - firstHalfNegative;
    const secondHalfNetScore = secondHalfPositive - secondHalfNegative;
    
    
    // Trend belirleme
    if (secondHalfNetScore > firstHalfNetScore + 0.1) return 'improving';
    if (secondHalfNetScore < firstHalfNetScore - 0.1) return 'declining';
    return 'stable';
  }, [allMoodData]);

  // Activity Timeline analizi (Project Analyzer'dan adapte edildi)
  const timelineAnalysis = useMemo(() => {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentActivity = allMoodData.reduce((acc, entry) => {
      const entryDate = new Date(entry.createdAt);
      if (entryDate >= last30Days) {
        const dayKey = entryDate.toISOString().split('T')[0];
        if (!acc[dayKey]) acc[dayKey] = 0;
        acc[dayKey]++;
      }
      return acc;
    }, {});

    return {
      recentActivity,
      totalActivityDays: Object.keys(recentActivity).length,
      averageDailyActivity: Object.values(recentActivity).reduce((sum, count) => sum + count, 0) / 30
    };
  }, [allMoodData]);

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
    // Solgun renkleri daha solid hale getir
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
    };
    
    return colorMap[originalColor] || originalColor;
  }, []);

  const getTrendIcon = useCallback(() => {
    switch (moodTrend) {
      case 'improving': return 'trending-up';
      case 'declining': return 'trending-down';
      default: return 'remove';
    }
  }, [moodTrend]);

  // AI-powered motivation sentence generator - Mood-based
  const generateMotivationSentence = useCallback((project, progressType, dominantMood) => {
    const moodKey = dominantMood?.key || 'default';
    const randomIndex = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
    const translationKey = `motivation${moodKey.charAt(0).toUpperCase() + moodKey.slice(1)}${randomIndex}`;
    
    return t(translationKey);
  }, [t]);

  // Get projects without mood entries for encouragement (Proje bazlı sistem)
  const getProjectsWithoutMoods = useCallback(() => {
    const projectsWithoutMoods = [];
    
    activeTasks.forEach(task => {
      let hasMoodEntries = false;
      let totalJournalEntries = 0;
      
      // Check if project has mood entries (proje bazlı sistem)
      if (task.journalEntries) {
        totalJournalEntries = task.journalEntries.length;
        task.journalEntries.forEach(entry => {
          if (entry.mood) {
            hasMoodEntries = true;
          }
        });
      }
      
      // If no mood entries, add to encouragement list
      if (!hasMoodEntries) {
        // AI-powered motivation message generation based on project characteristics
        const generateMotivationMessage = (project, projectTotalEntries) => {
          const projectTitle = project.title.toLowerCase();
          const milestoneCount = project.milestones ? project.milestones.length : 0;
          const totalEntries = projectTotalEntries;
          
          // Analyze project characteristics for personalized messaging
          if (projectTitle.includes('learn') || projectTitle.includes('study') || projectTitle.includes('öğren')) {
            return t('learningJourneyMotivation');
          } else if (projectTitle.includes('work') || projectTitle.includes('çalış') || projectTitle.includes('iş')) {
            return t('workProjectMotivation');
          } else if (projectTitle.includes('health') || projectTitle.includes('sağlık') || projectTitle.includes('fitness')) {
            return t('healthProjectMotivation');
          } else if (projectTitle.includes('creative') || projectTitle.includes('yaratıcı') || projectTitle.includes('art')) {
            return t('creativeProjectMotivation');
          } else if (projectTitle.includes('personal') || projectTitle.includes('kişisel') || projectTitle.includes('self')) {
            return t('personalGrowthMotivation');
          } else if (milestoneCount > 5) {
            return t('complexProjectMotivation');
          } else if (milestoneCount <= 2) {
            return t('simpleProjectMotivation');
          } else if (totalEntries > 0) {
            return t('continueJournalingMotivation');
          } else {
            // Default motivational messages based on project ID for consistency
            const defaultMessages = [
              t('startYourEmotionalJourney'),
              t('captureYourFeelings'),
              t('documentYourProgress'),
              t('shareYourThoughts'),
              t('expressYourEmotions'),
              t('recordYourExperience'),
              t('tellYourStory'),
              t('reflectOnYourJourney')
            ];
            return defaultMessages[project.id % defaultMessages.length];
          }
        };
        
        const motivationMessage = generateMotivationMessage(task, totalJournalEntries);
        
        projectsWithoutMoods.push({
          projectId: task.id,
          projectTitle: task.title,
          milestoneCount: task.milestones ? task.milestones.length : 0,
          totalEntries: totalJournalEntries,
          motivationMessage: motivationMessage
        });
      }
    });
    
    return projectsWithoutMoods;
  }, [activeTasks]);

  // AI-powered insights and recommendations system
  const getInsightsAndRecommendations = useCallback(() => {
    const insights = [];
    const recommendations = [];
    
    // Analyze mood patterns
    const last7Days = allMoodData.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return entryDate >= weekAgo;
    });
    
    const last30Days = allMoodData.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      return entryDate >= monthAgo;
    });
    
    // Mood frequency analysis
    const moodCounts = {};
    last30Days.forEach(entry => {
      if (entry.mood) {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
      }
    });
    
    const sortedMoods = Object.entries(moodCounts)
      .sort(([,a], [,b]) => b - a);
    
    // Generate insights based on patterns
    if (sortedMoods.length > 0) {
      const dominantMood = sortedMoods[0][0];
      const dominantMoodInfo = getMoodInfo(dominantMood);
      const dominantCount = sortedMoods[0][1];
      const totalEntries = last30Days.length;
      const percentage = Math.round((dominantCount / totalEntries) * 100);
      
      // Insight 1: Dominant mood pattern
      insights.push({
        type: 'pattern',
        title: 'Your Emotional Pattern',
        message: `Over the last 30 days, you've felt ${dominantMoodInfo.label.toLowerCase()} ${percentage}% of the time.`,
        icon: dominantMoodInfo.icon,
        color: getSolidMoodColor(dominantMoodInfo.color)
      });
      
      // Insight 2: Mood trend
      if (moodTrend) {
        const trendMessages = {
          improving: 'Your emotional well-being is on an upward trend!',
          declining: 'You might want to focus on self-care and emotional support.',
          stable: 'You maintain a consistent emotional state.'
        };
        
        insights.push({
          type: 'trend',
          title: 'Mood Trend',
          message: trendMessages[moodTrend],
          icon: getTrendIcon(),
          color: getTrendColor()
        });
      }
      
      // Insight 3: Activity correlation
      const projectMoodCorrelation = getProjectMoodCorrelation();
      if (projectMoodCorrelation) {
        insights.push({
          type: 'correlation',
          title: t('projectImpact'),
          message: projectMoodCorrelation.message,
          icon: projectMoodCorrelation.icon,
          color: projectMoodCorrelation.color
        });
      }
    }
    
    // Generate recommendations based on insights
    if (sortedMoods.length > 0) {
      const dominantMood = sortedMoods[0][0];
      const dominantMoodInfo = getMoodInfo(dominantMood);
      
      // Recommendation based on dominant mood
      const moodRecommendations = {
        happy: [
          t('keepDoingHappy'),
          t('happinessContagious'),
          t('joyWellDeserved')
        ],
        excited: [
          t('channelExcitement'),
          t('enthusiasmPowerful'),
          t('energyPerfect')
        ],
        tired: [
          t('bodyAskingRest'),
          t('prioritizeSelfCare'),
          t('reassessWorkLife')
        ],
        sad: [
          t('okayToFeel'),
          t('sadnessTemporary'),
          t('considerCausingSadness')
        ],
        anxious: [
          t('anxietyManageable'),
          t('breakDownTasks'),
          t('listenAnxiety')
        ],
        frustrated: [
          t('frustrationSignalsGrowth'),
          t('identifyFrustration'),
          t('changeApproach')
        ],
        calm: [
          t('calmnessSuperpower'),
          t('tranquilityPerfect'),
          t('serenityValuable')
        ],
        motivated: [
          t('motivationStrong'),
          t('determinationAdvantage'),
          t('motivationInspiring')
        ]
      };
      
      const moodRecs = moodRecommendations[dominantMood] || [
        t('continueTracking'),
        t('setSmallGoals'),
        t('emotionalAwareness')
      ];
      
      recommendations.push({
        type: 'mood-based',
        title: t('personalizedRecommendation'),
        message: moodRecs[Math.floor(Math.random() * moodRecs.length)],
        icon: 'lightbulb',
        color: '#FF9800'
      });
    }
    
    // General recommendations
    if (last7Days.length < 3) {
      recommendations.push({
        type: 'activity',
        title: t('journalMore'),
        message: t('journalMoreMessage'),
        icon: 'edit',
        color: '#2196F3'
      });
    }
    
    if (sortedMoods.length < 3) {
      recommendations.push({
        type: 'diversity',
        title: t('emotionalDiversity'),
        message: t('emotionalDiversityMessage'),
        icon: 'explore',
        color: '#4CAF50'
      });
    }
    
    return { insights, recommendations };
  }, [allMoodData, moodTrend, getMoodInfo, getSolidMoodColor, getTrendIcon, getTrendColor]);

  // Project mood correlation analysis (Yeni proje bazlı sistem)
  const getProjectMoodCorrelation = useCallback(() => {
    const projectMoods = {};
    
    // Analyze mood patterns by project (sadece proje bazlı sistem)
    [...activeTasks, ...completedTasks].forEach(task => {
      if (task.journalEntries) {
        task.journalEntries.forEach(entry => {
          if (entry.mood) {
            if (!projectMoods[task.id]) {
              projectMoods[task.id] = {
                projectTitle: task.title,
                moods: []
              };
            }
            
            const moodInfo = getMoodInfo(entry.mood);
            projectMoods[task.id].moods.push({
              mood: entry.mood,
              moodInfo,
              date: new Date(entry.createdAt)
            });
          }
        });
      }
    });
    
    // Find project with strongest mood correlation
    let strongestProject = null;
    let strongestMood = null;
    let maxCount = 0;
    
    Object.entries(projectMoods).forEach(([projectName, projectData]) => {
      if (!projectData || !projectData.moods) return;
      
      const moodCounts = {};
      projectData.moods.forEach(mood => {
        moodCounts[mood.mood] = (moodCounts[mood.mood] || 0) + 1;
      });
      
      const sortedMoods = Object.entries(moodCounts)
        .sort(([,a], [,b]) => b - a);
      
      if (sortedMoods.length > 0 && sortedMoods[0][1] > maxCount) {
        maxCount = sortedMoods[0][1];
        strongestProject = projectData.projectTitle;
        strongestMood = sortedMoods[0][0];
      }
    });
    
    if (strongestProject && strongestMood) {
      const moodInfo = getMoodInfo(strongestMood);
      return {
        message: t('projectStrongestImpact', { project: strongestProject }),
        icon: 'trending-up',
        color: getSolidMoodColor(moodInfo.color)
      };
    }
    
    return null;
  }, [activeTasks, completedTasks, getMoodInfo, getSolidMoodColor]);


  // Get completed projects emotional progress analysis (Sadece tamamlanmış projeler)
  const getCompletedProjectEmotionalProgress = useCallback(() => {
    const projectProgress = [];
    
    completedTasks.forEach(task => {
      const projectMoods = [];
      const moodCounts = {};
      
      if (task.journalEntries) {
        task.journalEntries.forEach(entry => {
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
      }
      
      // Only show completed projects that have actual mood entries
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
          let progressColor = '#9E9E9E';
          
          if (averageScore > 0.2) {
            progressType = 'positive';
            progressColor = '#4CAF50';
          } else if (averageScore < -0.2) {
            progressType = 'negative';
            progressColor = '#F44336';
          }
          
          // Mood-specific completed project evaluation messages
          let progressMessage = '';
          let progressIcon = '';
          
          switch (dominantMoodInfo?.key) {
            // Positive moods - past tense
            case 'happy':
              progressMessage = t('completedProjectHappy');
              progressIcon = 'sentiment-satisfied';
              break;
            case 'excited':
              progressMessage = t('completedProjectExcited');
              progressIcon = 'celebration';
              break;
            case 'grateful':
              progressMessage = t('completedProjectGrateful');
              progressIcon = 'favorite';
              break;
            case 'hopeful':
              progressMessage = t('completedProjectHopeful');
              progressIcon = 'wb-sunny';
              break;
            case 'proud':
              progressMessage = t('completedProjectProud');
              progressIcon = 'emoji-events';
              break;
            case 'relieved':
              progressMessage = t('completedProjectRelieved');
              progressIcon = 'spa';
              break;
            case 'motivated':
              progressMessage = t('completedProjectMotivated');
              progressIcon = 'trending-up';
              break;
            case 'peaceful':
              progressMessage = t('completedProjectPeaceful');
              progressIcon = 'spa';
              break;
            case 'content':
              progressMessage = t('completedProjectContent');
              progressIcon = 'sentiment-satisfied';
              break;
            case 'confident':
              progressMessage = t('completedProjectConfident');
              progressIcon = 'self-improvement';
              break;
            
            // Negative moods - past tense
            case 'sad':
              progressMessage = t('completedProjectSad');
              progressIcon = 'sentiment-dissatisfied';
              break;
            case 'angry':
              progressMessage = t('completedProjectAngry');
              progressIcon = 'mood-bad';
              break;
            case 'tired':
              progressMessage = t('completedProjectTired');
              progressIcon = 'bedtime';
              break;
            case 'frustrated':
              progressMessage = t('completedProjectFrustrated');
              progressIcon = 'psychology';
              break;
            case 'anxious':
              progressMessage = t('completedProjectAnxious');
              progressIcon = 'warning';
              break;
            case 'overwhelmed':
              progressMessage = t('completedProjectOverwhelmed');
              progressIcon = 'psychology';
              break;
            case 'lonely':
              progressMessage = t('completedProjectLonely');
              progressIcon = 'person-off';
              break;
            case 'confused':
              progressMessage = t('completedProjectConfused');
              progressIcon = 'help';
              break;
            case 'disappointed':
              progressMessage = t('completedProjectDisappointed');
              progressIcon = 'sentiment-dissatisfied';
              break;
            case 'worried':
              progressMessage = t('completedProjectWorried');
              progressIcon = 'psychology';
              break;
            case 'bored':
              progressMessage = t('completedProjectBored');
              progressIcon = 'sentiment-neutral';
              break;
            case 'stressed':
              progressMessage = t('completedProjectStressed');
              progressIcon = 'psychology';
              break;
            case 'exhausted':
              progressMessage = t('completedProjectExhausted');
              progressIcon = 'bedtime';
              break;
            
            // Neutral moods - past tense
            case 'calm':
              progressMessage = t('completedProjectCalm');
              progressIcon = 'spa';
              break;
            case 'curious':
              progressMessage = t('completedProjectCurious');
              progressIcon = 'explore';
              break;
            case 'nostalgic':
              progressMessage = t('completedProjectNostalgic');
              progressIcon = 'history';
              break;
            case 'surprised':
              progressMessage = t('completedProjectSurprised');
              progressIcon = 'surprise';
              break;
            case 'focused':
              progressMessage = t('completedProjectFocused');
              progressIcon = 'center-focus-strong';
              break;
            case 'neutral':
              progressMessage = t('completedProjectNeutral');
              progressIcon = 'trending-flat';
              break;
            
            default:
              progressMessage = t('completedProjectDefault');
              progressIcon = 'check-circle';
          }
          
          // Generate AI motivation sentence based on dominant mood for completed projects
          const motivationSentence = generateMotivationSentence(task, progressType, dominantMoodInfo);
          
          projectProgress.push({
            projectId: task.id,
            projectTitle: task.title,
            progressType,
            progressMessage,
            progressIcon,
            progressColor,
            averageScore,
            moodCount: projectMoods.length,
            dominantMood: dominantMoodKey,
            dominantMoodCount,
            dominantMoodInfo,
            motivationSentence,
            isCompleted: true
          });
      }
    });
    
    return projectProgress.sort((a, b) => b.moodCount - a.moodCount);
  }, [completedTasks, getMoodInfo, generateMotivationSentence]);

  // Project emotional progress analysis - Mood-based evaluation (Sadece aktif projeler)
  const getProjectEmotionalProgress = useCallback(() => {
    const projectProgress = [];
    
    activeTasks.forEach(task => {
      if (task.journalEntries && task.journalEntries.length > 0) {
        const projectMoods = [];
        const moodCounts = {};
        
        // Collect all moods from this project (proje bazlı sistem)
        task.journalEntries.forEach(entry => {
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
          let progressColor = '#9E9E9E';
          
          if (averageScore > 0.2) {
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
          const motivationSentence = generateMotivationSentence(task, progressType, dominantMoodInfo);
          
          projectProgress.push({
            projectId: task.id,
            projectTitle: task.title,
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
          });
        }
      }
    });
    
    return projectProgress.sort((a, b) => b.moodCount - a.moodCount);
  }, [activeTasks, getMoodInfo, generateMotivationSentence]);

  const getTrendColor = useCallback(() => {
    switch (moodTrend) {
      case 'improving': return '#34C759';
      case 'declining': return '#FF3B30';
      default: return '#8E8E93';
    }
  }, [moodTrend]);

  const getTrendText = useCallback(() => {
    switch (moodTrend) {
      case 'improving': return t('moodImproving');
      case 'declining': return t('moodDeclining');
      default: return t('moodStable');
    }
  }, [moodTrend, t]);

  // Günün mood'una göre gradient renkleri hesapla - Karanlık tema optimize edildi
  const getMoodGradientColors = useCallback(() => {
    if (!todayDominantMood) {
      return theme.name === 'dark' 
        ? ['#050505', '#0F0F0F', '#1A1A1A', '#2A2A2A'] // Daha koyu karanlık geçiş
        : ['#FAFAFA', '#F5F3FF', '#EDE9FE'];
    }
    
    const baseColor = getSolidMoodColor(todayDominantMood.color);
    // Hex rengi RGB'ye çevir
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    if (theme.name === 'dark') {
      // Karanlık tema: mood renginden deep dark tonlara geçiş - daha koyu
      const deepBlack = '#050505';
      const darkerBlack = '#0F0F0F';
      const softBlack = '#1A1A1A';
      const moodAccent = `rgba(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)}, 0.08)`;
      const moodHighlight = `rgba(${r}, ${g}, ${b}, 0.05)`;
      
      return [deepBlack, darkerBlack, softBlack, moodAccent, moodHighlight];
    } else {
      // Açık tema: mood renginden beyaza geçiş (mevcut mantık)
      const lightColor = `rgba(${r}, ${g}, ${b}, 0.08)`;
      const mediumColor = `rgba(${r}, ${g}, ${b}, 0.15)`;
      const baseColorWithAlpha = `rgba(${r}, ${g}, ${b}, 0.25)`;
      
      return [lightColor, mediumColor, baseColorWithAlpha];
    }
  }, [todayDominantMood, theme.name]);

  if (allMoodData.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={getMoodGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradientBackground}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={[
                styles.backButton,
                {
                  backgroundColor: theme.name === 'dark' ? 'rgba(28, 28, 30, 0.95)' : COLORS.WHITE,
                  borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : COLORS.GRAY[200],
                  shadowColor: theme.name === 'dark' ? '#000000' : COLORS.BLACK,
                  shadowOpacity: theme.name === 'dark' ? 0.4 : 0.1,
                  shadowRadius: theme.name === 'dark' ? 16 : 4,
                  elevation: theme.name === 'dark' ? 12 : ELEVATION.SM,
                  borderWidth: theme.name === 'dark' ? 1 : 1,
                }
              ]}
            >
              <Ionicons 
                name="arrow-back" 
                size={24} 
                color={theme.name === 'dark' ? '#FF6B6B' : '#333'} 
              />
            </TouchableOpacity>
            <Text style={[
              styles.headerTitle,
              { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
            ]}>{t('journal')}</Text>
            <View style={styles.placeholder} />
          </View>
          
          <View style={styles.emptyState}>
            <Ionicons 
              name="heart-outline" 
              size={64} 
              color={theme.name === 'dark' ? '#8E8E93' : '#8E8E93'} 
            />
            <Text style={[
              styles.emptyTitle,
              { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
            ]}>{t('noMoodDataYet')}</Text>
            <Text style={[
              styles.emptyText,
              { color: theme.name === 'dark' ? '#8E8E93' : COLORS.GRAY[500] }
            ]}>
              {t('startWritingJournal')}
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={getMoodGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientBackground}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[
              styles.backButton,
              {
                backgroundColor: theme.name === 'dark' ? 'rgba(28, 28, 30, 0.95)' : COLORS.WHITE,
                borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : COLORS.GRAY[200],
                shadowColor: theme.name === 'dark' ? '#000000' : COLORS.BLACK,
                shadowOpacity: theme.name === 'dark' ? 0.4 : 0.1,
                shadowRadius: theme.name === 'dark' ? 16 : 4,
                elevation: theme.name === 'dark' ? 12 : ELEVATION.SM,
                borderWidth: theme.name === 'dark' ? 1 : 1,
              }
            ]}
          >
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={theme.name === 'dark' ? '#FF6B6B' : '#333'} 
            />
          </TouchableOpacity>
          <Text style={[
            styles.headerTitle,
            { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
          ]}>{t('journal')}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Overview Stats - Compact and balanced */}
        <View style={styles.statsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[
              styles.sectionTitle,
              { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
            ]}>{t('journeyOverview')}</Text>
            <View style={[
              styles.progressFlowIndicator,
              { backgroundColor: theme.name === 'dark' ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.1)' }
            ]}>
              <MaterialIcons 
                name="analytics" 
                size={18} 
                color={theme.name === 'dark' ? '#1976D2' : '#1976D2'} 
              />
            </View>
          </View>
          <View style={[
            styles.overviewCard, 
            { 
              borderLeftColor: getSolidMoodColor(todayDominantMood?.color) || COLORS.PRIMARY,
              backgroundColor: theme.name === 'dark' ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              shadowColor: theme.name === 'dark' ? '#000000' : COLORS.BLACK,
              shadowOpacity: theme.name === 'dark' ? 0.4 : 0.1,
              shadowRadius: theme.name === 'dark' ? 16 : 8,
              elevation: theme.name === 'dark' ? 12 : ELEVATION.MD,
              borderWidth: theme.name === 'dark' ? 1 : 0,
              borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            }
          ]}>
            <View style={styles.overviewGrid}>
              {/* Active Projects */}
              <View style={styles.overviewItem}>
                <View style={[styles.overviewIcon, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
                  <Ionicons name="play-circle-outline" size={16} color="#2196F3" />
                </View>
                <Text style={[
                  styles.overviewNumber,
                  { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
                ]}>{moodStats.activeProjects}</Text>
                <Text style={[
                  styles.overviewLabel,
                  { color: theme.name === 'dark' ? '#8E8E93' : COLORS.GRAY[500] }
                ]}>{t('activeProjects')}</Text>
              </View>

              {/* Completed Projects */}
              <View style={styles.overviewItem}>
                <View style={[styles.overviewIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
                </View>
                <Text style={[
                  styles.overviewNumber,
                  { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
                ]}>{moodStats.completedProjects}</Text>
                <Text style={[
                  styles.overviewLabel,
                  { color: theme.name === 'dark' ? '#8E8E93' : COLORS.GRAY[500] }
                ]}>{t('completedProjects')}</Text>
              </View>

              {/* Total Entries */}
              <View style={styles.overviewItem}>
                <View style={[styles.overviewIcon, { backgroundColor: 'rgba(25, 118, 210, 0.1)' }]}>
                  <Ionicons name="document-text-outline" size={16} color="#1976D2" />
                </View>
                <Text style={[
                  styles.overviewNumber,
                  { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
                ]}>{moodStats.totalEntries}</Text>
                <Text style={[
                  styles.overviewLabel,
                  { color: theme.name === 'dark' ? '#8E8E93' : COLORS.GRAY[500] }
                ]}>{t('entries')}</Text>
              </View>

              {/* Words Written */}
              <View style={styles.overviewItem}>
                <View style={[styles.overviewIcon, { backgroundColor: 'rgba(255, 152, 0, 0.1)' }]}>
                  <Ionicons name="create-outline" size={16} color="#FF9800" />
                </View>
                <Text style={[
                  styles.overviewNumber,
                  { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
                ]}>{moodStats.totalWords > 1000 ? `${(moodStats.totalWords/1000).toFixed(1)}k` : moodStats.totalWords}</Text>
                <Text style={[
                  styles.overviewLabel,
                  { color: theme.name === 'dark' ? '#8E8E93' : COLORS.GRAY[500] }
                ]}>{t('words')}</Text>
              </View>
            </View>
          </View>
        </View>


        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

          {/* Mood Trend */}
          {moodTrend && (
            <View style={styles.trendContainer}>
              <View style={styles.sectionHeader}>
                <Text style={[
                  styles.sectionTitle,
                  { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
                ]}>{t('moodTrend')}</Text>
                <View style={[
                  styles.progressFlowIndicator,
                  { backgroundColor: theme.name === 'dark' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(52, 199, 89, 0.1)' }
                ]}>
                  <MaterialIcons 
                    name="trending-up" 
                    size={18} 
                    color={theme.name === 'dark' ? '#34C759' : '#34C759'} 
                  />
                </View>
              </View>
              <View style={[
                styles.trendCard,
                { 
                  borderLeftColor: getTrendColor(),
                  backgroundColor: theme.name === 'dark' ? 'rgba(28, 28, 30, 0.95)' : '#FFFFFF',
                  shadowColor: theme.name === 'dark' ? '#000000' : '#000',
                  shadowOpacity: theme.name === 'dark' ? 0.4 : 0.1,
                  shadowRadius: theme.name === 'dark' ? 16 : 8,
                  elevation: theme.name === 'dark' ? 12 : 3,
                  borderWidth: theme.name === 'dark' ? 1 : 0,
                  borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                }
              ]}>
                <View style={styles.trendHeader}>
                  <Ionicons name={getTrendIcon()} size={24} color={getTrendColor()} />
                  <Text style={[styles.trendText, { color: getTrendColor() }]}>
                    {getTrendText()}
                  </Text>
                </View>
                <Text style={[
                  styles.trendSubtext,
                  { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
                ]}>
                  {t('basedOnLast7Days')}
                </Text>
              </View>
            </View>
          )}


           {/* Project Emotional Progress - Dynamic Flow Design */}
           {getProjectEmotionalProgress().length > 0 && (
             <View style={styles.topMoodsContainer}>
               <View style={styles.sectionHeader}>
                 <Text style={[
                   styles.sectionTitle,
                   { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
                 ]}>{t('projectProgress')}</Text>
                 <View style={[
                   styles.progressFlowIndicator,
                   { backgroundColor: theme.name === 'dark' ? 'rgba(255, 107, 107, 0.1)' : 'rgba(142, 125, 190, 0.1)' }
                 ]}>
                   <MaterialIcons 
                     name="timeline" 
                     size={18} 
                     color={theme.name === 'dark' ? '#FF6B6B' : COLORS.PRIMARY} 
                   />
                 </View>
               </View>
               
               <View style={styles.progressFlowContainer}>
                 {getProjectEmotionalProgress().slice(0, 3).map((project, index) => (
                   <View key={project.projectId} style={styles.flowItemWrapper}>
                     <View style={styles.flowItemContainer}>
                       {/* Progress Flow Line */}
                       {index < getProjectEmotionalProgress().slice(0, 3).length - 1 && (
                         <View style={[styles.flowLine, { backgroundColor: project.progressColor + '30' }]} />
                       )}
                       
                       {/* Main Content */}
                       <View style={[
                         styles.flowItem, 
                         { 
                           borderLeftColor: project.progressColor,
                           backgroundColor: theme.name === 'dark' ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                           shadowColor: theme.name === 'dark' ? '#000000' : COLORS.BLACK,
                           shadowOpacity: theme.name === 'dark' ? 0.4 : 0.08,
                           shadowRadius: theme.name === 'dark' ? 16 : 8,
                           elevation: theme.name === 'dark' ? 12 : ELEVATION.SM,
                           borderWidth: theme.name === 'dark' ? 1 : 0,
                           borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                         }
                       ]}>
                         <View style={styles.flowHeader}>
                           <View style={styles.flowIconWrapper}>
                             <MaterialIcons name={project.progressIcon} size={20} color={project.progressColor} />
                           </View>
                           <View style={styles.flowTitleContainer}>
                             <Text style={[
                               styles.flowTitle,
                               { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
                             ]} numberOfLines={1}>{project.projectTitle}</Text>
                             <View style={styles.flowStatusBadge}>
                               <View style={[styles.flowStatusDot, { backgroundColor: project.progressColor }]} />
                               <Text style={[
                                 styles.flowStatusText,
                                 { color: theme.name === 'dark' ? '#8E8E93' : COLORS.GRAY[600] }
                               ]}>{project.moodCount} {t('entries')}</Text>
                             </View>
                           </View>
                           <View style={[styles.flowProgressCircle, { borderColor: project.progressColor }]}>
                             <Text style={[styles.flowProgressText, { color: project.progressColor }]}>
                               {Math.floor(Math.random() * 40 + 60)}%
                             </Text>
                           </View>
                         </View>
                         
                         <View style={styles.flowMessageContainer}>
                           <Text style={[
                             styles.flowMessage,
                             { color: theme.name === 'dark' ? '#8E8E93' : COLORS.GRAY[700] }
                           ]} numberOfLines={2}>{project.progressMessage}</Text>
                         </View>
                         
                       </View>
                     </View>
                   </View>
                 ))}
               </View>
             </View>
           )}

           {/* Projects Without Mood Entries - Encouragement */}
           {getProjectsWithoutMoods().length > 0 && (
             <View style={styles.topMoodsContainer}>
               <View style={styles.sectionHeader}>
                 <Text style={[
                   styles.sectionTitle,
                   { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
                 ]}>{t('transformProjectsIntoEmotionalExperience')}</Text>
                 <View style={[
                   styles.progressFlowIndicator,
                   { backgroundColor: theme.name === 'dark' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.1)' }
                 ]}>
                   <MaterialIcons 
                     name="edit" 
                     size={18} 
                     color={theme.name === 'dark' ? '#FF9800' : '#FF9800'} 
                   />
                 </View>
               </View>
               <View style={[
                 styles.moodsList,
                 { 
                   borderLeftColor: '#FF9800',
                   backgroundColor: theme.name === 'dark' ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 152, 0, 0.1)',
                   borderWidth: 1,
                   borderColor: '#FF9800'
                 }
               ]}>
                 {getProjectsWithoutMoods().map((project) => (
                   <View key={project.projectId} style={styles.moodItem}>
                     <View style={[styles.moodIcon, { backgroundColor: '#FF9800' }]}>
                       <MaterialIcons name="edit" size={22} color="#FFFFFF" />
                     </View>
                     <View style={styles.moodInfo}>
                       <Text style={[
                         styles.moodName,
                         { color: theme.name === 'dark' ? '#FFFFFF' : '#333' }
                       ]} numberOfLines={1}>{project.projectTitle}</Text>
                       <Text style={[
                         styles.moodCount,
                         { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
                       ]}>
                         {project.totalEntries > 0 
                           ? t('youHaveJournalEntries', { count: project.totalEntries })
                           : t('startWritingJournal')
                         }
                       </Text>
                       <Text style={[
                         styles.motivationText,
                         { color: theme.name === 'dark' ? '#8E8E93' : '#666666' }
                       ]}>
                         {project.totalEntries > 0 
                           ? t('thoughtsValuable')
                           : project.motivationMessage
                         }
                       </Text>
                     </View>
                   </View>
                 ))}
               </View>
             </View>
           )}

           {/* Completed Projects Emotional Journey */}
           {getCompletedProjectEmotionalProgress().length > 0 && (
             <View style={styles.topMoodsContainer}>
               <View style={styles.sectionHeader}>
                 <Text style={[
                   styles.sectionTitle,
                   { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
                 ]}>{t('completedProjectsJourney')}</Text>
                 <View style={[
                   styles.progressFlowIndicator,
                   { backgroundColor: theme.name === 'dark' ? 'rgba(156, 39, 176, 0.1)' : 'rgba(156, 39, 176, 0.1)' }
                 ]}>
                   <MaterialIcons 
                     name="check-circle" 
                     size={18} 
                     color={theme.name === 'dark' ? '#9C27B0' : '#9C27B0'} 
                   />
                 </View>
               </View>
               <View style={[
                 styles.moodsList,
                 { 
                   borderLeftColor: '#9C27B0',
                   backgroundColor: theme.name === 'dark' ? 'rgba(156, 39, 176, 0.2)' : 'rgba(156, 39, 176, 0.1)',
                   borderWidth: 1,
                   borderColor: '#9C27B0'
                 }
               ]}>
                 {getCompletedProjectEmotionalProgress().map((project) => (
                   <View key={project.projectId} style={styles.moodItem}>
                     <View style={[styles.moodIcon, { backgroundColor: project.progressColor }]}>
                       <MaterialIcons name={project.progressIcon} size={22} color="#FFFFFF" />
                     </View>
                     <View style={styles.moodInfo}>
                       <Text style={[
                         styles.moodName,
                         { color: theme.name === 'dark' ? '#FFFFFF' : '#333' }
                       ]} numberOfLines={1}>{project.projectTitle}</Text>
                       <Text style={[
                         styles.moodCount,
                         { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
                       ]}>{project.progressMessage}</Text>
                       <Text style={[
                         styles.motivationText,
                         { color: theme.name === 'dark' ? '#8E8E93' : '#666666' }
                       ]}>{project.motivationSentence}</Text>
                     </View>
                   </View>
                 ))}
               </View>
             </View>
           )}

          {/* Activity Timeline */}
          <View style={styles.timelineContainer}>
            <View style={styles.sectionHeader}>
              <Text style={[
                styles.sectionTitle,
                { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
              ]}>{t('activityTimeline')}</Text>
              <View style={[
                styles.progressFlowIndicator,
                { backgroundColor: theme.name === 'dark' ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.1)' }
              ]}>
                <MaterialIcons 
                  name="schedule" 
                  size={18} 
                  color={theme.name === 'dark' ? '#2196F3' : '#2196F3'} 
                />
              </View>
            </View>
            
            <View style={styles.timelineStats}>
              <View style={[
                styles.timelineStat, 
                { 
                  backgroundColor: theme.name === 'dark' ? 'rgba(28, 28, 30, 0.95)' : '#FFFFFF',
                  borderLeftWidth: 3,
                  borderLeftColor: theme.colors.primary,
                  shadowColor: theme.name === 'dark' ? '#000000' : COLORS.BLACK,
                  shadowOpacity: theme.name === 'dark' ? 0.4 : 0.08,
                  shadowRadius: theme.name === 'dark' ? 12 : 4,
                  elevation: theme.name === 'dark' ? 8 : 2,
                  borderWidth: theme.name === 'dark' ? 1 : 0,
                  borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                }
              ]}>
                <View style={styles.timelineStatContent}>
                  <View style={[styles.timelineIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Ionicons name="calendar" size={14} color={theme.colors.primary} />
                  </View>
                  <View style={styles.timelineStatText}>
                    <Text style={[styles.timelineStatNumber, { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }]}>
                      {timelineAnalysis.totalActivityDays}
                    </Text>
                    <Text style={[styles.timelineStatLabel, { color: theme.name === 'dark' ? '#8E8E93' : COLORS.GRAY[500] }]}>
                      {t('activeDays')}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={[
                styles.timelineStat, 
                { 
                  backgroundColor: theme.name === 'dark' ? 'rgba(28, 28, 30, 0.95)' : '#FFFFFF',
                  borderLeftWidth: 3,
                  borderLeftColor: COLORS.SUCCESS,
                  shadowColor: theme.name === 'dark' ? '#000000' : COLORS.BLACK,
                  shadowOpacity: theme.name === 'dark' ? 0.4 : 0.08,
                  shadowRadius: theme.name === 'dark' ? 12 : 4,
                  elevation: theme.name === 'dark' ? 8 : 2,
                  borderWidth: theme.name === 'dark' ? 1 : 0,
                  borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                }
              ]}>
                <View style={styles.timelineStatContent}>
                  <View style={[styles.timelineIcon, { backgroundColor: COLORS.SUCCESS + '15' }]}>
                    <Ionicons name="trending-up" size={14} color={COLORS.SUCCESS} />
                  </View>
                  <View style={styles.timelineStatText}>
                    <Text style={[styles.timelineStatNumber, { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }]}>
                      {Math.round(timelineAnalysis.averageDailyActivity * 10) / 10}
                    </Text>
                    <Text style={[styles.timelineStatLabel, { color: theme.name === 'dark' ? '#8E8E93' : COLORS.GRAY[500] }]}>
                      {t('avgDailyActivity')}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Mood Calendar */}
          <View style={styles.moodCalendarContainer}>
            <View style={styles.sectionHeader}>
              <Text style={[
                styles.sectionTitle,
                { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
              ]}>{t('moodCalendar')}</Text>
              <View style={[
                styles.progressFlowIndicator,
                { backgroundColor: theme.name === 'dark' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.1)' }
              ]}>
                <MaterialIcons 
                  name="calendar-today" 
                  size={18} 
                  color={theme.name === 'dark' ? '#4CAF50' : '#4CAF50'} 
                />
              </View>
            </View>
            <MoodCalendar />
          </View>

          {/* Minimal Recommendations */}
          {(() => {
            const { recommendations } = getInsightsAndRecommendations();
            return recommendations.length > 0 && (
              <View style={styles.minimalRecommendationsContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={[
                    styles.sectionTitle,
                    { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
                  ]}>{t('quickTips')}</Text>
                  <View style={[
                    styles.progressFlowIndicator,
                    { backgroundColor: theme.name === 'dark' ? 'rgba(255, 193, 7, 0.1)' : 'rgba(255, 193, 7, 0.1)' }
                  ]}>
                    <MaterialIcons 
                      name="lightbulb" 
                      size={18} 
                      color={theme.name === 'dark' ? '#FFC107' : '#FFC107'} 
                    />
                  </View>
                </View>
                <View style={styles.minimalRecommendationsList}>
                  {recommendations.slice(0, 1).map((rec, index) => (
                    <View key={index} style={[
                      styles.minimalRecommendationItem,
                      {
                        backgroundColor: theme.name === 'dark' ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.6)',
                        borderLeftColor: theme.name === 'dark' ? '#FF6B6B' : '#FF9800',
                        borderWidth: theme.name === 'dark' ? 1 : 0,
                        borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                        shadowColor: theme.name === 'dark' ? '#000000' : 'transparent',
                        shadowOpacity: theme.name === 'dark' ? 0.3 : 0,
                        shadowRadius: theme.name === 'dark' ? 8 : 0,
                        elevation: theme.name === 'dark' ? 4 : 0,
                      }
                    ]}>
                      <Text style={[
                        styles.minimalRecommendationText,
                        { color: theme.name === 'dark' ? '#8E8E93' : '#555' }
                      ]}>{rec.message}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.GRAY[50],
  },
  gradientBackground: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.XXL,
    paddingBottom: SPACING.MD,
  },
  headerDivider: {
    height: 1,
    backgroundColor: COLORS.GRAY[200],
    marginHorizontal: SPACING.MD,
    marginBottom: 0,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.FULL,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.SEMI_BOLD,
    paddingHorizontal: SPACING.MD,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.MD,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.XL,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: FONTS.SEMI_BOLD,
    marginTop: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: FONTS.REGULAR,
    textAlign: 'center',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.SEMI_BOLD,
    marginBottom: SPACING.SM,
    paddingHorizontal: SPACING.XL,
  },
  statsContainer: {
    marginTop: SPACING.SM,
  },
  overviewCard: {
    borderRadius: BORDER_RADIUS.LG,
    borderLeftWidth: 4,
    paddingVertical: SPACING.SM, // was MD
    paddingHorizontal: SPACING.MD,
    marginBottom: 0,
    marginHorizontal: SPACING.XL,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: ELEVATION.MD,
    backdropFilter: 'blur(10px)',
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewItem: {
    width: '25%', // 4 sütun için
    alignItems: 'center',
    paddingHorizontal: SPACING.XS,
    paddingVertical: SPACING.XS, // was SM
  },
  overviewIcon: {
    width: 28, // was 32
    height: 28, // was 32
    borderRadius: BORDER_RADIUS.FULL,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2, // was 4
  },
  overviewNumber: {
    fontSize: 13, // was 14
    fontFamily: FONTS.BOLD,
    color: COLORS.GRAY[800],
    marginBottom: 0, // was 1
    textAlign: 'center',
  },
  overviewLabel: {
    fontSize: 8,
    fontFamily: FONTS.MEDIUM,
    color: COLORS.GRAY[500],
    textAlign: 'center',
    lineHeight: 9, // was 10
  },
  trendContainer: {
    marginTop: 24,
  },
  trendCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: SPACING.LG,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    marginLeft: 12,
  },
  trendSubtext: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#8E8E93',
  },
  timelineContainer: {
    marginTop: 40,
  },
  timelineStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: SPACING.MD,
  },
  timelineStat: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.SM,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    flex: 1,
    marginHorizontal: 6,
  },
  timelineIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineStatNumber: {
    fontSize: 16,
    fontFamily: FONTS.BOLD,
    marginBottom: 2,
  },
  timelineStatLabel: {
    fontSize: 11,
    fontFamily: FONTS.REGULAR,
    textAlign: 'center',
  },
  topMoodsContainer: {
    marginTop: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: SPACING.LG,
  },
  progressFlowIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(142, 125, 190, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressFlowContainer: {
    marginHorizontal: SPACING.MD,
  },
  flowItemWrapper: {
    marginBottom: SPACING.MD,
    position: 'relative',
  },
  flowItemContainer: {
    position: 'relative',
  },
  flowLine: {
    position: 'absolute',
    left: 16,
    top: 32,
    width: 2,
    height: SPACING.MD + 8,
    zIndex: 1,
  },
  flowItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BORDER_RADIUS.MD,
    borderLeftWidth: 4,
    padding: SPACING.MD,
    marginLeft: SPACING.XS,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: ELEVATION.SM,
  },
  flowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  flowIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(142, 125, 190, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.SM,
  },
  flowTitleContainer: {
    flex: 1,
  },
  flowTitle: {
    fontSize: 16,
    fontFamily: FONTS.SEMI_BOLD,
    color: COLORS.GRAY[800],
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  flowStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flowStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.XS,
  },
  flowStatusText: {
    fontSize: 12,
    fontFamily: FONTS.MEDIUM,
    color: COLORS.GRAY[600],
  },
  flowProgressCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  flowProgressText: {
    fontSize: 11,
    fontFamily: FONTS.BOLD,
  },
  flowMessageContainer: {
    marginBottom: SPACING.SM,
  },
  flowMessage: {
    fontSize: 14,
    fontFamily: FONTS.REGULAR,
    color: COLORS.GRAY[700],
    lineHeight: 20,
  },
  flowBottomBar: {
    height: 3,
    borderRadius: 2,
    position: 'absolute',
    bottom: 0,
    left: SPACING.XS,
    right: SPACING.XS,
  },
  moodsList: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: SPACING.LG,
    borderLeftWidth: 4,
  },
  moodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  moodRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333333', // Solid dark background
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moodRankText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF', // White text for solid background
  },
  moodIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moodInfo: {
    flex: 1,
  },
  moodName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 2,
  },
   moodCount: {
     fontSize: 14,
     fontFamily: 'Poppins_400Regular',
     color: '#8E8E93',
   },
   motivationText: {
     fontSize: 12,
     fontFamily: 'Poppins_400Regular',
     color: '#666666',
     fontStyle: 'italic',
     marginTop: 4,
     lineHeight: 16,
   },
   insightsContainer: {
     marginTop: 24,
     marginBottom: 24,
   },
   insightsList: {
     backgroundColor: '#FFFFFF',
     borderRadius: 16,
     padding: 16,
     marginHorizontal: SPACING.LG,
     borderLeftWidth: 4,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.1,
     shadowRadius: 8,
     elevation: 3,
   },
   insightItem: {
     flexDirection: 'row',
     alignItems: 'flex-start',
     paddingVertical: 12,
     borderBottomWidth: 1,
     borderBottomColor: '#F8F9FA',
   },
   insightIcon: {
     width: 32,
     height: 32,
     borderRadius: 16,
     justifyContent: 'center',
     alignItems: 'center',
     marginRight: 12,
   },
   insightContent: {
     flex: 1,
   },
   insightTitle: {
     fontSize: 14,
     fontFamily: 'Poppins_600SemiBold',
     color: '#333',
     marginBottom: 4,
   },
   insightMessage: {
     fontSize: 13,
     fontFamily: 'Poppins_400Regular',
     color: '#666',
     lineHeight: 18,
   },
   recommendationsContainer: {
     marginTop: 24,
     marginBottom: 24,
   },
   recommendationsList: {
     backgroundColor: '#FFFFFF',
     borderRadius: 16,
     padding: 16,
     marginHorizontal: SPACING.LG,
     borderLeftWidth: 4,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.1,
     shadowRadius: 8,
     elevation: 3,
   },
   recommendationItem: {
     flexDirection: 'row',
     alignItems: 'flex-start',
     paddingVertical: 12,
     borderBottomWidth: 1,
     borderBottomColor: '#F8F9FA',
   },
   recommendationIcon: {
     width: 32,
     height: 32,
     borderRadius: 16,
     justifyContent: 'center',
     alignItems: 'center',
     marginRight: 12,
   },
   recommendationContent: {
     flex: 1,
   },
   recommendationTitle: {
     fontSize: 14,
     fontFamily: 'Poppins_600SemiBold',
     color: '#333',
     marginBottom: 4,
   },
   recommendationMessage: {
     fontSize: 13,
     fontFamily: 'Poppins_400Regular',
     color: '#666',
     lineHeight: 18,
   },
  moodCalendarContainer: {
    marginTop: 40,
    marginBottom: 20,
    paddingHorizontal: 0,
  },
  minimalRecommendationsContainer: {
    marginTop: 40,
    marginBottom: 40,
    paddingHorizontal: SPACING.LG,
  },
   minimalRecommendationsList: {
     gap: 8,
   },
   minimalRecommendationItem: {
     backgroundColor: 'rgba(255, 255, 255, 0.6)',
     borderRadius: 12,
     padding: 12,
     borderLeftWidth: 3,
     borderLeftColor: '#FF9800',
   },
   minimalRecommendationText: {
     fontSize: 13,
     fontFamily: 'Poppins_400Regular',
     color: '#555',
     lineHeight: 18,
     textAlign: 'center',
   },
  recentContainer: {
    marginTop: 24,
    marginBottom: 40,
  },
  entriesList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: SPACING.LG,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  entryMoodIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  entryContent: {
    flex: 1,
  },
  entryText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#333',
    lineHeight: 20,
    marginBottom: 4,
  },
  entryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryProject: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#007AFF',
  },
  entryDate: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#8E8E93',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
});

export default EmotionalJournalScreen;
