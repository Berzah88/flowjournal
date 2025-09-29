// components/ProjectCalendar.js
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { getMilestoneColor } from '../utils/milestoneColors';
import { useTasks } from '../hooks/useTaskContext';

const { width } = Dimensions.get("window");
const CELL_SIZE = (width - 40) / 7; // Equal width for 7 days
const CELL_HEIGHT = CELL_SIZE + 10; // Reduce cell height

export default function ProjectCalendar({ milestones = [], projectStartDate, projectEndDate }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const tasks = useTasks(); // Get all tasks
  
  // Collect all journal entries from all tasks
  const getAllJournalEntries = () => {
    const allEntries = [];
    tasks.forEach(task => {
      if (task.milestones) {
        task.milestones.forEach(milestone => {
          if (milestone.journalEntries) {
            milestone.journalEntries.forEach(entry => {
              allEntries.push({
                ...entry,
                taskId: task.id,
                milestoneId: milestone.id,
                projectTitle: task.title
              });
            });
          }
        });
      }
    });
    return allEntries;
  };
  
  // Function to find journal entry written on that day - FROM ALL PROJECTS
  const getJournalEntryForDate = (currentDate) => {
    const allEntries = getAllJournalEntries();
    
    // Find journal entries written on that day
    const entriesForThisDate = allEntries.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      return entryDate.toDateString() === currentDate.toDateString();
    });

    // Find entry with mood information (priority)
    const moodEntry = entriesForThisDate.find(entry => entry.mood || entry.moodIcon || entry.moodColor);
    
    if (moodEntry) {
      return moodEntry;
    }

    // If no mood information, return first entry
    return entriesForThisDate[0] || null;
  };
  
  // Color system is now managed from utils/milestoneColors.js

  // Function to shorten milestone name
  const getShortMilestoneTitle = (title, index) => {
    if (!title) return `M${index + 1}`;
    
    // If title is too long, shorten it
    if (title.length > 12) {
      return title.substring(0, 12) + "...";
    }
    
    return title;
  };

  // Ayın günlerini oluştur
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Pazar, 1 = Pazartesi, ...

    const days = [];
    
    // Önceki ayın son günlerini ekle (boş hücreler için)
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Bu ayın günlerini ekle
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  // Tüm task'lardan tüm milestone'ları topla
  const getAllMilestones = () => {
    const allMilestones = [];
    tasks.forEach(task => {
      if (task.milestones) {
        task.milestones.forEach(milestone => {
          allMilestones.push({
            ...milestone,
            taskId: task.id,
            projectTitle: task.title
          });
        });
      }
    });
    return allMilestones;
  };

  // Belirli bir tarihte milestone var mı kontrol et - TÜM PROJELERDEN
  const getMilestonesForDate = (date) => {
    if (!date) return [];
    
    const allMilestones = getAllMilestones();
    
    return allMilestones.filter(milestone => {
      const startDate = new Date(milestone.startDate);
      const endDate = new Date(milestone.endDate);
      
      // Tarih aralığında mı kontrol et
      return date >= startDate && date <= endDate;
    }).sort((a, b) => {
      // En son eklenen milestone'u ilk sıraya koy (ID'ye göre)
      return parseInt(b.id) - parseInt(a.id);
    });
  };

  // Gün arkaplan rengini belirle
  const getDayBackgroundColor = (date) => {
    if (!date) return "transparent";
    
    // Bugün ise RGB(255, 0, 127)
    const isToday = date.toDateString() === new Date().toDateString();
    if (isToday) return "#FF007F";
    
    const dayMilestones = getMilestonesForDate(date);
    if (dayMilestones.length === 0) return "transparent";
    
    // Öncelik sırası: 1) Aktif milestone'lar, 2) En yeni milestone
    const activeMilestones = dayMilestones.filter(m => !m.completed);
    if (activeMilestones.length > 0) {
      // Aktif milestone'lar varsa, en yeni aktif milestone'un rengini kullan
      return getMilestoneColor(activeMilestones[0]);
    } else {
      // Sadece completed milestone'lar varsa, en yeni completed milestone'un rengini kullan
      return getMilestoneColor(dayMilestones[0]);
    }
  };

  // Tarih formatı
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  // Ay değiştirme
  const changeMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{formatDate(currentDate)}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Hafta günleri */}
      <View style={styles.weekDaysRow}>
        {weekDays.map(day => (
          <View key={day} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Takvim grid */}
      <View style={styles.calendarGrid}>
        {days.map((date, index) => {
          const dayMilestones = getMilestonesForDate(date);
          const isToday = date && date.toDateString() === new Date().toDateString();
          const dayBackgroundColor = getDayBackgroundColor(date);
          
          // Inside border için milestone rengini belirle - basitleştirilmiş
          const getInsideBorderColor = () => {
            if (isToday) return "#FF007F"; // Bugün için özel renk
            if (dayMilestones.length === 0) return "transparent";
            
            // Öncelik sırası: 1) Aktif milestone'lar, 2) En yeni milestone
            const activeMilestones = dayMilestones.filter(m => !m.completed);
            const targetMilestone = activeMilestones.length > 0 ? activeMilestones[0] : dayMilestones[0];
            return getMilestoneColor(targetMilestone);
          };
          
          const insideBorderColor = getInsideBorderColor();
          
          return (
            <View key={index} style={[
              styles.calendarCell,
              { 
                backgroundColor: isToday ? dayBackgroundColor : "transparent",
                borderRadius: isToday ? 8 : 0,
                elevation: isToday ? 2 : 0
              }
            ]}>
              {date && (
                <>
                    <Text style={[
                      styles.dayText,
                      isToday && styles.todayText,
                      insideBorderColor !== "transparent" && {
                        borderColor: insideBorderColor,
                        borderWidth: 2,
                        backgroundColor: insideBorderColor + "20"
                      }
                    ]}>
                    {date.getDate()}
                  </Text>
                  
                  {/* Milestone işaretleri */}
                  <View style={styles.milestoneIndicators}>
                    {dayMilestones.slice(0, 3).map((milestone, idx) => (
                      <View
                        key={milestone.id}
                        style={[
                          styles.milestoneIndicator,
                          { backgroundColor: getMilestoneColor(milestone) }
                        ]}
                      />
                    ))}
                    {dayMilestones.length > 3 && (
                      <Text style={styles.moreText}>+{dayMilestones.length - 3}</Text>
                    )}
                  </View>
                  
                  {/* Mood tag - Sağ alt köşe */}
                  {(() => {
                    const journalEntry = getJournalEntryForDate(date);
                    
                    if (!journalEntry || (!journalEntry.mood && !journalEntry.moodIcon && !journalEntry.moodColor)) {
                      return null;
                    }
                    
                    const iconName = journalEntry.moodIcon || journalEntry.mood || 'sentiment-satisfied';
                    const backgroundColor = journalEntry.moodColor || '#8E7DBE';
                    
                    return (
                      <View style={styles.moodTagContainer}>
                        <View style={[styles.moodTag, { backgroundColor }]}>
                          <MaterialIcons
                            name={iconName}
                            size={10}
                            color="#333"
                          />
                        </View>
                      </View>
                    );
                  })()}
                </>
              )}
            </View>
          );
        })}
      </View>

      {/* Milestone legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Milestone Types</Text>
        
        {/* Aktif milestone'lar - TÜM PROJELERDEN */}
        {(() => {
          const allMilestones = getAllMilestones();
          const activeMilestones = allMilestones.filter(milestone => !milestone.completed);
          
          return activeMilestones.length > 0 && (
            <View style={styles.legendSection}>
              <View style={styles.legendGrid}>
                {activeMilestones
                  .map((milestone, index) => (
                    <View key={milestone.id} style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: getMilestoneColor(milestone) }]} />
                      <Text style={styles.legendText} numberOfLines={1}>
                        {getShortMilestoneTitle(milestone.title, index)}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          );
        })()}

        {/* Completed milestone'lar - TÜM PROJELERDEN */}
        {(() => {
          const allMilestones = getAllMilestones();
          const completedMilestones = allMilestones.filter(milestone => milestone.completed);
          
          return completedMilestones.length > 0 && (
            <View style={styles.legendSection}>
              <Text style={styles.legendSectionTitle}>Completed</Text>
              <View style={styles.legendGrid}>
                {completedMilestones
                  .map((milestone, index) => (
                    <View key={milestone.id} style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: "#BFBFBF" }]} />
                      <Text style={styles.legendText} numberOfLines={1}>
                        {getShortMilestoneTitle(milestone.title, index)}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          );
        })()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  navButtonText: {
    fontSize: 20,
    color: "#7f8c8d",
    fontFamily: "Poppins_700Bold",
  },
  monthTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    color: "#2c3e50",
    letterSpacing: -0.3,
  },
  weekDaysRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  weekDayCell: {
    width: CELL_SIZE,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  weekDayText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: "#7f8c8d",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    width: CELL_SIZE,
    height: CELL_HEIGHT,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 3,
  },
  dayText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: "#333",
    marginBottom: 2,
    borderWidth: 0,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 3,
    textAlign: "center",
    width: 28,
    height: 36,
  },
  todayText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
  },
  dayTextWithBackground: {
    color: "#333",
    fontWeight: "600",
  },
  milestoneIndicators: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 2,
  },
  milestoneIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 1,
    marginVertical: 1,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.1)",
  },
  moreText: {
    fontSize: 8,
    color: "#666",
    fontFamily: "Poppins_500Medium",
  },
  legend: {
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  legendTitle: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: "#2c3e50",
    marginBottom: 12,
  },
  legendSection: {
    marginBottom: 16,
  },
  legendSectionTitle: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: "#34495e",
    marginBottom: 8,
  },
  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    width: "48%",
    paddingRight: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#7f8c8d",
  },
  moodTagContainer: {
    position: "absolute",
    bottom: 2,
    right: 2,
  },
  moodTag: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 16,
    minHeight: 16,
    elevation: 2,
  },
});
