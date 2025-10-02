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

const { width, height } = Dimensions.get('window');

const EmotionalJournalScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
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

  // AI-powered motivation sentence generator - Mood-based
  const generateMotivationSentence = useCallback((project, progressType, dominantMood) => {
    const motivationSentences = {
      // Positive mood-specific motivations
      happy: [
        "Your happiness is your greatest asset - let it guide you to even more success!",
        "This joy you're feeling is well-deserved. You've earned every smile!",
        "Keep riding this wave of happiness! Your positive energy is contagious and powerful!"
      ],
      excited: [
        "Your excitement is the spark that ignites great achievements! Channel this energy!",
        "This enthusiasm is your secret weapon - use it to make amazing things happen!",
        "Your excitement is magnetic! Let it attract more opportunities and success!"
      ],
      grateful: [
        "Gratitude attracts more good things. Keep this beautiful energy flowing!",
        "Your appreciation mindset is creating a positive ripple effect in your life!",
        "This grateful heart is opening doors to even more opportunities and blessings!"
      ],
      hopeful: [
        "Your hope is the light that guides you through any darkness. Keep it burning bright!",
        "This optimism is your superpower - it's turning possibilities into realities!",
        "Hope is the foundation of all great achievements. You're building something amazing!"
      ],
      proud: [
        "You have every right to be proud. This is just the beginning of your greatness!",
        "Your pride is well-earned. Let it motivate you to reach even higher heights!",
        "This sense of accomplishment is the fuel for your next victory. Keep going!"
      ],
      motivated: [
        "Your motivation is unstoppable! Keep this momentum going and achieve greatness!",
        "This drive is your competitive advantage - leverage it fully and succeed!",
        "Your determination is inspiring. Let it guide you to the success you deserve!"
      ],
      peaceful: [
        "Your peace is a superpower in a chaotic world. Use it to make wise decisions!",
        "This tranquility is creating space for clarity and focus. Embrace it fully!",
        "Your serenity is your strength. Let it guide you through any challenge!"
      ],
      content: [
        "Contentment is the highest form of success. You're exactly where you need to be!",
        "This satisfaction is the foundation for even greater achievements ahead!",
        "Your contentment is a sign of wisdom. You've found the perfect balance!"
      ],
      confident: [
        "Your confidence is magnetic! It's attracting success and opportunities to you!",
        "This self-belief is your greatest asset. Trust it and watch miracles happen!",
        "Confidence is the key to unlocking your full potential. You've got this!"
      ],
      
      // Negative mood-specific motivations
      sad: [
        "It's okay to feel this way. Your feelings are valid and this too shall pass!",
        "This sadness is just making room for even greater joy ahead. You're stronger than you know!",
        "Every cloud has a silver lining. Your breakthrough is coming - stay strong!"
      ],
      angry: [
        "Your anger shows you care deeply. Channel this passion into positive action!",
        "This frustration is temporary, but your strength is permanent. Keep pushing forward!",
        "Anger can be a powerful motivator. Use it to fuel your determination to succeed!"
      ],
      tired: [
        "Rest is not giving up, it's preparing for the next victory! Listen to your body!",
        "Even the strongest warriors need to rest. You're still winning - just recharge!",
        "Your body is asking for care. Take a break and come back even stronger!"
      ],
      frustrated: [
        "Frustration is just success in disguise. You're closer than you think!",
        "This challenge is making you stronger. Every expert was once a beginner!",
        "Your frustration shows you're pushing your limits. That's where growth happens!"
      ],
      anxious: [
        "Breathe deeply. You've overcome challenges before, and you will again!",
        "Your anxiety is just your mind preparing for success. Trust the process!",
        "This feeling is temporary, but your strength is permanent. You've got this!"
      ],
      overwhelmed: [
        "Break it down into smaller steps. You've got this, one piece at a time!",
        "Overwhelm is just excitement in disguise. You're capable of amazing things!",
        "Remember: you don't have to do everything at once. Progress, not perfection!"
      ],
      lonely: [
        "Your solitude is a gift. Use this time to connect with your inner strength!",
        "This loneliness is temporary. You're building resilience and self-reliance!",
        "Sometimes we need to be alone to discover how strong we really are!"
      ],
      confused: [
        "Confusion is the beginning of wisdom. You're about to discover something amazing!",
        "This uncertainty is just the universe preparing you for clarity. Trust the process!",
        "Every breakthrough starts with confusion. You're exactly where you need to be!"
      ],
      disappointed: [
        "Disappointment is just a detour, not a dead end. Your success story continues!",
        "This setback is setting you up for an even greater comeback. Stay strong!",
        "Your disappointment shows you have high standards. That's a sign of greatness!"
      ],
      worried: [
        "Worry is just your mind trying to protect you. You're stronger than your fears!",
        "This concern shows you care deeply. Channel that care into positive action!",
        "Your worries are temporary, but your ability to overcome them is permanent!"
      ],
      bored: [
        "Boredom is the birthplace of creativity. Use this time to explore new possibilities!",
        "This restlessness is a sign that you're ready for your next big adventure!",
        "When you're bored, you're actually ready to discover something amazing!"
      ],
      stressed: [
        "Stress is just your body preparing for success. You're stronger than you think!",
        "This pressure is creating diamonds. You're being forged into something incredible!",
        "Your stress shows you're pushing boundaries. That's where breakthroughs happen!"
      ],
      exhausted: [
        "Exhaustion is a sign of hard work. You're building something meaningful!",
        "This tiredness shows you've been giving your all. Rest and come back stronger!",
        "Even the strongest need to recharge. You're still winning - just take a break!"
      ],
      
      // Neutral mood-specific motivations
      calm: [
        "Your calmness is a superpower in a chaotic world. Use it wisely and succeed!",
        "This peaceful energy is creating space for clarity and focus. Embrace it!",
        "Your serenity is your strength. Let it guide you to make wise decisions!"
      ],
      curious: [
        "Your curiosity is the key to unlocking new possibilities! Keep exploring!",
        "This sense of wonder is what drives innovation. You're on the right path!",
        "Your questions are leading you to amazing discoveries. Stay curious!"
      ],
      nostalgic: [
        "Your nostalgia shows you have beautiful memories. Create even more amazing ones!",
        "This fondness for the past is fueling your appreciation for the present!",
        "Your memories are treasures. Use them to build an even brighter future!"
      ],
      surprised: [
        "Your surprise shows you're open to new experiences. That's where magic happens!",
        "This sense of wonder is keeping you young at heart. Embrace every surprise!",
        "Your openness to surprises is your greatest asset. Keep expecting the unexpected!"
      ],
      focused: [
        "Your focus is laser-sharp! This concentration is your path to success!",
        "This deep focus is creating something amazing. Keep your eyes on the prize!",
        "Your concentration is a superpower. Use it to achieve your biggest dreams!"
      ],
      neutral: [
        "Steady progress is still progress. You're exactly where you need to be!",
        "Consistency is the mother of mastery. Keep going and watch the magic happen!",
        "Your steady approach is building something beautiful. Trust the process!"
      ],
      
      // Default fallback
      default: [
        "You're exactly where you need to be right now. Trust the journey!",
        "Every step you take is bringing you closer to your goals. Keep going!",
        "Your progress is real and meaningful. You're building something amazing!"
      ]
    };

    const moodSentences = motivationSentences[dominantMood?.key] || motivationSentences.default;
    
    // Return a random sentence from the appropriate mood category
    return moodSentences[Math.floor(Math.random() * moodSentences.length)];
  }, []);

  // Get projects without mood entries for encouragement
  const getProjectsWithoutMoods = useCallback(() => {
    const projectsWithoutMoods = [];
    
    activeTasks.forEach(task => {
      if (task.milestones && task.milestones.length > 0) {
        let hasMoodEntries = false;
        
        // Check if any milestone has mood entries
        task.milestones.forEach(milestone => {
          if (milestone.journalEntries) {
            milestone.journalEntries.forEach(entry => {
              if (entry.mood) {
                hasMoodEntries = true;
              }
            });
          }
        });
        
        // If no mood entries, add to encouragement list
        if (!hasMoodEntries) {
          projectsWithoutMoods.push({
            projectId: task.id,
            projectTitle: task.title,
            milestoneCount: task.milestones.length,
            totalEntries: task.milestones.reduce((total, milestone) => 
              total + (milestone.journalEntries ? milestone.journalEntries.length : 0), 0)
          });
        }
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
          title: 'Project Impact',
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
          'Keep doing what makes you happy! Consider sharing your positive energy with others.',
          'Your happiness is contagious! Use this positive momentum to tackle new challenges.',
          'This joy is well-deserved. Consider setting new goals to maintain this positive energy.'
        ],
        excited: [
          'Channel this excitement into new projects and opportunities!',
          'Your enthusiasm is powerful - use it to inspire others around you.',
          'This energy is perfect for taking on bigger challenges and goals.'
        ],
        tired: [
          'Your body is asking for rest. Consider taking a break or reducing your workload.',
          'Prioritize self-care and ensure you\'re getting enough sleep and relaxation.',
          'This tiredness might indicate you need to reassess your work-life balance.'
        ],
        sad: [
          'It\'s okay to feel this way. Consider talking to someone you trust or seeking support.',
          'This sadness might be temporary. Focus on small, positive activities each day.',
          'Consider what might be causing this sadness and take steps to address it.'
        ],
        anxious: [
          'Anxiety is manageable. Try deep breathing exercises or mindfulness practices.',
          'Consider breaking down overwhelming tasks into smaller, manageable steps.',
          'Your anxiety might be telling you something important - listen to it with compassion.'
        ],
        frustrated: [
          'Frustration often signals growth. You\'re pushing your boundaries - that\'s positive!',
          'Try to identify what\'s causing the frustration and address it systematically.',
          'This feeling might indicate you need to change your approach or seek help.'
        ],
        calm: [
          'Your calmness is a superpower! Use this peaceful energy to make wise decisions.',
          'This tranquility is perfect for reflection and planning your next steps.',
          'Your serenity is valuable - consider how to maintain this peaceful state.'
        ],
        motivated: [
          'Your motivation is strong! Use this drive to tackle your most important goals.',
          'This determination is your competitive advantage - leverage it fully.',
          'Your motivation is inspiring - consider how to sustain this energy long-term.'
        ]
      };
      
      const moodRecs = moodRecommendations[dominantMood] || [
        'Continue tracking your emotions to better understand your patterns.',
        'Consider setting small, achievable goals to maintain your progress.',
        'Your emotional awareness is growing - keep up the great work!'
      ];
      
      recommendations.push({
        type: 'mood-based',
        title: 'Personalized Recommendation',
        message: moodRecs[Math.floor(Math.random() * moodRecs.length)],
        icon: 'lightbulb',
        color: '#FF9800'
      });
    }
    
    // General recommendations
    if (last7Days.length < 3) {
      recommendations.push({
        type: 'activity',
        title: 'Journal More',
        message: 'Try to write in your journal more frequently to get better insights into your emotional patterns.',
        icon: 'edit',
        color: '#2196F3'
      });
    }
    
    if (sortedMoods.length < 3) {
      recommendations.push({
        type: 'diversity',
        title: 'Emotional Diversity',
        message: 'Consider exploring different activities to experience a wider range of emotions.',
        icon: 'explore',
        color: '#4CAF50'
      });
    }
    
    return { insights, recommendations };
  }, [allMoodData, moodTrend, getMoodInfo, getSolidMoodColor, getTrendIcon, getTrendColor]);

  // Project mood correlation analysis
  const getProjectMoodCorrelation = useCallback(() => {
    const projectMoods = {};
    
    // Analyze mood patterns by project
    activeTasks.forEach(task => {
      if (task.milestones) {
        task.milestones.forEach(milestone => {
          if (milestone.journalEntries) {
            milestone.journalEntries.forEach(entry => {
              if (entry.mood) {
                if (!projectMoods[task.title]) {
                  projectMoods[task.title] = [];
                }
                projectMoods[task.title].push(entry.mood);
              }
            });
          }
        });
      }
    });
    
    // Find project with strongest mood correlation
    let strongestProject = null;
    let strongestMood = null;
    let maxCount = 0;
    
    Object.entries(projectMoods).forEach(([projectName, moods]) => {
      const moodCounts = {};
      moods.forEach(mood => {
        moodCounts[mood] = (moodCounts[mood] || 0) + 1;
      });
      
      const sortedMoods = Object.entries(moodCounts)
        .sort(([,a], [,b]) => b - a);
      
      if (sortedMoods.length > 0 && sortedMoods[0][1] > maxCount) {
        maxCount = sortedMoods[0][1];
        strongestProject = projectName;
        strongestMood = sortedMoods[0][0];
      }
    });
    
    if (strongestProject && strongestMood) {
      const moodInfo = getMoodInfo(strongestMood);
      return {
        message: `Your "${strongestProject}" project has the strongest emotional impact on you.`,
        icon: 'trending-up',
        color: getSolidMoodColor(moodInfo.color)
      };
    }
    
    return null;
  }, [activeTasks, getMoodInfo, getSolidMoodColor]);


  // Get completed projects emotional progress analysis
  const getCompletedProjectEmotionalProgress = useCallback(() => {
    const projectProgress = [];
    
    completedTasks.forEach(task => {
      if (task.milestones && task.milestones.length > 0) {
        const projectMoods = [];
        const moodCounts = {};
        
        // Collect all moods from this completed project
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
                
                // Count each mood
                moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
              }
            });
          }
        });
        
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
              progressMessage = 'This project was a joyful and fulfilling experience for you!';
              progressIcon = 'sentiment-satisfied';
              break;
            case 'excited':
              progressMessage = 'This project filled you with excitement and energy throughout!';
              progressIcon = 'celebration';
              break;
            case 'grateful':
              progressMessage = 'This project made you feel grateful and appreciative!';
              progressIcon = 'favorite';
              break;
            case 'hopeful':
              progressMessage = 'This project filled you with hope and optimism!';
              progressIcon = 'wb-sunny';
              break;
            case 'proud':
              progressMessage = 'This project made you feel proud of your achievements!';
              progressIcon = 'emoji-events';
              break;
            case 'relieved':
              progressMessage = 'This project brought you relief and peace of mind!';
              progressIcon = 'spa';
              break;
            case 'motivated':
              progressMessage = 'This project kept you highly motivated and driven!';
              progressIcon = 'trending-up';
              break;
            case 'peaceful':
              progressMessage = 'This project brought you inner peace and tranquility!';
              progressIcon = 'spa';
              break;
            case 'content':
              progressMessage = 'This project made you feel content and satisfied!';
              progressIcon = 'sentiment-satisfied';
              break;
            case 'confident':
              progressMessage = 'This project boosted your confidence and self-belief!';
              progressIcon = 'self-improvement';
              break;
            
            // Negative moods - past tense
            case 'sad':
              progressMessage = 'This project was challenging and made you feel downhearted';
              progressIcon = 'sentiment-dissatisfied';
              break;
            case 'angry':
              progressMessage = 'This project was frustrating and angering for you';
              progressIcon = 'mood-bad';
              break;
            case 'tired':
              progressMessage = 'This project was exhausting and drained your energy';
              progressIcon = 'bedtime';
              break;
            case 'frustrated':
              progressMessage = 'This project proved to be frustrating for you';
              progressIcon = 'psychology';
              break;
            case 'anxious':
              progressMessage = 'This project caused you anxiety and worry';
              progressIcon = 'warning';
              break;
            case 'overwhelmed':
              progressMessage = 'This project felt overwhelming and too much to handle';
              progressIcon = 'psychology';
              break;
            case 'lonely':
              progressMessage = 'This project made you feel isolated and alone';
              progressIcon = 'person-off';
              break;
            case 'confused':
              progressMessage = 'This project was confusing and unclear to you';
              progressIcon = 'help';
              break;
            case 'disappointed':
              progressMessage = 'This project was disappointing and didn\'t meet your expectations';
              progressIcon = 'sentiment-dissatisfied';
              break;
            case 'worried':
              progressMessage = 'This project caused you worry and concern';
              progressIcon = 'psychology';
              break;
            case 'bored':
              progressMessage = 'This project felt boring and unengaging to you';
              progressIcon = 'sentiment-neutral';
              break;
            case 'stressed':
              progressMessage = 'This project stressed you out and caused tension';
              progressIcon = 'psychology';
              break;
            case 'exhausted':
              progressMessage = 'This project left you feeling completely exhausted';
              progressIcon = 'bedtime';
              break;
            
            // Neutral moods - past tense
            case 'calm':
              progressMessage = 'This project was a calm and peaceful experience for you';
              progressIcon = 'spa';
              break;
            case 'curious':
              progressMessage = 'This project sparked your curiosity and kept you interested';
              progressIcon = 'explore';
              break;
            case 'nostalgic':
              progressMessage = 'This project brought back fond memories and nostalgia';
              progressIcon = 'history';
              break;
            case 'surprised':
              progressMessage = 'This project continued to surprise and intrigue you';
              progressIcon = 'surprise';
              break;
            case 'focused':
              progressMessage = 'This project kept you focused and concentrated';
              progressIcon = 'center-focus-strong';
              break;
            case 'neutral':
              progressMessage = 'This project progressed at a steady, neutral pace';
              progressIcon = 'trending-flat';
              break;
            
            default:
              progressMessage = 'This project was completed successfully';
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
      }
    });
    
    return projectProgress.sort((a, b) => b.moodCount - a.moodCount);
  }, [completedTasks, getMoodInfo, generateMotivationSentence]);

  // Project emotional progress analysis - Mood-based evaluation
  const getProjectEmotionalProgress = useCallback(() => {
    const projectProgress = [];
    
    activeTasks.forEach(task => {
      if (task.milestones && task.milestones.length > 0) {
        const projectMoods = [];
        const moodCounts = {};
        
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
                
                // Count each mood
                moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
              }
            });
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
              progressMessage = 'This project is a joyful experience for you!';
              progressIcon = 'sentiment-satisfied';
              break;
            case 'excited':
              progressMessage = 'This project fills you with excitement and energy!';
              progressIcon = 'celebration';
              break;
            case 'grateful':
              progressMessage = 'This project makes you feel grateful and appreciative!';
              progressIcon = 'favorite';
              break;
            case 'hopeful':
              progressMessage = 'This project fills you with hope and optimism!';
              progressIcon = 'wb-sunny';
              break;
            case 'proud':
              progressMessage = 'This project makes you feel proud of your achievements!';
              progressIcon = 'emoji-events';
              break;
            case 'relieved':
              progressMessage = 'This project brings you relief and peace of mind!';
              progressIcon = 'spa';
              break;
            case 'motivated':
              progressMessage = 'This project keeps you highly motivated and driven!';
              progressIcon = 'trending-up';
              break;
            case 'peaceful':
              progressMessage = 'This project brings you inner peace and tranquility!';
              progressIcon = 'spa';
              break;
            case 'content':
              progressMessage = 'This project makes you feel content and satisfied!';
              progressIcon = 'sentiment-satisfied';
              break;
            case 'confident':
              progressMessage = 'This project boosts your confidence and self-belief!';
              progressIcon = 'self-improvement';
              break;
            
            // Negative moods
            case 'sad':
              progressMessage = 'This project is making you feel sad and downhearted';
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
              progressMessage = 'This project is proving to be frustrating for you';
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
              progressMessage = 'This project is disappointing and not meeting your expectations';
              progressIcon = 'sentiment-dissatisfied';
              break;
            case 'worried':
              progressMessage = 'This project is causing you worry and concern';
              progressIcon = 'psychology';
              break;
            case 'bored':
              progressMessage = 'This project feels boring and unengaging to you';
              progressIcon = 'sentiment-neutral';
              break;
            case 'stressed':
              progressMessage = 'This project is stressing you out and causing tension';
              progressIcon = 'psychology';
              break;
            case 'exhausted':
              progressMessage = 'This project is leaving you feeling completely exhausted';
              progressIcon = 'bedtime';
              break;
            
            // Neutral moods
            case 'calm':
              progressMessage = 'This project is a calm and peaceful experience for you';
              progressIcon = 'spa';
              break;
            case 'curious':
              progressMessage = 'This project sparks your curiosity and keeps you interested';
              progressIcon = 'explore';
              break;
            case 'nostalgic':
              progressMessage = 'This project brings back fond memories and nostalgia';
              progressIcon = 'history';
              break;
            case 'surprised':
              progressMessage = 'This project continues to surprise and intrigue you';
              progressIcon = 'surprise';
              break;
            case 'focused':
              progressMessage = 'This project keeps you focused and concentrated';
              progressIcon = 'center-focus-strong';
              break;
            case 'neutral':
              progressMessage = 'This project is progressing at a steady, neutral pace';
              progressIcon = 'trending-flat';
              break;
            
            default:
              progressMessage = 'This project is progressing steadily';
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
      case 'improving': return 'Your mood is improving!';
      case 'declining': return 'Your mood seems to be declining';
      default: return 'Your mood is stable';
    }
  }, [moodTrend]);

  // Günün mood'una göre gradient renkleri hesapla
  const getMoodGradientColors = useCallback(() => {
    if (!todayDominantMood) {
      return theme.name === 'dark' 
        ? ['#1C1C1E', '#1A1A1A', '#000000'] 
        : ['#FAFAFA', '#F5F3FF', '#EDE9FE'];
    }
    
    const baseColor = getSolidMoodColor(todayDominantMood.color);
    // Hex rengi RGB'ye çevir
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    if (theme.name === 'dark') {
      // Karanlık tema: mood renginden soft siyah tonlara geçiş
      const softBlack = '#1A1A1A';
      const darkMoodColor = `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 0.15)`;
      const moodColor = `rgba(${r}, ${g}, ${b}, 0.25)`;
      
      return [softBlack, darkMoodColor, moodColor];
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
                  backgroundColor: theme.name === 'dark' ? '#1C1C1E' : COLORS.WHITE,
                  borderColor: theme.name === 'dark' ? '#000000' : COLORS.GRAY[200],
                  shadowColor: theme.name === 'dark' ? '#000000' : COLORS.BLACK,
                  shadowOpacity: theme.name === 'dark' ? 0.3 : 0.1,
                  shadowRadius: theme.name === 'dark' ? 12 : 4,
                  elevation: theme.name === 'dark' ? 8 : ELEVATION.SM,
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
                backgroundColor: theme.name === 'dark' ? '#1C1C1E' : COLORS.WHITE,
                borderColor: theme.name === 'dark' ? '#000000' : COLORS.GRAY[200],
                shadowColor: theme.name === 'dark' ? '#000000' : COLORS.BLACK,
                shadowOpacity: theme.name === 'dark' ? 0.3 : 0.1,
                shadowRadius: theme.name === 'dark' ? 12 : 4,
                elevation: theme.name === 'dark' ? 8 : ELEVATION.SM,
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
          <Text style={[
            styles.sectionTitle,
            { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
          ]}>Overview</Text>
          <View style={[
            styles.overviewCard, 
            { 
              borderLeftColor: getSolidMoodColor(todayDominantMood?.color) || COLORS.PRIMARY,
              backgroundColor: theme.name === 'dark' ? '#1C1C1E' : 'rgba(255, 255, 255, 0.95)',
              shadowColor: theme.name === 'dark' ? '#000000' : COLORS.BLACK,
              shadowOpacity: theme.name === 'dark' ? 0.3 : 0.1,
              shadowRadius: theme.name === 'dark' ? 12 : 8,
              elevation: theme.name === 'dark' ? 8 : ELEVATION.MD,
            }
          ]}>
            <View style={styles.overviewGrid}>
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

              {/* Last 7 Days */}
              <View style={styles.overviewItem}>
                <View style={[styles.overviewIcon, { backgroundColor: 'rgba(142, 125, 190, 0.1)' }]}>
                  <Ionicons name="calendar-outline" size={16} color="#8E7DBE" />
                </View>
                <Text style={[
                  styles.overviewNumber,
                  { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
                ]}>{moodStats.last7Days}</Text>
                <Text style={[
                  styles.overviewLabel,
                  { color: theme.name === 'dark' ? '#8E8E93' : COLORS.GRAY[500] }
                ]}>{t('thisWeek')}</Text>
              </View>

              {/* Last 30 Days */}
              <View style={styles.overviewItem}>
                <View style={[styles.overviewIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                  <Ionicons name="calendar" size={16} color="#4CAF50" />
                </View>
                <Text style={[
                  styles.overviewNumber,
                  { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
                ]}>{moodStats.last30Days}</Text>
                <Text style={[
                  styles.overviewLabel,
                  { color: theme.name === 'dark' ? '#8E8E93' : COLORS.GRAY[500] }
                ]}>{t('thisMonth')}</Text>
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
              <Text style={[
                styles.sectionTitle,
                { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
              ]}>Mood Trend</Text>
              <View style={[
                styles.trendCard,
                { 
                  borderLeftColor: getTrendColor(),
                  backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
                  shadowColor: theme.name === 'dark' ? '#000000' : '#000',
                  shadowOpacity: theme.name === 'dark' ? 0.3 : 0.1,
                  shadowRadius: theme.name === 'dark' ? 12 : 8,
                  elevation: theme.name === 'dark' ? 8 : 3,
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
                  Based on your last 7 days of mood entries
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
                 ]}>Project Progress</Text>
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
                           backgroundColor: theme.name === 'dark' ? '#1C1C1E' : 'rgba(255, 255, 255, 0.95)',
                           shadowColor: theme.name === 'dark' ? '#000000' : COLORS.BLACK,
                           shadowOpacity: theme.name === 'dark' ? 0.3 : 0.08,
                           shadowRadius: theme.name === 'dark' ? 12 : 8,
                           elevation: theme.name === 'dark' ? 8 : ELEVATION.SM,
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
                               ]}>{project.moodCount} entries</Text>
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
                         
                         <View style={[styles.flowBottomBar, { backgroundColor: project.progressColor + '20' }]} />
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
               <Text style={[
                 styles.sectionTitle,
                 { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
               ]}>Start Your Emotional Journey</Text>
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
                           ? `You have ${project.totalEntries} journal entries - add mood tags to track your emotional journey!`
                           : `You have ${project.milestoneCount} milestones - start writing journal entries with mood tags!`
                         }
                       </Text>
                       <Text style={[
                         styles.motivationText,
                         { color: theme.name === 'dark' ? '#8E8E93' : '#666666' }
                       ]}>
                         {project.totalEntries > 0 
                           ? "Your thoughts are valuable! Adding mood tags will help you understand your emotional patterns and growth."
                           : "Every journey begins with a single step. Start documenting your progress and feelings today!"
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
               <Text style={[
                 styles.sectionTitle,
                 { color: theme.name === 'dark' ? '#FFFFFF' : COLORS.GRAY[800] }
               ]}>Completed Projects Emotional Journey</Text>
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



          {/* Minimal Recommendations */}
          {(() => {
            const { recommendations } = getInsightsAndRecommendations();
            return recommendations.length > 0 && (
              <View style={styles.minimalRecommendationsContainer}>
                <Text style={[
                  styles.minimalRecommendationsTitle,
                  { color: theme.name === 'dark' ? '#FFFFFF' : '#333' }
                ]}>💡 Quick Tips</Text>
                <View style={styles.minimalRecommendationsList}>
                  {recommendations.slice(0, 2).map((rec, index) => (
                    <View key={index} style={[
                      styles.minimalRecommendationItem,
                      {
                        backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.6)',
                        borderLeftColor: theme.name === 'dark' ? '#FF6B6B' : '#FF9800',
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
    marginTop: SPACING.LG,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.MD,
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
   minimalRecommendationsContainer: {
     marginTop: 20,
     marginBottom: 40,
     paddingHorizontal: SPACING.LG,
   },
   minimalRecommendationsTitle: {
     fontSize: 16,
     fontFamily: 'Poppins_600SemiBold',
     color: '#333',
     marginBottom: 12,
     textAlign: 'center',
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
