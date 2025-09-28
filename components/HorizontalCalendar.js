// components/HorizontalCalendar.js
import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const HorizontalCalendar = ({ selectedDate, onDateSelect, tasksByDate = {}, milestones = [] }) => {
  const [currentWeek, setCurrentWeek] = useState(0);

  // 7 günlük tarihleri hesapla - bugünü ortaya hizala
  const weekDates = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    // Bugünü ortaya hizala (3 gün öncesi + bugün + 3 gün sonrası)
    startOfWeek.setDate(today.getDate() - 3 + (currentWeek * 7));
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentWeek]);

  // Tarih formatı
  const formatDate = (date) => {
    return date.getDate();
  };

  // Gün kısaltması
  const getDayAbbreviation = (date) => {
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    return days[date.getDay()];
  };

  // Bugün mü kontrolü
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Seçili tarih mi kontrolü
  const isSelected = (date) => {
    if (!selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };


  // Tarihte görev var mı kontrolü
  const hasTasks = (date) => {
    const dateString = date.toDateString();
    return tasksByDate[dateString] && tasksByDate[dateString].length > 0;
  };

  // O güne ait mood bilgisini bulan fonksiyon
  const getMoodForDate = (currentDate) => {
    for (const milestone of milestones) {
      if (!milestone.journalEntries || milestone.journalEntries.length === 0) {
        continue;
      }

      const entryForThisDate = milestone.journalEntries.find(entry => {
        const entryDate = new Date(entry.createdAt);
        return entryDate.toDateString() === currentDate.toDateString();
      });

      if (entryForThisDate && (entryForThisDate.mood || entryForThisDate.moodIcon || entryForThisDate.moodColor)) {
        return {
          icon: entryForThisDate.moodIcon || entryForThisDate.mood || 'sentiment-satisfied',
          color: entryForThisDate.moodColor || '#8E7DBE'
        };
      }
    }
    return null;
  };


  return (
    <View style={styles.container}>
      {/* Calendar Strip */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.calendarStrip}
        snapToInterval={340} // 5 günün toplam genişliği (5 × 68px) - 7 gün görünür ama 5 gün snap
        snapToAlignment="start"
        decelerationRate="fast"
        pagingEnabled={false}
      >
         {weekDates.map((date, index) => {
           const dayNumber = formatDate(date);
           const dayAbbr = getDayAbbreviation(date);
           const isTodayDate = isToday(date);
           const isSelectedDate = isSelected(date);
           const hasTasksForDate = hasTasks(date);
           const moodInfo = getMoodForDate(date);

           return (
             <TouchableOpacity
               key={index}
               style={[
                 styles.dayContainer,
                 isSelectedDate && styles.selectedContainer,
                 hasTasksForDate && styles.hasTasksContainer,
               ]}
               onPress={() => onDateSelect && onDateSelect(date)}
               accessible={true}
               accessibilityLabel={`${dayAbbr} ${dayNumber}`}
               accessibilityRole="button"
             >
               <Text style={[
                 styles.dayNumber,
                 isSelectedDate && styles.selectedNumber,
                 hasTasksForDate && styles.hasTasksNumber,
               ]}>
                 {dayNumber}
               </Text>
               <Text style={[
                 styles.dayAbbr,
                 isSelectedDate && styles.selectedAbbr,
                 hasTasksForDate && styles.hasTasksAbbr,
               ]}>
                 {dayAbbr}
               </Text>
               
               {/* Mood sticker */}
               {moodInfo && (
                 <View style={styles.moodTagContainer}>
                   <View style={[styles.moodTag, { backgroundColor: moodInfo.color }]}>
                     <MaterialIcons
                       name={moodInfo.icon}
                       size={10}
                       color="#333"
                     />
                   </View>
                 </View>
               )}
               
               {/* Task indicator dot */}
               {hasTasksForDate && !moodInfo && (
                 <View style={[
                   styles.taskDot,
                   isSelectedDate && styles.selectedTaskDot,
                 ]} />
               )}
             </TouchableOpacity>
           );
         })}
      </ScrollView>
    </View>
  );
};

export default HorizontalCalendar;

const styles = StyleSheet.create({
  container: {
    paddingTop: 5,
    paddingBottom: 0,
    paddingHorizontal: 20,
    width: '100%',
    backgroundColor: 'transparent',
  },
  calendarStrip: {
    paddingHorizontal: 4,
  },
  dayContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    minWidth: 60,
  },
  selectedContainer: {
    backgroundColor: "#4A90E2",
    elevation: 4,
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: "#4A90E2",
  },
  selectedNumber: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },
  selectedAbbr: {
    color: "#FFFFFF",
    fontFamily: "Poppins_500Medium",
  },
  selectedTaskDot: {
    backgroundColor: "#FFFFFF",
  },
  hasTasksContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.04)",
  },
  dayNumber: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#8E8E93",
    marginBottom: 2,
  },
  todayNumber: {
    color: "#FFFFFF",
  },
  hasTasksNumber: {
    color: "#1D1D1F",
  },
  dayAbbr: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    color: "#8E8E93",
  },
  todayAbbr: {
    color: "#FFFFFF",
  },
  hasTasksAbbr: {
    color: "#1D1D1F",
  },
  taskDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#007AFF",
    marginTop: 4,
  },
  moodTagContainer: {
    position: "absolute",
    bottom: 4,
    right: 4,
  },
  moodTag: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 16,
    minHeight: 16,
    elevation: 1,
  },
});
