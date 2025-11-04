// components/MoodCalendar.js
import React, { useState, useMemo, useCallback, memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTasks } from '../hooks/useTaskContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getValidIconName } from '../utils/AIMoodPredictor';
import { getMilestoneColor } from '../utils/milestoneColors';

const { width } = Dimensions.get("window");
// Dinamik hücre genişliği hesaplama
// Ekran genişliği - (30*2 marginHorizontal + 16*2 containerPadding) / 7 gün
const AVAILABLE_WIDTH = width - (30 * 2) - (16 * 2);
const CELL_SIZE = Math.floor(AVAILABLE_WIDTH / 7);
const CELL_HEIGHT = 48; // More compact vertical spacing
const MILESTONE_DOT_SIZE = 6; // size of the milestone dot under day number

function MoodCalendar() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const tasks = useTasks();
  
  // Arka plan rengine göre kontrast renk hesapla (memoized)
  const getContrastColor = useCallback((backgroundColor) => {
    if (!backgroundColor) return theme.name === 'dark' ? '#FFFFFF' : '#000000';

    try {
      // Hex rengi RGB'ye çevir
      const hex = backgroundColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);

      // Luminance hesapla
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      // Kontrast renk döndür
      return luminance > 0.5 ? '#000000' : '#FFFFFF';
    } catch (e) {
      // fallback
      return theme.name === 'dark' ? '#FFFFFF' : '#000000';
    }
  }, [theme.name]);
  
  // Collect all journal entries from all tasks (memoized)
  const allEntries = useMemo(() => {
    const entries = [];
    try {
      tasks.forEach(task => {
        if (task && Array.isArray(task.journalEntries) && task.journalEntries.length > 0) {
          task.journalEntries.forEach(entry => {
            entries.push({
              ...entry,
              taskId: task.id,
              projectTitle: task.title
            });
          });
        }
      });
    } catch (e) {
      if (__DEV__) console.error('MoodCalendar: allEntries build error', e);
    }
    return entries;
  }, [tasks]);
  
  // Build a map of latest mood entry per date (memoized)
  const moodByDate = useMemo(() => {
    const map = Object.create(null);
    try {
      allEntries.forEach(entry => {
        if (!entry || !entry.createdAt) return;
        if (!(entry.mood || entry.moodIcon || entry.moodColor)) return;
        const d = new Date(entry.createdAt);
        const key = d.toDateString();
        const existing = map[key];
        if (!existing || new Date(entry.createdAt) > new Date(existing.createdAt)) {
          map[key] = {
            mood: entry.mood,
            moodIcon: entry.moodIcon,
            moodColor: entry.moodColor,
            createdAt: entry.createdAt
          };
        }
      });
    } catch (e) {
      if (__DEV__) console.error('MoodCalendar: moodByDate build error', e);
    }
    return map;
  }, [allEntries]);

  const getMoodForDate = useCallback((date) => {
    return moodByDate[date.toDateString()] || null;
  }, [moodByDate]);

  // Function to check if a date is within any active project's date range
  // Build project map for current month (memoized)
  const projectMap = useMemo(() => {
    const map = Object.create(null);
    try {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      tasks.forEach(project => {
        if (!project || project.completed || project.done || !project.startDate || !project.endDate) return;
        const rawStart = new Date(project.startDate);
        const rawEnd = new Date(project.endDate);
        rawStart.setHours(0,0,0,0);
        rawEnd.setHours(23,59,59,999);

        // Determine overlap with current month
        const start = rawStart < monthStart ? new Date(monthStart) : new Date(rawStart);
        const end = rawEnd > monthEnd ? new Date(monthEnd) : new Date(rawEnd);

        if (start > end) return;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const key = new Date(d).toDateString();
          const isStartDate = key === new Date(rawStart).toDateString();
          const isEndDate = key === new Date(rawEnd).toDateString();
          const isOverdue = new Date(key) > rawEnd; // unlikely here
          let statusColor = project.logoColor || project.color || '#4A90E2';
          if (new Date(key) > rawEnd) statusColor = '#F44336';
          map[key] = {
            projectTitle: project.title,
            projectColor: statusColor,
            isStartDate,
            isEndDate,
            isOverdue
          };
        }
      });
    } catch (e) {
      if (__DEV__) console.error('MoodCalendar: projectMap build error', e);
    }
    return map;
  }, [tasks, currentDate]);

  // legacy accessor removed — use projectMap directly for performance

  // Function to find a milestone for a specific date across active projects
  // Precompute milestones keyed by date (memoized)
  const milestoneMap = useMemo(() => {
    const map = Object.create(null);
    try {
      tasks.forEach(project => {
        if (!project || !Array.isArray(project.milestones)) return;
        project.milestones.forEach(milestone => {
          if (!milestone || !milestone.endDate) return;
          const key = new Date(milestone.endDate).toDateString();
          // prefer first match; if multiple milestones on same day, last one will override — acceptable
          map[key] = { milestone, project };
        });
      });
    } catch (e) {
      if (__DEV__) console.error('MoodCalendar: milestoneMap build error', e);
    }
    return map;
  }, [tasks]);

  // legacy accessor removed — use milestoneMap directly for performance

  // Get days in month and first day (memoized)
  const daysInMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(), [currentDate]);
  const firstDay = useMemo(() => {
    const day = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1;
  }, [currentDate]);

  // Navigate months
  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  // Render calendar
  const renderCalendar = () => {
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.emptyDay} />);
    }

    const todayKey = new Date().toDateString();

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayKey = dayDate.toDateString();
      const isToday = dayKey === todayKey;
      const moodData = moodByDate[dayKey];
      const projectData = projectMap[dayKey];
      const milestoneMatch = milestoneMap[dayKey];

      const todayIndicatorStyle = isToday ? {
        backgroundColor: theme.colors?.info || '#4A90E2',
        borderWidth: 2,
        borderColor: theme.colors?.info || '#4A90E2',
        shadowColor: theme.colors?.info || '#4A90E2',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 2,
      } : null;

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isToday && [styles.todayDay, todayIndicatorStyle],
            moodData && !isToday && styles.moodDay,
            projectData && styles.projectDay
          ]}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.dayText,
            { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' },
            isToday && [styles.todayText, { color: '#FFFFFF' }]
          ]}>
            {day}
          </Text>

          {moodData && (
            <View style={[
              styles.moodIndicator,
              {
                backgroundColor: moodData.moodColor || theme.colors.primary,
                borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                borderWidth: 0.8
              }
            ]}>
              <MaterialIcons
                name={getValidIconName(moodData.moodIcon || 'sentiment-neutral')}
                size={14}
                color={getContrastColor(moodData.moodColor || theme.colors.primary)}
              />
            </View>
          )}

          {milestoneMatch ? (
            <View style={[
              styles.milestoneDot,
              {
                backgroundColor: milestoneMatch.milestone.color || getMilestoneColor(milestoneMatch.milestone, theme.name === 'dark' ? 'dark' : 'light'),
                left: (CELL_SIZE / 2) - (MILESTONE_DOT_SIZE / 2),
                borderWidth: 0.6,
                borderColor: getContrastColor(milestoneMatch.milestone.color || getMilestoneColor(milestoneMatch.milestone, theme.name === 'dark' ? 'dark' : 'light')),
              }
            ]} />
          ) : (
            projectData && (projectData.isStartDate || projectData.isEndDate) && (
              <View style={[
                styles.milestoneDot,
                {
                  backgroundColor: projectData.projectColor,
                  left: (CELL_SIZE / 2) - (MILESTONE_DOT_SIZE / 2),
                  borderWidth: 0.6,
                  borderColor: getContrastColor(projectData.projectColor),
                }
              ]} />
            )
          )}
        </TouchableOpacity>
      );
    }

    return days;
  };

  // Memoize generated calendar days to avoid recreating elements unless relevant inputs change
  const calendarDays = useMemo(() => renderCalendar(), [daysInMonth, firstDay, moodByDate, projectMap, milestoneMap, currentDate, theme.name]);

  return (
    <View style={styles.outerContainer}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[
          styles.sectionTitle,
          { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
        ]}>{t('moodCalendar')}</Text>
        <View style={[
          styles.progressFlowIndicator,
          { backgroundColor: theme.name === 'dark' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.1)' }
        ]}>
          <MaterialIcons 
            name="calendar-today" 
            size={18} 
            color={theme.name === 'dark' ? '#4CAF50' : '#4CAF50'} 
          />
        </View>
      </View>

      {/* Calendar Card */}
      <View style={[
        styles.container,
        { backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF' }
      ]}>
        {/* Month Navigation Header */}
        <View style={[
          styles.header,
          { borderBottomColor: theme.name === 'dark' ? '#2C2C2E' : '#E0E0E0' }
        ]}>
          <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
            <MaterialIcons name="chevron-left" size={20} color={theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F'} />
          </TouchableOpacity>
          
          <Text style={[
            styles.monthYear,
            { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
          ]}>
            {currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
          </Text>
          
          <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
            <MaterialIcons name="chevron-right" size={20} color={theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F'} />
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={styles.dayHeaders}>
          {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, index) => (
            <View key={index} style={styles.dayHeaderContainer}>
              <Text style={[
                styles.dayHeader,
                { color: theme.name === 'dark' ? '#8E8E93' : '#666666' }
              ]}>
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {calendarDays}
        </View>
      </View>
    </View>
  );
}

MoodCalendar.displayName = 'MoodCalendar';
export default memo(MoodCalendar);

const styles = StyleSheet.create({
  outerContainer: {
    marginHorizontal: 30,
    marginTop: 16,
    marginBottom: 20,
  },
  // EmotionalJournalScreen için farklı margin gerekirse bu prop olarak alınabilir
  // Şu an MyDayScreen için: marginTop: 16
  // EmotionalJournalScreen için ise: marginTop: 40 olması gerekiyor
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
  container: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  navButton: {
    padding: 4,
    borderRadius: 6,
  },
  monthYear: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'capitalize',
  },
  dayHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayHeaderContainer: {
    width: CELL_SIZE,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayHeader: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emptyDay: {
    width: CELL_SIZE,
    height: CELL_HEIGHT,
    marginBottom: 2,
  },
  calendarDay: {
    width: CELL_SIZE,
    height: CELL_HEIGHT,
    justifyContent: 'flex-start', // day number aligned top
    alignItems: 'center',
    paddingTop: 8, // move day number slightly lower vertically
    position: 'relative',
    marginBottom: 2,
  },
  todayDay: {
    borderRadius: 8,
  },
  todayDayWithMood: {
    // Additional styling for today with mood
  },
  moodDay: {
    // Additional styling for days with mood
  },
  projectDay: {
    // Additional styling for days within project range
  },
  projectText: {
    fontFamily: 'Poppins_600SemiBold',
    overflow: 'hidden',
  },
  dayText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
  },
  todayText: {
    fontFamily: 'Poppins_600SemiBold',
  },
  moodIndicator: {
    position: 'absolute',
  bottom: 4, // slightly above the milestone underline
  right: 2, // closer to the corner
  width: 20,
  height: 20,
  borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    elevation: 1,
  },
  milestoneUnderline: {
    position: 'absolute',
    // removed - kept for backward compatibility placeholder (no visual use)
    bottom: 0,
    left: 8,
    right: 8,
    height: 3,
    borderRadius: 2,
    opacity: 0.0,
  },
  milestoneDot: {
    position: 'absolute',
    bottom: 2,
    width: MILESTONE_DOT_SIZE,
    height: MILESTONE_DOT_SIZE,
    borderRadius: MILESTONE_DOT_SIZE / 2,
    opacity: 0.95,
  },
});