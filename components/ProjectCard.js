// components/ProjectCard.js
import React, { memo, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Animated, Vibration, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { getMilestoneColor } from '../utils/milestoneColors';
import { COLORS } from '../constants';

const ProjectCard = memo(function ProjectCard({
  project,
  index,
  isLastProject,
  theme,
  t,
  setSelectedCard,
  setSelectedProjectForMilestone,
  setAddMilestoneModalVisible,
  completingMilestones,
  selectedDate,
  isMilestoneActiveToday,
  isMilestoneOverdue,
  isMilestoneLastDay,
  openMilestone,
  handleMilestoneToggle,
  onOpenJournal,
  isMilestoneCompletedToday,
  isFocused,
  onProjectLongPress,
  getProjectEmotionalProgress,
}) {
  // Smooth touch animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);
  
  const handlePressIn = useCallback(() => {
    // Reset long press flag
    isLongPress.current = false;
    
    // Clear any existing timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    
    // Smooth scale down animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      // Mark as long press
      isLongPress.current = true;
      
      // Haptic feedback
      Vibration.vibrate(50);
      
      // Smooth spring back
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
          tension: 80,
        }),
        Animated.spring(opacityAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
          tension: 80,
        }),
      ]).start();
      
      // Trigger long press action
      onProjectLongPress(project);
    }, 500);
  }, [scaleAnim, opacityAnim, onProjectLongPress, project]);
  
  const handlePressOut = useCallback(() => {
    // Clear timer if press is released early
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    // Smooth spring back (only if not already animated by long press)
    if (!isLongPress.current) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
          tension: 80,
        }),
        Animated.spring(opacityAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
          tension: 80,
        }),
      ]).start();
    }
  }, [scaleAnim, opacityAnim]);
  
  const handlePress = useCallback(() => {
    // Only trigger normal press if it wasn't a long press
    if (!isLongPress.current) {
      setSelectedCard(project);
    }
  }, [setSelectedCard, project]);
  
  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View
        style={[
          styles.projectSummaryCard,
          {
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
            borderColor: theme.name === 'dark' ? '#000000' : '#1976D2',
            shadowColor: theme.name === 'dark' ? '#000000' : '#000',
            shadowOpacity: theme.name === 'dark' ? 0.1 : 0.02,
            shadowRadius: theme.name === 'dark' ? 4 : 3,
            elevation: theme.name === 'dark' ? 2 : 1,
            marginBottom: isLastProject ? 0 : 8,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
          isFocused && {
            borderColor: '#FF9500',
            borderWidth: 2,
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFF9F0',
            shadowColor: '#FF9500',
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 2,
          },
          !isFocused && project.isLastDay && {
            borderColor: '#8E7DBE',
            borderWidth: 1.5,
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#F8F6FF',
          },
          !isFocused && project.isOverdue && {
            borderColor: '#FF4444',
            borderWidth: 1.5,
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFF5F5',
          }
        ]}
      >
        <View style={styles.projectHeader}>
          <View style={styles.projectTitleContainer}>
            <Text style={[
              styles.projectTitle,
              {
                color: theme.name === 'dark' ? '#FF6B6B' : '#1B2951',
              },
              isFocused && {
                color: theme.name === 'dark' ? '#FF9500' : '#FF9500',
              },
              !isFocused && project.isLastDay && {
                color: theme.name === 'dark' ? '#A78BFA' : '#8E7DBE',
              },
              !isFocused && project.isOverdue && {
                color: theme.name === 'dark' ? '#FF6666' : '#FF4444',
              }
            ]}>
              {project.title || ''}
            </Text>
            {isFocused && (
              <View style={[
                styles.focusedBadge,
                { backgroundColor: theme.name === 'dark' ? '#FF9500' : '#FF9500' }
              ]}>
                <Ionicons name="star" size={12} color="#FFFFFF" />
                <Text style={styles.focusedBadgeText}>{t('focused') || 'Focused'}</Text>
              </View>
            )}
          </View>
          <View style={styles.dateContainer}>
            <View style={[
              styles.projectDateRange,
              {
                backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#E3F2FD',
                borderColor: theme.name === 'dark' ? '#2C2C2E' : 'transparent',
                borderWidth: theme.name === 'dark' ? 0.5 : 0,
              },
              project.isLastDay && {
                backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#F0EDFF',
                borderColor: '#8E7DBE',
                borderWidth: 0.5,
              },
              project.isOverdue && {
                backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFE5E5',
                borderColor: '#FF4444',
                borderWidth: 0.5,
              }
            ]}>
              <Text style={[
                styles.dateText,
                {
                  color: theme.name === 'dark' ? '#8E8E93' : '#1B2951',
                },
                project.isLastDay && {
                  color: theme.name === 'dark' ? '#A78BFA' : '#8E7DBE',
                },
                project.isOverdue && {
                  color: theme.name === 'dark' ? '#FF6666' : '#FF4444',
                }
              ]}>
                {new Date(project.startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })} - {new Date(project.endDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
              </Text>
            </View>
            {project.isLastDay && (
              <View style={styles.lastDayBadge}>
                <Ionicons name="warning" size={12} color="#FFFFFF" />
                <Text style={styles.lastDayText}>{t('lastDay')}</Text>
              </View>
            )}
            {project.isOverdue && (
              <View style={[
                styles.overdueBadge,
                {
                  backgroundColor: theme.name === 'dark' ? '#FF4444' : '#FF4444',
                }
              ]}>
                <Ionicons name="alert-circle" size={12} color="#FFFFFF" />
                <Text style={styles.overdueText}>
                  {project.daysOverdue === 1 ? t('overdue1Day') : t('overdueDays', { days: project.daysOverdue })}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Milestone button under date - show for all projects */}
        <TouchableOpacity 
          style={[
            styles.minimalAddMilestoneButton,
            {
              backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(34, 139, 34, 0.1)',
              borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(34, 139, 34, 0.2)',
              borderWidth: 1,
              alignSelf: 'flex-end',
            }
          ]}
          onPress={() => {
            setSelectedProjectForMilestone(project);
            setAddMilestoneModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={16} color={theme.name === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(34, 139, 34, 0.7)'} />
          <Text style={[
            styles.minimalAddMilestoneText,
            { color: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(34, 139, 34, 0.7)' }
          ]}>{t('milestone')}</Text>
        </TouchableOpacity>
        
        {project.milestones && project.milestones.length > 0 && (
          <View style={styles.milestonesList}>
            {(() => {
              // NEW FILTERING LOGIC: Show active milestones + today's completed milestones
              const filteredMilestones = project.milestones.filter(m => {
                // Always show if completing
                if (completingMilestones.has(`${project.id}-${m.id}`)) return true;
                
                // Show completed milestones ONLY if completed today
                if (m.completed) {
                  return isMilestoneCompletedToday(m, selectedDate);
                }
                
                // If milestone is a child
                if (m.parentId) {
                  const parent = project.milestones.find(p => p.id === m.parentId);
                  // Show child only if parent is not completed (or completed today)
                  if (parent && (!parent.completed || isMilestoneCompletedToday(parent, selectedDate))) {
                    return isMilestoneActiveToday(m, selectedDate);
                  }
                  // Don't show child if parent is completed (and not today)
                  return false;
                }
                
                // If milestone is a parent or standalone
                // Show if active OR any of its children is active/completed today
                const hasActiveOrTodayChild = project.milestones.some(child => {
                  if (child.parentId !== m.id) return false;
                  if (completingMilestones.has(`${project.id}-${child.id}`)) return true;
                  if (child.completed) return isMilestoneCompletedToday(child, selectedDate);
                  return isMilestoneActiveToday(child, selectedDate);
                });
                return isMilestoneActiveToday(m, selectedDate) || hasActiveOrTodayChild;
              });
              
              // Organize hierarchically
              const organized = [];
              const childrenMap = {};
              
              // Group children by parent
              filteredMilestones.forEach(ms => {
                if (ms.parentId) {
                  if (!childrenMap[ms.parentId]) {
                    childrenMap[ms.parentId] = [];
                  }
                  childrenMap[ms.parentId].push(ms);
                }
              });
              
              // Add parents and their children in hierarchical order
              filteredMilestones.forEach(ms => {
                if (!ms.parentId) {
                  organized.push(ms);
                  // Add children right after parent
                  if (childrenMap[ms.id]) {
                    organized.push(...childrenMap[ms.id]);
                  }
                }
              });
              
              return organized.map((milestone, index) => {
                const milestoneKey = `${project.id}-${milestone.id}`;
                const isCompleting = completingMilestones.has(milestoneKey);
                const isOverdue = isMilestoneOverdue(milestone, selectedDate);
                const isLastDay = isMilestoneLastDay(milestone, selectedDate);
                const isChild = !!milestone.parentId;
                const children = project.milestones.filter(m => m.parentId === milestone.id);
                const hasChildren = children.length > 0;
                const completedChildren = children.filter(m => m.completed).length;
                
                return (
                <TouchableOpacity 
                  key={milestone.id || index}
                  style={[
                    styles.milestoneItem,
                    { marginLeft: isChild ? 20 : 0 }
                  ]}
                  onLongPress={() => {
                    // Toggle milestone: complete ↔ active (sadece bugün)
                    handleMilestoneToggle(milestone, project, selectedDate);
                  }}
                  activeOpacity={0.7}
                  delayLongPress={500}
                >
                  <View style={styles.milestoneInfo}>
                    <Ionicons 
                      name={milestone.completed ? "checkmark-circle" : "ellipse"}
                      size={18} 
                      color={
                        milestone.completed 
                          ? (theme.name === 'dark' ? '#34C759' : '#34C759')
                          : getMilestoneColor(milestone, theme.name)
                      } 
                    />
                    <View style={styles.milestoneContent}>
                      <View style={styles.milestoneTextContainer}>
                        <Text style={[
                          styles.milestoneText,
                          {
                            color: theme.name === 'dark' ? '#FFFFFF' : '#1976D2',
                          },
                          milestone.completed && styles.completedMilestoneText,
                          isCompleting && styles.completingMilestoneText,
                          isOverdue && !milestone.completed && styles.overdueMilestoneText,
                          isLastDay && !milestone.completed && styles.lastDayMilestoneText
                        ]}>
                          {milestone.title || ''}
                        </Text>
                        {milestone.completed && isMilestoneCompletedToday(milestone, selectedDate) && (
                          <Text style={[
                            styles.completedTodayBadge,
                            { color: theme.name === 'dark' ? '#34C759' : '#34C759' }
                          ]}>
                            {' '}✓ {t('completedToday') || 'Bugün tamamlandı'}
                          </Text>
                        )}
                      </View>
                      {/* Mood stickers removed */}
                    </View>
                  </View>
                </TouchableOpacity>
                );
              });
            })()}
          </View>
        )}


        {/* Recent Entries Section */}
        <View style={styles.projectProgressSection}>
        <View style={styles.projectProgressTitleRow}>
          <Text style={[
            styles.projectProgressTitle,
            { color: theme.name === 'dark' ? '#FFFFFF' : '#1B2951' }
          ]}>
            {t('recentEntries')}
          </Text>
          {(() => {
            // Calculate unique journal card count (unique day groups)
            let journalCardCount = 0;
            if (project.journalEntries && Array.isArray(project.journalEntries)) {
              const uniqueDates = new Set();
              project.journalEntries.forEach(entry => {
                if (entry.createdAt) {
                  const date = new Date(entry.createdAt);
                  const dateKey = date.toLocaleDateString('en-US', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  });
                  uniqueDates.add(dateKey);
                }
              });
              journalCardCount = uniqueDates.size;
            }
            return (
              <View style={[
                styles.journalCountBadge,
                {
                  backgroundColor: theme.name === 'dark' ? '#007AFF' : '#007AFF',
                }
              ]}>
                <Ionicons name="journal" size={10} color="#FFFFFF" />
                <Text style={styles.journalCountText}>{journalCardCount}</Text>
              </View>
            );
          })()}
        </View>
          
          {(() => {
            const emotionalProgress = getProjectEmotionalProgress(project);
            if (emotionalProgress) {
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    const projectData = {
                      id: 'project-journal',
                      title: t('projectJournal'),
                      taskId: project.id,
                      projectTitle: project.title || '',
                      isProjectBased: true
                    };
                    onOpenJournal(projectData);
                  }}
                  style={[
                  styles.projectProgressCard,
                  { 
                    borderLeftColor: emotionalProgress.progressColor,
                    backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                    shadowColor: theme.name === 'dark' ? '#000000' : COLORS.BLACK,
                    shadowOpacity: theme.name === 'dark' ? 0 : 0.02,
                    shadowRadius: theme.name === 'dark' ? 0 : 3,
                    elevation: theme.name === 'dark' ? 0 : 1,
                    borderWidth: theme.name === 'dark' ? 1 : 0.5,
                    borderColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : emotionalProgress.progressColor + '20',
                  }
                ]}
                >
                  <View style={styles.projectProgressHeader}>
                    <View style={[
                      styles.projectProgressIconWrapper,
                      { backgroundColor: emotionalProgress.progressColor + '20' }
                    ]}>
                      <MaterialIcons 
                        name={emotionalProgress.progressIcon} 
                        size={18} 
                        color={emotionalProgress.progressColor} 
                      />
                    </View>
                    <View style={styles.projectProgressInfo}>
                      <Text style={[
                        styles.projectProgressMessage,
                        { color: theme.name === 'dark' ? '#CCCCCC' : COLORS.GRAY[700] }
                      ]} numberOfLines={4}>
                        {emotionalProgress.progressMessage}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            } else {
              // Transform Projects - No mood entries
              const generateMotivationMessage = (project) => {
                const projectTitle = project.title.toLowerCase();
                const milestoneCount = project.milestones ? project.milestones.length : 0;
                const totalEntries = project.journalEntries ? project.journalEntries.length : 0;
                
                if (projectTitle.includes('learn') || projectTitle.includes('study') || projectTitle.includes('öğren')) {
                  return t('learningJourneyMotivation');
                } else if (projectTitle.includes('work') || projectTitle.includes('çalış') || projectTitle.includes('iş')) {
                  return t('workProjectMotivation');
                } else if (projectTitle.includes('health') || projectTitle.includes('sağlık') || projectTitle.includes('fitness')) {
                  return t('healthProjectMotivation');
                } else if (projectTitle.includes('creative') || projectTitle.includes('yaratıcı') || projectTitle.includes('art')) {
                  return t('creativeProjectMotivation');
                } else if (projectTitle.includes('personal') || projectTitle.includes('kişisel') || projectTitle.includes('self')) {
                  return t('personalGrowthMotivation');
                } else if (milestoneCount > 5) {
                  return t('complexProjectMotivation');
                } else if (milestoneCount <= 2) {
                  return t('simpleProjectMotivation');
                } else if (totalEntries > 0) {
                  return t('continueJournalingMotivation');
                } else {
                  const defaultMessages = [
                    t('startYourEmotionalJourney'),
                    t('captureYourFeelings'),
                    t('documentYourProgress'),
                    t('shareYourThoughts'),
                    t('expressYourEmotions'),
                    t('recordYourExperience'),
                    t('tellYourStory'),
                    t('reflectOnYourJourney')
                  ];
                  return defaultMessages[project.id % defaultMessages.length];
                }
              };
              
              const totalEntries = project.journalEntries ? project.journalEntries.length : 0;
              const motivationMessage = generateMotivationMessage(project);
              
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    const projectData = {
                      id: 'project-journal',
                      title: t('projectJournal'),
                      taskId: project.id,
                      projectTitle: project.title || '',
                      isProjectBased: true
                    };
                    onOpenJournal(projectData);
                  }}
                  style={[
                  styles.projectProgressCard,
                  { 
                    borderLeftColor: '#FF9800',
                    backgroundColor: theme.name === 'dark' ? 'rgba(255, 152, 0, 0.05)' : 'rgba(255, 152, 0, 0.05)',
                    borderWidth: 1,
                    borderColor: theme.name === 'dark' ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 152, 0, 0.3)',
                  }
                ]}
                >
                  <View style={styles.projectProgressHeader}>
                    <View style={[
                      styles.projectProgressIconWrapper,
                      { backgroundColor: '#FF9800' }
                    ]}>
                      <MaterialIcons 
                        name="edit" 
                        size={18} 
                        color="#FFFFFF" 
                      />
                    </View>
                    <View style={styles.projectProgressInfo}>
                      <Text style={[
                        styles.projectProgressMessage,
                        { color: theme.name === 'dark' ? '#CCCCCC' : COLORS.GRAY[700] }
                      ]} numberOfLines={2}>
                        {totalEntries > 0 
                          ? t('youHaveJournalEntries', { count: totalEntries })
                          : t('startWritingJournal')
                        }
                      </Text>
                      <Text style={[
                        styles.projectProgressMotivation,
                        { color: theme.name === 'dark' ? '#8E8E93' : '#666666' }
                      ]} numberOfLines={3}>
                        {totalEntries > 0 
                          ? t('thoughtsValuable')
                          : motivationMessage
                        }
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }
          })()}
        </View>


        {/* Journal Add Button removed; Recent Entries are clickable */}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
});

