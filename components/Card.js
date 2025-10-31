import React, { useEffect, useRef, useMemo, useCallback, memo } from "react";
import { View, Text, StyleSheet, Image, Animated, TouchableWithoutFeedback, Vibration } from "react-native";
import Svg, { Circle } from "react-native-svg";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import PropTypes from "prop-types";
import { getMilestoneColor, getMilestoneCardColor } from '../utils/milestoneColors';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, ANIMATION_DURATIONS } from '../constants';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Hex rengi RGB'ye çeviren fonksiyon
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 211, g: 203, b: 227 }; // Varsayılan renk
};

// Mood tag'lerini render eden fonksiyon - basit ve temiz
const MoodTags = memo(({ project, theme }) => {
  const recentMoods = useMemo(() => {
    // Early return for performance
    if (!project?.journalEntries || project.journalEntries.length === 0) {
      return [];
    }

    // Cache length to avoid repeated property access
    const entries = project.journalEntries;
    const entriesCount = entries.length;
    
    // If only a few entries, no need to sort/filter extensively
    if (entriesCount <= 3) {
      return entries.filter(entry => entry.mood || entry.moodIcon || entry.moodColor);
    }

    // Son 3 mood'u al (en yeni önce) - optimize with slice before sort
    return entries
      .slice(-10) // Only check last 10 entries for performance
      .sort((a, b) => b.id - a.id) // En yeni entry'ler önce
      .filter(entry => entry.mood || entry.moodIcon || entry.moodColor) // Sadece mood'u olan entry'ler
      .slice(0, 3); // En fazla 3 mood göster
  }, [project?.journalEntries?.length]); // Only recompute when length changes

  // Eğer mood yoksa hiçbir şey gösterme
  if (recentMoods.length === 0) {
    return null;
  }

  return (
    <View style={styles.moodTagsContainer}>
      {recentMoods.map((entry, index) => {
        if (!entry.mood && !entry.moodIcon && !entry.moodColor) return null;
        
        const iconName = entry.moodIcon || entry.mood || 'sentiment-satisfied';
        const backgroundColor = entry.moodColor || theme.colors.primary;
        
        return (
          <View 
            key={`${entry.id}-${index}`}
            style={[
              styles.moodTag, 
              { 
                backgroundColor: backgroundColor, // Same color for both themes
                borderColor: theme.name === 'dark' 
                  ? 'rgba(255, 255, 255, 0.2)' 
                  : 'rgba(0, 0, 0, 0.1)',
                borderWidth: 1,
                zIndex: index + 1 // Sağdaki (son eklenen) en yüksek zIndex
              }
            ]}
          >
            <MaterialIcons
              name={iconName}
              size={12}
              color={theme.name === 'dark' ? '#000000' : '#333'}
            />
          </View>
        );
      })}
    </View>
  );
});

