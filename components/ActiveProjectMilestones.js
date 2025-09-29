// components/ActiveProjectMilestones.js
import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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
  // isLatest değerlerini hesapla - NO MEMOIZATION
  const activeMilestonesWithLatest = activeMilestones.map((milestone, index) => ({
    ...milestone,
    taskId: currentTask.id,
    isLatest: index === activeMilestones.length - 1
  }));

  const completedMilestonesWithLatest = completedMilestones.map((milestone, index) => ({
    ...milestone,
    taskId: currentTask.id,
    isLatest: index === completedMilestones.length - 1
  }));

  return (
    <View style={styles.modernMilestonesContainer}>
      {/* Modern Milestones Header */}
      <View style={styles.modernMilestoneHeader}>
        <View style={styles.milestoneHeaderContent}>
          <Text style={styles.modernMilestoneTitle}>Milestones</Text>
          <TouchableOpacity 
            style={styles.minimalAddButton}
            onPress={onAddMilestone}
            activeOpacity={0.6}
          >
            <Text style={styles.minimalAddText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Milestones List */}
      {allMilestones.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyHint}>No milestones yet — add one with +</Text>
        </View>
      )}
      
      {allMilestones.length > 0 && (
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ paddingBottom: 40 }}
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
                console.log('ActiveProjectMilestones: onEditToggle called', { milestoneId: milestone.id, milestoneTitle: milestone.title });
                onEditToggle(milestone);
              }}
              onOpenJournal={onOpenJournal}
              navigation={navigation}
            />
          ))}

          {/* Completed Milestones Section */}
          {completedMilestones.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.completedHeader}>Completed Milestones</Text>
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
    backgroundColor: '#FFFFFF',
  },
  modernMilestoneHeader: {
    backgroundColor: 'rgba(248, 251, 255, 0.5)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
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
    fontSize: 18,
    color: "#1D1D1F",
    letterSpacing: -0.5,
  },
  // Minimalist Add Button
  minimalAddButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    borderRadius: 12,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.15)',
  },
  minimalAddText: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#007AFF",
    lineHeight: 18,
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
    color: "#8E8E93",
    fontStyle: "italic",
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  completedHeader: {
    fontFamily: "Poppins_600SemiBold",
    marginTop: 24,
    marginBottom: 12,
    fontSize: 16,
    color: "#1D1D1F",
    marginHorizontal: 24,
    letterSpacing: -0.3,
  },
});
