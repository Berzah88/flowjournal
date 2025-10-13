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
    return { type: 'improvement' };
  } else if (firstCategory === 'positive' && lastCategory === 'negative') {
    return { type: 'decline' };
  } else if (allMoods.length >= 3) {
    // Mood çeşitliliği analizi
    const uniqueMoods = new Set(allMoods.map(m => m.mood));
    if (uniqueMoods.size >= 3) {
      return { type: 'diverse' };
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

// Helper: Recency bazlı weight hesapla - EN ÖNEMLİ: Son girilen entry en yüksek weight
const getRecencyWeight = (timestamp, allTimestamps) => {
  const entryTime = new Date(timestamp).getTime();
  const now = Date.now();
  const timeDiff = now - entryTime; // Milliseconds
  
  // RECENCY FACTOR - Ne kadar yakınsa o kadar yüksek
  let recencyWeight = 1.0;
  
  if (timeDiff < 60 * 60 * 1000) {
    // Son 1 saat: 3.0x weight (ÇOK ÖNEMLİ)
    recencyWeight = 3.0;
  } else if (timeDiff < 3 * 60 * 60 * 1000) {
    // Son 3 saat: 2.0x weight
    recencyWeight = 2.0;
  } else if (timeDiff < 6 * 60 * 60 * 1000) {
    // Son 6 saat: 1.5x weight
    recencyWeight = 1.5;
  } else if (timeDiff < 12 * 60 * 60 * 1000) {
    // Son 12 saat: 1.2x weight
    recencyWeight = 1.2;
  }
  // Daha eski: 1.0x (normal)
  
  return recencyWeight;
};

const MoodStatement = React.memo(({ 
  activeTasks = [], 
  completedTasks = [],
  selectedDate, // Optional - yoksa bugün kullanılır
  onPress = null,
  onCreateFirstProject = null // Yeni: İlk proje oluşturma callback
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  // STEP 1: Journal metadata'yı hesapla (lightweight!)
  const journalMetadata = useMemo(() => {
    let totalCount = 0;
    let lastTimestamp = '';
    
    [...activeTasks, ...completedTasks].forEach(task => {
      if (task.journalEntries && Array.isArray(task.journalEntries)) {
        totalCount += task.journalEntries.length;
        const lastEntry = task.journalEntries[task.journalEntries.length - 1];
        if (lastEntry?.createdAt > lastTimestamp) {
          lastTimestamp = lastEntry.createdAt;
        }
      }
    });
    
    return { totalCount, lastTimestamp };
  }, [activeTasks, completedTasks]);
  
  // STEP 2: Journal entries'i flat array'e çıkar - SADECE METADATA DEĞİŞTİĞİNDE
  const allJournalEntries = useMemo(() => {
    console.log('📦 MoodStatement - Journal cache güncelleniyor');
    
    const entries = [];
    [...activeTasks, ...completedTasks].forEach(task => {
      if (task.journalEntries && Array.isArray(task.journalEntries)) {
        task.journalEntries.forEach(entry => {
          entries.push({
            ...entry,
            projectId: task.id,
            projectDone: task.done
          });
        });
      }
    });
    return entries;
  }, [journalMetadata.totalCount, journalMetadata.lastTimestamp]); // ✅ Primitive values!
  
  // Bugünkü mood'ları hesapla - SADECE allJournalEntries DEĞİŞTİĞİNDE
  const todayMoodData = useMemo(() => {
    console.log('🔄 MoodStatement - HESAPLAMA YAPILIYOR (sadece journal değiştiğinde olmalı)');
    
    // selectedDate yoksa bugünü kullan
    const dateToUse = selectedDate || new Date();
    const today = new Date(dateToUse);
    today.setHours(0, 0, 0, 0);
    
    const todayMoods = [];
    const moodCounts = {};
    let hasCompletedProjectToday = false;
    
    // Bugünkü entry'leri filtrele - allJournalEntries'den (optimize edilmiş)
    allJournalEntries.forEach(entry => {
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
    
    // Bugün tamamlanan projeleri kontrol et (hızlı check)
    const completedTasksList = completedTasks.filter(t => t.done);
    completedTasksList.forEach(task => {
      const completionDate = task.updatedAt ? new Date(task.updatedAt) : 
                            task.completedAt ? new Date(task.completedAt) : null;
      
      if (completionDate) {
        completionDate.setHours(0, 0, 0, 0);
        if (completionDate.getTime() === today.getTime()) {
          hasCompletedProjectToday = true;
        }
      }
    });
    
    // ✨ RECENCY-BASED: Son girilen entry en yüksek öncelik!
    let dominantMood = null;
    let maxWeightedScore = 0;
    const moodWeightedScores = {};
    
    // Tüm timestamp'leri al (recency hesaplama için)
    const allTimestamps = todayMoods.map(e => e.timestamp);
    
    // Her mood için weighted score hesapla - RECENCY FACTOR
    todayMoods.forEach(entry => {
      const recencyWeight = getRecencyWeight(entry.timestamp, allTimestamps);
      const mood = entry.mood;
      
      if (!moodWeightedScores[mood]) {
        moodWeightedScores[mood] = 0;
      }
      
      // Son 1 saat içindeki entry 3x daha önemli!
      moodWeightedScores[mood] += recencyWeight;
    });
    
    // En yüksek weighted score'u bul - SADECE EN YÜKSEK SCORE'U BUL
    let dominantMoodKey = null;
    Object.entries(moodWeightedScores).forEach(([mood, score]) => {
      if (score > maxWeightedScore) {
        maxWeightedScore = score;
        dominantMoodKey = mood;
      }
    });
    
    // Dominant mood bulunduysa mood objesini oluştur
    if (dominantMoodKey) {
      // Önce MOODS'da ara
      let foundMood = MOODS.find(m => m.key === dominantMoodKey);
        
      // MOODS'da bulunamazsa EXTENDED_MOODS'da ara
      if (!foundMood) {
        const { EXTENDED_MOODS } = require('../utils/AIMoodPredictor');
        foundMood = EXTENDED_MOODS.find(m => m.key === dominantMoodKey);
      }
      
      // Hiçbirinde bulunamazsa, journal entry'den gelen bilgileri kullan
      if (!foundMood) {
        const entryWithMood = todayMoods.find(entry => entry.mood === dominantMoodKey);
        foundMood = {
          key: dominantMoodKey,
          label: dominantMoodKey.charAt(0).toUpperCase() + dominantMoodKey.slice(1),
          icon: entryWithMood?.moodIcon || 'sentiment-neutral',
          color: entryWithMood?.moodColor || '#4A90E2'
        };
      }
      
      dominantMood = foundMood;
      
      // Debug log - Sadece final result
      if (todayMoods.length > 0) {
        console.log('🎭 MoodStatement - Final Dominant:', dominantMood?.key, 
                    '| Scores:', moodWeightedScores,
                    '| Entries:', todayMoods.length);
      }
    }
    
    // ✨ YENİ: Dünkü mood'u hesapla (Trend Analysis) - OPTIMIZE
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayMoods = [];
    
    // allJournalEntries'den dünkü mood'ları filtrele
    allJournalEntries.forEach(entry => {
      const entryDate = new Date(entry.createdAt);
      entryDate.setHours(0, 0, 0, 0);
      
      if (entryDate.getTime() === yesterday.getTime() && entry.mood) {
        yesterdayMoods.push({ mood: entry.mood, timestamp: entry.createdAt });
      }
    });
    
    // Dünkü dominant mood - Dün için de recency kullan
    let yesterdayDominantMood = null;
    if (yesterdayMoods.length > 0) {
      const yesterdayWeightedScores = {};
      const yesterdayTimestamps = yesterdayMoods.map(e => e.timestamp);
      
      yesterdayMoods.forEach(entry => {
        const recencyWeight = getRecencyWeight(entry.timestamp, yesterdayTimestamps);
        yesterdayWeightedScores[entry.mood] = (yesterdayWeightedScores[entry.mood] || 0) + recencyWeight;
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
    
    // ✨ YENİ: Streak Calculation (Son 7 gün) - OPTIMIZE
    const last7Days = [];
    const journalStreak = { current: 0, longest: 0 };
    const moodStreak = { mood: null, count: 0 };
    
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);
      
      // allJournalEntries'den bu günün mood'larını filtrele (optimize)
      const dayMoods = allJournalEntries
        .filter(entry => {
          const entryDate = new Date(entry.createdAt);
          entryDate.setHours(0, 0, 0, 0);
          return entryDate.getTime() === checkDate.getTime() && entry.mood;
        })
        .map(entry => entry.mood);
      
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
  }, [allJournalEntries, completedTasks, selectedDate]); // ✅ SADECE JOURNAL DEĞİŞTİĞİNDE!
  
  // Sadece bugün için göster - selectedDate verilmemişse her zaman göster
  if (selectedDate) {
    const today = new Date();
    const selectedDateObj = new Date(selectedDate);
    today.setHours(0, 0, 0, 0);
    selectedDateObj.setHours(0, 0, 0, 0);
    
    // selectedDate bugün değilse component'i gösterme
    if (selectedDateObj.getTime() !== today.getTime()) {
      return null;
    }
  }
  
  // Check: Hiç proje var mı?
  const hasNoProjects = activeTasks.length === 0 && completedTasks.length === 0;
  
  const content = (
    <View style={styles.container}>
      {/* Enhanced Mood Status - More Prominent */}
      <View style={[
        styles.moodStatus,
        { 
          borderLeftColor: hasNoProjects 
            ? '#667eea' // Proje yoksa mor
            : (todayMoodData.dominantMood?.color || '#007AFF'),
          backgroundColor: theme.name === 'dark' 
            ? (hasNoProjects ? 'rgba(102, 126, 234, 0.12)' : (todayMoodData.dominantMood ? 'rgba(28, 28, 30, 0.95)' : 'rgba(0, 122, 255, 0.12)'))
            : (hasNoProjects ? 'rgba(102, 126, 234, 0.08)' : (todayMoodData.dominantMood ? 'rgba(255, 255, 255, 0.98)' : 'rgba(0, 122, 255, 0.08)')),
          borderWidth: theme.name === 'dark' ? 1 : 0.5,
          borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          shadowColor: hasNoProjects ? '#667eea' : (todayMoodData.dominantMood?.color || '#8E7DBE'),
          shadowOffset: { width: 0, height: 3 }, // 2 → 3 (daha belirgin)
          shadowOpacity: 0.25, // 0.15 → 0.25 (daha belirgin)
          shadowRadius: 10, // 6 → 10 (daha yumuşak)
          elevation: 6, // 3 → 6 (daha yüksek)
        }
      ]}>
        <View style={[
          styles.moodIconContainer,
          {
            backgroundColor: hasNoProjects 
              ? '#667eea' // Proje yoksa mor (teşvik edici)
              : (todayMoodData.dominantMood?.color || '#007AFF'),
            shadowColor: hasNoProjects 
              ? '#667eea' 
              : (todayMoodData.dominantMood?.color || '#007AFF'),
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.4, // 0.3 → 0.4 (daha belirgin)
            shadowRadius: 6, // 4 → 6 (daha yumuşak)
            elevation: 4, // 2 → 4 (daha yüksek)
          }
        ]}>
          <MaterialIcons 
            name={hasNoProjects ? 'rocket-launch' : (todayMoodData.dominantMood?.icon || 'create')} 
            size={24} 
            color="#000000" 
          />
        </View>
        
        <View style={styles.statusContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={[
              styles.statusText,
              { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
            ]}>
              {hasNoProjects ? 
                t('startYourJourney') || 'İlk projeni oluşturarak başla' :
                (todayMoodData.dominantMood ? 
                  `${t('todayYourMoodIs')} ${t(todayMoodData.dominantMood.key) || todayMoodData.dominantMood.label || todayMoodData.dominantMood.key}${t('like') ? ' ' + t('like') : ''}` :
                  t('howAreYouFeelingToday')
                )
              }
            </Text>
            
            {/* ✨ Trend Arrow - Sadece proje varsa */}
            {!hasNoProjects && todayMoodData.trendDirection && (
              <Text style={{ fontSize: 16, marginLeft: 4 }}>
                {todayMoodData.trendDirection === 'up' ? ' ↗️' : 
                 todayMoodData.trendDirection === 'down' ? ' ↘️' : ' →'}
              </Text>
            )}
            
            {/* ✨ Streak Badge - Sadece proje varsa */}
            {!hasNoProjects && todayMoodData.journalStreak.current >= 3 && (
              <View style={[styles.streakBadge, { backgroundColor: todayMoodData.dominantMood?.color || '#FF9500', marginLeft: 6 }]}>
                <Text style={styles.streakText}>🔥 {todayMoodData.journalStreak.current}</Text>
              </View>
            )}
          </View>
          
          <Text style={[
            styles.motivationText,
            { 
              color: theme.name === 'dark' 
                ? (hasNoProjects ? '#667eea' : (todayMoodData.dominantMood ? '#8E8E93' : '#4A90E2'))
                : (hasNoProjects ? '#667eea' : (todayMoodData.dominantMood ? '#8E8E93' : '#4A90E2'))
            }
          ]}>
            {/* ✨ Context-Aware & Smart Messages with Priority */}
            {hasNoProjects ? (
              // Proje yoksa: Teşvik edici mesaj
              t('noActiveProjects') || 'Henüz hiçbir proje yok! 🚀'
            ) : todayMoodData.totalEntries > 0 ? (
              // Priority 1: Dün vs bugün trend
              todayMoodData.trendMessage === 'improvingFromYesterday' ? t('improvingFromYesterday') :
              todayMoodData.trendMessage === 'worseningFromYesterday' ? t('worseningFromYesterday') :
              // Priority 2: Semantic gün içi pattern
              todayMoodData.semanticPattern?.type === 'improvement' ? t('dayImprovement') :
              todayMoodData.semanticPattern?.type === 'decline' ? t('dayEndFatigue') :
              todayMoodData.semanticPattern?.type === 'diverse' ? t('richEmotionalPalette') :
              // Priority 3: Mood streak
              todayMoodData.moodStreak.count >= 3 ? t('moodStreakDays', { count: todayMoodData.moodStreak.count, mood: t(todayMoodData.moodStreak.mood) || todayMoodData.moodStreak.mood }) :
              // Priority 4: Journal streak
              todayMoodData.journalStreak.current >= 5 ? t('journalStreakDays', { count: todayMoodData.journalStreak.current }) :
              // Priority 5: Stable mood
              todayMoodData.trendMessage === 'stableMood' ? t('stableMood') :
              // Default: View details
              t('viewMoreDetails')
            ) : (
              t('startJournalingToday')
            )}
          </Text>
        </View>
      </View>
    </View>
  );

  // Smart onPress: Proje yoksa farklı action
  const handlePress = hasNoProjects ? onCreateFirstProject : onPress;
  
  if (handlePress) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}, (prevProps, nextProps) => { // React.memo comparison function
  // Custom comparison: Journal entry VEYA proje sayısı değiştiğinde re-render
  
  // Proje sayılarını kontrol et
  const prevHasNoProjects = prevProps.activeTasks.length === 0 && prevProps.completedTasks.length === 0;
  const nextHasNoProjects = nextProps.activeTasks.length === 0 && nextProps.completedTasks.length === 0;
  
  // Proje durumu değiştiyse re-render gerekli
  if (prevHasNoProjects !== nextHasNoProjects) {
    console.log('🔄 MoodStatement - Re-render gerekli (proje durumu değişti)');
    return false; // Do re-render
  }
  
  // Journal entry count ve son timestamp karşılaştır
  let prevCount = 0;
  let prevLastTimestamp = '';
  [...prevProps.activeTasks, ...prevProps.completedTasks].forEach(task => {
    if (task.journalEntries) {
      prevCount += task.journalEntries.length;
      const last = task.journalEntries[task.journalEntries.length - 1];
      if (last?.createdAt > prevLastTimestamp) prevLastTimestamp = last.createdAt;
    }
  });
  
  let nextCount = 0;
  let nextLastTimestamp = '';
  [...nextProps.activeTasks, ...nextProps.completedTasks].forEach(task => {
    if (task.journalEntries) {
      nextCount += task.journalEntries.length;
      const last = task.journalEntries[task.journalEntries.length - 1];
      if (last?.createdAt > nextLastTimestamp) nextLastTimestamp = last.createdAt;
    }
  });
  
  // True = DON'T re-render, False = RE-render
  const shouldSkipRender = (
    prevCount === nextCount && 
    prevLastTimestamp === nextLastTimestamp &&
    prevProps.selectedDate === nextProps.selectedDate
  );
  
  if (!shouldSkipRender) {
    console.log('🔄 MoodStatement - Re-render gerekli (journal değişti)');
  }
  
  return shouldSkipRender;
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24, // 26 → 24 (biraz daha geniş)
    marginTop: 12, // 10 → 12 (biraz daha fazla boşluk)
    marginBottom: 8, // 6 → 8 (biraz daha fazla boşluk)
  },
  moodStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16, // 14 → 16 (daha spacious)
    paddingHorizontal: 18, // 16 → 18 (daha spacious)
    borderRadius: 16, // 14 → 16 (daha yuvarlak)
    borderLeftWidth: 4, // 3 → 4 (daha kalın vurgu)
  },
  moodIconContainer: {
    width: 40, // 34 → 40 (daha büyük icon)
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14, // 12 → 14 (biraz daha fazla boşluk)
  },
  statusContent: {
    flex: 1,
  },
  statusText: {
    fontSize: 15, // 14 → 15 (daha büyük)
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 4, // 3 → 4 (biraz daha fazla boşluk)
    lineHeight: 20, // 19 → 20
    letterSpacing: -0.3,
  },
  motivationText: {
    fontSize: 13, // 12 → 13 (biraz daha büyük)
    fontFamily: 'Poppins_400Regular',
    lineHeight: 17, // 16 → 17
    opacity: 0.8, // 0.75 → 0.8 (biraz daha opak)
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
