// components/MoodCalendar.js
import React, { useState } from "react";
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

export default function MoodCalendar() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const tasks = useTasks();
  
  // Arka plan rengine göre kontrast renk hesapla
  const getContrastColor = (backgroundColor) => {
    if (!backgroundColor) return theme.name === 'dark' ? '#FFFFFF' : '#000000';
    
    // Hex rengi RGB'ye çevir
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Luminance hesapla
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Kontrast renk döndür
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };
  
  // Collect all journal entries from all tasks
  const getAllJournalEntries = () => {
    const allEntries = [];
    tasks.forEach(task => {
      if (task.journalEntries) {
        task.journalEntries.forEach(entry => {
          allEntries.push({
            ...entry,
            taskId: task.id,
            projectTitle: task.title
          });
        });
      }
    });
    return allEntries;
  };
  
  // Function to find mood for a specific date
  const getMoodForDate = (currentDate) => {
    const allEntries = getAllJournalEntries();
    
    // Find journal entries written on that day
    const entriesForThisDate = allEntries.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      return entryDate.toDateString() === currentDate.toDateString();
    });

    // Find entries with mood information
    const moodEntries = entriesForThisDate.filter(entry => entry.mood || entry.moodIcon || entry.moodColor);
    
    if (moodEntries.length > 0) {
      // EN SON yazılan günlüğü kullan (createdAt'e göre sırala ve en sonuncuyu al)
      const sortedMoodEntries = moodEntries.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      const latestMoodEntry = sortedMoodEntries[0];
      
      return {
        mood: latestMoodEntry.mood,
        moodIcon: latestMoodEntry.moodIcon,
        moodColor: latestMoodEntry.moodColor,
        hasEntry: true
      };
    }
    
    return null;
  };

  // Function to check if a date is within any active project's date range
  const getProjectForDate = (currentDate) => {
    // Get all projects that are not completed
    const activeProjects = tasks.filter(task => 
      !task.completed && 
      !task.done &&
      task.startDate && 
      task.endDate
    );
    
    for (const project of activeProjects) {
      const startDate = new Date(project.startDate);
      const endDate = new Date(project.endDate);
      
      // Set time to start/end of day for proper comparison
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      const checkDate = new Date(currentDate);
      checkDate.setHours(0, 0, 0, 0);
      
      if (checkDate >= startDate && checkDate <= endDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Determine project status color
        // Prefer an explicit logoColor (e.g., project.logoColor) if provided, otherwise fall back to project.color
        let statusColor = project.logoColor || project.color || '#4A90E2';

        // If the project is overdue, mark as red for visibility
        if (checkDate > endDate) {
          statusColor = '#F44336';
        }
        
        return {
          projectTitle: project.title,
          projectColor: statusColor,
          isStartDate: checkDate.toDateString() === startDate.toDateString(),
          isEndDate: checkDate.toDateString() === endDate.toDateString(),
          isOverdue: checkDate > endDate
        };
      }
    }
    
    return null;
  };

  // Function to find a milestone for a specific date across active projects
  const getMilestoneForDate = (currentDate) => {
    const activeProjects = tasks.filter(task => task.milestones && task.milestones.length > 0);

    for (const project of activeProjects) {
      for (const milestone of project.milestones) {
        if (!milestone || !milestone.endDate) continue;

        const msDate = new Date(milestone.endDate);
        msDate.setHours(0, 0, 0, 0);
        const checkDate = new Date(currentDate);
        checkDate.setHours(0, 0, 0, 0);

        if (msDate.toDateString() === checkDate.toDateString()) {
          return { milestone, project };
        }
      }
    }

    return null;
  };

  // Get days in month
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Get first day of month (Monday = 0, Sunday = 6)
  const getFirstDayOfMonth = (date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    // Convert Sunday (0) to 6, Monday (1) to 0, etc.
    return day === 0 ? 6 : day - 1;
  };

  // Navigate months
  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  // Render calendar
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.emptyDay} />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isToday = dayDate.toDateString() === new Date().toDateString();
  const moodData = getMoodForDate(dayDate);
  const projectData = getProjectForDate(dayDate);
  const milestoneMatch = getMilestoneForDate(dayDate);
      
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isToday && [
              styles.todayDay,
              (() => {
                // Use the theme info color (blue) as a solid today indicator to match HorizontalCalendar
                const indicator = theme.colors?.info || '#4A90E2';
                return {
                  backgroundColor: indicator,
                  borderWidth: 2,
                  borderColor: indicator,
                  shadowColor: indicator,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.12,
                  shadowRadius: 6,
                  elevation: 2,
                };
              })()
            ],
            moodData && !isToday && styles.moodDay,
            projectData && [
              styles.projectDay
            ]
          ]}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.dayText,
            { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' },
            isToday && [
              styles.todayText,
              {
                color: '#FFFFFF'
              }
            ],
            // project text decoration removed; milestones shown as underline instead
          ]}>
            {day}
          </Text>
          
          
          {/* Mood indicator (increased size) */}
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

          {/* Milestone dot: prefer milestone's own color if a milestone exists for this date */}
          {milestoneMatch ? (
            (() => {
              const ms = milestoneMatch.milestone;
              const msColor = ms.color || getMilestoneColor(ms, theme.name === 'dark' ? 'dark' : 'light');
              return (
                <View style={[
                  styles.milestoneDot,
                  {
                    backgroundColor: msColor,
                    left: (CELL_SIZE / 2) - (MILESTONE_DOT_SIZE / 2),
                    borderWidth: 0.6,
                    borderColor: getContrastColor(msColor),
                  }
                ]} />
              );
            })()
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
          {renderCalendar()}
        </View>
      </View>
    </View>
  );
}

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