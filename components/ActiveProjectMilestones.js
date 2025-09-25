// components/ActiveProjectMilestones.js
import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import MileStone from './MileStone';

const ActiveProjectMilestones = memo(function ActiveProjectMilestones({
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
  onAddMilestone
}) {
  return (
    <>
      {/* Milestones Header */}
      <View style={styles.milestoneHeader}>
        <Text style={styles.milestoneTitle}>MileStones</Text>
        <TouchableOpacity onPress={onAddMilestone}>
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Milestones List */}
      {allMilestones.length === 0 && (
        <Text style={styles.emptyHint}>No milestones yet — add one with +</Text>
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
          {activeMilestones.map((milestone, index) => (
            <MileStone
              key={milestone.id}
              milestone={milestone}
              isLatest={index === activeMilestones.length - 1}
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
              onEditToggle={(milestone) => onEditToggle(milestone)}
            />
          ))}

          {/* Completed Milestones Section */}
          {completedMilestones.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.completedHeader}>Completed Milestones</Text>
              {completedMilestones.map((ms) => (
                <MileStone
                  key={ms.id}
                  milestone={ms}
                  isLatest={false}
                  isCompleted={true}
                  onOpenDetail={() => onOpenMilestoneDetail({ 
                    ...ms, 
                    isLatest: false, 
                    taskId: currentTask.id 
                  })}
                  onOpenEditor={(ms) => onOpenJournalEditor(ms)}
                  onDelete={() => onDeleteMilestone(currentTask.id, ms.id)}
                  onSetActive={() => onSetActiveMilestone(currentTask.id, ms.id)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </>
  );
});

export default ActiveProjectMilestones;

const styles = StyleSheet.create({
  milestoneHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 20
  },
  milestoneTitle: { 
    fontFamily: "Poppins_700Bold", 
    marginTop: 10, 
    fontSize: 16, 
    color: "#505050" 
  },
  addText: { 
    fontSize: 30, 
    fontFamily: "Poppins_700Bold", 
    color: "#4A90E2", 
    padding: 5 
  },
  emptyHint: { 
    color: "#888", 
    fontStyle: "italic", 
    marginVertical: 8, 
    padding: 10 
  },
  completedHeader: { 
    fontFamily: "Poppins_700Bold", 
    marginTop: 20, 
    marginBottom: 6, 
    fontSize: 16, 
    color: "#505050", 
    marginHorizontal: 20 
  },
});
