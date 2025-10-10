// components/MoodStatement.js
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { MOODS } from '../utils/AIMoodPredictor';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

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
    
    // En çok tekrar eden mood'u bul
    let dominantMood = null;
    let maxCount = 0;
    
    Object.entries(moodCounts).forEach(([mood, count]) => {
      if (count > maxCount) {
        maxCount = count;
        
        // Önce MOODS'da ara
        let foundMood = MOODS.find(m => m.key === mood);
        
        // MOODS'da bulunamazsa EXTENDED_MOODS'da ara
        if (!foundMood) {
          const { EXTENDED_MOODS } = require('../utils/AIMoodPredictor');
          foundMood = EXTENDED_MOODS.find(m => m.key === mood);
        }
        
        // Hiçbirinde bulunamazsa, journal entry'den gelen bilgileri kullan
        if (!foundMood) {
          // Bu mood'a sahip ilk entry'yi bul
          const entryWithMood = todayMoods.find(entry => entry.mood === mood);
          foundMood = {
            key: mood,
            label: mood.charAt(0).toUpperCase() + mood.slice(1), // Capitalize first letter
            icon: entryWithMood?.moodIcon || 'sentiment-neutral',
            color: entryWithMood?.moodColor || '#4A90E2'
          };
        }
        
        dominantMood = foundMood;
      }
    });
    
    return {
      dominantMood,
      totalEntries: todayMoods.length + (hasCompletedProjectToday ? 1 : 0),
      allMoods: todayMoods,
      hasCompletedProjectToday
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
          <Text style={[
            styles.statusText,
            { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
          ]}>
            {todayMoodData.dominantMood ? 
              `${t('todayYourMoodIs')} ${t(todayMoodData.dominantMood.key) || todayMoodData.dominantMood.label || todayMoodData.dominantMood.key}${t('like') ? ' ' + t('like') : ''}` :
              t('howAreYouFeelingToday')
            }
          </Text>
          
          <Text style={[
            styles.motivationText,
            { 
              color: theme.name === 'dark' 
                ? (todayMoodData.dominantMood ? '#8E8E93' : '#4A90E2')
                : (todayMoodData.dominantMood ? '#8E8E93' : '#4A90E2')
            }
          ]}>
            {todayMoodData.totalEntries > 0 ? 
              t('viewMoreDetails') :
              t('startJournalingToday') || 'Bugünü kaydetmeye başlayın'
            }
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
});

export default MoodStatement;
