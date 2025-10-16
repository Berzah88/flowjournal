// components/TodaysSummary.js
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import DailyMoodSummary from './DailyMoodSummary';

const TodaysSummary = memo(function TodaysSummary({
  selectedDateActiveTasks,
  selectedDate,
  activeTasks,
  completedTasks,
  navigation,
  onAddProject,
  ProjectCard,
  setSelectedCard,
  setSelectedProjectForMilestone,
  setAddMilestoneModalVisible,
  completingMilestones,
  isMilestoneActiveToday,
  isMilestoneOverdue,
  isMilestoneLastDay,
  openMilestone,
  handleMilestoneToggle,
  onOpenJournal,
  isMilestoneCompletedToday,
  focusedProjects,
  handleProjectLongPress,
  getProjectEmotionalProgress,
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[
            styles.icon,
            { backgroundColor: theme.name === 'dark' ? 'rgba(33, 150, 243, 0.12)' : 'rgba(33, 150, 243, 0.1)' }
          ]}>
            <MaterialIcons 
              name="schedule" 
              size={16}
              color={theme.name === 'dark' ? '#2196F3' : '#2196F3'} 
            />
          </View>
          <Text style={[
            styles.title,
            { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
          ]}>{t('todaysSummary')}</Text>
        </View>
      </View>
      
      {/* Progress Status */}
      <DailyMoodSummary
        activeTasks={activeTasks}
        completedTasks={completedTasks}
        selectedDate={selectedDate}
        navigation={navigation}
        insideCard={true}
      />
      
      {selectedDateActiveTasks.length === 0 ? (
        // Empty State
        <View style={[
          styles.emptyState,
          {
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#F2F2F7',
            borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            borderWidth: theme.name === 'dark' ? 1 : 0,
            borderLeftColor: theme.name === 'dark' ? '#FF6B6B' : '#1976D2',
          }
        ]}>
          <Ionicons name="calendar-outline" size={54} color="#8E8E93" />
          <Text style={[
            styles.emptyTitle,
            { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
          ]}>{t('noProjectOnThisDate')}</Text>
          <Text style={[
            styles.emptyText,
            { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
          ]}>
            {(() => {
              const today = new Date();
              const selected = new Date(selectedDate);
              today.setHours(0, 0, 0, 0);
              selected.setHours(0, 0, 0, 0);
              
              if (selected < today) {
                return t('noProjectOnThisDate');
              } else {
                return t('noActiveProjectOnSelectedDate');
              }
            })()}
          </Text>
          {(() => {
            const today = new Date();
            const selected = new Date(selectedDate);
            today.setHours(0, 0, 0, 0);
            selected.setHours(0, 0, 0, 0);
            
            if (selected >= today) {
              return (
                <TouchableOpacity
                  style={[
                    styles.emptyAddButton,
                    {
                      backgroundColor: theme.name === 'dark' ? '#2C2C2E' : '#F0F8FF',
                      borderColor: theme.name === 'dark' ? '#FF6B6B' : '#1976D2',
                    }
                  ]}
                  onPress={onAddProject}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name="add-circle" 
                    size={22} 
                    color={theme.name === 'dark' ? '#FF6B6B' : '#1976D2'} 
                  />
                  <Text style={[
                    styles.emptyAddButtonText,
                    { color: theme.name === 'dark' ? '#FF6B6B' : '#1976D2' }
                  ]}>{t('addProject')}</Text>
                </TouchableOpacity>
              );
            }
            return null;
          })()}
        </View>
      ) : (
        // Project Cards
        <>
          {selectedDateActiveTasks.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
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
              isFocused={focusedProjects.has(project.id)}
              onProjectLongPress={handleProjectLongPress}
              getProjectEmotionalProgress={getProjectEmotionalProgress}
            />
          ))}
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 38,
    marginTop: 16,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // group icon + title on the left
    marginBottom: 14, // 12 → 14: a bit more breathing room
    marginHorizontal: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18, // 16 → 18
    fontFamily: 'Poppins_600SemiBold',
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8, // spacing between icon and title
  },
  emptyState: {
    borderRadius: 16,
    padding: 36, // 32 → 36
    alignItems: 'center',
    marginTop: 8,
    borderLeftWidth: 3, // accent to draw attention
  },
  emptyTitle: {
    fontSize: 20, // 18 → 20
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15, // 14 → 15
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 18, // 16 → 18
    paddingVertical: 12, // 10 → 12
    borderRadius: 12,
    marginTop: 20,
  },
  emptyAddButtonText: {
    fontSize: 15, // 14 → 15
    fontFamily: 'Poppins_500Medium',
    marginLeft: 6,
  },
  
});

export default TodaysSummary;

