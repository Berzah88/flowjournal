// components/ActiveProjectMilestones.js
import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import MileStone from './MileStone';

function ActiveProjectMilestones({
  currentTask,
  allMilestones,
  activeMilestones,
  completedMilestones,
  onUpdateMilestone,
  onCompleteMilestone,
  onDeleteMilestone,
  onSetActiveMilestone,
  onOpenMilestoneDetail,
  onOpenJournalEditor,
  onEditToggle,
  onAddMilestone,
  onOpenJournal,
  navigation,
  refreshKey
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  // isLatest değerlerini hesapla - NO MEMOIZATION
  const activeMilestonesWithLatest = activeMilestones.map((milestone, index) => ({
    ...milestone,
    taskId: currentTask.id,
    isLatest: index === activeMilestones.length - 1,
    title: milestone.title || '',
    id: milestone.id || `active-${index}`
  }));

  const completedMilestonesWithLatest = completedMilestones.map((milestone, index) => ({
    ...milestone,
    taskId: currentTask.id,
    isLatest: index === completedMilestones.length - 1,
    title: milestone.title || '',
    id: milestone.id || `completed-${index}`
  }));

  return (
    <View style={[
      styles.modernMilestonesContainer,
        {
          backgroundColor: theme.name === 'dark' ? '#1A1A1C' : '#FFFFFF',
        }
    ]}>
      {/* Modern Milestones Header */}
      <View style={[
        styles.modernMilestoneHeader,
        {
          backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(248, 251, 255, 0.5)',
          borderBottomColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
        }
      ]}>
        <View style={styles.milestoneHeaderContent}>
          <Text style={[
            styles.modernMilestoneTitle,
            { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
          ]}>{t('milestones')}</Text>
          <TouchableOpacity 
            style={styles.minimalAddButton}
            onPress={onAddMilestone}
            activeOpacity={0.6}
          >
            <Ionicons name="add" size={16} color={theme.name === 'dark' ? '#FFFFFF' : '#007AFF'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Milestones List */}
      {allMilestones.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={[
            styles.emptyHint,
            { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
          ]}>No milestones yet — add one with +</Text>
        </View>
      )}
      
      {allMilestones.length > 0 && (
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ paddingBottom: 4 }}
          showsVerticalScrollIndicator={true}
          bounces={true}
          scrollEnabled={true}
        >
          {/* Active Milestones */}
          {activeMilestonesWithLatest.map((milestone, index) => (
            <MileStone
              key={`${milestone.id}-${refreshKey}`}
              milestone={milestone}
              isLatest={milestone.isLatest}
              onUpdate={(milestoneData) => {
                onUpdateMilestone(currentTask.id, milestone.id, milestoneData);
              }}
              onComplete={() => onCompleteMilestone(currentTask.id, milestone.id)}
              onDelete={() => onDeleteMilestone(currentTask.id, milestone.id)}
              onOpenDetail={() => onOpenMilestoneDetail({ 
                ...milestone, 
                isLatest: index === activeMilestones.length - 1, 
                taskId: currentTask.id 
              })}
              onOpenEditor={(ms) => onOpenJournalEditor(ms)}
              isCompleted={false}
              onEditToggle={(milestone) => {
                onEditToggle(milestone);
              }}
              onOpenJournal={onOpenJournal}
              navigation={navigation}
              currentTask={currentTask}
            />
          ))}

          {/* Completed Milestones Section */}
          {completedMilestones.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={[
                styles.completedHeader,
                { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
              ]}>{t('completedMilestones')}</Text>
              {completedMilestonesWithLatest.map((ms) => (
                <MileStone
                  key={`${ms.id}-${refreshKey}`}
                  milestone={ms}
                  isLatest={ms.isLatest}
                  isCompleted={true}
                  onOpenDetail={() => onOpenMilestoneDetail({ 
                    ...ms, 
                    isLatest: false, 
                    taskId: currentTask.id 
                  })}
                  onOpenEditor={(ms) => onOpenJournalEditor(ms)}
                  onDelete={() => onDeleteMilestone(currentTask.id, ms.id)}
                  onSetActive={() => onSetActiveMilestone(currentTask.id, ms.id)}
                  onOpenJournal={onOpenJournal}
                  navigation={navigation}
                  currentTask={currentTask}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

export default ActiveProjectMilestones;

const styles = StyleSheet.create({
  // Modern Milestones Container
  modernMilestonesContainer: {
    flex: 1,
  },
  modernMilestoneHeader: {
    borderBottomWidth: 1,
  },
  milestoneHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  modernMilestoneTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    letterSpacing: -0.5,
  },
  // Minimalist Add Button
  minimalAddButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.15)',
  },
  minimalAddText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    lineHeight: 16,
    marginTop: -1, // Fine-tune vertical alignment
  },
  // Legacy styles (keeping for compatibility)
  addMilestoneButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addMilestoneText: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: "#007AFF",
    lineHeight: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyHint: {
    fontStyle: "italic",
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  completedHeader: {
    fontFamily: "Poppins_600SemiBold",
    marginTop: 16,
    marginBottom: 12,
    fontSize: 16,
    color: "#1D1D1F",
    marginHorizontal: 24,
    letterSpacing: -0.3,
  },
});
