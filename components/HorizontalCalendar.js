// components/HorizontalCalendar.js
import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

const HorizontalCalendar = ({ selectedDate, onDateSelect, tasksByDate = {}, milestones = [] }) => {
  const [currentWeek, setCurrentWeek] = useState(0);
  const { theme } = useTheme();
  const { t, language } = useLanguage();

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
    const dayAbbreviations = t('dayAbbreviations');
    return dayAbbreviations[date.getDay()];
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
        snapToInterval={68} // Tek günün genişliği (68px)
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
                 {
                   backgroundColor: theme.name === 'dark' ? 'transparent' : 'transparent',
                 },
                 isSelectedDate && {
                   backgroundColor: theme.name === 'dark' ? '#FF6B6B' : '#4A90E2',
                   elevation: 4,
                   shadowColor: theme.name === 'dark' ? '#FF6B6B' : '#4A90E2',
                   shadowOffset: { width: 0, height: 4 },
                   shadowOpacity: 0.3,
                   shadowRadius: 8,
                   borderWidth: 2,
                   borderColor: theme.name === 'dark' ? '#FF6B6B' : '#4A90E2',
                 },
                 hasTasksForDate && {
                   backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                 },
               ]}
               onPress={() => onDateSelect && onDateSelect(date)}
               accessible={true}
               accessibilityLabel={`${dayAbbr} ${dayNumber}`}
               accessibilityRole="button"
             >
               <Text style={[
                 styles.dayNumber,
                 {
                   color: theme.name === 'dark' ? '#D1D5DB' : '#8E8E93',
                 },
                 isSelectedDate && {
                   color: '#FFFFFF',
                   fontFamily: 'Poppins_600SemiBold',
                 },
                 hasTasksForDate && {
                   color: theme.name === 'dark' ? '#F9FAFB' : '#1D1D1F',
                 },
               ]}>
                 {dayNumber}
               </Text>
               <Text style={[
                 styles.dayAbbr,
                 {
                   color: theme.name === 'dark' ? '#D1D5DB' : '#8E8E93',
                 },
                 isSelectedDate && {
                   color: '#FFFFFF',
                   fontFamily: 'Poppins_500Medium',
                 },
                 hasTasksForDate && {
                   color: theme.name === 'dark' ? '#F9FAFB' : '#1D1D1F',
                 },
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
                   {
                     backgroundColor: theme.name === 'dark' ? '#4A90E2' : '#007AFF',
                   },
                   isSelectedDate && {
                     backgroundColor: '#FFFFFF',
                   },
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
    paddingTop: 8, // 0'dan 8'e çıkardım - biraz padding top
    paddingBottom: 0,
    paddingHorizontal: 16, // 20'den 16'ya düşürdüm
    marginBottom: 20, // Horizontal calendar margin bottom
    width: '100%',
    backgroundColor: 'transparent',
  },
  calendarStrip: {
    paddingHorizontal: 2, // 4'ten 2'ye düşürdüm - daha kompakt
  },
  dayContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4, // 6'dan 4'e düşürdüm - daha da kompakt
    paddingHorizontal: 12, // 16'dan 12'ye düşürdüm
    marginHorizontal: 10, // 8'den 10'a çıkardım - günler arası boşluğu daha da artırdım
    borderRadius: 10, // 12'den 10'a düşürdüm
    minWidth: 45, // 55'ten 45'e düşürdüm - mavi seçiciyi daraltım
  },
  dayNumber: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 2,
  },
  dayAbbr: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    marginTop: -4, // -2'den -4'e düşürdüm - daha da yakınlaştırdım
  },
  taskDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
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