const styles = StyleSheet.create({
  projectSummaryCard: {
    borderRadius: 16,
    padding: 20,
    marginTop: 6,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    marginHorizontal: 0,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  projectTitleContainer: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginRight: 12,
  },
  projectTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    flexShrink: 1,
  },
  focusedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  focusedBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  projectDateRange: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
  },
  lastDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8E7DBE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  lastDayText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  overdueText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  minimalAddMilestoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  minimalAddMilestoneText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    marginLeft: 6,
  },
  milestonesList: {
    marginTop: 8,
  },
  milestoneItem: {
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(142, 142, 147, 0.2)',
  },
  milestoneInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  milestoneContent: {
    flex: 1,
    marginLeft: 10,
  },
  milestoneTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  milestoneText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 4,
  },
  completedMilestoneText: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
  },
  completingMilestoneText: {
    color: '#8E8E93',
  },
  overdueMilestoneText: {
    color: '#FF4444',
  },
  lastDayMilestoneText: {
    color: '#8E7DBE',
  },
  completedTodayBadge: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    marginTop: 2,
  },
  // Recent Entries Styles
  projectProgressSection: {
    marginTop: 45,
  },
  projectProgressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  projectProgressTitle: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  journalCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  journalCountText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  projectProgressCard: {
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  projectProgressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  projectProgressIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  projectProgressInfo: {
    flex: 1,
  },
  projectProgressMessage: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 18,
  },
  projectProgressMotivation: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 16,
    marginTop: 4,
  },
  // Journal Button Styles
  journalActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});

export default ProjectCard;