const Card = memo(function Card({ title, startDate, endDate, completed = false, activeMilestones = [], onMilestonePress, onPress, task }) {
  // Performance monitoring (sadece development'ta)
  // Performance monitoring - sadece kritik durumlarda uyar
  usePerformanceMonitor('Card', {
    trackFPS: false, // FPS tracking'i kapat
    warnThreshold: 200, // Daha yüksek threshold
    criticalThreshold: 500 // Daha yüksek critical threshold
  });
  
  // Theme context
  const { theme } = useTheme();
  const { t, language } = useLanguage();

  const locale = language === 'tr' ? 'tr-TR' : (language || 'en-US');
  const formatShort = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
    } catch (e) {
      return '';
    }
  };
  
  // Smooth touch animations (like JourneyOverview)
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  
  // Safety check for required props
  if (!title || !startDate || !endDate) {
    return null;
  }
  
  // Memoize expensive calculations
  const { totalDays, remainingDays, progress } = useMemo(() => {
    const total = Math.max(
      1,
      (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
    );
    const remaining = Math.max(
      0,
      (new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    const prog = Math.min(1, (total - remaining) / total);
    
    return {
      totalDays: total,
      remainingDays: remaining,
      progress: prog
    };
  }, [startDate, endDate]);

  // Status calculation for header badge: started / not started / overdue / completed
  const { statusText, statusVariant } = useMemo(() => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const capitalize = (s) => {
      if (!s) return s;
      return s.charAt(0).toUpperCase() + s.slice(1);
    };

    const safeT = (key, params = {}) => {
      try {
        if (!t) return null;
        const translated = t(key, params);
        // If translation missing, t returns the key itself — detect that and return null
        if (!translated || translated === key) return null;
        return translated;
      } catch (e) {
        return null;
      }
    };

    if (completed) {
      const label = safeT('status.completed') || (language === 'tr' ? 'Tamamlandı' : 'Completed');
      return { statusText: capitalize(label), statusVariant: 'completed' };
    }

    // overdue: now is past endDate
    if (now > end) {
      const daysOver = Math.ceil((now - end) / (1000 * 60 * 60 * 24));
      const translated = safeT('status.overdueDays', { days: daysOver });
      const label = translated || (language === 'tr' ? `${daysOver} gün gecikmede` : `${daysOver} days overdue`);
      return { statusText: capitalize(label), statusVariant: 'overdue' };
    }

    if (now < start) {
      const label = safeT('status.notStarted') || (language === 'tr' ? 'Başlamadı' : 'Not started');
      return { statusText: capitalize(label), statusVariant: 'notStarted' };
    }

    // otherwise it's started
    const label = safeT('status.started') || (language === 'tr' ? 'Başladı' : 'Started');
    return { statusText: capitalize(label), statusVariant: 'started' };
  }, [startDate, endDate, completed, t, language]);

  // Foreground color (icon + text) should match the badge border color for each variant
  const badgeForegroundColor = useMemo(() => {
    switch (statusVariant) {
      case 'started':
        return '#007AFF'; // stronger blue for readability
      case 'notStarted':
      case 'completed':
        return '#2EA043'; // slightly darker green than #34C759
      case 'overdue':
        return '#E02E4A'; // slightly darker red than #FF375F
      default:
        return '#ffffff';
    }
  }, [statusVariant]);

  // Memoize circle calculations
  const { radius, strokeWidth, center, circumference } = useMemo(() => {
    const r = 28;
    const sw = 8;
    const c = r + sw;
    const circ = 2 * Math.PI * r;
    
    return {
      radius: r,
      strokeWidth: sw,
      center: c,
      circumference: circ
    };
  }, []);

  // Compute unique journal day count (same logic as ProjectCard.js)
  const journalCardCount = useMemo(() => {
    try {
      if (!task || !Array.isArray(task.journalEntries)) return 0;
      const uniqueDates = new Set();
      task.journalEntries.forEach(entry => {
        if (!entry?.createdAt) return;
        const d = new Date(entry.createdAt);
        const dateKey = d.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
        uniqueDates.add(dateKey);
      });
      return uniqueDates.size;
    } catch (e) {
      return 0;
    }
  }, [task?.journalEntries?.length, locale]);

  const animatedValue = useRef(new Animated.Value(0)).current;

  // Memoized milestone press handler
  const handleMilestonePress = useCallback((milestone) => {
    onMilestonePress?.(milestone);
  }, [onMilestonePress]);

  // Smooth touch interaction handlers (same as JourneyOverview)
  const handlePressIn = useCallback(() => {
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

  const handlePressOut = useCallback(() => {
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

  const handlePress = useCallback(() => {
    // CRITICAL: Immediately trigger navigation without any delay
    if (onPress) {
      onPress();
    }
  }, [onPress]);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: ANIMATION_DURATIONS.VERY_SLOW,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      animatedValue.stopAnimation();
    };
  }, []);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const cardStyle = [styles.card, completed ? styles.completedCard : {}];
  const titleStyle = [styles.title, completed ? styles.completedTitle : {}];
  const daysLeftTextStyle = [styles.daysLeftText, completed ? styles.completedDaysText : {}];

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View
        style={[
          styles.modernCard,
          { 
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
            borderColor: theme.name === 'dark' ? '#000000' : 'rgba(0, 0, 0, 0.03)',
            borderWidth: theme.name === 'dark' ? 1.5 : 0.5,
            shadowColor: theme.name === 'dark' ? '#000000' : '#000',
            shadowOpacity: theme.name === 'dark' ? 0.3 : 0.05,
            shadowRadius: theme.name === 'dark' ? 12 : 8,
            elevation: theme.name === 'dark' ? 8 : 1,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
          completed && styles.modernCompletedCard,
        ]}
      >
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <View style={styles.modernTitleSection}>
          <Text style={[
            styles.modernTitle, 
            { color: theme.name === 'dark' ? '#FF6B6B' : theme.colors.text },
            completed && styles.modernCompletedTitle
          ]}>
            {title}
          </Text>
          
          <View style={[
            styles.modernDateFrame, 
            {
              backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#F2F2F7',
              borderColor: theme.name === 'dark' ? '#2C2C2E' : 'transparent',
              borderWidth: theme.name === 'dark' ? 0.5 : 0,
            },
            completed && styles.modernCompletedDateFrame
          ]}>
            <Text style={[
              styles.modernDateRange, 
              { color: theme.name === 'dark' ? '#8E8E93' : theme.colors.textSecondary },
              completed && styles.modernCompletedDateText
            ]}>
              {formatShort(startDate)} - {formatShort(endDate)}
            </Text>
          </View>
          
          {/* Project Mood Indicator - Tarihin altında */}
          {task && <MoodTags project={task} theme={theme} />}
        </View>

        {/* Status badge on the right of the header */}
        <View style={styles.statusBadgeWrapper}>
          <View
            style={[
              styles.statusBadgeContainer,
              statusVariant === 'started' && styles.statusBadgeStarted,
              statusVariant === 'notStarted' && styles.statusBadgeNotStarted,
              statusVariant === 'overdue' && styles.statusBadgeOverdue,
              statusVariant === 'completed' && styles.statusBadgeCompleted,
            ]}
            accessibilityLabel={`status-${statusVariant}`}
          >
            {/* Icon + label */}
            <View style={styles.statusBadgeRow}>
              <MaterialIcons
                name={
                  statusVariant === 'started' ? 'play-arrow' :
                  statusVariant === 'notStarted' ? 'hourglass-empty' :
                  statusVariant === 'overdue' ? 'error' :
                  'check'
                }
                size={14}
                color={badgeForegroundColor}
                style={styles.statusBadgeIcon}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: badgeForegroundColor },
                ]}
                numberOfLines={1}
              >
                {statusText}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Modern Bottom Section */}
      <View style={[styles.modernBottomSection, completed && styles.modernCompletedBottomSection]}>
        <View style={styles.modernDaysLeft}>
          <MaterialIcons 
            name="schedule" 
            size={16} 
            color={completed ? theme.colors.textTertiary : theme.colors.primary} 
          />
          <Text style={[
            styles.modernDaysLeftText, 
            { color: theme.colors.textSecondary },
            completed && styles.modernCompletedDaysText
          ]}>
            {completed ? `${Math.ceil(totalDays)} days completed` : `${Math.ceil(remainingDays)} gün kaldı`}
          </Text>
        </View>
        {/* Journal count badge copied from ProjectCard - placed to the right of days left */}
        <View style={styles.journalBadgeWrapper}>
          <View style={[styles.journalCountBadge, { backgroundColor: theme.name === 'dark' ? '#007AFF' : '#007AFF' }]}> 
            <Ionicons name="journal" size={12} color="#FFFFFF" />
            <Text style={styles.journalCountText}>{journalCardCount}</Text>
          </View>
        </View>
      </View>


      {/* Completed Stats Section */}
      {completed && (
        <View style={[
          styles.completedStatsSection,
          {
            borderTopColor: theme.name === 'dark' 
              ? 'rgba(255, 255, 255, 0.15)' 
              : 'rgba(199, 199, 204, 0.3)',
          }
        ]}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons 
                name="list" 
                size={16} 
                color={theme.name === 'dark' ? '#AEAEB2' : theme.colors.textTertiary} 
              />
              <Text style={[
                styles.statText, 
                { color: theme.name === 'dark' ? '#AEAEB2' : theme.colors.textSecondary }
              ]}>
                {activeMilestones.length} milestone
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons 
                name="location" 
                size={16} 
                color={theme.name === 'dark' ? '#AEAEB2' : theme.colors.textTertiary} 
              />
              <Text style={[
                styles.statText, 
                { color: theme.name === 'dark' ? '#AEAEB2' : theme.colors.textSecondary }
              ]}>
                {activeMilestones.reduce((total, ms) => 
                  total + (ms.journalEntries?.filter(entry => entry.location).length || 0), 0
                )} konum
              </Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons 
                name="journal" 
                size={16} 
                color={theme.name === 'dark' ? '#AEAEB2' : theme.colors.textTertiary} 
              />
              <Text style={[
                styles.statText, 
                { color: theme.name === 'dark' ? '#AEAEB2' : theme.colors.textSecondary }
              ]}>
                {activeMilestones.reduce((total, ms) => total + (ms.journalEntries?.length || 0), 0)} günlük
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons 
                name="image" 
                size={16} 
                color={theme.name === 'dark' ? '#AEAEB2' : theme.colors.textTertiary} 
              />
              <Text style={[
                styles.statText, 
                { color: theme.name === 'dark' ? '#AEAEB2' : theme.colors.textSecondary }
              ]}>
                {activeMilestones.reduce((total, ms) => 
                  total + (ms.journalEntries?.reduce((entryTotal, entry) => 
                    entryTotal + (entry.images?.length || 0), 0) || 0), 0
                )} medya
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Info boxes: show active and completed task counts instead of milestone list */}
      {!completed && (
        <View style={styles.infoBoxesRow}>
          {/* Determine counts from provided task.milestones if available, otherwise fall back to activeMilestones prop */}
          {/* Compute inside render to keep values up-to-date */}
          {(() => {
            const allMilestones = (task && Array.isArray(task.milestones)) ? task.milestones : (activeMilestones || []);
            const activeCount = allMilestones.filter(m => !m.completed).length;
            const completedCount = allMilestones.filter(m => m.completed).length;

            const translateOrDefault = (key, fallback) => {
              try {
                if (!t) return fallback;
                const translated = t(key);
                if (!translated || translated === key) return fallback;
                return translated;
              } catch (e) {
                return fallback;
              }
            };

            const activeLabel = translateOrDefault('activeMilestones', language === 'tr' ? 'Aktif Görevler' : 'Active');
            const completedLabel = translateOrDefault('completedMilestones', language === 'tr' ? 'Tamamlanan Görevler' : 'Completed');

            return (
              <>
                <View style={[styles.infoBox, { backgroundColor: theme.name === 'dark' ? '#0F0F10' : '#F7F7FC', borderColor: theme.name === 'dark' ? '#272729' : 'rgba(0,0,0,0.04)' }] }>
                  <View style={styles.infoBoxHeader}>
                    <Text style={[styles.infoBoxTitle, { color: theme.colors.textSecondary }]}>{activeLabel}</Text>
                  </View>
                  <View style={styles.infoBoxNumber}>
                    <Text style={[styles.infoBoxValue, { color: theme.colors.text }]}>{activeCount}</Text>
                  </View>
                </View>

                <View style={[styles.infoBox, { backgroundColor: theme.name === 'dark' ? '#0F0F10' : '#F7F7FC', borderColor: theme.name === 'dark' ? '#272729' : 'rgba(0,0,0,0.04)' }] }>
                  <View style={styles.infoBoxHeader}>
                    <Text style={[styles.infoBoxTitle, { color: theme.colors.textSecondary }]}>{completedLabel}</Text>
                  </View>
                  <View style={styles.infoBoxNumber}>
                    <Text style={[styles.infoBoxValue, { color: theme.colors.text }]}>{completedCount}</Text>
                  </View>
                </View>
              </>
            );
          })()}
        </View>
      )}
    </Animated.View>
    </TouchableWithoutFeedback>
  );
}, (prevProps, nextProps) => {
  // Smart comparison function - only re-render when necessary
  // Check basic props first (fastest)
  if (prevProps.title !== nextProps.title ||
      prevProps.startDate !== nextProps.startDate ||
      prevProps.endDate !== nextProps.endDate ||
      prevProps.completed !== nextProps.completed) {
    return false; // Re-render needed
  }
  
  // Check task object - important for detecting parentId changes
  const prevTask = prevProps.task;
  const nextTask = nextProps.task;
  
  if (prevTask && nextTask) {
    const prevTaskMilestones = prevTask.milestones || [];
    const nextTaskMilestones = nextTask.milestones || [];
    
    if (prevTaskMilestones.length !== nextTaskMilestones.length) {
      return false; // Re-render needed
    }
    
    // Create ID-based map to check parentId changes (order-independent)
    const prevParentIdMap = {};
    const nextParentIdMap = {};
    
    prevTaskMilestones.forEach(ms => {
      if (ms && ms.id) {
        prevParentIdMap[ms.id] = ms.parentId;
      }
    });
    
    nextTaskMilestones.forEach(ms => {
      if (ms && ms.id) {
        nextParentIdMap[ms.id] = ms.parentId;
      }
    });
    
    // Check if any milestone's parentId changed
    for (const id in prevParentIdMap) {
      if (prevParentIdMap[id] !== nextParentIdMap[id]) {
        return false; // Re-render needed - parentId changed!
      }
    }
  }
  
  // Check milestones length (fast)
  const prevMilestones = prevProps.activeMilestones || [];
  const nextMilestones = nextProps.activeMilestones || [];
  
  if (prevMilestones.length !== nextMilestones.length) {
    return false; // Re-render needed
  }
  
  // Check milestones content (only if length matches)
  for (let i = 0; i < prevMilestones.length; i++) {
    const prev = prevMilestones[i];
    const next = nextMilestones[i];
    
    if (!prev || !next) return false;
    
    // Check basic milestone properties including parentId
    if (prev.id !== next.id ||
        prev.title !== next.title ||
        prev.completed !== next.completed ||
        prev.parentId !== next.parentId) {
      return false; // Re-render needed
    }
    
    // Check journal entries length
    const prevEntries = prev.journalEntries || [];
    const nextEntries = next.journalEntries || [];
    
    if (prevEntries.length !== nextEntries.length) {
      return false; // Re-render needed
    }
    
    // Check journal entries content (only if length matches)
    for (let j = 0; j < prevEntries.length; j++) {
      const prevEntry = prevEntries[j];
      const nextEntry = nextEntries[j];
      
      if (!prevEntry || !nextEntry) return false;
      
      // Check mood-related properties
      if (prevEntry.id !== nextEntry.id ||
          prevEntry.mood !== nextEntry.mood ||
          prevEntry.moodIcon !== nextEntry.moodIcon ||
          prevEntry.moodColor !== nextEntry.moodColor ||
          prevEntry.createdAt !== nextEntry.createdAt) {
        return false; // Re-render needed
      }
    }
  }
  
  return true; // No re-render needed
});

