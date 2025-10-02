// screens/CompletedProjectsScreen.js
import React, { useState, useRef, useMemo, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useCompletedTasks, useTaskActions } from "../hooks/useTaskContext";
import { usePerformanceMonitor } from "../hooks/usePerformanceMonitor";
import { SWIPE_THRESHOLDS, ANIMATION_DURATIONS } from "../constants";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import Card from "../components/Card";
import CompletedActiveProject from "./CompletedActiveProject";
import LoadingSpinner from "../components/LoadingSpinner";

const { width } = Dimensions.get("window");

const CompletedProjectsScreen = memo(function CompletedProjectsScreen({ navigation }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const completedTasks = useCompletedTasks();
  const { deleteTask, completeTask, addMilestone, updateMilestone, completeMilestone, setActiveMilestone, deleteMilestone, updateTask } = useTaskActions();
  
  // Performance monitoring (sadece development'ta) - geçici olarak devre dışı
  // usePerformanceMonitor('CompletedProjectsScreen');

  const [selectedCard, setSelectedCard] = useState(null);

  // Memoized handlers to prevent unnecessary re-renders
  const openCard = useCallback((card) => setSelectedCard(card), []);
  const closeCard = useCallback(() => setSelectedCard(null), []);



  // Memoized render functions for FlatList
  const renderCompletedItem = useCallback(({ item }) => (
    <Card
      title={item.title}
      startDate={item.startDate}
      endDate={item.endDate}
      completed={item.done}
      activeMilestones={item.milestones ?? []}
      onMilestonePress={null} // Completed cards don't allow milestone taps
      onPress={() => openCard(item)}
      style={{ marginBottom: 15 }}
    />
  ), [openCard]);

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  // Memoized data arrays with content-based dependencies
  const completedTasksReversed = useMemo(() => {
    return [...completedTasks].reverse();
  }, [completedTasks.length, completedTasks.map(t => `${t.id}-${t.title}-${t.done}-${t.milestones?.length || 0}-${t.milestones?.map(m => `${m.id}-${m.title}-${m.completed}-${m.journalEntries?.length || 0}-${m.journalEntries?.map(e => `${e.id}-${e.mood}-${e.moodIcon}-${e.moodColor}`).join(',') || ''}`).join(',') || ''}`).join(',')]);

  // Additional safety check
  if (!completedTasksReversed) {
    return <LoadingSpinner />;
  }

  return (
    <LinearGradient
      colors={theme.name === 'dark' 
        ? ['#1C1C1E', '#1A1A1A', '#000000'] 
        : ['#F0F0F0', '#E8E8E8']}
      start={{ x: 0, y: 1 }}
      end={{ x: 0, y: 0 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={[
            styles.backButton,
            {
              backgroundColor: theme.name === 'dark' ? '#1C1C1E' : 'rgba(255, 255, 255, 0.8)',
              borderColor: theme.name === 'dark' ? '#000000' : 'rgba(0, 0, 0, 0.05)',
              shadowColor: theme.name === 'dark' ? '#000000' : '#000',
              shadowOpacity: theme.name === 'dark' ? 0.3 : 0.1,
              shadowRadius: theme.name === 'dark' ? 12 : 8,
              elevation: theme.name === 'dark' ? 8 : 3,
            }
          ]}
          onPress={() => navigation.goBack()}
          accessible={true}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons 
            name="arrow-back" 
            size={28} 
            color={theme.name === 'dark' ? '#FF6B6B' : '#1D1D1F'} 
          />
        </TouchableOpacity>
        
        <Text style={[
          styles.headerTitle,
          { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
        ]}>{t('completedProjects')}</Text>
        
        <View style={styles.headerSpacer} />
      </View>

      {/* Compact Statistics */}
      {completedTasksReversed.length > 0 && (
        <View style={[
          styles.compactStats,
          {
            backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(142, 142, 147, 0.08)',
          }
        ]}>
          <View style={styles.compactStatColumn}>
            <View style={styles.compactStatItem}>
              <Ionicons 
                name="checkmark-circle" 
                size={14} 
                color={theme.name === 'dark' ? '#8E8E93' : '#8E8E93'} 
              />
              <Text style={[
                styles.compactStatText,
                { color: theme.name === 'dark' ? '#FFFFFF' : '#636366' }
              ]}>{completedTasksReversed.length}</Text>
            </View>
            <Text style={[
              styles.compactStatLabel,
              { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
            ]}>Projects</Text>
          </View>
          
          <View style={styles.compactStatColumn}>
            <View style={styles.compactStatItem}>
              <Ionicons 
                name="flag" 
                size={14} 
                color={theme.name === 'dark' ? '#8E8E93' : '#8E8E93'} 
              />
              <Text style={[
                styles.compactStatText,
                { color: theme.name === 'dark' ? '#FFFFFF' : '#636366' }
              ]}>
                {completedTasksReversed.reduce((total, task) => 
                  total + (task.milestones?.filter(m => m.completed).length || 0), 0
                )}
              </Text>
            </View>
            <Text style={[
              styles.compactStatLabel,
              { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
            ]}>Milestones</Text>
          </View>
          
          <View style={styles.compactStatColumn}>
            <View style={styles.compactStatItem}>
              <Ionicons 
                name="journal" 
                size={14} 
                color={theme.name === 'dark' ? '#8E8E93' : '#8E8E93'} 
              />
              <Text style={[
                styles.compactStatText,
                { color: theme.name === 'dark' ? '#FFFFFF' : '#636366' }
              ]}>
                {completedTasksReversed.reduce((total, task) => 
                  total + (task.milestones?.reduce((milestoneTotal, milestone) => 
                    milestoneTotal + (milestone.journalEntries?.length || 0), 0
                  ) || 0), 0
                )}
              </Text>
            </View>
            <Text style={[
              styles.compactStatLabel,
              { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
            ]}>Entries</Text>
          </View>
          
          <View style={styles.compactStatColumn}>
            <View style={styles.compactStatItem}>
              <Ionicons 
                name="create" 
                size={14} 
                color={theme.name === 'dark' ? '#8E8E93' : '#8E8E93'} 
              />
              <Text style={[
                styles.compactStatText,
                { color: theme.name === 'dark' ? '#FFFFFF' : '#636366' }
              ]}>
                {(() => {
                  const totalWords = completedTasksReversed.reduce((total, task) => 
                    total + (task.milestones?.reduce((milestoneTotal, milestone) => 
                      milestoneTotal + (milestone.journalEntries?.reduce((entryTotal, entry) => {
                        // Journal entry'lerde 'text' alanı kullanılıyor
                        const text = entry.text || entry.content || '';
                        if (text && typeof text === 'string' && text.trim().length > 0) {
                          const words = text.trim().split(/\s+/).filter(word => word.length > 0);
                          return entryTotal + words.length;
                        }
                        return entryTotal;
                      }, 0) || 0), 0
                    ) || 0), 0
                  );
                  return totalWords > 1000 ? `${Math.round(totalWords / 1000)}k` : totalWords.toString();
                })()}
              </Text>
            </View>
            <Text style={[
              styles.compactStatLabel,
              { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
            ]}>Words</Text>
          </View>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {completedTasksReversed.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons 
              name="checkmark-circle-outline" 
              size={64} 
              color={theme.name === 'dark' ? '#8E8E93' : '#8E8E93'} 
            />
            <Text style={[
              styles.emptyTitle,
              { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
            ]}>{t('noCompletedProjects')}</Text>
            <Text style={[
              styles.emptySubtitle,
              { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
            ]}>
              Your completed projects will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={completedTasksReversed}
            renderItem={renderCompletedItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={5}
            getItemLayout={(data, index) => ({
              length: 200, // Approximate card height
              offset: 200 * index,
              index,
            })}
          />
        )}
      </View>

      {/* Modals */}
      {selectedCard && (
        <CompletedActiveProject
          selectedCard={selectedCard}
          onClose={closeCard}
          navigation={navigation}
        />
      )}

    </LinearGradient>
  );
});

export default CompletedProjectsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "transparent",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 40,
  },
  compactStats: {
    flexDirection: "row",
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 0, // Alt boşluk kaldırıldı
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: "space-around",
    alignItems: "center",
  },
  compactStatColumn: {
    alignItems: "center",
    flex: 1,
  },
  compactStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  compactStatText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: -0.1,
  },
  compactStatLabel: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    letterSpacing: 0.1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  listContainer: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 24,
    letterSpacing: 0.1,
  },
});

