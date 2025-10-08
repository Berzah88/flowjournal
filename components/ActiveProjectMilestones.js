// components/ActiveProjectMilestones.js
import React, { memo, useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, UIManager, InteractionManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import MileStone from './MileStone';
import CompletedMilestonesList from './CompletedMilestonesList';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useTaskActions } from '../hooks/useTaskContext';

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
  const { updateTask } = useTaskActions();
  // Debug flags
  const SHOULD_PERSIST_AFTER_DROP = false; // set true after verifying jitter source

  // Stable cell renderer to avoid re-renders of unaffected rows
  const StableCell = useCallback(({ children, ...rest }) => (
    <View {...rest}>{children}</View>
  ), []);

  // Local reorderable state for active milestones
  const [activeList, setActiveList] = useState([]);
  const [isDraggingAny, setIsDraggingAny] = useState(false);
  const lastOrderRef = React.useRef([]);
  const heightsRef = React.useRef({});
  const [draggingId, setDraggingId] = useState(null);

  // Enable LayoutAnimation on Android for smoother drops
  useEffect(() => {
    try {
      if (Platform.OS === 'android' && UIManager?.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    // Map without isLatest; compute it at render-time to avoid post-drop mismatches
    const mapped = activeMilestones.map((milestone, index) => ({
      ...milestone,
      taskId: currentTask.id,
      title: milestone.title || '',
      id: milestone.id || `active-${index}`
    }));
    setActiveList(mapped);
    lastOrderRef.current = mapped.map(m => m.id);
  }, [activeMilestones, currentTask?.id, refreshKey]);
  const activeMilestonesWithLatest = activeList;

  const completedMilestonesWithLatest = completedMilestones.map((milestone, index) => ({
    ...milestone,
    taskId: currentTask.id,
    isLatest: index === completedMilestones.length - 1,
    title: milestone.title || '',
    id: milestone.id || `completed-${index}`
  }));

  const handleDragEnd = useCallback(({ data, from, to }) => {
    // Compute new active order ids
    const reorderedIds = data.map(m => m.id);
    const prevIds = lastOrderRef.current;

    // Skip updates if order didn't actually change to prevent jitter
    const isSameOrder = prevIds.length === reorderedIds.length && prevIds.every((id, i) => id === reorderedIds[i]);

    // Let the current frame finish
    requestAnimationFrame(() => setIsDraggingAny(false));

    if (!isSameOrder) {
      // Preserve referential equality for unchanged items to reduce re-renders
      const idToOriginal = new Map(activeList.map(ms => [ms.id, ms]));
      const rebuilt = reorderedIds.map(id => idToOriginal.get(id) || data.find(m => m.id === id) || { id });
      // Defer list update to next frame to avoid layout thrash
      requestAnimationFrame(() => {
        setActiveList(rebuilt);
        lastOrderRef.current = reorderedIds;
      });

      // Persist new order after a short debounce to avoid interrupting settle
      try {
        const completedIds = completedMilestonesWithLatest.map(m => m.id);
        const idToMs = new Map();
        [...allMilestones].forEach(ms => idToMs.set(ms.id, ms));
        const newMilestones = [
          ...reorderedIds.map(id => idToMs.get(id)).filter(Boolean),
          ...completedIds.map(id => idToMs.get(id)).filter(Boolean),
        ];
        if (SHOULD_PERSIST_AFTER_DROP && updateTask && currentTask?.id) {
          InteractionManager.runAfterInteractions(() => {
            setTimeout(() => {
              requestAnimationFrame(() => {
                updateTask(currentTask.id, { milestones: newMilestones });
              });
            }, 700);
          });
        }
      } catch (e) {
        // noop fallback
      }
    }

  }, [activeList, allMilestones, completedMilestonesWithLatest, updateTask, currentTask?.id]);

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
        <>
          {/* Active Milestones - Draggable */}
          <DraggableFlatList
            containerStyle={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingBottom: 4 }}
            data={activeMilestonesWithLatest}
            keyExtractor={(item) => `${item.id}`}
            CellRendererComponent={StableCell}
            activationDistance={14}
            animationConfig={{
              // Snap into place immediately on drop (no visible settle)
              damping: 50,
              mass: 1,
              stiffness: 500,
              overshootClamping: true,
              restDisplacementThreshold: 2.0,
              restSpeedThreshold: 2.0,
            }}
            dragItemOverflow
            autoscrollThreshold={9999}
            autoscrollSpeed={0}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            removeClippedSubviews
            windowSize={7}
            getItemLayout={(data, index) => ({ length: 56, offset: 56 * index, index })}
            scrollEnabled={!isDraggingAny}
            onDragBegin={(index) => {
              setIsDraggingAny(true);
              try {
                const id = activeMilestonesWithLatest?.[index]?.id;
                setDraggingId(id || null);
              } catch { setDraggingId(null); }
            }}
            renderPlaceholder={() => (
              <View pointerEvents="none" style={{
                height: 56,
                borderRadius: 16,
                marginTop: 8,
                marginHorizontal: 28,
                backgroundColor: 'transparent'
              }} />
            )}
            onDragEnd={(args) => { setDraggingId(null); handleDragEnd(args); }}
            renderItem={React.useCallback(({ item, drag, isActive }) => (
              <View
                renderToHardwareTextureAndroid={true}
                shouldRasterizeIOS={true}
                collapsable={false}
              >
                <MileStone
                  milestone={item}
                  onUpdate={(milestoneData) => {
                    onUpdateMilestone(currentTask.id, item.id, milestoneData);
                  }}
                  onComplete={() => onCompleteMilestone(currentTask.id, item.id)}
                  onDelete={() => onDeleteMilestone(currentTask.id, item.id)}
                  onOpenDetail={() => onOpenMilestoneDetail({ ...item, isLatest: false, taskId: currentTask.id })}
                  onOpenEditor={(ms) => onOpenJournalEditor(ms)}
                  isCompleted={false}
                  onEditToggle={(ms) => {
                    onEditToggle(ms);
                  }}
                  onOpenJournal={onOpenJournal}
                  navigation={navigation}
                  currentTask={currentTask}
                  // Drag handle: start drag when icon pressed (handled inside MileStone via new prop)
                  onStartDrag={drag}
                  isDragging={isActive}
                />
              </View>
            ), [currentTask?.id, navigation, onOpenJournal, onOpenMilestoneDetail, onOpenJournalEditor, onCompleteMilestone, onDeleteMilestone, onUpdateMilestone, onEditToggle])}
          />

          {/* Completed Milestones Section (decoupled list, always mounted) */}
          <View>
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
              navigation={navigation}
              styles={styles}
            />
          </View>
        </>
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
