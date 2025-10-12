// components/ActiveProjectMilestones.js
import React, { memo, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import MileStone from './MileStone';
import CompletedMilestonesList from './CompletedMilestonesList';

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
  onAttachMilestone,
  navigation,
  refreshKey
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  // Attach mode state
  const [attachMode, setAttachMode] = useState(null); // null veya { milestoneId: string }

  // Prepare active milestones data with hierarchy - OPTIMIZED
  const activeMilestonesWithLatest = useMemo(() => {
    const milestones = activeMilestones.map((milestone, index) => ({
      ...milestone,
      taskId: currentTask.id,
      title: milestone.title || '',
      id: milestone.id || `active-${index}`
    }));
    
    // Organize milestones hierarchically (parent -> children)
    const organized = [];
    const childrenMap = {};
    
    // Group children by parent
    milestones.forEach(ms => {
      if (ms.parentId) {
        if (!childrenMap[ms.parentId]) {
          childrenMap[ms.parentId] = [];
        }
        childrenMap[ms.parentId].push(ms);
      }
    });
    
    // Add parents and their children
    milestones.forEach(ms => {
      if (!ms.parentId) {
        organized.push(ms);
        // Add children right after parent, sorted by startDate (earliest first)
        if (childrenMap[ms.id]) {
          const sortedChildren = [...childrenMap[ms.id]].sort((a, b) => {
            // Sort by startDate - earliest (closest) first
            const dateA = a.startDate ? new Date(a.startDate).getTime() : Infinity;
            const dateB = b.startDate ? new Date(b.startDate).getTime() : Infinity;
            return dateA - dateB;
          });
          organized.push(...sortedChildren);
        }
      }
    });
    
    return organized;
  }, [activeMilestones, currentTask?.id]);

  // Prepare completed milestones data - OPTIMIZED
  const completedMilestonesWithLatest = useMemo(() => 
    completedMilestones.map((milestone, index) => ({
      ...milestone,
      taskId: currentTask.id,
      isLatest: index === completedMilestones.length - 1,
      title: milestone.title || '',
      id: milestone.id || `completed-${index}`
    }))
  , [completedMilestones, currentTask?.id]);

  // Attach mode handlers
  const handleStartAttachMode = (milestoneId) => {
    setAttachMode({ milestoneId });
  };

  const handleSelectForAttach = (parentId) => {
    if (attachMode) {
      onAttachMilestone(currentTask.id, attachMode.milestoneId, parentId);
      setAttachMode(null);
    }
  };

  const handleCancelAttachMode = () => {
    setAttachMode(null);
  };

  const handleDetachMilestone = (milestoneId) => {
    onAttachMilestone(currentTask.id, milestoneId, null); // null = detach
  };

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
          backgroundColor: attachMode
            ? theme.name === 'dark' ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 122, 255, 0.08)'
            : theme.name === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(248, 251, 255, 0.5)',
          borderBottomColor: attachMode
            ? theme.name === 'dark' ? 'rgba(0, 122, 255, 0.3)' : 'rgba(0, 122, 255, 0.25)'
            : theme.name === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
        }
      ]}>
        <View style={styles.milestoneHeaderContent}>
          {attachMode ? (
            <>
              <View style={styles.attachModeIndicator}>
                <Ionicons name="link" size={18} color="#007AFF" />
                <Text style={[
                  styles.attachModeText,
                  { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
                ]}>
                  {t('selectParentMilestone') || 'Ana görev seçin'}
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: theme.name === 'dark' ? '#3A3A3C' : '#E5E5EA' }]}
                onPress={handleCancelAttachMode}
                activeOpacity={0.6}
              >
                <Ionicons name="close" size={16} color={theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F'} />
              </TouchableOpacity>
            </>
          ) : (
            <>
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
            </>
          )}
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
          contentContainerStyle={{ 
            paddingBottom: 20,
            paddingHorizontal: 0, // Centered alignment
            alignItems: 'stretch', // Full width items
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Active Milestones */}
          {activeMilestonesWithLatest.map((item) => {
            const isSelectableForAttach = attachMode && 
              item.id !== attachMode.milestoneId && 
              !item.completed && 
              !item.parentId; // Can't attach to child milestones
            
            return (
              <MileStone
                key={item.id}
                milestone={item}
                onUpdate={(milestoneData) => {
                  onUpdateMilestone(currentTask.id, item.id, milestoneData);
                }}
                onComplete={() => onCompleteMilestone(currentTask.id, item.id)}
                onDelete={() => onDeleteMilestone(currentTask.id, item.id)}
                onSetActive={() => onSetActiveMilestone(currentTask.id, item.id)}
                onOpenDetail={() => onOpenMilestoneDetail({ ...item, isLatest: false, taskId: currentTask.id })}
                onOpenEditor={(ms) => onOpenJournalEditor(ms)}
                isCompleted={item.completed}
                onEditToggle={(ms) => {
                  onEditToggle(ms);
                }}
                onOpenJournal={onOpenJournal}
                navigation={navigation}
                currentTask={currentTask}
                isAttachMode={!!attachMode}
                isSelectableForAttach={isSelectableForAttach}
                attachModeSourceId={attachMode?.milestoneId}
                allMilestones={allMilestones}
                onStartAttachMode={() => handleStartAttachMode(item.id)}
                onSelectForAttach={() => handleSelectForAttach(item.id)}
                onDetachMilestone={() => handleDetachMilestone(item.id)}
              />
            );
          })}

          {/* Completed Milestones */}
          <CompletedMilestonesList
            completedMilestones={completedMilestonesWithLatest}
            refreshKey={refreshKey}
            theme={theme}
            t={t}
            currentTask={currentTask}
            onOpenMilestoneDetail={onOpenMilestoneDetail}
            onOpenJournalEditor={onOpenJournalEditor}
            onDeleteMilestone={onDeleteMilestone}
            onSetActiveMilestone={onSetActiveMilestone}
            onOpenJournal={onOpenJournal}
            onAttachMilestone={onAttachMilestone}
            allMilestones={allMilestones}
            navigation={navigation}
            styles={styles}
            isAttachMode={!!attachMode}
            attachModeSourceId={attachMode?.milestoneId}
            onStartAttachMode={handleStartAttachMode}
            onSelectForAttach={handleSelectForAttach}
            onDetachMilestone={handleDetachMilestone}
          />
        </ScrollView>
      )}
    </View>
  );
}

export default memo(ActiveProjectMilestones);

const styles = StyleSheet.create({
  // Modern Milestones Container
  modernMilestonesContainer: {
    flex: 1,
    paddingHorizontal: 0, // Remove horizontal padding for centering
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
  attachModeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachModeText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: -0.3,
  },
  cancelButton: {
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
