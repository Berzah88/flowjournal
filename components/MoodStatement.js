// components/MoodStatement.js
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { MOODS } from '../utils/MoodPredictor';

const MoodStatement = ({ 
  activeTasks = [], 
  selectedDate,
  onPress = null
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
    
    // En çok tekrar eden mood'u bul
    let dominantMood = null;
    let maxCount = 0;
    
    Object.entries(moodCounts).forEach(([mood, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantMood = MOODS.find(m => m.key === mood) || {
          key: mood,
          label: mood,
          icon: 'sentiment-satisfied',
          color: '#4A90E2'
        };
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
          backgroundColor: todayMoodData.dominantMood ? 
            'rgba(255, 255, 255, 0.95)' : 
            'rgba(0, 122, 255, 0.1)'
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
          <Text style={styles.statusText}>
            {todayMoodData.dominantMood ? 
              `Today you feel a bit ${todayMoodData.dominantMood.label || todayMoodData.dominantMood.key}` :
              "How are you feeling today?"
            }
          </Text>
          
          <Text style={[
            styles.motivationText,
            { color: todayMoodData.dominantMood ? '#8E8E93' : '#4A90E2' }
          ]}>
            {todayMoodData.totalEntries > 0 ? 
              "Keep recording your emotions" :
              "Click on a Milestone right away and start writing your journal"
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
    marginLeft: 16,
    marginRight: 40,
    marginTop: 4,
    marginBottom: 10,
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
    color: '#1D1D1F',
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
