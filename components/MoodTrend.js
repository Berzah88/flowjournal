// components/MoodTrend.js
import React, { useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { COLORS, ELEVATION } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigation } from '@react-navigation/native';

const MoodTrend = ({ activeTasks, completedTasks }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation();

  // Mood trend calculation (from previous code)
  const moodTrend = useMemo(() => {
    const allTasks = [...activeTasks, ...completedTasks];
    const allMoodData = [];
    allTasks.forEach(task => {
      if (task.journalEntries && Array.isArray(task.journalEntries)) {
        task.journalEntries.forEach(entry => {
          if (entry.mood) {
            allMoodData.push({ mood: entry.mood, createdAt: entry.createdAt });
          }
        });
      }
    });
    const now = new Date();
    const positiveMoods = ['happy', 'excited', 'grateful', 'confident', 'calm', 'peaceful', 'hopeful', 'proud', 'relieved', 'motivated', 'content'];
    const negativeMoods = ['sad', 'angry', 'anxious', 'overwhelmed', 'tired', 'frustrated', 'stressed', 'exhausted', 'worried', 'disappointed', 'lonely', 'confused', 'bored'];
    const last7DaysStart = new Date(now);
    last7DaysStart.setDate(now.getDate() - 7);
    last7DaysStart.setHours(0, 0, 0, 0);
    const thisWeekEntries = allMoodData.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      return entryDate >= last7DaysStart;
    });
    const previous7DaysStart = new Date(now);
    previous7DaysStart.setDate(now.getDate() - 14);
    previous7DaysStart.setHours(0, 0, 0, 0);
    const previousWeekEntries = allMoodData.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      return entryDate >= previous7DaysStart && entryDate < last7DaysStart;
    });

    // Check if we have enough data for trend analysis (at least 3 entries across 3 different days in current week)
    const hasEnoughData = thisWeekEntries.length >= 3;

    // Check if user has written journal entries on at least 3 different days this week
    const uniqueDaysThisWeek = new Set();
    thisWeekEntries.forEach(entry => {
      const entryDate = new Date(entry.createdAt);
      const dayKey = `${entryDate.getFullYear()}-${entryDate.getMonth()}-${entryDate.getDate()}`;
      uniqueDaysThisWeek.add(dayKey);
    });
    const hasEnoughDailyEntries = uniqueDaysThisWeek.size >= 3;

    if (!hasEnoughData || !hasEnoughDailyEntries) {
      return { trend: null, hasEnoughData: false, hasEnoughDailyEntries: false };
    }

    const thisWeekPositive = thisWeekEntries.filter(e => positiveMoods.includes(e.mood)).length;
    const thisWeekNegative = thisWeekEntries.filter(e => negativeMoods.includes(e.mood)).length;
    const thisWeekScore = thisWeekEntries.length > 0 ? (thisWeekPositive - thisWeekNegative) / thisWeekEntries.length : 0;
    const prevWeekPositive = previousWeekEntries.filter(e => positiveMoods.includes(e.mood)).length;
    const prevWeekNegative = previousWeekEntries.filter(e => negativeMoods.includes(e.mood)).length;
    const prevWeekScore = previousWeekEntries.length > 0 ? (prevWeekPositive - prevWeekNegative) / previousWeekEntries.length : 0;
    const scoreDiff = thisWeekScore - prevWeekScore;

    let trend;
    if (previousWeekEntries.length === 0) {
      if (thisWeekScore > 0.3) trend = 'improving';
      else if (thisWeekScore < -0.3) trend = 'declining';
      else trend = 'stable';
    } else {
      if (scoreDiff > 0.2) trend = 'improving';
      else if (scoreDiff < -0.2) trend = 'declining';
      else trend = 'stable';
    }

    return { trend, hasEnoughData: true, hasEnoughDailyEntries: true };
  }, [activeTasks, completedTasks]);

  // Don't show if no trend data
  if (!moodTrend) return null;

  // Touch animation states
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handleCardPressIn = useCallback(() => {
    scaleAnim.stopAnimation();
    opacityAnim.stopAnimation();
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        friction: 10,
        tension: 120,
      }),
      Animated.spring(opacityAnim, {
        toValue: 0.85,
        useNativeDriver: true,
        friction: 10,
        tension: 120,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  const handleCardPressOut = useCallback(() => {
    scaleAnim.stopAnimation();
    opacityAnim.stopAnimation();
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }),
      Animated.spring(opacityAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  const handleCardPress = useCallback(() => {
    navigation.navigate('MoodTrend');
  }, [navigation]);

  // Helper functions
  const getTrendIcon = useCallback(() => {
    if (!moodTrend.hasEnoughData) return 'analytics';
    switch (moodTrend.trend) {
      case 'improving': return 'trending-up';
      case 'declining': return 'trending-down';
      default: return 'remove';
    }
  }, [moodTrend]);

  const getTrendColor = useCallback(() => {
    if (!moodTrend.hasEnoughData) return '#007AFF';
    switch (moodTrend.trend) {
      case 'improving': return '#34C759';
      case 'declining': return '#FF3B30';
      default: return '#8E8E93';
    }
  }, [moodTrend]);

  const getTrendText = useCallback(() => {
    if (!moodTrend.hasEnoughDailyEntries) return t('writeJournalMoreDays');
    switch (moodTrend.trend) {
      case 'improving': return t('moodImproving');
      case 'declining': return t('moodDeclining');
      default: return t('moodStable');
    }
  }, [moodTrend, t]);

  const getSubtext = useCallback(() => {
    if (!moodTrend.hasEnoughDailyEntries) return t('needMoreJournalDays');
    return t('basedOnLast7Days');
  }, [moodTrend, t]);

  return (
    <View style={styles.outerContainer}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[
          styles.sectionTitle,
          { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
        ]}>{t('moodTrend')}</Text>
        <View style={styles.headerRightRow}>
          {/* chevron placed left of the indicator icon */}
          <Ionicons name="chevron-forward" size={16} color={theme.name === 'dark' ? '#8E8E93' : '#8E8E93'} style={{ marginRight: 8 }} />
          <View style={[
            styles.progressFlowIndicator,
            { backgroundColor: theme.name === 'dark' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(52, 199, 89, 0.1)' }
          ]}>
            <MaterialIcons
              name="trending-up"
              size={18}
              color={theme.name === 'dark' ? '#34C759' : '#34C759'}
            />
          </View>
        </View>
      </View>

      {/* Content Card - Animated Touchable */}
      <TouchableWithoutFeedback
        onPressIn={handleCardPressIn}
        onPressOut={handleCardPressOut}
        onPress={handleCardPress}
      >
        <Animated.View style={[
          styles.card,
          {
            borderLeftColor: getTrendColor(),
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : 'rgba(255, 255, 255, 0.95)',
            shadowColor: theme.name === 'dark' ? '#000000' : '#000',
            shadowOpacity: theme.name === 'dark' ? 0 : 0.03,
            shadowRadius: theme.name === 'dark' ? 0 : 4,
            elevation: theme.name === 'dark' ? 0 : 1,
            borderWidth: theme.name === 'dark' ? 1 : 0,
            borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          }
        ]}>
          <View style={styles.header}>
            <Ionicons name={getTrendIcon()} size={24} color={getTrendColor()} />
            <Text style={[
              styles.trendText,
              { color: getTrendColor() }
            ]}>
              {getTrendText()}
            </Text>
            <View style={{ flex: 1 }} />
                {/* chevron moved into header (left of icon) — no outside chevron */}
          </View>
          <Text style={[
            styles.subtext,
            { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
          ]}>
            {getSubtext()}
          </Text>
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );

};

const styles = StyleSheet.create({
  outerContainer: {
    marginHorizontal: 30,
    marginTop: 16,
    // Allow chevron to render outside the card bounds visually
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  progressFlowIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    marginLeft: 12,
  },
  subtext: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default MoodTrend;

