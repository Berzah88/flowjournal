// components/MoodStatement.js
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { MOODS } from '../utils/AIMoodPredictor';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// Helper: Semantic analiz ile mood pattern'leri tespit et
const analyzeSemanticPatterns = (allMoods) => {
  if (allMoods.length < 2) return null;
  
  // En erken ve en son mood'ları karşılaştır
  const sortedByTime = [...allMoods].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  const firstMood = sortedByTime[0].mood;
  const lastMood = sortedByTime[sortedByTime.length - 1].mood;
  
  const firstCategory = getMoodCategory(firstMood);
  const lastCategory = getMoodCategory(lastMood);
  
  // Gün içinde iyileşme/kötüleşme tespiti
  if (firstCategory === 'negative' && lastCategory === 'positive') {
    return { type: 'improvement', message: '🌅 Gün içinde iyileştin!' };
  } else if (firstCategory === 'positive' && lastCategory === 'negative') {
    return { type: 'decline', message: '🌙 Gün sonu yorgunluğu' };
  } else if (allMoods.length >= 3) {
    // Mood çeşitliliği analizi
    const uniqueMoods = new Set(allMoods.map(m => m.mood));
    if (uniqueMoods.size >= 3) {
      return { type: 'diverse', message: '🎨 Zengin bir duygu paleti' };
    }
  }
  
  return null;
};

// Helper: Mood kategorisini belirle
const getMoodCategory = (moodKey) => {
  const positiveMoods = ['happy', 'excited', 'grateful', 'hopeful', 'proud', 'motivated', 'energetic', 'relieved', 'peaceful', 'content'];
  const negativeMoods = ['sad', 'angry', 'anxious', 'frustrated', 'overwhelmed', 'lonely', 'disappointed', 'worried'];
  
  if (positiveMoods.includes(moodKey)) return 'positive';
  if (negativeMoods.includes(moodKey)) return 'negative';
  return 'neutral';
};

// Helper: Light mood color'ı solid color'a çevir
const getSolidMoodColor = (originalColor) => {
  const colorMap = {
    // Basic MOODS
    '#C8E6C9': '#4CAF50', // Happy - Light green
    '#FFE0B2': '#FF9800', // Excited - Light orange
    '#E1BEE7': '#9C27B0', // Tired - Light purple
    '#FFCDD2': '#F44336', // Sad - Light red
    '#FFAB91': '#FF5722', // Angry - Light deep orange
    
    // EXTENDED_MOODS
    '#FFCCBC': '#FF7043', // Frustrated
    '#FFF3E0': '#FFB74D', // Anxious
    '#E8F5E8': '#66BB6A', // Grateful
    '#E1F5FE': '#42A5F5', // Hopeful
    '#FFF8E1': '#FFCA28', // Proud
    '#F3E5F5': '#BA68C8', // Relieved
    '#FFEBEE': '#EF5350', // Overwhelmed
    '#E0E0E0': '#90A4AE', // Lonely
    '#DCEDC8': '#8BC34A', // Motivated
    '#F5F5F5': '#BDBDBD', // Confused
    '#FFE0E6': '#F48FB1', // Disappointed
    '#E8EAF6': '#7986CB', // Nostalgic
    '#E0F2F1': '#4DB6AC', // Peaceful
    '#FFFDE7': '#FFF176', // Curious
    '#FAFAFA': '#E0E0E0', // Bored
    '#FFF9C4': '#FFF59D', // Surprised
    '#FCE4EC': '#F06292', // Worried
    '#CFD8DC': '#90A4AE', // Natural
  };
  
  return colorMap[originalColor] || originalColor;
};

// Helper: Zaman bazlı weight hesapla
const getTimeBasedWeight = (timestamp) => {
  const hour = new Date(timestamp).getHours();
  
  // Sabah (6-12): 0.7 - Eski
  if (hour >= 6 && hour < 12) return 0.7;
  
  // Öğle (12-18): 0.85 - Orta
  if (hour >= 12 && hour < 18) return 0.85;
  
  // Akşam (18-24 + 0-6): 1.0 - En güncel
  return 1.0;
};