export default Card;

const styles = StyleSheet.create({
  // Modern Card Styles
  modernCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
    width: "100%",
    shadowOffset: { width: 0, height: 2 },
  },
  modernCompletedCard: {
    backgroundColor: "#F2F2F7", // Hafif koyu gri arka plan
    borderColor: "#000000", // Siyah border
    borderWidth: 1.5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    paddingVertical: 20, // Üst-alt boşluk artırıldı
    paddingHorizontal: 20, // Yan boşluklar artırıldı
  },
  modernHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20, // Boşluk artırıldı
  },
  modernTitleSection: {
    flex: 1,
    marginRight: 16,
  },
  modernTitle: {
    fontSize: 17,
    fontFamily: FONTS.BOLD,
    letterSpacing: -0.3,
    color: "#1D1D1F",
    lineHeight: 24,
    marginBottom: 4,
  },
  modernDateFrame: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8, // Boşluk artırıldı
  },
  modernDateRange: {
    fontSize: 11,
    fontFamily: FONTS.MEDIUM,
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  modernBottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16, // Boşluk artırıldı
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  modernCompletedBottomSection: {
    borderTopColor: 'rgba(199, 199, 204, 0.3)',
  },
  modernDaysLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernDaysLeftText: {
    fontSize: 12,
    fontFamily: FONTS.MEDIUM,
    color: "#007AFF",
    marginLeft: 6,
  },
  journalBadgeWrapper: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    minWidth: 40,
  },
  journalCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  journalCountText: {
    fontSize: 10,
    fontFamily: FONTS.MEDIUM,
    color: '#FFFFFF',
    marginLeft: 6,
  },
  statusBadgeWrapper: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    minWidth: 92,
  },
  statusBadgeContainer: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeIcon: {
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.MEDIUM,
    letterSpacing: -0.1,
  },
  statusBadgeStarted: {
    backgroundColor: 'rgba(0,122,255,0.12)',
    borderColor: 'rgba(0,122,255,0.25)',
    borderWidth: 1,
  },
  statusBadgeNotStarted: {
    backgroundColor: 'rgba(52,199,89,0.12)',
    borderColor: 'rgba(52,199,89,0.22)',
    borderWidth: 1,
  },
  statusBadgeOverdue: {
    backgroundColor: 'rgba(255,55,95,0.12)',
    borderColor: 'rgba(255,55,95,0.25)',
    borderWidth: 1,
  },
  statusBadgeCompleted: {
    backgroundColor: 'rgba(52,199,89,0.12)',
    borderColor: 'rgba(52,199,89,0.22)',
    borderWidth: 1,
  },
  // Completed States - Dengeli Gri Tema
  modernCompletedTitle: {
    color: "#1D1D1F", // Koyu gri metin
  },
  modernCompletedDateFrame: {
    backgroundColor: '#D1D1D6', // Orta gri arka plan
  },
  modernCompletedDateText: {
    color: "#636366", // Orta koyu gri metin
  },
  modernCompletedDaysText: {
    color: "#636366", // Orta koyu gri metin
  },
  modernCompletedMilestoneText: {
    color: "#1D1D1F", // Koyu gri metin
  },
  // Legacy styles (keeping for compatibility)
  card: {
    backgroundColor: "#FFFFFF", // Temiz beyaz arka plan
    padding: 24, // Daha geniş padding
    marginBottom: 20,
    borderRadius: 20,
    width: "100%",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },
  completedCard: {
    backgroundColor: "#2c3e50",
    borderRadius: 24,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontFamily: FONTS.BOLD,
    letterSpacing: -0.3,
    color: "#1D1D1F", // Apple'ın kullandığı koyu gri
    lineHeight: 26,
    flex: 1,
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  projectDateRange: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 11,
    fontFamily: FONTS.MEDIUM,
    color: '#8E8E93',
  },
  completedTitle: {
    color: "#fff",
  },
  completedDateRange: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completedDateText: {
    color: '#fff',
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  daysLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -8,
  },
  daysLeftText: {
    fontFamily: FONTS.MEDIUM,
    color: "#007AFF", // Apple'ın mavi rengi
    fontSize: 14,
    letterSpacing: -0.1,
  },
  completedDaysText: {
    color: "#fff",
  },

  milestoneList: {
    marginTop: 4,
    paddingTop: 0,
  },
  infoBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 6,
  },
  infoBox: {
    width: '46%', // ensure equal widths for both boxes
    aspectRatio: 1.4, // reduce vertical height (wider relative to height)
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  infoBoxTitle: {
    fontSize: 11,
    fontFamily: FONTS.MEDIUM,
    marginBottom: 4,
    letterSpacing: -0.1,
    textAlign: 'center',
  },
  infoBoxValue: {
    fontSize: 16,
    fontFamily: FONTS.BOLD,
    letterSpacing: -0.15,
    textAlign: 'center',
  },
  infoBoxHeader: {
    flex: 0.45,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  infoBoxNumber: {
    flex: 0.55,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  milestoneItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 0,
  },
  milestoneItemClickable: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    minHeight: 48,
    justifyContent: 'flex-start',
  },
  completedMilestoneItem: {
    backgroundColor: "rgba(199, 199, 204, 0.1)", // Şeffaf gri arka plan
    borderWidth: 1,
    borderColor: "rgba(199, 199, 204, 0.2)",
  },
  iconContainer: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneContent: {
    flex: 1,
    flexDirection: "column",
    marginLeft: 8,
  },
  moodContainer: {
    marginTop: 4,
  },
  moodTagsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
    flexWrap: "wrap",
    backgroundColor: 'transparent',
  },
  moodTag: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: -3,
    marginBottom: 2,
    minWidth: 20,
    minHeight: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    zIndex: 1,
  },
  milestoneText: {
    fontFamily: FONTS.MEDIUM,
    fontSize: 13,
    color: "#1D1D1F", // Apple'ın koyu gri rengi
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  // Completed Stats Section
  completedStatsSection: {
    marginTop: 20, // Boşluk artırıldı
    paddingTop: 18, // Boşluk artırıldı
    borderTopWidth: 1,
    borderTopColor: 'rgba(199, 199, 204, 0.3)',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 12, // Satırlar arası boşluk artırıldı
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
  },
  statText: {
    fontSize: 12,
    fontFamily: FONTS.MEDIUM,
    color: "#636366",
    marginLeft: 6,
    letterSpacing: -0.1,
  },
});

// PropTypes validation
Card.propTypes = {
  title: PropTypes.string.isRequired,
  startDate: PropTypes.string.isRequired,
  endDate: PropTypes.string.isRequired,
  completed: PropTypes.bool,
  activeMilestones: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      title: PropTypes.string,
      completed: PropTypes.bool,
    })
  ),
  onMilestonePress: PropTypes.func,
  onPress: PropTypes.func,
  task: PropTypes.object,
};

Card.defaultProps = {
  completed: false,
  activeMilestones: [],
};