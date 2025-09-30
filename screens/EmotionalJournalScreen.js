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

const { width, height } = Dimensions.get('window');

const EmotionalJournalScreen = ({ navigation }) => {
  const activeTasks = useActiveTasks();
  const completedTasks = useCompletedTasks();

  // Günün dominant mood'unu hesapla (MoodStatement'ten alınan mantık)
  const todayDominantMood = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayMoods = [];
    const moodCounts = {};
    
    // Tüm projelerdeki milestone'ları tara
    activeTasks.forEach(task => {
      if (task.milestones) {
        task.milestones.forEach(milestone => {
          if (milestone.journalEntries) {
            milestone.journalEntries.forEach(entry => {
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
  }, [activeTasks]);

  // Tüm mood verilerini topla
  const allMoodData = useMemo(() => {
    const moodEntries = [];
    const allTasks = [...activeTasks, ...completedTasks];
    
    allTasks.forEach(task => {
      if (task.milestones) {
        task.milestones.forEach(milestone => {
          if (milestone.journalEntries) {
            milestone.journalEntries.forEach(entry => {
              if (entry.mood || entry.moodIcon || entry.moodColor) {
                moodEntries.push({
                  id: entry.id,
                  mood: entry.mood,
                  moodIcon: entry.moodIcon,
                  moodColor: entry.moodColor,
                  text: entry.text,
                  createdAt: entry.createdAt,
                  projectTitle: task.title,
                  milestoneTitle: milestone.title,
                  taskId: task.id,
                  milestoneId: milestone.id
                });
              }
            });
          }
        });
      }
    });
    
    return moodEntries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [activeTasks, completedTasks]);

  // Mood istatistikleri
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
    
    return {
      totalEntries: allMoodData.length,
      topMoods: sortedMoods,
      last7Days: last7Days.length,
      last30Days: last30Days.length,
      totalWords: totalWords,
      moodCounts
    };
  }, [allMoodData]);

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

  // AI-powered motivation sentence generator
  const generateMotivationSentence = useCallback((project, progressType, dominantMood) => {
    const motivationSentences = {
      positive: {
        happy: [
          "Keep riding this wave of happiness! Your positive energy is contagious.",
          "Your joy is your superpower - let it fuel your continued success!",
          "This happiness is well-deserved. You've earned every smile!"
        ],
        excited: [
          "Your excitement is the spark that ignites great achievements!",
          "Channel this energy into making amazing things happen!",
          "This enthusiasm is your secret weapon - use it wisely!"
        ],
        grateful: [
          "Gratitude attracts more good things. Keep this beautiful energy flowing!",
          "Your appreciation mindset is creating a positive ripple effect!",
          "This grateful heart is opening doors to even more opportunities!"
        ],
        proud: [
          "You have every right to be proud. This is just the beginning!",
          "Your pride is well-earned. Let it motivate you to reach even higher!",
          "This sense of accomplishment is the fuel for your next victory!"
        ],
        motivated: [
          "Your motivation is unstoppable! Keep this momentum going!",
          "This drive is your competitive advantage - leverage it fully!",
          "Your determination is inspiring. Let it guide you to greatness!"
        ],
        default: [
          "You're in the zone! Keep this positive momentum flowing!",
          "Your positive energy is creating magic. Don't stop now!",
          "This is your time to shine - embrace every moment!"
        ]
      },
      negative: {
        tired: [
          "Rest is not giving up, it's preparing for the next victory!",
          "Your body is asking for care. Listen to it and recharge!",
          "Even the strongest warriors need to rest. You're still winning!"
        ],
        frustrated: [
          "Frustration is just success in disguise. You're closer than you think!",
          "This challenge is making you stronger. Keep pushing forward!",
          "Every expert was once a beginner. You're exactly where you need to be!"
        ],
        anxious: [
          "Breathe deeply. You've overcome challenges before, and you will again!",
          "Your anxiety is just your mind preparing for success. Trust the process!",
          "This feeling is temporary, but your strength is permanent!"
        ],
        overwhelmed: [
          "Break it down into smaller steps. You've got this, one piece at a time!",
          "Overwhelm is just excitement in disguise. You're capable of amazing things!",
          "Remember: you don't have to do everything at once. Progress, not perfection!"
        ],
        sad: [
          "It's okay to feel this way. Your feelings are valid and temporary.",
          "This sadness is just making room for even greater joy ahead!",
          "You're stronger than you know. This too shall pass, and you'll emerge wiser!"
        ],
        default: [
          "This challenge is temporary, but your growth is permanent!",
          "You're building resilience with every step. Keep going!",
          "Difficult roads often lead to beautiful destinations. Trust the journey!"
        ]
      },
      neutral: {
        calm: [
          "Your calmness is a superpower in a chaotic world. Use it wisely!",
          "This peaceful energy is creating space for clarity and focus!",
          "Your serenity is your strength. Let it guide your decisions!"
        ],
        curious: [
          "Your curiosity is the key to unlocking new possibilities!",
          "This sense of wonder is what drives innovation. Keep exploring!",
          "Your questions are leading you to amazing discoveries!"
        ],
        default: [
          "Steady progress is still progress. You're exactly where you need to be!",
          "Consistency is the mother of mastery. Keep going!",
          "Your steady approach is building something beautiful!"
        ]
      }
    };

    const categorySentences = motivationSentences[progressType] || motivationSentences.neutral;
    const moodSentences = categorySentences[dominantMood?.key] || categorySentences.default;
    
    // Return a random sentence from the appropriate category
    return moodSentences[Math.floor(Math.random() * moodSentences.length)];
  }, []);

  // Project emotional progress analysis
  const getProjectEmotionalProgress = useCallback(() => {
    const projectProgress = [];
    
    activeTasks.forEach(task => {
      if (task.milestones && task.milestones.length > 0) {
        const projectMoods = [];
        let totalMoodScore = 0;
        let moodCount = 0;
        
        // Collect all moods from this project
        task.milestones.forEach(milestone => {
          if (milestone.journalEntries) {
            milestone.journalEntries.forEach(entry => {
              if (entry.mood) {
                const moodInfo = getMoodInfo(entry.mood);
                projectMoods.push({
                  mood: entry.mood,
                  moodInfo,
                  date: new Date(entry.createdAt)
                });
                
                // Calculate mood score (positive = 1, neutral = 0, negative = -1)
                const score = moodInfo.category === 'positive' ? 1 : 
                             moodInfo.category === 'negative' ? -1 : 0;
                totalMoodScore += score;
                moodCount++;
              }
            });
          }
        });
        
        if (moodCount > 0) {
          const averageScore = totalMoodScore / moodCount;
          const recentMoods = projectMoods
            .sort((a, b) => b.date - a.date)
            .slice(0, 5); // Get last 5 moods for better analysis
          
          // Find the most frequent mood in recent entries
          const recentMoodCounts = {};
          recentMoods.forEach(mood => {
            recentMoodCounts[mood.mood] = (recentMoodCounts[mood.mood] || 0) + 1;
          });
          
          const dominantMood = Object.entries(recentMoodCounts)
            .sort(([,a], [,b]) => b - a)[0];
          
          const dominantMoodInfo = dominantMood ? getMoodInfo(dominantMood[0]) : null;
          
          let progressType = 'neutral';
          let progressMessage = 'This project is progressing steadily';
          let progressIcon = 'trending-flat';
          let progressColor = '#9E9E9E';
          
          // More accurate progress determination
          if (averageScore > 0.2) {
            progressType = 'positive';
            progressColor = '#4CAF50';
            
            // Positive mood-specific messages and icons
            switch (dominantMoodInfo?.key) {
              case 'happy':
                progressMessage = 'This project brings you joy and satisfaction!';
                progressIcon = 'sentiment-satisfied';
                break;
              case 'excited':
                progressMessage = 'You\'re enthusiastic and energized about this project!';
                progressIcon = 'celebration';
                break;
              case 'grateful':
                progressMessage = 'You feel grateful and appreciative of this project!';
                progressIcon = 'favorite';
                break;
              case 'hopeful':
                progressMessage = 'This project fills you with hope and optimism!';
                progressIcon = 'wb-sunny';
                break;
              case 'proud':
                progressMessage = 'You\'re proud of your progress on this project!';
                progressIcon = 'emoji-events';
                break;
              case 'relieved':
                progressMessage = 'This project gives you a sense of relief and peace!';
                progressIcon = 'spa';
                break;
              case 'motivated':
                progressMessage = 'You feel highly motivated to continue this project!';
                progressIcon = 'trending-up';
                break;
              case 'peaceful':
                progressMessage = 'This project brings you inner peace and calm!';
                progressIcon = 'spa';
                break;
              case 'content':
                progressMessage = 'You feel content and satisfied with this project!';
                progressIcon = 'sentiment-satisfied';
                break;
              default:
                progressMessage = 'This project is going great for you!';
                progressIcon = 'trending-up';
            }
          } else if (averageScore < -0.2) {
            progressType = 'negative';
            progressColor = '#F44336';
            
            // Negative mood-specific messages and icons
            switch (dominantMoodInfo?.key) {
              case 'sad':
                progressMessage = 'This project is making you feel down and discouraged';
                progressIcon = 'sentiment-dissatisfied';
                break;
              case 'angry':
                progressMessage = 'This project is frustrating and angering you';
                progressIcon = 'mood-bad';
                break;
              case 'tired':
                progressMessage = 'This project is exhausting and draining your energy';
                progressIcon = 'bedtime';
                break;
              case 'frustrated':
                progressMessage = 'You\'re feeling frustrated and stuck with this project';
                progressIcon = 'psychology';
                break;
              case 'anxious':
                progressMessage = 'This project is causing you anxiety and worry';
                progressIcon = 'warning';
                break;
              case 'overwhelmed':
                progressMessage = 'This project feels overwhelming and too much to handle';
                progressIcon = 'psychology';
                break;
              case 'lonely':
                progressMessage = 'This project makes you feel isolated and alone';
                progressIcon = 'person-off';
                break;
              case 'confused':
                progressMessage = 'This project is confusing and unclear to you';
                progressIcon = 'help';
                break;
              case 'disappointed':
                progressMessage = 'This project is disappointing and not meeting expectations';
                progressIcon = 'sentiment-dissatisfied';
                break;
              case 'worried':
                progressMessage = 'This project is causing you worry and concern';
                progressIcon = 'psychology';
                break;
              case 'bored':
                progressMessage = 'This project feels boring and unengaging';
                progressIcon = 'sentiment-neutral';
                break;
              default:
                progressMessage = 'This project seems challenging for you';
                progressIcon = 'trending-down';
            }
          } else {
            // Neutral mood-specific messages and icons
            switch (dominantMoodInfo?.key) {
              case 'calm':
                progressMessage = 'This project keeps you calm and composed';
                progressIcon = 'spa';
                break;
              case 'curious':
                progressMessage = 'This project sparks your curiosity and interest';
                progressIcon = 'explore';
                break;
              case 'nostalgic':
                progressMessage = 'This project brings back fond memories';
                progressIcon = 'history';
                break;
              case 'surprised':
                progressMessage = 'This project continues to surprise you';
                progressIcon = 'surprise';
                break;
              default:
                progressMessage = 'This project is progressing steadily';
                progressIcon = 'trending-flat';
            }
          }
          
          // Generate AI motivation sentence
          const motivationSentence = generateMotivationSentence(task, progressType, dominantMoodInfo);
          
          projectProgress.push({
            projectId: task.id,
            projectTitle: task.title,
            progressType,
            progressMessage,
            progressIcon,
            progressColor,
            averageScore,
            moodCount,
            recentMoods: recentMoods.map(m => m.moodInfo),
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
      case 'improving': return 'Your mood is improving!';
      case 'declining': return 'Your mood seems to be declining';
      default: return 'Your mood is stable';
    }
  }, [moodTrend]);

  // Günün mood'una göre gradient renkleri hesapla
  const getMoodGradientColors = useCallback(() => {
    if (!todayDominantMood) {
      return ['#FAFAFA', '#F5F3FF', '#EDE9FE'];
    }
    
    const baseColor = getSolidMoodColor(todayDominantMood.color);
    // Hex rengi RGB'ye çevir
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Daha solgun tonlar oluştur - alt kısım daha koyu
    const lightColor = `rgba(${r}, ${g}, ${b}, 0.08)`;
    const mediumColor = `rgba(${r}, ${g}, ${b}, 0.15)`;
    const baseColorWithAlpha = `rgba(${r}, ${g}, ${b}, 0.25)`;
    
    return [lightColor, mediumColor, baseColorWithAlpha];
  }, [todayDominantMood]);

  if (allMoodData.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={getMoodGradientColors()}
          style={styles.gradientBackground}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Emotional Journal</Text>
            <View style={styles.placeholder} />
          </View>
          
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No Mood Data Yet</Text>
            <Text style={styles.emptyText}>
              Start writing journal entries with mood tags to see your emotional journey here.
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
        style={styles.gradientBackground}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Emotional Journal</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Overview Stats - Scroll dışında */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={[
            styles.overviewCard, 
            { 
              borderLeftColor: getSolidMoodColor(todayDominantMood?.color) || COLORS.PRIMARY,
              backgroundColor: todayDominantMood ? 
                'rgba(255, 255, 255, 0.95)' : 
                'rgba(0, 122, 255, 0.1)'
            }
          ]}>
            <View style={styles.overviewGrid}>
              {/* Total Entries */}
              <View style={styles.overviewItem}>
                 <View style={[styles.overviewIcon, { backgroundColor: '#E3F2FD' }]}>
                   <Ionicons name="document-text-outline" size={18} color="#1976D2" />
                 </View>
                <Text style={styles.overviewNumber}>{moodStats.totalEntries}</Text>
                <Text style={styles.overviewLabel}>Total Entries</Text>
              </View>

              {/* Last 7 Days */}
              <View style={styles.overviewItem}>
                 <View style={[styles.overviewIcon, { backgroundColor: '#F3E5F5' }]}>
                   <Ionicons name="calendar-outline" size={18} color="#8E7DBE" />
                 </View>
                <Text style={styles.overviewNumber}>{moodStats.last7Days}</Text>
                <Text style={styles.overviewLabel}>Last 7 Days</Text>
              </View>

              {/* Last 30 Days */}
              <View style={styles.overviewItem}>
                 <View style={[styles.overviewIcon, { backgroundColor: '#E8F5E8' }]}>
                   <Ionicons name="calendar" size={18} color="#4CAF50" />
                 </View>
                <Text style={styles.overviewNumber}>{moodStats.last30Days}</Text>
                <Text style={styles.overviewLabel}>Last 30 Days</Text>
              </View>

              {/* Words Written - En sağda */}
              <View style={styles.overviewItem}>
                <View style={[styles.overviewIcon, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="create-outline" size={18} color="#FF9800" />
                </View>
                <Text style={styles.overviewNumber}>{moodStats.totalWords.toLocaleString()}</Text>
                <Text style={styles.overviewLabel}>Words Written</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Başlık çizgisi - Overview altında */}
        <View style={styles.headerDivider} />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

          {/* Mood Trend */}
          {moodTrend && (
            <View style={styles.trendContainer}>
              <Text style={styles.sectionTitle}>Mood Trend</Text>
              <View style={[
                styles.trendCard,
                { borderLeftColor: getTrendColor() }
              ]}>
                <View style={styles.trendHeader}>
                  <Ionicons name={getTrendIcon()} size={24} color={getTrendColor()} />
                  <Text style={[styles.trendText, { color: getTrendColor() }]}>
                    {getTrendText()}
                  </Text>
                </View>
                <Text style={styles.trendSubtext}>
                  Based on your last 7 days of mood entries
                </Text>
              </View>
            </View>
          )}

          {/* Project Emotional Progress */}
          <View style={styles.topMoodsContainer}>
            <Text style={styles.sectionTitle}>Project Emotional Progress</Text>
            <View style={[
              styles.moodsList,
              { 
                borderLeftColor: getSolidMoodColor(todayDominantMood?.color) || COLORS.SECONDARY,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderWidth: 1,
                borderColor: getSolidMoodColor(todayDominantMood?.color) || COLORS.SECONDARY
              }
            ]}>
               {getProjectEmotionalProgress().map((project) => (
                 <View key={project.projectId} style={styles.moodItem}>
                   <View style={[styles.moodIcon, { backgroundColor: project.progressColor }]}>
                     <MaterialIcons name={project.progressIcon} size={22} color="#FFFFFF" />
                   </View>
                   <View style={styles.moodInfo}>
                     <Text style={styles.moodName} numberOfLines={1}>{project.projectTitle}</Text>
                     <Text style={styles.moodCount}>{project.progressMessage}</Text>
                     <Text style={styles.motivationText}>{project.motivationSentence}</Text>
                   </View>
                 </View>
               ))}
            </View>
          </View>

          {/* Recent Entries */}
          <View style={styles.recentContainer}>
            <Text style={styles.sectionTitle}>Recent Entries</Text>
            <View style={[
              styles.entriesList,
              { borderLeftColor: COLORS.INFO }
            ]}>
               {allMoodData.slice(0, 10).map((entry, index) => {
                 const moodInfo = getMoodInfo(entry.mood);
                 return (
                   <View key={entry.id || index} style={styles.entryItem}>
                     <View style={[styles.entryMoodIcon, { backgroundColor: getSolidMoodColor(moodInfo.color) }]}>
                       <MaterialIcons name={moodInfo.icon} size={18} color="#FFFFFF" />
                     </View>
                     <View style={styles.entryContent}>
                       <Text style={styles.entryText} numberOfLines={2}>
                         {entry.text || 'No text'}
                       </Text>
                       <View style={styles.entryMeta}>
                         <Text style={styles.entryProject}>{entry.projectTitle}</Text>
                         <Text style={styles.entryDate}>
                           {new Date(entry.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                         </Text>
                       </View>
                     </View>
                   </View>
                 );
               })}
            </View>
          </View>
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
    backgroundColor: COLORS.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.GRAY[200],
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: ELEVATION.SM,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.SEMI_BOLD,
    color: COLORS.GRAY[800],
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
    color: COLORS.GRAY[800],
    marginTop: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: FONTS.REGULAR,
    color: COLORS.GRAY[500],
    textAlign: 'center',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.SEMI_BOLD,
    color: COLORS.GRAY[800],
    marginBottom: SPACING.SM,
    paddingHorizontal: SPACING.XL,
  },
  statsContainer: {
    marginTop: SPACING.SM,
  },
  overviewCard: {
    borderRadius: BORDER_RADIUS.LG,
    borderLeftWidth: 4,
    paddingVertical: SPACING.MD,
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.XS,
  },
  overviewIcon: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.FULL,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  overviewNumber: {
    fontSize: 14,
    fontFamily: FONTS.BOLD,
    color: COLORS.GRAY[800],
    marginBottom: 1,
    textAlign: 'center',
  },
  overviewLabel: {
    fontSize: 8,
    fontFamily: FONTS.MEDIUM,
    color: COLORS.GRAY[500],
    textAlign: 'center',
    lineHeight: 10,
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
  topMoodsContainer: {
    marginTop: 24,
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
