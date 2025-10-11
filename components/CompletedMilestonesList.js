import React, { memo } from 'react';
import { View, Text } from 'react-native';
import MileStone from './MileStone';

function CompletedMilestonesList({
  completedMilestones,
  refreshKey,
  theme,
  t,
  currentTask,
  onOpenMilestoneDetail,
  onOpenJournalEditor,
  onDeleteMilestone,
  onSetActiveMilestone,
  onOpenJournal,
  onAttachMilestone,
  allMilestones,
  navigation,
  styles,
  isAttachMode = false,
  attachModeSourceId = null,
  onStartAttachMode,
  onSelectForAttach,
  onDetachMilestone,
}) {
  if (!completedMilestones || completedMilestones.length === 0) return null;

  // Organize completed milestones hierarchically
  const organized = [];
  const childrenMap = {};
  
  // Group children by parent
  completedMilestones.forEach(ms => {
    if (ms.parentId) {
      if (!childrenMap[ms.parentId]) {
        childrenMap[ms.parentId] = [];
      }
      childrenMap[ms.parentId].push(ms);
    }
  });
  
  // Add parents and their children
  completedMilestones.forEach(ms => {
    if (!ms.parentId) {
      organized.push(ms);
      // Add children right after parent
      if (childrenMap[ms.id]) {
        organized.push(...childrenMap[ms.id]);
      }
    }
  });

  return (
    <View style={{ marginTop: 20 }}>
      <Text style={[
        styles.completedHeader,
        { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
      ]}>{t('completedMilestones')}</Text>
      {organized.map((ms) => {
        const isSelectableForAttach = isAttachMode && 
          ms.id !== attachModeSourceId && 
          !ms.completed && 
          !ms.parentId;
        
        return (
          <MileStone
            key={`${ms.id}`}
            milestone={ms}
            isLatest={ms.isLatest}
            isCompleted={true}
            onOpenDetail={() => onOpenMilestoneDetail({ 
              ...ms, 
              isLatest: false, 
              taskId: currentTask.id 
            })}
            onOpenEditor={(m) => onOpenJournalEditor(m)}
            onDelete={() => onDeleteMilestone(currentTask.id, ms.id)}
            onSetActive={() => onSetActiveMilestone(currentTask.id, ms.id)}
            onOpenJournal={onOpenJournal}
            navigation={navigation}
            currentTask={currentTask}
            isAttachMode={isAttachMode}
            isSelectableForAttach={isSelectableForAttach}
            attachModeSourceId={attachModeSourceId}
            allMilestones={allMilestones}
            onStartAttachMode={() => onStartAttachMode?.(ms.id)}
            onSelectForAttach={() => onSelectForAttach?.(ms.id)}
            onDetachMilestone={() => onDetachMilestone?.(ms.id)}
          />
        );
      })}
    </View>
  );
}

export default memo(CompletedMilestonesList);