const MoodStatement = ({ 
  activeTasks = [], 
  completedTasks = [],
  selectedDate,
  onPress = null
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  // Bugünkü mood'ları hesapla
  const todayMoodData = useMemo(() => {
    const today = new Date(selectedDate);
    today.setHours(0, 0, 0, 0);
    
    const todayMoods = [];
    const moodCounts = {};
    let hasCompletedProjectToday = false;
    
    // Tüm projelerdeki journal entry'leri tara (project-based system)
    activeTasks.forEach(task => {
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
              text: entry.text,
              timestamp: entry.createdAt
            });
            
            // Mood sayısını artır
            moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
          }
        });
      }
    });
    
    // Bugün tamamlanan projeleri kontrol et
    completedTasks.forEach(task => {
      // Proje bugün tamamlandı mı kontrol et
      if (task.done) {
        // Task'in updatedAt veya completedAt alanı varsa onu kullan
        // Yoksa milestones'ların tamamlanma tarihlerini kontrol et
        let completionDate = null;
        
        // updatedAt veya completedAt varsa direkt kullan
        if (task.updatedAt) {
          completionDate = new Date(task.updatedAt);
        } else if (task.completedAt) {
          completionDate = new Date(task.completedAt);
        }
        
        // Eğer completionDate varsa ve bugünse, günlük sayısını artır
        if (completionDate) {
          completionDate.setHours(0, 0, 0, 0);
          if (completionDate.getTime() === today.getTime()) {
            hasCompletedProjectToday = true;
          }
        }
      }
      
      // Ayrıca tamamlanan projelerin de journal entry'lerini kontrol et
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
              text: entry.text,
              timestamp: entry.createdAt
            });
            
            // Mood sayısını artır
            moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
          }
        });
      }
    });
    
    // ✨ YENİ: Zaman bazlı ağırlıklandırma ile dominant mood hesapla
    let dominantMood = null;
    let maxWeightedScore = 0;
    const moodWeightedScores = {};
    
    // Her mood için weighted score hesapla
    todayMoods.forEach(entry => {
      const timeWeight = getTimeBasedWeight(entry.timestamp);
      const mood = entry.mood;
      
      if (!moodWeightedScores[mood]) {
        moodWeightedScores[mood] = 0;
      }
      
      moodWeightedScores[mood] += timeWeight;
    });
    
    // En yüksek weighted score'u bul
    Object.entries(moodWeightedScores).forEach(([mood, score]) => {
      if (score > maxWeightedScore) {
        maxWeightedScore = score;
        
        // Önce MOODS'da ara
        let foundMood = MOODS.find(m => m.key === mood);
        
        // MOODS'da bulunamazsa EXTENDED_MOODS'da ara
        if (!foundMood) {
          const { EXTENDED_MOODS } = require('../utils/AIMoodPredictor');
          foundMood = EXTENDED_MOODS.find(m => m.key === mood);
        }
        
        // Hiçbirinde bulunamazsa, journal entry'den gelen bilgileri kullan
        if (!foundMood) {
          const entryWithMood = todayMoods.find(entry => entry.mood === mood);
          foundMood = {
            key: mood,
            label: mood.charAt(0).toUpperCase() + mood.slice(1),
            icon: entryWithMood?.moodIcon || 'sentiment-neutral',
            color: entryWithMood?.moodColor || '#4A90E2'
          };
        }
        
        dominantMood = foundMood;
      }
    });
    
    // ✨ YENİ: Dünkü mood'u hesapla (Trend Analysis)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayMoods = [];
    
    [...activeTasks, ...completedTasks].forEach(task => {
      if (task.journalEntries) {
        task.journalEntries.forEach(entry => {
          const entryDate = new Date(entry.createdAt);
          entryDate.setHours(0, 0, 0, 0);
          
          if (entryDate.getTime() === yesterday.getTime() && entry.mood) {
            yesterdayMoods.push({ mood: entry.mood, timestamp: entry.createdAt });
          }
        });
      }
    });
    
    // Dünkü dominant mood
    let yesterdayDominantMood = null;
    if (yesterdayMoods.length > 0) {
      const yesterdayWeightedScores = {};
      yesterdayMoods.forEach(entry => {
        const timeWeight = getTimeBasedWeight(entry.timestamp);
        yesterdayWeightedScores[entry.mood] = (yesterdayWeightedScores[entry.mood] || 0) + timeWeight;
      });
      
      let maxYesterdayScore = 0;
      Object.entries(yesterdayWeightedScores).forEach(([mood, score]) => {
        if (score > maxYesterdayScore) {
          maxYesterdayScore = score;
          yesterdayDominantMood = mood;
        }
      });
    }
    
    // Trend analizi
    let trendDirection = null;
    let trendMessage = null;
    
    if (dominantMood && yesterdayDominantMood) {
      const todayCategory = getMoodCategory(dominantMood.key);
      const yesterdayCategory = getMoodCategory(yesterdayDominantMood);
      
      if (todayCategory === 'positive' && yesterdayCategory === 'negative') {
        trendDirection = 'up';
        trendMessage = 'improvingFromYesterday'; // "Dünden daha iyi!"
      } else if (todayCategory === 'negative' && yesterdayCategory === 'positive') {
        trendDirection = 'down';
        trendMessage = 'worseningFromYesterday'; // "Ruh halin biraz düştü"
      } else if (todayCategory === yesterdayCategory) {
        trendDirection = 'stable';
        trendMessage = 'stableMood'; // "Sabit bir ruh hali"
      }
    }
    
    // ✨ YENİ: Streak Calculation (Son 7 gün)
    const last7Days = [];
    const journalStreak = { current: 0, longest: 0 };
    const moodStreak = { mood: null, count: 0 };
    
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);
      
      const dayMoods = [];
      [...activeTasks, ...completedTasks].forEach(task => {
        if (task.journalEntries) {
          task.journalEntries.forEach(entry => {
            const entryDate = new Date(entry.createdAt);
            entryDate.setHours(0, 0, 0, 0);
            
            if (entryDate.getTime() === checkDate.getTime() && entry.mood) {
              dayMoods.push(entry.mood);
            }
          });
        }
      });
      
      last7Days.push({
        date: new Date(checkDate),
        hasEntry: dayMoods.length > 0,
        moods: dayMoods
      });
    }
    
    // Journal streak hesapla (kaç gün üst üste journal yazıldı)
    let currentStreak = 0;
    for (const day of last7Days) {
      if (day.hasEntry) {
        currentStreak++;
      } else {
        break;
      }
    }
    journalStreak.current = currentStreak;
    
    // Mood streak hesapla (aynı mood kaç gün üst üste)
    if (dominantMood) {
      let consecutiveDays = 0;
      for (const day of last7Days) {
        if (day.moods.includes(dominantMood.key)) {
          consecutiveDays++;
        } else {
          break;
        }
      }
      
      if (consecutiveDays >= 2) {
        moodStreak.mood = dominantMood.key;
        moodStreak.count = consecutiveDays;
      }
    }
    
    // ✨ Semantic Analysis - Gün içi mood patterns
    const semanticPattern = analyzeSemanticPatterns(todayMoods);
    
    return {
      dominantMood,
      totalEntries: todayMoods.length + (hasCompletedProjectToday ? 1 : 0),
      allMoods: todayMoods,
      hasCompletedProjectToday,
      // ✨ YENİ özellikler
      trendDirection,
      trendMessage,
      yesterdayDominantMood,
      journalStreak,
      moodStreak,
      moodCounts, // Mood çeşitliliği için
      semanticPattern, // ✨ Gün içi pattern analizi
    };
  }, [activeTasks, completedTasks, selectedDate]);
  
  // Sadece bugün için göster
  const today = new Date();
  const selectedDateObj = new Date(selectedDate);
  today.setHours(0, 0, 0, 0);
  selectedDateObj.setHours(0, 0, 0, 0);
  
  // Bugün değilse component'i gösterme
  if (selectedDateObj.getTime() !== today.getTime()) {
    return null;
  }
  
  const content = (
    <View style={styles.container}>
      {/* Enhanced Mood Status - More Prominent */}
      <View style={[
        styles.moodStatus,
        { 
          borderLeftColor: todayMoodData.dominantMood?.color || '#007AFF',
          backgroundColor: theme.name === 'dark' 
            ? (todayMoodData.dominantMood ? 'rgba(28, 28, 30, 0.95)' : 'rgba(0, 122, 255, 0.12)')
            : (todayMoodData.dominantMood ? 'rgba(255, 255, 255, 0.98)' : 'rgba(0, 122, 255, 0.08)'),
          borderWidth: theme.name === 'dark' ? 1 : 0.5,
          borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          shadowColor: todayMoodData.dominantMood?.color || '#8E7DBE',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 3,
        }
      ]}>
        <View style={[
          styles.moodIconContainer,
          {
            backgroundColor: todayMoodData.dominantMood?.color || '#007AFF',
            shadowColor: todayMoodData.dominantMood?.color || '#007AFF',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 2,
          }
        ]}>
          <MaterialIcons 
            name={todayMoodData.dominantMood?.icon || 'create'} 
            size={20} 
            color="#000000" 
          />
        </View>
        
        <View style={styles.statusContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={[
              styles.statusText,
              { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
            ]}>
              {todayMoodData.dominantMood ? 
                `${t('todayYourMoodIs')} ${t(todayMoodData.dominantMood.key) || todayMoodData.dominantMood.label || todayMoodData.dominantMood.key}${t('like') ? ' ' + t('like') : ''}` :
                t('howAreYouFeelingToday')
              }
            </Text>
            
            {/* ✨ Trend Arrow */}
            {todayMoodData.trendDirection && (
              <Text style={{ fontSize: 16, marginLeft: 4 }}>
                {todayMoodData.trendDirection === 'up' ? ' ↗️' : 
                 todayMoodData.trendDirection === 'down' ? ' ↘️' : ' →'}
              </Text>
            )}
            
            {/* ✨ Streak Badge */}
            {todayMoodData.journalStreak.current >= 3 && (
              <View style={[styles.streakBadge, { backgroundColor: todayMoodData.dominantMood?.color || '#FF9500', marginLeft: 6 }]}>
                <Text style={styles.streakText}>🔥 {todayMoodData.journalStreak.current}</Text>
              </View>
            )}
          </View>
          
          <Text style={[
            styles.motivationText,
            { 
              color: theme.name === 'dark' 
                ? (todayMoodData.dominantMood ? '#8E8E93' : '#4A90E2')
                : (todayMoodData.dominantMood ? '#8E8E93' : '#4A90E2')
            }
          ]}>
            {/* ✨ Context-Aware & Smart Messages with Priority */}
            {todayMoodData.totalEntries > 0 ? (
              // Priority 1: Dün vs bugün trend
              todayMoodData.trendMessage === 'improvingFromYesterday' ? '✨ Dünden daha iyi hissediyorsun!' :
              todayMoodData.trendMessage === 'worseningFromYesterday' ? '💙 Bugün zor bir gün olabilir, kendine iyi bak' :
              // Priority 2: Semantic gün içi pattern
              todayMoodData.semanticPattern?.message ? todayMoodData.semanticPattern.message :
              // Priority 3: Mood streak
              todayMoodData.moodStreak.count >= 3 ? `🎯 ${todayMoodData.moodStreak.count} gündür ${todayMoodData.moodStreak.mood}` :
              // Priority 4: Journal streak
              todayMoodData.journalStreak.current >= 5 ? `🔥 ${todayMoodData.journalStreak.current} gün üst üste journal yazıyorsun!` :
              // Priority 5: Stable mood
              todayMoodData.trendMessage === 'stableMood' ? '→ Tutarlı bir ruh hali' :
              // Default: View details
              t('viewMoreDetails')
            ) : (
              t('startJournalingToday') || 'Bugünü kaydetmeye başlayın'
            )}
          </Text>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 26,
    marginTop: 10,
    marginBottom: 6,
  },
  moodStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderLeftWidth: 3,
  },
  moodIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 3,
    lineHeight: 19,
    letterSpacing: -0.3,
  },
  motivationText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 16,
    opacity: 0.75,
  },
  streakBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  streakText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: '#000000',
  },
});

export default MoodStatement;
