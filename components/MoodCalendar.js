// components/MoodCalendar.js
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTasks } from '../hooks/useTaskContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getValidIconName } from '../utils/AIMoodPredictor';

const { width } = Dimensions.get("window");
const CELL_SIZE = 40; // Fixed size for all cells
const CELL_HEIGHT = 52; // Taller cells for better mood indicator visibility

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

    // Find entry with mood information
    const moodEntry = entriesForThisDate.find(entry => entry.mood || entry.moodIcon || entry.moodColor);
    
    if (moodEntry) {
      return {
        mood: moodEntry.mood,
        moodIcon: moodEntry.moodIcon,
        moodColor: moodEntry.moodColor,
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
        let statusColor = project.color || '#4A90E2';
        
        if (checkDate.toDateString() === endDate.toDateString()) {
          // Last day of project - purple
          statusColor = '#9C27B0';
        } else if (checkDate > endDate) {
          // Project is overdue - red
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
      
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isToday && [
              styles.todayDay,
              { 
                backgroundColor: theme.name === 'dark' 
                  ? 'rgba(255, 59, 48, 0.3)' // Karanlık modda kırmızı
                  : theme.colors.primary + '20' // Açık modda tema rengi
              }
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
                color: theme.name === 'dark' 
                  ? '#FF3B30' // Karanlık modda kırmızı
                  : theme.colors.primary // Açık modda tema rengi
              }
            ],
            projectData && !isToday && [
              styles.projectText,
              { 
                color: projectData.projectColor,
                borderWidth: 1.5,
                borderColor: projectData.projectColor,
                borderRadius: 6,
                paddingHorizontal: 4,
                paddingVertical: 1,
                fontSize: 10,
                minWidth: 18,
                textAlign: 'center'
              }
            ]
          ]}>
            {day}
          </Text>
          
          
          {/* Mood indicator */}
          {moodData && (
            <View style={[
              styles.moodIndicator,
              { 
                backgroundColor: moodData.moodColor || theme.colors.primary,
                borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                borderWidth: 1.2
              }
            ]}>
              <MaterialIcons 
                name={getValidIconName(moodData.moodIcon || 'sentiment-neutral')} 
                size={12} 
                color={getContrastColor(moodData.moodColor || theme.colors.primary)}
              />
            </View>
          )}
        </TouchableOpacity>
      );
    }
    
    return days;
  };

  return (
    <View style={[
      styles.container,
      { backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF' }
    ]}>
      {/* Header */}
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
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    marginBottom: 8,
  },
  dayHeaderContainer: {
    width: CELL_SIZE,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayHeader: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyDay: {
    width: CELL_SIZE,
    height: CELL_HEIGHT,
    marginBottom: 4,
  },
  calendarDay: {
    width: CELL_SIZE,
    height: CELL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 4,
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
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
  },
  todayText: {
    fontFamily: 'Poppins_600SemiBold',
  },
  moodIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
});