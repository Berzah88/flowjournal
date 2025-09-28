// screens/MyDayScreen.js
import React, { useState, useRef, useMemo, useEffect, useCallback, memo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TextInput,
  ScrollView,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useActiveTasks, useTaskActions } from "../hooks/useTaskContext";
import { getMilestoneColor } from "../utils/milestoneColors";
import { usePerformanceMonitor } from "../hooks/usePerformanceMonitor";
import { ANIMATION_DURATIONS } from "../constants";
import LoadingSpinner from "../components/LoadingSpinner";
import ActiveProject from "./ActiveProject";
import AddMilestoneModal from "../components/AddMilestoneModal";
const { width } = Dimensions.get("window");

const MyDayScreen = memo(function MyDayScreen({ navigation }) {
  const activeTasks = useActiveTasks();
  const { addMilestone, updateMilestone, completeMilestone, addJournalEntry } = useTaskActions();
  
  // Performance monitoring (sadece development'ta) - geçici olarak devre dışı
  // usePerformanceMonitor('MyDayScreen');

  const [refreshing, setRefreshing] = useState(false);
  const [completingMilestones, setCompletingMilestones] = useState(new Set());
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [addMilestoneModalVisible, setAddMilestoneModalVisible] = useState(false);
  const [selectedProjectForMilestone, setSelectedProjectForMilestone] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());



  // Refresh fonksiyonu
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simüle edilmiş refresh - gerçek uygulamada API çağrısı olabilir
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);


  // Memoized handlers to prevent unnecessary re-renders
  const openCard = useCallback((card) => {
    setSelectedCard(card);
  }, []);
  
  const closeCard = useCallback(() => {
    setSelectedCard(null);
  }, []);

  const openMilestone = useCallback((milestone, project) => {
    console.log('openMilestone called with:', { milestone, project: project?.title });
    
    // Milestone'a tıklayınca direkt journal aç
    const milestoneData = {
      ...milestone,
      taskId: project.id,
      projectTitle: project.title,
      autoOpenJournal: true // Journal'ı otomatik aç
    };
    setSelectedMilestone(milestoneData);
  }, []);

  const handleMilestoneComplete = useCallback((milestone, project) => {
    if (milestone.completed) return;
    
    const milestoneKey = `${project.id}-${milestone.id}`;
    
    // Milestone'u completing state'e ekle
    setCompletingMilestones(prev => new Set([...prev, milestoneKey]));
    
    // 1.5 saniye sonra milestone'u tamamla ve completing state'den çıkar
    setTimeout(() => {
      try {
        completeMilestone(project.id, milestone.id);
        setCompletingMilestones(prev => {
          const newSet = new Set(prev);
          newSet.delete(milestoneKey);
          return newSet;
        });
      } catch (error) {
        // Hata durumunda completing state'i temizle
        setCompletingMilestones(prev => {
          const newSet = new Set(prev);
          newSet.delete(milestoneKey);
          return newSet;
        });
      }
    }, 1500);
  }, [completeMilestone]);

  // Milestone'ın bugün için uygun olup olmadığını kontrol et
  const isMilestoneActiveToday = useCallback((milestone, selectedDate) => {
    const today = new Date(selectedDate);
    today.setHours(0, 0, 0, 0); // Sadece tarih kısmını al
    
    // Başlangıç tarihi kontrolü
    if (milestone.startDate) {
      const milestoneStartDate = new Date(milestone.startDate);
      milestoneStartDate.setHours(0, 0, 0, 0);
      
      // Milestone henüz başlamamışsa gösterme
      if (milestoneStartDate > today) {
        return false;
      }
    }
    
    // Bitiş tarihi kontrolü
    if (milestone.endDate) {
      const milestoneEndDate = new Date(milestone.endDate);
      milestoneEndDate.setHours(23, 59, 59, 999); // Günün sonuna kadar
      
      // Milestone bitmişse gösterme
      if (milestoneEndDate < today) {
        return false;
      }
    }
    
    return true; // Başlangıç ve bitiş tarihleri arasında
  }, []);

  // Milestone'ın günü geçip geçmediğini kontrol et
  const isMilestoneOverdue = useCallback((milestone, selectedDate) => {
    if (!milestone.endDate) return false; // Bitiş tarihi yoksa günü geçmiş sayma
    
    const milestoneEndDate = new Date(milestone.endDate);
    const today = new Date(selectedDate);
    
    return milestoneEndDate < today;
  }, []);

  // Milestone'ın son günü olup olmadığını kontrol et
  const isMilestoneLastDay = useCallback((milestone, selectedDate) => {
    if (!milestone.endDate) return false; // Bitiş tarihi yoksa son gün değil
    
    const milestoneEndDate = new Date(milestone.endDate);
    const today = new Date(selectedDate);
    
    return milestoneEndDate.toDateString() === today.toDateString();
  }, []);

  const closeMilestone = useCallback(() => setSelectedMilestone(null), [setSelectedMilestone]);



  // Seçili tarihin string formatı
  const selectedDateString = selectedDate.toDateString();

  // Seçili tarihteki görevleri filtrele (tarih aralığına göre)
  const selectedDateActiveTasks = useMemo(() => {
     if (!activeTasks || activeTasks.length === 0) {
       return [];
     }
    
    const filtered = activeTasks.filter(task => {
      const startDate = new Date(task.startDate);
      const endDate = new Date(task.endDate);
      const selectedDateObj = new Date(selectedDate);
      
      // Tarih karşılaştırması için sadece tarih kısmını al (saat bilgisini kaldır)
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      selectedDateObj.setHours(0, 0, 0, 0);
      
      // Seçili tarih proje tarih aralığında mı kontrol et
      const isInRange = selectedDateObj >= startDate && selectedDateObj <= endDate;
      
      
      return isInRange;
    }).map(task => {
      // Son gününde olan projeleri işaretle
      const endDate = new Date(task.endDate);
      const selectedDateObj = new Date(selectedDate);
      
      endDate.setHours(0, 0, 0, 0);
      selectedDateObj.setHours(0, 0, 0, 0);
      
      const isLastDay = selectedDateObj.getTime() === endDate.getTime();
      
      return {
        ...task,
        isLastDay: isLastDay
      };
    });
    
    console.log('Filtered projects for date:', selectedDate.toDateString(), 'Count:', filtered.length);
    return filtered;
  }, [activeTasks, selectedDate]);

  // Bugünün özeti için milestone'ları hesapla - o gün aktif olan milestone'ları baz al
  const todaySummary = useMemo(() => {
    const totalMilestones = selectedDateActiveTasks.reduce((total, project) => {
      return total + (project.milestones?.filter(m => !m.completed && isMilestoneActiveToday(m, selectedDate)).length || 0);
    }, 0);

    const completedMilestones = selectedDateActiveTasks.reduce((total, project) => {
      return total + (project.milestones?.filter(m => m.completed && isMilestoneActiveToday(m, selectedDate)).length || 0);
    }, 0);

    const activeMilestones = totalMilestones;

    return {
      totalProjects: selectedDateActiveTasks.length,
      totalMilestones,
      completedMilestones,
      activeMilestones,
    };
  }, [selectedDateActiveTasks]);






  const keyExtractor = useCallback((item) => item.id.toString(), []);

  // Tarih bazında görevleri organize et (takvim için)
  const tasksByDate = useMemo(() => {
    const tasks = {};
    return tasks;
  }, [selectedDateString]);


  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
            colors={["#007AFF"]}
          />
        }
      >
        {/* Today's Summary Section */}
        <View style={styles.summaryContainer}>
        <Text style={styles.sectionTitle}>Today's Summary</Text>
        {selectedDateActiveTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#8E8E93" />
            <Text style={styles.emptyTitle}>Bu tarihte proje yok</Text>
            <Text style={styles.emptyText}>
              {(() => {
                const today = new Date();
                const selected = new Date(selectedDate);
                today.setHours(0, 0, 0, 0);
                selected.setHours(0, 0, 0, 0);
                
                if (selected < today) {
                  return "Bu tarihte proje yok";
                } else {
                  return "Seçili tarihte aktif proje bulunmuyor.\nYeni bir proje oluşturmak ister misin?";
                }
              })()}
            </Text>
            {(() => {
              const today = new Date();
              const selected = new Date(selectedDate);
              today.setHours(0, 0, 0, 0);
              selected.setHours(0, 0, 0, 0);
              
              // Sadece bugün veya gelecek tarihleri için buton göster
              if (selected >= today) {
                return (
                  <TouchableOpacity 
                    style={styles.addProjectButton}
                    onPress={onAddProject}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.addProjectButtonText}>Proje Ekle</Text>
                  </TouchableOpacity>
                );
              }
              return null;
            })()}
          </View>
        ) : (
          selectedDateActiveTasks.map((project) => (
            <TouchableOpacity 
              key={project.id} 
              style={[
              styles.projectSummaryCard,
              project.isLastDay && styles.lastDayProjectCard
              ]}
              onPress={() => setSelectedCard(project)}
              activeOpacity={0.7}
            >
              <View style={styles.projectHeader}>
                <Text style={[
                  styles.projectTitle,
                  project.isLastDay && styles.lastDayProjectTitle
                ]}>
                  {project.title}
                </Text>
                <View style={styles.dateContainer}>
                  <View style={[
                    styles.projectDateRange,
                    project.isLastDay && styles.lastDayDateRange
                  ]}>
                    <Text style={[
                      styles.dateText,
                      project.isLastDay && styles.lastDayDateText
                    ]}>
                      {new Date(project.startDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} - {new Date(project.endDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                    </Text>
                  </View>
                  {project.isLastDay && (
                    <View style={styles.lastDayBadge}>
                      <Ionicons name="warning" size={12} color="#FFFFFF" />
                      <Text style={styles.lastDayText}>Son Gün</Text>
                    </View>
                  )}
                </View>
              </View>
              
              {/* Tarih altında + sembolü */}
              <TouchableOpacity 
                style={styles.minimalAddMilestoneButton}
                onPress={() => {
                  console.log('Add milestone button pressed for project:', project.title);
                  setSelectedProjectForMilestone(project);
                  setAddMilestoneModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color="#007AFF" />
              </TouchableOpacity>
              
              {project.milestones && (project.milestones.filter(m => !m.completed && isMilestoneActiveToday(m, selectedDate)).length > 0 || project.milestones.some(m => completingMilestones.has(`${project.id}-${m.id}`))) ? (
                <View style={styles.milestonesList}>
                  {project.milestones.filter(m => (!m.completed && isMilestoneActiveToday(m, selectedDate)) || completingMilestones.has(`${project.id}-${m.id}`)).map((milestone, index) => {
                    const milestoneKey = `${project.id}-${milestone.id}`;
                    const isCompleting = completingMilestones.has(milestoneKey);
                    const isOverdue = isMilestoneOverdue(milestone, selectedDate);
                    const isLastDay = isMilestoneLastDay(milestone, selectedDate);
                    
                    return (
                    <TouchableOpacity 
                      key={milestone.id || index}
                      style={styles.milestoneItem}
                      onPress={() => openMilestone(milestone, project)}
                      onLongPress={() => {
                        if (!milestone.completed) {
                          handleMilestoneComplete(milestone, project);
                        }
                      }}
                      activeOpacity={0.7}
                      delayLongPress={500}
                    >
                      <View style={styles.milestoneInfo}>
                        <Ionicons 
                          name="ellipse" 
                          size={18} 
                          color={getMilestoneColor(milestone)} 
                        />
                        <View style={styles.milestoneContent}>
                          <View style={styles.milestoneTextContainer}>
                            <Text style={[
                              styles.milestoneText,
                              milestone.completed && styles.completedMilestoneText,
                              isCompleting && styles.completingMilestoneText,
                              isOverdue && styles.overdueMilestoneText,
                              isLastDay && styles.lastDayMilestoneText
                            ]}>
                              {milestone.title}
                            </Text>
                          </View>
                          {/* Mood sticker - sadece seçili güne ait */}
                          {milestone.journalEntries && milestone.journalEntries.length > 0 && (
                            <View style={styles.moodStickers}>
                              {milestone.journalEntries
                                .filter(entry => {
                                  // Sadece seçili güne ait mood'ları göster
                                  const entryDate = new Date(entry.createdAt).toDateString();
                                  const selectedDateStr = selectedDate.toDateString();
                                  return entryDate === selectedDateStr && (entry.mood || entry.moodIcon || entry.moodColor);
                                })
                                .slice(0, 3) // Maksimum 3 mood sticker
                                .map((entry, index) => (
                                  <View 
                                    key={index} 
                                    style={[
                                      styles.moodSticker, 
                                      { backgroundColor: entry.moodColor || '#8E7DBE' }
                                    ]}
                                  >
                                  <MaterialIcons
                                    name={entry.moodIcon || entry.mood || 'sentiment-satisfied'}
                                    size={10}
                                    color="#333"
                                  />
                                  </View>
                                ))
                              }
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.addMilestoneButton}
                  onPress={() => {
                    console.log('Add milestone button pressed for project:', project.title);
                    setSelectedProjectForMilestone(project);
                    setAddMilestoneModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={16} color="#007AFF" />
                  <Text style={styles.addMilestoneText}>Add milestone</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}

      </View>
      </ScrollView>


    </View>
  );
});

export default MyDayScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  progressContainer: {
    marginTop: 20,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1D1D1F',
    marginLeft: 6,
  },
  progressBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#E0F2FE',
  },
  progressPercentage: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: '#007AFF',
  },
  progressBarContainer: {
    marginBottom: 12,
    marginHorizontal: -4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
    borderRadius: 3,
  },
  progressStats: {
    marginTop: 0,
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStatDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#34C759',
    marginRight: 5,
  },
  progressStatLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#8E8E93',
    marginRight: 3,
  },
  progressStatValue: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1D1D1F',
  },
  summaryContainer: {
    marginHorizontal: 30,
    marginTop: 16,
  },
  emptyState: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 32,
    marginTop: 12,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1D1D1F',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  addProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addProjectButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  projectSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    marginHorizontal: 2,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  projectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  projectTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1D1D1F',
    flex: 1,
  },
  projectDateRange: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#8E8E93',
  },
  milestonesList: {
    marginTop: 8,
    marginLeft: 16,
  },
  milestoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  milestoneInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  milestoneContent: {
    flex: 1,
    marginLeft: 12,
  },
  milestoneText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  completedMilestoneText: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
  },
  milestoneTextContainer: {
    position: 'relative',
    flex: 1,
  },
  completingMilestoneText: {
    color: '#8E8E93',
    opacity: 0.7,
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    textDecorationColor: '#8E8E93',
  },
  journalCount: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  journalCountText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#007AFF',
  },
  moodStickers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  moodSticker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 20,
    minHeight: 20,
    marginRight: 4,
    elevation: 1,
  },
  noMilestonesText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#8E8E93',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  overdueMilestoneText: {
    color: '#FF3B30',
  },
  lastDayMilestoneText: {
    color: '#FF9500',
  },
  addMilestoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  addMilestoneText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#007AFF',
    marginLeft: 6,
  },
  minimalAddMilestoneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 122, 255, 0.2)',
    alignSelf: 'flex-end',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#1D1D1F",
    marginBottom: 0,
  },
  // Son gününde olan projeler için özel style'lar
  lastDayProjectCard: {
    borderColor: '#8E7DBE',
    borderWidth: 1.5,
    backgroundColor: '#F8F6FF',
  },
  lastDayProjectTitle: {
    color: '#8E7DBE',
  },
  lastDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8E7DBE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
  },
  lastDayText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  lastDayDateRange: {
    backgroundColor: '#F0EDFF',
    borderColor: '#8E7DBE',
    borderWidth: 0.5,
  },
  lastDayDateText: {
    color: '#8E7DBE',
  },
});
