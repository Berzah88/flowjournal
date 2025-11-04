import React, { memo, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MileStone from './MileStone';

function CompletedTasksList({
  completedMilestones,
  theme,
  t,
  currentTask,
  onOpenMilestoneDetail,
  onOpenJournalEditor,
  onDeleteMilestone,
  onSetActiveMilestone,
  onOpenJournal,
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

  // Collapsible state
  const [expanded, setExpanded] = useState(false);
  const anim = useRef(new Animated.Value(0)).current; // 0 = collapsed, 1 = expanded

  const toggle = () => {
    const toValue = expanded ? 0 : 1;
    if (!expanded) {
      setExpanded(true);
    }
    Animated.timing(anim, {
      toValue,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      if (expanded) {
        // just finished collapsing
        setExpanded(false);
      }
    });
  };

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={{ marginTop: 20 }}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 }}>
        <Text style={[
          styles.completedHeader,
          { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
        ]}>{t('completedMilestones')}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={18} color={theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F'} />
        </Animated.View>
      </TouchableOpacity>

      {/* Animated content: opacity + translateY for a subtle reveal */}
  <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }] }} pointerEvents={expanded ? 'auto' : 'none'}>
  {expanded && organized.map((ms) => {
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
      </Animated.View>
    </View>
  );
}

export default memo(CompletedTasksList);


