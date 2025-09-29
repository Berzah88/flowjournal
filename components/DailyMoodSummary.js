// components/DailyMoodSummary.js
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { MOODS } from '../utils/MoodPredictor';

const { width } = Dimensions.get('window');

const DailyMoodSummary = ({ 
  activeTasks = [], 
  selectedDate,
  hasMedia = false
}) => {
  // Bugünkü mood'ları hesapla
  const todayMoodData = useMemo(() => {
    const today = new Date(selectedDate);
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
                  text: entry.text,
                  timestamp: entry.createdAt
                });
                
                // Mood sayısını artır
                moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
              }
            });
          }
        });
      }
    });
    
    // En çok kullanılan mood'u bul
    const dominantMood = Object.keys(moodCounts).reduce((a, b) => 
      moodCounts[a] > moodCounts[b] ? a : b, null
    );
    
    // Mood objesini bul
    const moodObj = MOODS.find(m => m.key === dominantMood) || 
                   (todayMoods.length > 0 ? {
                     key: todayMoods[0].mood,
                     icon: todayMoods[0].moodIcon,
                     color: todayMoods[0].moodColor,
                     label: todayMoods[0].mood
                   } : null);
    
    return {
      moods: todayMoods,
      dominantMood: moodObj,
      totalEntries: todayMoods.length,
      moodCounts
    };
  }, [activeTasks, selectedDate]);
  
  // Motivasyon mesajları
  const getMotivationMessage = () => {
    const { totalEntries, dominantMood } = todayMoodData;
    
    if (totalEntries === 0) {
      return {
        title: "How are you feeling today?",
        subtitle: "Start recording your emotions and make sense of your day",
        action: "Write your first journal"
      };
    }
    
    if (totalEntries === 1) {
      return {
        title: "Great start!",
        subtitle: "Keep sharing your emotions, this is very valuable",
        action: "Write more"
      };
    }
    
    if (totalEntries >= 3) {
      return {
        title: "Very active day!",
        subtitle: "You express your emotions beautifully, this is great",
        action: "Continue"
      };
    }
    
    // Mood'a göre kişiselleştirilmiş mesajlar
    if (dominantMood) {
      const moodMessages = {
        'happy': {
          title: "Happy day!",
          subtitle: "Keep recording this positive energy",
          action: "Share your happiness"
        },
        'calm': {
          title: "Calm day",
          subtitle: "Recording these peaceful moments is beautiful",
          action: "Write your peace"
        },
        'angry': {
          title: "Challenging day",
          subtitle: "Writing your emotions will relax you",
          action: "Express your emotions"
        },
        'sick': {
          title: "Time to rest",
          subtitle: "Recording how you feel helps your recovery",
          action: "Write your condition"
        },
        'Natural': {
          title: "Normal day",
          subtitle: "Every day has its own unique story",
          action: "Record your day"
        }
      };
      
      return moodMessages[dominantMood.key] || {
        title: "Going well!",
        subtitle: "Keep recording your emotions",
        action: "Write more"
      };
    }
    
    return {
      title: "Going well!",
      subtitle: "Keep recording your emotions",
      action: "Write more"
    };
  };
  
  const motivation = getMotivationMessage();
  
  // Mood trend analizi
  const getMoodTrend = () => {
    const { moodCounts } = todayMoodData;
    const moodKeys = Object.keys(moodCounts);
    
    if (moodKeys.length === 0) return null;
    if (moodKeys.length === 1) return "Consistent";
    
    const maxCount = Math.max(...Object.values(moodCounts));
    const totalCount = Object.values(moodCounts).reduce((a, b) => a + b, 0);
    
    if (maxCount / totalCount > 0.7) return "Consistent";
    if (maxCount / totalCount > 0.5) return "Mixed";
    return "Variable";
  };
  
  const moodTrend = getMoodTrend();
  
  // Milestone'ın bugün için uygun olup olmadığını kontrol et
  const isMilestoneActiveToday = (milestone, selectedDate) => {
    const today = new Date(selectedDate);
    today.setHours(0, 0, 0, 0);
    
    if (milestone.startDate) {
      const milestoneStartDate = new Date(milestone.startDate);
      milestoneStartDate.setHours(0, 0, 0, 0);
      if (milestoneStartDate > today) return false;
    }
    
    if (milestone.endDate) {
      const milestoneEndDate = new Date(milestone.endDate);
      milestoneEndDate.setHours(23, 59, 59, 999);
      if (milestoneEndDate < today) return false;
    }
    
    return true;
  };
  
  // Progress hesaplama
  const progressData = useMemo(() => {
    const today = new Date(selectedDate);
    today.setHours(0, 0, 0, 0);
    
    const totalMilestones = activeTasks.reduce((acc, project) => 
      acc + (project.milestones?.filter(m => !m.completed && isMilestoneActiveToday(m, today)).length || 0), 0
    );
    const completedMilestones = activeTasks.reduce((acc, project) => 
      acc + (project.milestones?.filter(m => m.completed && isMilestoneActiveToday(m, today)).length || 0), 0
    );
    
    const total = totalMilestones + completedMilestones;
    const percentage = total > 0 ? Math.round((completedMilestones / total) * 100) : 0;
    
    return {
      total,
      completed: completedMilestones,
      remaining: totalMilestones,
      percentage
    };
  }, [activeTasks, selectedDate]);
  
  // Sadece bugün için göster
  const today = new Date();
  const selectedDateObj = new Date(selectedDate);
  today.setHours(0, 0, 0, 0);
  selectedDateObj.setHours(0, 0, 0, 0);
  
  // Bugün değilse component'i gösterme
  if (selectedDateObj.getTime() !== today.getTime()) {
    return null;
  }
  
  return (
    <View style={[
      styles.container,
      hasMedia && styles.mediaOverlay
    ]}>
      {/* Progress Status - Inline Design */}
      {progressData.total > 0 && (
        <View style={styles.progressStatus}>
          <View style={styles.progressIconContainer}>
            <Ionicons name="trending-up" size={16} color="#34C759" />
          </View>
          
          <View style={styles.progressContent}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>İlerleme Durumu</Text>
              <Text style={styles.progressPercentage}>{progressData.percentage}%</Text>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressBarFill,
                  { width: `${progressData.percentage}%` }
                ]}>
                  <LinearGradient
                    colors={['#34C759', '#30D158']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressGradient}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 30,
    marginTop: 8,
    marginBottom: 4,
  },
  mediaOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    marginHorizontal: 16,
    marginTop: 8,
  },
  // Progress Status Styles
  progressStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.05)',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
    marginTop: 4,
    marginHorizontal: 2, // Kartlarla aynı margin
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
    color: '#1D1D1F',
  },
  progressPercentage: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#34C759',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  progressBarContainer: {
    marginBottom: 0,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
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

export default DailyMoodSummary;
