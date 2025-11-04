// screens/overview.js
import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useActiveTasks, useCompletedTasks } from '../hooks/useTaskContext';
import { MOODS, EXTENDED_MOODS } from '../utils/AIMoodPredictor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Helpers, Typography } from '../constants';

const { width } = Dimensions.get('window');

const OverviewScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const activeTasks = useActiveTasks();
  const completedTasks = useCompletedTasks();
  const insets = useSafeAreaInsets();

  const [selectedStreakCardIndex, setSelectedStreakCardIndex] = useState(0);
  // bump this on focus to restart counters
  const [focusVersion, setFocusVersion] = useState(0);
  const [streakVersion, setStreakVersion] = useState(0);
  const [showCounters, setShowCounters] = useState(false);

  const translate = useCallback((key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  }, [t]);

  const locale = useMemo(() => {
    if (!language) {
      return undefined;
    }

    switch (language) {
      case 'tr':
        return 'tr-TR';
      case 'en':
      default:
        return 'en-US';
    }
  }, [language]);

  const safeActiveTasks = Array.isArray(activeTasks) ? activeTasks : [];
  const safeCompletedTasks = Array.isArray(completedTasks) ? completedTasks : [];

  const selectedDate = useMemo(() => {
    try {
      const raw = route?.params?.selectedDate ? new Date(route.params.selectedDate) : new Date();
      return new Date(raw.getFullYear(), raw.getMonth(), raw.getDate());
    } catch (error) {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }, [route?.params?.selectedDate]);

  const selectedDateKey = selectedDate.getTime();
  const allTasks = useMemo(() => [...safeActiveTasks, ...safeCompletedTasks], [safeActiveTasks, safeCompletedTasks]);

  const dailyStats = useMemo(() => {
    let entriesToday = 0;
    let wordsToday = 0;

    allTasks.forEach(task => {
      (task.journalEntries || []).forEach(entry => {
        if (!entry?.createdAt) {
          return;
        }

        const entryDate = new Date(entry.createdAt);
        entryDate.setHours(0, 0, 0, 0);
        const normalizedKey = entryDate.getTime();

        if (normalizedKey !== selectedDateKey) {
          return;
        }

        entriesToday += 1;
        if (entry.text) {
          wordsToday += entry.text.trim().split(/\s+/).filter(Boolean).length;
        }
      });
    });

    return { entriesToday, wordsToday };
  }, [allTasks, selectedDateKey]);

  // Active milestones count (not completed yet)
  const activeMilestonesCount = useMemo(() => {
    let count = 0;
    const selectedDayKey = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();

    safeActiveTasks.forEach(task => {
      (task.milestones || []).forEach(milestone => {
        if (milestone.completed) return; // Skip completed milestones
        
        const startDate = milestone.startDate ? new Date(milestone.startDate) : null;
        const startsOnOrBeforeSelected = !startDate || new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime() <= selectedDayKey;
        
        if (startsOnOrBeforeSelected) {
          count += 1;
        }
      });
    });

    return count;
  }, [safeActiveTasks, selectedDate]);

  const milestonesTodayCount = useMemo(() => {
    let count = 0;
    const selectedDayKey = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();

    safeActiveTasks.forEach(task => {
      (task.milestones || []).forEach(milestone => {
        const startDate = milestone.startDate ? new Date(milestone.startDate) : null;
        const completedAt = milestone.completedAt ? new Date(milestone.completedAt) : null;

        const startsOnOrBeforeSelected = !startDate || new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime() <= selectedDayKey;
        const completedToday = completedAt && new Date(completedAt.getFullYear(), completedAt.getMonth(), completedAt.getDate()).getTime() === selectedDayKey;
        const activeToday = startsOnOrBeforeSelected && !milestone.completed;

        if (activeToday || completedToday) {
          count += 1;
        }
      });
    });

    return count;
  }, [safeActiveTasks, selectedDate]);

  const weeklyActivity = useMemo(() => {
    const base = new Date(selectedDate);
    base.setHours(0, 0, 0, 0);

    const dayKeys = [];
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(base);
      day.setDate(base.getDate() - i);
      day.setHours(0, 0, 0, 0);
      dayKeys.push(day.getTime());
    }

    const counts = dayKeys.reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});

    allTasks.forEach(task => {
      (task.journalEntries || []).forEach(entry => {
        if (!entry?.createdAt) {
          return;
        }

        const entryDate = new Date(entry.createdAt);
        entryDate.setHours(0, 0, 0, 0);
        const key = entryDate.getTime();

        if (counts[key] === undefined) {
          return;
        }

        counts[key] += 1;
      });
    });

    return dayKeys.map(key => counts[key]);
  }, [allTasks, selectedDate]);

  const activeTaskCount = safeActiveTasks.length;

  const activeProjectCount = useMemo(() => {
    const ids = new Set();
    safeActiveTasks.forEach(task => {
      if (task?.projectId) ids.add(task.projectId);
      else if (task?.projectTitle) ids.add(task.projectTitle);
    });
    return ids.size || safeActiveTasks.length;
  }, [safeActiveTasks]);

  const completedMilestonesToday = useMemo(() => {
    let count = 0;
    allTasks.forEach(task => {
      (task.milestones || []).forEach(m => {
        if (!m?.completedAt) return;
        const dt = new Date(m.completedAt);
        if (Number.isNaN(dt.getTime())) return;
        const key = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
        if (key === selectedDateKey) count += 1;
      });
    });
    return count;
  }, [allTasks, selectedDateKey]);

  const getRecencyWeight = useCallback((timestamp) => {
    const entryTime = new Date(timestamp).getTime();
    const now = Date.now();
    const timeDiff = now - entryTime;

    if (timeDiff < 60 * 60 * 1000) return 3.0;
    if (timeDiff < 3 * 60 * 60 * 1000) return 2.0;
    if (timeDiff < 6 * 60 * 60 * 1000) return 1.5;
    if (timeDiff < 12 * 60 * 60 * 1000) return 1.2;
    return 1.0;
  }, []);

  const getSolidMoodColor = useCallback((originalColor) => {
    if (!originalColor) {
      return '#8E7DBE';
    }

    const colorMap = {
      '#C8E6C9': '#4CAF50',
      '#FFE0B2': '#FF9800',
      '#E1BEE7': '#9C27B0',
      '#FFCDD2': '#F44336',
      '#FFAB91': '#FF5722',
      '#FFCCBC': '#FF7043',
      '#FFF3E0': '#FFB74D',
      '#BBDEFB': '#2196F3',
      '#D7CCC8': '#795548',
      '#B2DFDB': '#009688',
      '#E0F7FA': '#00BCD4',
      '#F8BBD0': '#E91E63',
      '#D1C4E9': '#673AB7',
      '#F0F4C3': '#CDDC39',
      '#C5CAE9': '#3F51B5',
      '#B3E5FC': '#03A9F4',
      '#E8F5E8': '#66BB6A',
      '#E1F5FE': '#42A5F5',
      '#FFF8E1': '#FFCA28',
      '#F3E5F5': '#BA68C8',
      '#FFEBEE': '#EF5350',
      '#E0E0E0': '#90A4AE',
      '#DCEDC8': '#8BC34A',
      '#F5F5F5': '#BDBDBD',
      '#FFE0E6': '#F48FB1',
      '#E8EAF6': '#7986CB',
      '#E0F2F1': '#4DB6AC',
      '#FFFDE7': '#FFF176',
      '#FAFAFA': '#E0E0E0',
      '#FFF9C4': '#FFF59D',
      '#FCE4EC': '#F06292',
      '#CFD8DC': '#90A4AE',
      '#FFE082': '#FFC107',
      '#E6EE9C': '#C0CA33',
      '#EFEBE9': '#6D4C41',
      '#FFECB3': '#FFA000',
    };

    return colorMap[originalColor] || originalColor;
  }, []);

  const todayMoodData = useMemo(() => {
    const todayEntries = [];

    allTasks.forEach(task => {
      (task.journalEntries || []).forEach(entry => {
        if (!entry?.createdAt) return;
        if (!entry.mood && !entry.moodColor) return;

        const entryDate = new Date(entry.createdAt);
        entryDate.setHours(0, 0, 0, 0);
        if (entryDate.getTime() !== selectedDateKey) return;

        todayEntries.push(entry);
      });
    });

    if (!todayEntries.length) {
      return null;
    }

    const moodScores = todayEntries.reduce((acc, entry) => {
      const key = entry.mood || 'neutral';
      acc[key] = (acc[key] || 0) + getRecencyWeight(entry.createdAt);
      return acc;
    }, {});

    let dominantMoodKey = null;
    let maxScore = -Infinity;
    Object.entries(moodScores).forEach(([key, score]) => {
      if (score > maxScore) {
        dominantMoodKey = key;
        maxScore = score;
      }
    });

    const fallbackEntry = todayEntries.reduce((latest, entry) => {
      const time = new Date(entry.createdAt).getTime();
      if (!latest || time > latest.time) {
        return { time, entry };
      }
      return latest;
    }, null);

    const fallbackColor = fallbackEntry?.entry?.moodColor || '#8E7DBE';

    if (!dominantMoodKey) {
      return { key: null, color: fallbackColor };
    }

    const moodInfo = MOODS.find(m => m.key === dominantMoodKey) ||
      EXTENDED_MOODS.find(m => m.key === dominantMoodKey);

    const derivedColor = moodInfo?.color || todayEntries.find(e => e.mood === dominantMoodKey)?.moodColor || fallbackColor;

    return {
      key: dominantMoodKey,
      color: getSolidMoodColor(derivedColor)
    };
  }, [allTasks, selectedDateKey, getRecencyWeight, getSolidMoodColor]);

  const isDark = theme.name === 'dark';

  const overviewGradientColors = useMemo(() => {
  const fallbackDark = ['#16171B', '#131418', '#0F1014'];
    const fallbackLight = ['#F4F2FD', '#F7F5FF', '#FFFFFF'];

    const solidColor = todayMoodData?.color;
    if (!solidColor || !/^#[0-9A-Fa-f]{6}$/.test(solidColor)) {
      return isDark ? fallbackDark : fallbackLight;
    }

    const hex = solidColor.slice(1);
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
      return isDark ? fallbackDark : fallbackLight;
    }

    if (isDark) {
      const moodSoftTop = `rgba(${r}, ${g}, ${b}, 0.28)`;
      const moodSoftMid = `rgba(${r}, ${g}, ${b}, 0.18)`;
      const moodSoftLow = `rgba(${r}, ${g}, ${b}, 0.12)`;
      const moodSoftFaint = `rgba(${r}, ${g}, ${b}, 0.06)`;
      const moodGlow = `rgba(${r}, ${g}, ${b}, 0.04)`;
      const moodBase = `rgba(${Math.max(Math.round(r * 0.18), 16)}, ${Math.max(Math.round(g * 0.18), 16)}, ${Math.max(Math.round(b * 0.2), 18)}, 1)`;
      return [moodSoftTop, moodSoftMid, moodSoftLow, moodSoftFaint, moodGlow, moodBase];
    }

    const moodTop = `rgba(${r}, ${g}, ${b}, 0.35)`;
    const moodMid = `rgba(${r}, ${g}, ${b}, 0.20)`;
    const moodLight = `rgba(${r}, ${g}, ${b}, 0.08)`;
    return [moodTop, moodMid, moodLight, '#FFFFFF'];
  }, [isDark, todayMoodData]);

  const formattedWeekday = useMemo(() => {
    try {
      return selectedDate.toLocaleDateString(locale, {
        weekday: 'long', // e.g., "Tuesday"
      });
    } catch (error) {
      return '';
    }
  }, [locale, selectedDate]);

  const formattedShortDate = useMemo(() => {
    try {
      return selectedDate.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (error) {
      return selectedDate.toLocaleDateString(locale);
    }
  }, [locale, selectedDate]);

  const softerSurface = isDark ? '#1C1C1E' : '#FFFFFF';
  const textPrimary = isDark ? '#FFFFFF' : '#1D1D1F';
  const textSecondary = isDark ? '#8E8E93' : '#636366';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const solidPrimaryColor = useMemo(() => (isDark ? '#0A84FF' : '#1976D2'), [isDark]);

  const formatNumber = useCallback((value) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return `${value}`;
  }, []);

  const topHighlights = useMemo(() => ([
    {
      key: 'projects',
      icon: 'briefcase-outline',
      value: activeProjectCount,
      label: translate('activeProjects', 'Active Projects'),
      iconColor: solidPrimaryColor,
      iconBackground: isDark ? 'rgba(10,132,255,0.22)' : 'rgba(25,118,210,0.12)',
    },
    {
      key: 'activeTasks',
      icon: 'checkbox-outline',
      value: activeMilestonesCount,
      label: translate('activeTasks', 'Active Tasks'),
      iconColor: '#34C759',
      iconBackground: isDark ? 'rgba(52,199,89,0.22)' : 'rgba(52,199,89,0.12)',
    },
  ]), [activeProjectCount, activeMilestonesCount, isDark, solidPrimaryColor, translate]);

  const bottomHighlights = useMemo(() => ([
    {
      key: 'entries',
      icon: 'create-outline',
      value: dailyStats.entriesToday,
      label: translate('entriesToday', 'Entries Today'),
      iconColor: '#FF2D55',
      iconBackground: isDark ? 'rgba(255,45,85,0.22)' : 'rgba(255,45,85,0.12)',
    },
    {
      key: 'words',
      icon: 'document-text-outline',
      value: dailyStats.wordsToday,
      label: translate('wordsToday', 'Words Today'),
      iconColor: '#FF9500',
      iconBackground: isDark ? 'rgba(255,149,0,0.22)' : 'rgba(255,149,0,0.12)',
    },
    {
      key: 'completedTasks',
      icon: 'checkmark-done-outline',
      value: completedMilestonesToday,
      label: translate('completedTasks', 'Completed Tasks'),
      iconColor: '#5AC8FA',
      iconBackground: isDark ? 'rgba(90,200,250,0.22)' : 'rgba(90,200,250,0.12)',
    },
  ]), [completedMilestonesToday, dailyStats.entriesToday, dailyStats.wordsToday, isDark, translate]);

  // Streaks
  const streakInfo = useMemo(() => {
    const datesSet = new Set();
    allTasks.forEach(task => {
      (task.journalEntries || []).forEach(entry => {
        if (!entry.createdAt) return;
        const d = new Date(entry.createdAt);
        d.setHours(0,0,0,0);
        datesSet.add(d.getTime());
      });
    });
    if (datesSet.size === 0) {
      return { current: 0, longest: 0, todayWritten: false };
    }
    const all = Array.from(datesSet).sort((a,b)=>a-b);
    let longest = 1, curLen = 1;
    for (let i=1;i<all.length;i++){
      const prev = new Date(all[i-1]);
      const curr = new Date(all[i]);
      const diff = (curr - prev)/(1000*60*60*24);
      if (diff === 1) { curLen += 1; longest = Math.max(longest, curLen); }
      else if (diff > 1) { curLen = 1; }
    }
    // current streak counting backward from selectedDate
    let current = 0;
    const keySet = new Set(all);
    let d = new Date(selectedDate);
    d.setHours(0,0,0,0);
    while (keySet.has(d.getTime())) {
      current += 1;
      d.setDate(d.getDate()-1);
    }
    const todayKey = new Date(selectedDate).setHours(0,0,0,0);
    const todayWritten = keySet.has(todayKey);
    return { current, longest, todayWritten };
  }, [allTasks, selectedDate]);

  // Streak carousel: 3 slides (Days, Longest, Wrote Today)
  const streakSlides = useMemo(() => [
    {
      title: translate('currentStreak', 'Current Streak'),
      icon: 'flame',
      value: streakInfo.current,
      subtitle: translate('days', 'days'),
      // More pronounced blue gradient
      colors: isDark ? ['#2E66D6', '#4C8FF0'] : ['#2B6CE6', '#5AA3F8'],
    },
    {
      title: translate('longestStreak', 'Longest Streak'),
      icon: 'trophy',
      value: streakInfo.longest,
      subtitle: translate('days', 'days'),
      // Stronger amber / gold gradient
      colors: isDark ? ['#B57016', '#D69E3A'] : ['#D29B1E', '#F4C35D'],
    },
    {
      title: streakInfo.todayWritten ? translate('wroteToday', 'Wrote Today') : translate('noEntryToday', 'No Entry Today'),
      icon: streakInfo.todayWritten ? 'checkmark-circle' : 'close-circle',
      value: streakInfo.todayWritten ? '✓' : '✗',
      subtitle: streakInfo.todayWritten ? translate('keepItUp', 'Keep it up!') : translate('writeToday', 'Write today!'),
      // Stronger success / warning gradients
      colors: streakInfo.todayWritten 
        ? (isDark ? ['#2E8B57', '#4FBF8B'] : ['#2EBD7A', '#66D69F'])
        : (isDark ? ['#C59A2E', '#E8C870'] : ['#E3C06A', '#F5DD9B']),
    },
  ], [streakInfo, isDark, translate]);

  useEffect(() => {
    if (!streakSlides.length) {
      if (selectedStreakCardIndex !== 0) {
        setSelectedStreakCardIndex(0);
      }
      return;
    }

    if (selectedStreakCardIndex >= streakSlides.length) {
      setSelectedStreakCardIndex(0);
    }
  }, [selectedStreakCardIndex, streakSlides.length]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const STORAGE_KEY = 'overview_last_streak_index';

      const start = async () => {
        if (!streakSlides.length) {
          if (isActive) setSelectedStreakCardIndex(0);
          return;
        }

        setStreakVersion(0);
        setShowCounters(false);

        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          const last = raw ? parseInt(raw, 10) : null;
          const nextIndex = (Number.isInteger(last) && !Number.isNaN(last))
            ? (last + 1) % streakSlides.length
            : 0;

          if (isActive) {
            setSelectedStreakCardIndex(nextIndex);
            await AsyncStorage.setItem(STORAGE_KEY, `${nextIndex}`);
          }
        } catch (e) {
          // fallback: just rotate in-memory
          if (isActive) {
            setSelectedStreakCardIndex(prev => (streakSlides.length ? (prev + 1) % streakSlides.length : 0));
          }
        }

        const delayTimer = setTimeout(() => {
          if (!isActive) return;
          setShowCounters(true);
          setFocusVersion(v => v + 1);
          setStreakVersion(v => v + 1);
        }, 1000);

        // cleanup for the timeout
        return () => clearTimeout(delayTimer);
      };

      let clearFn;
      start().then((cleanup) => { clearFn = cleanup; }).catch(() => {});

      return () => {
        isActive = false;
        if (typeof clearFn === 'function') clearFn();
        return undefined;
      };
    }, [streakSlides.length])
  );

  const selectedStreakCard = streakSlides[selectedStreakCardIndex];
  const secondaryStreakCards = streakSlides.filter((_, idx) => idx !== selectedStreakCardIndex);

  // Slideshow removed; a single random streak card is shown per visit

  return (
    <LinearGradient
      colors={overviewGradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.screen, Helpers.container]}
    >
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, 16) * 3,
          },
        ]}
      >
        <View style={styles.topBarTitleContainer}>
          <View style={styles.topBarSubtitleRow}>
            <TouchableOpacity
              onPress={() => navigation?.goBack?.()}
              style={styles.inlineBackButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={translate('goBack', 'Go Back')}
            >
              <Ionicons name="chevron-back" size={18} color={textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.topBarTitle, { color: textPrimary }]}>
              {formattedWeekday}
            </Text>
          </View>
          <Text style={[styles.topBarSubtitle, { color: textSecondary, marginLeft: 40 }]}>
            {formattedShortDate}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ backgroundColor: 'transparent' }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
  {/* Streaks Hero - Random Card */}
        <View style={styles.streakHeroContainer}>
          {selectedStreakCard && (
            <LinearGradient
              colors={selectedStreakCard.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.streakHeroCard, isDark ? styles.streakHeroCardDark : styles.streakHeroCardLight]}
            >
              <View style={styles.streakHeroHeader}>
                <Ionicons name={selectedStreakCard.icon} size={18} color="#FFFFFF" />
                <Text style={styles.streakHeroTitle}>{selectedStreakCard.title}</Text>
              </View>
              <View style={styles.streakHeroContent}>
                {typeof selectedStreakCard.value === 'number' ? (
                  showCounters ? (
                    <CountUp
                      key={`streak-${streakVersion}-${selectedStreakCardIndex}`}
                      value={selectedStreakCard.value}
                      duration={1800}
                      style={styles.streakHeroNumber}
                      formatter={(n) => `${n}`}
                    />
                  ) : (
                    <Text style={styles.streakHeroNumber}>0</Text>
                  )
                ) : (
                  <Text style={styles.streakHeroNumber}>{selectedStreakCard.value}</Text>
                )}
                <Text style={styles.streakHeroSub}>{selectedStreakCard.subtitle}</Text>
              </View>
              <View style={styles.streakMiniRow}>
                {weeklyActivity.map((count, idx) => (
                  <View key={idx} style={[styles.streakMiniDot, { opacity: count > 0 ? 1 : 0.35 }]} />
                ))}
              </View>
              {secondaryStreakCards.length > 0 && (
                <View style={styles.streakHeroBadges}>
                  {secondaryStreakCards.map((otherSlide, idx) => (
                    <View
                      key={`${otherSlide.title}-${idx}`}
                      style={[
                        styles.streakBadge,
                        { backgroundColor: isDark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.26)' },
                      ]}
                    >
                      <Ionicons name={otherSlide.icon} size={14} color="#FFFFFF" />
                      <Text style={styles.streakBadgeText}>
                        {otherSlide.title}: {otherSlide.value}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </LinearGradient>
          )}
        </View>

        {/* Daily Highlights - Data-focused tiles */}
        <View style={styles.highlightsModernContainer}>
          <View style={[styles.highlightCard]}> 
            <View style={styles.highlightRow}>
              {topHighlights.map(item => (
                <View
                  key={item.key}
                  style={[styles.highlightItemLarge, { backgroundColor: softerSurface, borderColor }]}
                >
                  <View style={[styles.highlightIcon, { backgroundColor: item.iconBackground }]}> 
                    <Ionicons name={item.icon} size={20} color={item.iconColor} />
                  </View>
                  {typeof item.value === 'number' ? (
                    showCounters ? (
                      <CountUp
                        key={`top-${item.key}-${focusVersion}`}
                        value={item.value}
                        duration={1600}
                        style={[styles.highlightValue, { color: textPrimary }]}
                        formatter={(n) => formatNumber(n)}
                      />
                    ) : (
                      <Text style={[styles.highlightValue, { color: textPrimary }]}>0</Text>
                    )
                  ) : (
                    <Text style={[styles.highlightValue, { color: textPrimary }]}>
                      {item.value}
                    </Text>
                  )}
                  <Text style={[styles.highlightLabel, { color: textSecondary }]}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
            <View style={[styles.highlightRow, { marginTop: 10 }]}>
              {bottomHighlights.map(item => (
                <View
                  key={item.key}
                  style={[styles.highlightItemSmall, { backgroundColor: softerSurface, borderColor }]}
                >
                  <View style={[styles.highlightIconSmall, { backgroundColor: item.iconBackground }]}> 
                    <Ionicons name={item.icon} size={18} color={item.iconColor} />
                  </View>
                  {typeof item.value === 'number' ? (
                    showCounters ? (
                      <CountUp
                        key={`bottom-${item.key}-${focusVersion}`}
                        value={item.value}
                        duration={1600}
                        style={[styles.highlightValueSmall, { color: textPrimary }]}
                        formatter={(n) => formatNumber(n)}
                      />
                    ) : (
                      <Text style={[styles.highlightValueSmall, { color: textPrimary }]}>0</Text>
                    )
                  ) : (
                    <Text style={[styles.highlightValueSmall, { color: textPrimary }]}>
                      {item.value}
                    </Text>
                  )}
                  <Text style={[styles.highlightLabelSmall, { color: textSecondary }]}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Inline back icon in top bar; removed bottom Go Back button */}

        {/* Streak chips section removed since hero is at the top */}

        {/* Next best actions removed per request */}

        {/* Other sections removed per request; will add heatmap, streaks, and next actions below */}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  screen: {
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  topBarTitle: {
    fontSize: 22,
    fontFamily: Typography.fonts.semiBold,
  },
  topBarSubtitle: {
    fontSize: 14,
    fontFamily: Typography.fonts.regular,
    marginTop: 2,
  },
  topBarSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineBackButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  highlightsModernContainer: {
    marginHorizontal: Math.max(20, width * 0.05), // Responsive margin: minimum 20, max 5% of screen width
    marginTop: 12,
  },
  highlightCard: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 0,
    borderWidth: 0,
  },
  highlightGrid: {
    display: 'none',
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8, // Use gap instead of margin for better spacing
  },
  highlightItemLarge: {
    flex: 1, // Use flex instead of fixed percentage
    maxWidth: '48%', // Maximum width constraint
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightItemSmall: {
    flex: 1, // Use flex for equal distribution
    minWidth: 90, // Minimum width to prevent squishing
    maxWidth: '31%', // Maximum width constraint
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  highlightIconSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  highlightValue: {
    fontSize: 22,
    fontFamily: Typography.fonts.bold,
    marginBottom: 4,
    textAlign: 'center',
  },
  highlightValueSmall: {
    fontSize: 18,
    fontFamily: Typography.fonts.bold,
    marginBottom: 2,
    textAlign: 'center',
  },
  highlightLabel: {
    fontSize: 12,
    fontFamily: Typography.fonts.medium,
    textAlign: 'center',
  },
  highlightLabelSmall: {
    fontSize: 11,
    fontFamily: Typography.fonts.medium,
    textAlign: 'center',
  },
  streakHeroContainer: {
    marginHorizontal: Math.max(20, width * 0.05), // Responsive margin
    marginTop: 12,
  },
  streakHeroCard: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    overflow: 'hidden', // Prevent content overflow
  },
  streakHeroCardDark: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    // elevated shadow to help card pop on dark backgrounds
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  streakHeroCardLight: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    // soft shadow for light backgrounds
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  streakHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakHeroTitle: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
    fontFamily: Typography.fonts.semiBold,
  },
  streakHeroContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  streakHeroNumber: {
    color: '#FFFFFF',
    fontSize: 46,
    lineHeight: 48,
    fontFamily: Typography.fonts.extraBold,
    marginRight: 6,
  },
  streakHeroSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontFamily: Typography.fonts.semiBold,
    marginBottom: 4,
  },
  streakMiniRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  streakMiniDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
    marginRight: 6,
  },
  streakHeroBadges: {
    flexDirection: 'row',
    marginTop: 12,
    flexWrap: 'wrap', // Allow badges to wrap on small screens
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 4, // Add bottom margin for wrapped items
  },
  streakBadgeText: {
    color: '#FFFFFF',
    marginLeft: 6,
    fontSize: 12,
    fontFamily: Typography.fonts.medium,
  },
});

export default OverviewScreen;

// Smooth reusable count-up component with improved easing
const CountUp = ({ value, duration = 1200, style, formatter }) => {
  const [display, setDisplay] = useState(0);
  const endValue = typeof value === 'number' ? value : 0;

  useEffect(() => {
    setDisplay(0);
    if (endValue === 0) {
      return;
    }

    // OPTIMIZED: Smoother animation with ease-out-cubic
    const fps = 60; // Target 60 FPS
    const totalFrames = Math.ceil((duration / 1000) * fps);
    const frameDelay = 1000 / fps; // ~16.67ms per frame
    
    let currentFrame = 0;
    let animationFrameId;
    let lastTimestamp = performance.now();

    const animate = (timestamp) => {
      const elapsed = timestamp - lastTimestamp;
      
      if (elapsed >= frameDelay) {
        currentFrame++;
        lastTimestamp = timestamp;
        
        // Ease-out-cubic for smooth deceleration
        const progress = Math.min(currentFrame / totalFrames, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        const currentValue = Math.round(eased * endValue);
        setDisplay(currentValue);
        
        if (currentFrame < totalFrames) {
          animationFrameId = requestAnimationFrame(animate);
        } else {
          setDisplay(endValue); // Ensure exact final value
        }
      } else {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [endValue, duration]);

  const text = formatter ? formatter(display) : `${display}`;
  return <Text style={style}>{text}</Text>;
};
