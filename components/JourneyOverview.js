// components/JourneyOverview.js
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { COLORS, ELEVATION } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { MOODS, EXTENDED_MOODS } from '../utils/AIMoodPredictor';

const JourneyOverview = ({ activeTasks, completedTasks, selectedDate, onPress }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const ContainerComponent = onPress ? TouchableOpacity : View;
  const containerProps = onPress
    ? { activeOpacity: 0.85, onPress }
    : {};

  // Mood rengini solid hale getir
  const getSolidMoodColor = (originalColor) => {
    const colorMap = {
      '#C8E6C9': '#4CAF50', '#FFE0B2': '#FF9800', '#E1BEE7': '#9C27B0',
      '#FFCDD2': '#F44336', '#FFAB91': '#FF5722', '#FFCCBC': '#FF7043',
      '#FFF3E0': '#FFB74D', '#E8F5E8': '#66BB6A', '#E1F5FE': '#42A5F5',
      '#FFF8E1': '#FFCA28', '#F3E5F5': '#BA68C8', '#FFEBEE': '#EF5350',
      '#E0E0E0': '#90A4AE', '#DCEDC8': '#8BC34A', '#F5F5F5': '#BDBDBD',
      '#FFE0E6': '#F48FB1', '#E8EAF6': '#7986CB', '#E0F2F1': '#4DB6AC',
      '#FFFDE7': '#FFF176', '#FAFAFA': '#E0E0E0', '#FFF9C4': '#FFF59D',
      '#FCE4EC': '#F06292', '#CFD8DC': '#90A4AE',
    };
    return colorMap[originalColor] || originalColor;
  };

  // Journey Stats hesaplaması
  const journeyStats = useMemo(() => {
    const allTasks = [...activeTasks, ...completedTasks];
    let totalEntries = 0;
    let totalWords = 0;
    
    allTasks.forEach(task => {
      if (task.journalEntries && Array.isArray(task.journalEntries)) {
        totalEntries += task.journalEntries.length;
        
        task.journalEntries.forEach(entry => {
          if (entry.text) {
            const words = entry.text.trim().split(/\s+/).filter(word => word.length > 0);
            totalWords += words.length;
          }
        });
      }
    });
    
    return {
      activeProjects: activeTasks.length,
      completedProjects: completedTasks.length,
      totalEntries,
      totalWords
    };
  }, [activeTasks, completedTasks]);

  // Günün dominant mood'unu hesapla
  const todayDominantMood = useMemo(() => {
    const today = new Date(selectedDate);
    today.setHours(0, 0, 0, 0);
    
    const todayMoods = [];
    const allTasks = [...activeTasks, ...completedTasks];
    
    allTasks.forEach(task => {
      if (task.journalEntries && Array.isArray(task.journalEntries)) {
        task.journalEntries.forEach(entry => {
          const entryDate = new Date(entry.createdAt);
          entryDate.setHours(0, 0, 0, 0);
          
          if (entryDate.getTime() === today.getTime() && entry.mood) {
            todayMoods.push({
              mood: entry.mood,
              moodIcon: entry.moodIcon,
              moodColor: entry.moodColor,
              timestamp: entry.createdAt
            });
          }
        });
      }
    });
    
    if (todayMoods.length === 0) return null;
    
    const moodCounts = {};
    todayMoods.forEach(entry => {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    });
    
    const dominantMoodKey = Object.keys(moodCounts).reduce((a, b) => 
      moodCounts[a] > moodCounts[b] ? a : b
    );
    
    const dominantMood = MOODS.find(m => m.key === dominantMoodKey) || 
                         EXTENDED_MOODS.find(m => m.key === dominantMoodKey) || {
      key: dominantMoodKey,
      label: dominantMoodKey,
      icon: 'sentiment-satisfied',
      color: '#8E7DBE'
    };
    
    return dominantMood;
  }, [activeTasks, completedTasks, selectedDate]);

  return (
    <ContainerComponent style={styles.container} {...containerProps}>
      <View style={styles.header}>
        <Text style={[
          styles.title,
          { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
        ]}>
          {t('journeyOverview')}
        </Text>
        <View style={styles.headerRight}>
          <View style={[
            styles.icon,
            { backgroundColor: theme.name === 'dark' ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.1)' }
          ]}>
            <MaterialIcons 
              name="analytics" 
              size={18} 
              color={theme.name === 'dark' ? '#1976D2' : '#1976D2'} 
            />
          </View>
          {onPress && (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.name === 'dark' ? '#8E8E93' : '#1D1D1F'}
              style={styles.chevron}
            />
          )}
        </View>
      </View>
      
      <View style={[
        styles.card,
        { 
          borderLeftColor: todayDominantMood ? getSolidMoodColor(todayDominantMood.color) : COLORS.PRIMARY,
          backgroundColor: theme.name === 'dark' ? '#1C1C1E' : 'rgba(255, 255, 255, 0.95)',
          shadowColor: theme.name === 'dark' ? '#000000' : COLORS.BLACK,
          shadowOpacity: theme.name === 'dark' ? 0 : 0.03,
          shadowRadius: theme.name === 'dark' ? 0 : 4,
          elevation: theme.name === 'dark' ? 0 : 1,
          borderWidth: theme.name === 'dark' ? 1 : 0,
          borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
        }
      ]}>
        <View style={styles.grid}>
          {/* Active Projects */}
          <View style={styles.item}>
            <View style={[
              styles.itemIcon, 
              { backgroundColor: todayDominantMood ? `${getSolidMoodColor(todayDominantMood.color)}15` : 'rgba(33, 150, 243, 0.1)' }
            ]}>
              <Ionicons 
                name="play-circle-outline" 
                size={16} 
                color={todayDominantMood ? getSolidMoodColor(todayDominantMood.color) : '#2196F3'} 
              />
            </View>
            <Text style={[
              styles.number,
              { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
            ]}>
              {journeyStats.activeProjects}
            </Text>
            <Text style={[
              styles.label,
              { color: theme.name === 'dark' ? '#8E8E93' : COLORS.GRAY[500] }
            ]}>
              {t('activeProjects')}
            </Text>
          </View>

          {/* Completed Projects */}
          <View style={styles.item}>
            <View style={[
              styles.itemIcon,
              { backgroundColor: todayDominantMood ? `${getSolidMoodColor(todayDominantMood.color)}15` : 'rgba(76, 175, 80, 0.1)' }
            ]}>
              <Ionicons 
                name="checkmark-circle-outline" 
                size={16} 
                color={todayDominantMood ? getSolidMoodColor(todayDominantMood.color) : '#4CAF50'} 
              />
            </View>
            <Text style={[
              styles.number,
              { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
            ]}>
              {journeyStats.completedProjects}
            </Text>
            <Text style={[
              styles.label,
              { color: theme.name === 'dark' ? '#8E8E93' : COLORS.GRAY[500] }
            ]}>
              {t('completedProjects')}
            </Text>
          </View>

          {/* Total Entries */}
          <View style={styles.item}>
            <View style={[
              styles.itemIcon,
              { backgroundColor: todayDominantMood ? `${getSolidMoodColor(todayDominantMood.color)}15` : 'rgba(25, 118, 210, 0.1)' }
            ]}>
              <Ionicons 
                name="document-text-outline" 
                size={16} 
                color={todayDominantMood ? getSolidMoodColor(todayDominantMood.color) : '#1976D2'} 
              />
            </View>
            <Text style={[
              styles.number,
              { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
            ]}>
              {journeyStats.totalEntries}
            </Text>
            <Text style={[
              styles.label,
              { color: theme.name === 'dark' ? '#8E8E93' : COLORS.GRAY[500] }
            ]}>
              {t('entries')}
            </Text>
          </View>

          {/* Words Written */}
          <View style={styles.item}>
            <View style={[
              styles.itemIcon,
              { backgroundColor: todayDominantMood ? `${getSolidMoodColor(todayDominantMood.color)}15` : 'rgba(255, 152, 0, 0.1)' }
            ]}>
              <Ionicons 
                name="create-outline" 
                size={16} 
                color={todayDominantMood ? getSolidMoodColor(todayDominantMood.color) : '#FF9800'} 
              />
            </View>
            <Text style={[
              styles.number,
              { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
            ]}>
              {journeyStats.totalWords > 1000 ? `${(journeyStats.totalWords/1000).toFixed(1)}k` : journeyStats.totalWords}
            </Text>
            <Text style={[
              styles.label,
              { color: theme.name === 'dark' ? '#8E8E93' : COLORS.GRAY[500] }
            ]}>
              {t('words')}
            </Text>
          </View>
        </View>
      </View>
    </ContainerComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 30,
    marginTop: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevron: {
    marginLeft: 6,
  },
  card: {
    borderRadius: 16,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowOffset: { width: 0, height: 1 },
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  item: {
    width: '25%',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  itemIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  number: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 0,
    textAlign: 'center',
  },
  label: {
    fontSize: 8,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
    lineHeight: 10,
  },
});

export default JourneyOverview;

