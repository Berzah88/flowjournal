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
      totalEntries: todayMoods.length,
      allMoods: todayMoods
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
  
  const content = (
    <View style={styles.container}>
      {/* Mood Status - Inline Design */}
      <View style={[
        styles.moodStatus,
        { 
          borderLeftColor: todayMoodData.dominantMood?.color || '#007AFF',
          backgroundColor: theme.name === 'dark' 
            ? (todayMoodData.dominantMood ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 122, 255, 0.1)')
            : (todayMoodData.dominantMood ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 122, 255, 0.1)')
        }
      ]}>
        <View style={[
          styles.moodIconContainer,
          {
            backgroundColor: todayMoodData.dominantMood?.color || '#007AFF'
          }
        ]}>
          <MaterialIcons 
            name={todayMoodData.dominantMood?.icon || 'create'} 
            size={18} 
            color="#000000" 
          />
        </View>
        
        <View style={styles.statusContent}>
          <Text style={[
            styles.statusText,
            { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
          ]}>
            {todayMoodData.dominantMood ? 
              `${t('todayYouFeel')} ${todayMoodData.dominantMood.label || todayMoodData.dominantMood.key}` :
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
              t('clickMilestoneStartWriting')
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
    marginHorizontal: 30, // DailyMoodSummary ile aynı
    marginTop: 8, // DailyMoodSummary ile aynı
    marginBottom: 4, // DailyMoodSummary ile aynı
  },
  moodStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
  },
  moodIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statusContent: {
    flex: 1,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    marginBottom: 1,
    lineHeight: 16,
  },
  motivationText: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 14,
  },
});

export default MoodStatement;
