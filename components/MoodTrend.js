// components/MoodTrend.js
import React, { memo, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigation } from '@react-navigation/native';

// Moods lists hoisted to module scope to avoid recreating on each render
const POSITIVE_MOODS = ['happy', 'excited', 'grateful', 'confident', 'calm', 'peaceful', 'hopeful', 'proud', 'relieved', 'motivated', 'content'];
const NEGATIVE_MOODS = ['sad', 'angry', 'anxious', 'overwhelmed', 'tired', 'frustrated', 'stressed', 'exhausted', 'worried', 'disappointed', 'lonely', 'confused', 'bored'];

const MoodTrend = ({ activeTasks = [], completedTasks = [] }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation();

  // Mood trend calculation (optimized to avoid repeated Date parsing)
  const moodTrend = useMemo(() => {
    const allTasks = [...activeTasks, ...completedTasks];
    const allMoodData = [];
    for (let i = 0; i < allTasks.length; i++) {
      const task = allTasks[i];
      const entries = task?.journalEntries;
      if (!entries || !Array.isArray(entries)) continue;
      for (let j = 0; j < entries.length; j++) {
        const entry = entries[j];
        if (!entry || !entry.mood) continue;
        const createdAtMs = typeof entry.createdAt === 'number' ? entry.createdAt : (Date.parse(entry.createdAt || '') || Date.now());
        const d = new Date(createdAtMs);
        const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        allMoodData.push({ mood: entry.mood, createdAtMs, dayKey });
      }
    }

    const oneDayMs = 24 * 60 * 60 * 1000;
    const todayStartMs = (new Date()).setHours(0,0,0,0);
    const last7DaysStartMs = todayStartMs - (7 * oneDayMs);
    const previous7DaysStartMs = last7DaysStartMs - (7 * oneDayMs);

    const thisWeekEntries = [];
    const previousWeekEntries = [];
    for (let k = 0; k < allMoodData.length; k++) {
      const e = allMoodData[k];
      if (e.createdAtMs >= last7DaysStartMs) thisWeekEntries.push(e);
      else if (e.createdAtMs >= previous7DaysStartMs && e.createdAtMs < last7DaysStartMs) previousWeekEntries.push(e);
    }

    const hasEnoughData = thisWeekEntries.length >= 3;
    const uniqueDaysThisWeek = new Set(thisWeekEntries.map(e => e.dayKey));
    const hasEnoughDailyEntries = uniqueDaysThisWeek.size >= 3;

    if (!hasEnoughData || !hasEnoughDailyEntries) {
      return { trend: null, hasEnoughData: false, hasEnoughDailyEntries: false };
    }

    const thisWeekPositive = thisWeekEntries.reduce((acc, e) => acc + (POSITIVE_MOODS.includes(e.mood) ? 1 : 0), 0);
    const thisWeekNegative = thisWeekEntries.reduce((acc, e) => acc + (NEGATIVE_MOODS.includes(e.mood) ? 1 : 0), 0);
    const thisWeekScore = thisWeekEntries.length > 0 ? (thisWeekPositive - thisWeekNegative) / thisWeekEntries.length : 0;
    const prevWeekPositive = previousWeekEntries.reduce((acc, e) => acc + (POSITIVE_MOODS.includes(e.mood) ? 1 : 0), 0);
    const prevWeekNegative = previousWeekEntries.reduce((acc, e) => acc + (NEGATIVE_MOODS.includes(e.mood) ? 1 : 0), 0);
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

  // Memoized UI values derived from moodTrend
  const iconName = useMemo(() => {
    if (!moodTrend.hasEnoughData) return 'analytics';
    switch (moodTrend.trend) {
      case 'improving': return 'trending-up';
      case 'declining': return 'trending-down';
      default: return 'remove';
    }
  }, [moodTrend]);

  const trendColor = useMemo(() => {
    if (!moodTrend.hasEnoughData) return '#007AFF';
    switch (moodTrend.trend) {
      case 'improving': return '#34C759';
      case 'declining': return '#FF3B30';
      default: return '#8E8E93';
    }
  }, [moodTrend]);

  const trendText = useMemo(() => {
    if (!moodTrend.hasEnoughDailyEntries) return t('writeJournalMoreDays');
    switch (moodTrend.trend) {
      case 'improving': return t('moodImproving');
      case 'declining': return t('moodDeclining');
      default: return t('moodStable');
    }
  }, [moodTrend, t]);

  const subtext = useMemo(() => {
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
        accessible
        accessibilityRole="button"
        accessibilityLabel={t('openMoodTrend')}
      >
        <Animated.View style={[
          styles.card,
          {
            borderLeftColor: trendColor,
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
            <Ionicons name={iconName} size={24} color={trendColor} />
            <Text style={[
              styles.trendText,
              { color: trendColor }
            ]}>
              {trendText}
            </Text>
            <View style={{ flex: 1 }} />
                {/* chevron moved into header (left of icon) — no outside chevron */}
          </View>
          <Text style={[
            styles.subtext,
            { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
          ]}>
            {subtext}
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

export default memo(MoodTrend);

