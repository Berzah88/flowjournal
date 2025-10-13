// components/ActivityTimeline.js
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { COLORS, ELEVATION } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const ActivityTimeline = ({ activeTasks, completedTasks }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  // Activity Timeline Analysis
  const timelineAnalysis = useMemo(() => {
    const allTasks = [...activeTasks, ...completedTasks];
    const allMoodData = [];
    
    allTasks.forEach(task => {
      if (task.journalEntries && Array.isArray(task.journalEntries)) {
        task.journalEntries.forEach(entry => {
          if (entry.createdAt) {
            allMoodData.push({
              createdAt: entry.createdAt,
              mood: entry.mood
            });
          }
        });
      }
    });
    
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
  }, [activeTasks, completedTasks]);

  // Don't show if no activity
  if (timelineAnalysis.totalActivityDays === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[
          styles.title,
          { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
        ]}>
          {t('activityTimeline')}
        </Text>
        <View style={[
          styles.icon,
          { backgroundColor: theme.name === 'dark' ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.1)' }
        ]}>
          <MaterialIcons 
            name="schedule" 
            size={18} 
            color={theme.name === 'dark' ? '#2196F3' : '#2196F3'} 
          />
        </View>
      </View>
      
      <View style={styles.statsContainer}>
        {/* Active Days */}
        <View style={[
          styles.stat, 
          { 
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : 'rgba(255, 255, 255, 0.95)',
            borderLeftColor: theme.colors.primary,
            shadowColor: theme.name === 'dark' ? '#000000' : COLORS.BLACK,
            shadowOpacity: theme.name === 'dark' ? 0 : 0.02,
            shadowRadius: theme.name === 'dark' ? 0 : 3,
            elevation: theme.name === 'dark' ? 0 : 1,
            borderWidth: theme.name === 'dark' ? 1 : 0,
            borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
          }
        ]}>
          <View style={styles.statContent}>
            <View style={[
              styles.statIcon, 
              { backgroundColor: theme.colors.primary + '15' }
            ]}>
              <Ionicons name="calendar" size={14} color={theme.colors.primary} />
            </View>
            <View style={styles.statText}>
              <Text style={[
                styles.statNumber, 
                { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
              ]}>
                {timelineAnalysis.totalActivityDays}
              </Text>
              <Text style={[
                styles.statLabel, 
                { color: theme.name === 'dark' ? '#8E8E93' : COLORS.GRAY[500] }
              ]}>
                {t('activeDays')}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Average Daily Activity */}
        <View style={[
          styles.stat, 
          { 
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : 'rgba(255, 255, 255, 0.95)',
            borderLeftColor: COLORS.SUCCESS,
            shadowColor: theme.name === 'dark' ? '#000000' : COLORS.BLACK,
            shadowOpacity: theme.name === 'dark' ? 0 : 0.02,
            shadowRadius: theme.name === 'dark' ? 0 : 3,
            elevation: theme.name === 'dark' ? 0 : 1,
            borderWidth: theme.name === 'dark' ? 1 : 0,
            borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
          }
        ]}>
          <View style={styles.statContent}>
            <View style={[
              styles.statIcon, 
              { backgroundColor: COLORS.SUCCESS + '15' }
            ]}>
              <Ionicons name="trending-up" size={14} color={COLORS.SUCCESS} />
            </View>
            <View style={styles.statText}>
              <Text style={[
                styles.statNumber, 
                { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
              ]}>
                {Math.round(timelineAnalysis.averageDailyActivity * 10) / 10}
              </Text>
              <Text style={[
                styles.statLabel, 
                { color: theme.name === 'dark' ? '#8E8E93' : COLORS.GRAY[500] }
              ]}>
                {t('avgDailyActivity')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 38,
    marginTop: 16,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderLeftWidth: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  statContent: {
    alignItems: 'center',
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statText: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
});

export default ActivityTimeline;

