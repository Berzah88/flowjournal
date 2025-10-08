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
  navigation,
  styles,
}) {
  if (!completedMilestones || completedMilestones.length === 0) return null;

  return (
    <View style={{ marginTop: 20 }}>
      <Text style={[
        styles.completedHeader,
        { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
      ]}>{t('completedMilestones')}</Text>
      {completedMilestones.map((ms) => (
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
        />
      ))}
    </View>
  );
}

export default memo(CompletedMilestonesList);


