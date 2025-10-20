// components/TodaysSummary.js
import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const TodaysSummary = memo(function TodaysSummary({
  selectedDateActiveTasks,
  selectedDate,
  isMilestoneActiveToday,
  isMilestoneCompletedToday,
  ProjectCard,
  setSelectedCard,
  setSelectedProjectForMilestone,
  setAddMilestoneModalVisible,
  completingMilestones,
  isMilestoneOverdue,
  isMilestoneLastDay,
  openMilestone,
  handleMilestoneToggle,
  onOpenJournal,
  focusedProjects,
  handleProjectLongPress,
  getProjectEmotionalProgress,
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <View style={styles.summaryHeaderContainer}>
        <View style={styles.summaryHeaderContent}>
          <Text style={[styles.summaryHeaderTitle, { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }]}>
            {t('todaysSummary')}
          </Text>
          <View style={[styles.counterBadge, { backgroundColor: theme.name === 'dark' ? 'rgba(33, 150, 243, 0.12)' : 'rgba(33, 150, 243, 0.1)', borderColor: theme.name === 'dark' ? 'rgba(33,150,243,0.25)' : 'rgba(33,150,243,0.15)' }]}>
            <Text style={[styles.counterText, { color: theme.name === 'dark' ? '#2196F3' : '#1976D2' }]}>
              {selectedDateActiveTasks.length}
            </Text>
          </View>
        </View>
      </View>
      {(() => {
        const today = new Date();
        const selectedDateObj = new Date(selectedDate);
        today.setHours(0, 0, 0, 0);
        selectedDateObj.setHours(0, 0, 0, 0);
        if (selectedDateObj.getTime() !== today.getTime()) return null;
        const totalMilestones = selectedDateActiveTasks.reduce((total, project) => total + (project.milestones?.filter(m => !m.completed && isMilestoneActiveToday(m, selectedDate)).length || 0), 0);
        const completedMilestones = selectedDateActiveTasks.reduce((total, project) => total + (project.milestones?.filter(m => isMilestoneCompletedToday(m, selectedDate)).length || 0), 0);
        const total = totalMilestones + completedMilestones;
        const percentage = total > 0 ? Math.round((completedMilestones / total) * 100) : 0;
        if (total === 0) return null;
        return (
          <View style={[styles.progressStatus, { backgroundColor: theme.name === 'dark' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(52, 199, 89, 0.05)', borderLeftColor: '#34C759' }]}>
            <View style={styles.progressIconContainer}><Ionicons name="trending-up" size={16} color="#34C759" /></View>
            <View style={styles.progressContent}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressText, { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }]}>{t('progressStatus')}</Text>
                <Text style={[styles.progressPercentage, { color: '#34C759', backgroundColor: theme.name === 'dark' ? 'rgba(52, 199, 89, 0.2)' : 'rgba(52, 199, 89, 0.1)' }]}>{percentage}%</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { backgroundColor: theme.name === 'dark' ? 'rgba(52, 199, 89, 0.3)' : 'rgba(52, 199, 89, 0.2)' }]}>
                  <View style={[styles.progressBarFill, { width: `${percentage}%` }]}>
                    <LinearGradient colors={['#34C759', '#30D158']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.progressGradient} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        );
      })()}
      <View style={styles.summaryContainer}>
        {selectedDateActiveTasks.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#F2F2F7', borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'transparent', borderWidth: theme.name === 'dark' ? 1 : 0, borderLeftColor: theme.name === 'dark' ? '#FF6B6B' : '#1976D2' }]}>
            <Ionicons name="calendar-outline" size={48} color="#8E8E93" />
            <Text style={[styles.emptyTitle, { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }]}>{t('noProjectOnThisDate')}</Text>
            <Text style={[styles.emptyText, { color: '#8E8E93' }]}>
              {(() => { const today = new Date(); const selected = new Date(selectedDate); today.setHours(0,0,0,0); selected.setHours(0,0,0,0); return selected < today ? t('noProjectOnThisDate') : t('noActiveProjectOnSelectedDate'); })()}
            </Text>
          </View>
        ) : (
          <FlatList
            data={selectedDateActiveTasks}
            keyExtractor={(item) => item.id.toString()}
            initialNumToRender={6}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews={true}
            renderItem={({ item, index }) => (
              <ProjectCard
                key={item.id}
                project={item}
                index={index}
                isLastProject={index >= selectedDateActiveTasks.length - 1}
                theme={theme}
                t={t}
                setSelectedCard={setSelectedCard}
                setSelectedProjectForMilestone={setSelectedProjectForMilestone}
                setAddMilestoneModalVisible={setAddMilestoneModalVisible}
                completingMilestones={completingMilestones}
                selectedDate={selectedDate}
                isMilestoneActiveToday={isMilestoneActiveToday}
                isMilestoneOverdue={isMilestoneOverdue}
                isMilestoneLastDay={isMilestoneLastDay}
                openMilestone={openMilestone}
                handleMilestoneToggle={handleMilestoneToggle}
                onOpenJournal={onOpenJournal}
                isMilestoneCompletedToday={isMilestoneCompletedToday}
                isFocused={focusedProjects.has(item.id)}
                onProjectLongPress={handleProjectLongPress}
                getProjectEmotionalProgress={getProjectEmotionalProgress}
              />
            )}
          />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: 0 },
  summaryHeaderContainer: { marginHorizontal: 30, marginTop: 16, marginBottom: 14 },
  summaryHeaderContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryHeaderTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold' },
  counterBadge: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1 
  },
  counterText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  progressStatus: { marginHorizontal: 30, marginBottom: 14, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start', borderLeftWidth: 3 },
  progressIconContainer: { marginRight: 12, marginTop: 2 },
  progressContent: { flex: 1 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  progressText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  progressPercentage: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  progressBarContainer: { width: '100%' },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  progressGradient: { flex: 1, width: '100%', height: '100%' },
  summaryContainer: { marginHorizontal: 30 },
  emptyState: { borderRadius: 16, padding: 36, alignItems: 'center', marginTop: 8, borderLeftWidth: 3 },
  emptyTitle: { fontSize: 20, fontFamily: 'Poppins_600SemiBold', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 15, fontFamily: 'Poppins_400Regular', textAlign: 'center', marginBottom: 20 },
});

export default TodaysSummary;
