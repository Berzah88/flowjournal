// components/DailyMoodSummary.js
import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { MOODS, EXTENDED_MOODS } from '../utils/AIMoodPredictor';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

const DailyMoodSummary = ({ 
  activeTasks = [], 
  completedTasks = [], // Tamamlanmış projeler de eklendi
  selectedDate,
  hasMedia = false,
  onPress = null,
  navigation = null,
  insideCard = false
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  // ---------- Helpers: colors, icons, recency ----------
  const getSolidMoodColor = useCallback((originalColor) => {
    const map = {
      '#C8E6C9': '#4CAF50',
      '#FFE0B2': '#FF9800',
      '#E1BEE7': '#9C27B0',
      '#FFCDD2': '#F44336',
      '#FFAB91': '#FF5722',
      '#FFCCBC': '#FF7043',
      '#FFF3E0': '#FFB74D',
      '#E8F5E8': '#66BB6A',
      '#E1F5FE': '#42A5F5',
      '#FFF8E1': '#FFCA28',
      '#F3E5F5': '#BA68C8',
      '#FFEBEE': '#EF5350',
      '#E0E0E0': '#90A4AE',
      '#DCEDC8': '#8BC34A',
      '#F5F5F5': '#BDBDBD',
      '#FFE0E6': '#F48FB1',
      '#E8EAF6': '#7986CB',
      '#E0F2F1': '#4DB6AC',
      '#FFFDE7': '#FFF176',
      '#FAFAFA': '#E0E0E0',
      '#FFF9C4': '#FFF59D',
      '#FCE4EC': '#F06292',
      '#CFD8DC': '#90A4AE',
    };
    return map[originalColor] || originalColor || '#8E8E93';
  }, []);

  const getMoodIconSafe = useCallback((key) => {
    switch (key) {
      case 'happy': return 'sentiment-satisfied';
      case 'excited': return 'celebration';
      case 'grateful': return 'favorite';
      case 'hopeful': return 'wb-sunny';
      case 'proud': return 'emoji-events';
      case 'relieved': return 'spa';
      case 'motivated': return 'trending-up';
      case 'peaceful': return 'spa';
      case 'content': return 'sentiment-satisfied';
      case 'confident': return 'self-improvement';
      case 'sad': return 'sentiment-dissatisfied';
      case 'angry': return 'mood-bad';
      case 'tired': return 'bedtime';
      case 'frustrated': return 'psychology';
      case 'anxious': return 'warning';
      case 'overwhelmed': return 'psychology';
      case 'lonely': return 'person-off';
      case 'confused': return 'help';
      case 'disappointed': return 'sentiment-dissatisfied';
      case 'worried': return 'psychology';
      case 'bored': return 'sentiment-neutral';
      case 'stressed': return 'psychology';
      case 'exhausted': return 'bedtime';
      case 'calm': return 'spa';
      case 'curious': return 'explore';
      case 'nostalgic': return 'history';
      case 'surprised': return 'emoji-emotions';
      case 'focused': return 'center-focus-strong';
      case 'neutral': return 'trending-flat';
      case 'natural': return 'sentiment-neutral';
      default: return 'sentiment-neutral';
    }
  }, []);

  const getRecencyWeight = useCallback((timestamp) => {
    const tms = new Date(timestamp).getTime();
    const diff = Date.now() - tms;
    if (diff < 60 * 60 * 1000) return 3.0;      // <1h
    if (diff < 3 * 60 * 60 * 1000) return 2.0;  // <3h
    if (diff < 6 * 60 * 60 * 1000) return 1.5;  // <6h
    if (diff < 12 * 60 * 60 * 1000) return 1.2; // <12h
    return 1.0;
  }, []);

  // ---------- Gather entries and detect dominant mood (recency-weighted) ----------
  const allJournalEntries = useMemo(() => {
    const list = [];
    const all = [...activeTasks, ...completedTasks];
    all.forEach(task => {
      if (task?.journalEntries && Array.isArray(task.journalEntries)) {
        task.journalEntries.forEach(e => {
          if (e?.createdAt && (e.mood || e.moodIcon || e.moodColor)) {
            list.push({ ...e, projectId: task.id });
          }
        });
      }
      // Legacy milestone-based entries (backward compatibility)
      if (task?.milestones && Array.isArray(task.milestones)) {
        task.milestones.forEach(ms => {
          if (ms?.journalEntries && Array.isArray(ms.journalEntries)) {
            ms.journalEntries.forEach(e => {
              if (e?.createdAt && (e.mood || e.moodIcon || e.moodColor)) {
                list.push({ ...e, projectId: task.id });
              }
            });
          }
        });
      }
    });
    return list;
  }, [activeTasks, completedTasks]);

  const dominantMoodForSelectedDate = useMemo(() => {
    if (!selectedDate) return null;
    const day = new Date(selectedDate);
    day.setHours(0,0,0,0);
    const entries = allJournalEntries.filter(e => {
      const d = new Date(e.createdAt); d.setHours(0,0,0,0);
      return d.getTime() === day.getTime() && e.mood;
    });
    if (entries.length === 0) return null;

    const scores = {};
    entries.forEach(e => {
      const w = getRecencyWeight(e.createdAt);
      scores[e.mood] = (scores[e.mood] || 0) + w;
    });

    let bestKey = null, bestScore = -Infinity;
    Object.entries(scores).forEach(([k, s]) => { if (s > bestScore) { bestScore = s; bestKey = k; } });
    const mood = MOODS.find(m => m.key === bestKey) || EXTENDED_MOODS.find(m => m.key === bestKey) || null;
    return mood || (entries[0]?.mood ? { key: entries[0].mood, color: entries[0].moodColor, icon: entries[0].moodIcon } : null);
  }, [allJournalEntries, selectedDate, getRecencyWeight]);

  // ---------- Quick Tips ----------
  const generateQuickTip = useCallback((moodKey) => {
    const tips = {
      happy: ['keepDoingHappy','happinessContagious','joyWellDeserved'],
      excited: ['channelExcitement','enthusiasmPowerful','energyPerfect'],
      grateful: ['keepDoingHappy','joyWellDeserved','emotionalAwareness'],
      hopeful: ['continueTracking','setSmallGoals','emotionalAwareness'],
      proud: ['continueTracking','setSmallGoals','emotionalAwareness'],
      motivated: ['motivationStrong','determinationAdvantage','motivationInspiring'],
      peaceful: ['calmnessSuperpower','tranquilityPerfect','serenityValuable'],
      content: ['continueTracking','setSmallGoals','emotionalAwareness'],
      confident: ['motivationStrong','determinationAdvantage','motivationInspiring'],
      sad: ['okayToFeel','sadnessTemporary','considerCausingSadness'],
      angry: ['frustrationSignalsGrowth','identifyFrustration','changeApproach'],
      tired: ['bodyAskingRest','prioritizeSelfCare','reassessWorkLife'],
      frustrated: ['frustrationSignalsGrowth','identifyFrustration','changeApproach'],
      anxious: ['anxietyManageable','breakDownTasks','listenAnxiety'],
      overwhelmed: ['breakDownTasks','anxietyManageable','listenAnxiety'],
      lonely: ['okayToFeel','continueTracking','emotionalAwareness'],
      confused: ['continueTracking','setSmallGoals','emotionalAwareness'],
      disappointed: ['changeApproach','setSmallGoals','continueTracking'],
      worried: ['anxietyManageable','listenAnxiety','continueTracking'],
      bored: ['setSmallGoals','continueTracking','emotionalAwareness'],
      stressed: ['breakDownTasks','prioritizeSelfCare','setSmallGoals'],
      exhausted: ['bodyAskingRest','prioritizeSelfCare','reassessWorkLife'],
      calm: ['calmnessSuperpower','tranquilityPerfect','serenityValuable'],
      curious: ['setSmallGoals','continueTracking','emotionalAwareness'],
      nostalgic: ['emotionalAwareness','continueTracking','setSmallGoals'],
      surprised: ['continueTracking','emotionalAwareness','setSmallGoals'],
      focused: ['motivationStrong','setSmallGoals','emotionalAwareness'],
      neutral: ['continueTracking','setSmallGoals','emotionalAwareness'],
      natural: ['continueTracking','setSmallGoals','emotionalAwareness'],
      default: ['continueTracking','setSmallGoals','emotionalAwareness']
    };
    const list = tips[moodKey] || tips.default;
    return t(list[Math.floor(Math.random() * list.length)]);
  }, [t]);

  // Milestone'ın bugün için uygun olup olmadığını kontrol et
  const isMilestoneActiveToday = (milestone, selectedDate) => {
    const today = new Date(selectedDate);
    today.setHours(0, 0, 0, 0);
    
    if (milestone.startDate) {
      const milestoneStartDate = new Date(milestone.startDate);
      milestoneStartDate.setHours(0, 0, 0, 0);
      if (milestoneStartDate > today) return false;
    }
    
    if (milestone.endDate) {
      const milestoneEndDate = new Date(milestone.endDate);
      milestoneEndDate.setHours(23, 59, 59, 999);
      if (milestoneEndDate < today) return false;
    }
    
    return true;
  };
  
  // Progress hesaplama
  const progressData = useMemo(() => {
    const today = new Date(selectedDate);
    today.setHours(0, 0, 0, 0);
    
    const totalMilestones = activeTasks.reduce((acc, project) => 
      acc + (project.milestones?.filter(m => !m.completed && isMilestoneActiveToday(m, today)).length || 0), 0
    );
    const completedMilestones = activeTasks.reduce((acc, project) => 
      acc + (project.milestones?.filter(m => m.completed && isMilestoneActiveToday(m, today)).length || 0), 0
    );
    
    const total = totalMilestones + completedMilestones;
    const percentage = total > 0 ? Math.round((completedMilestones / total) * 100) : 0;
    
    return {
      total,
      completed: completedMilestones,
      remaining: totalMilestones,
      percentage
    };
  }, [activeTasks, selectedDate]);
  
  // Sadece bugün için göster (component değil, progress için)
  const today = new Date();
  const selectedDateObj = new Date(selectedDate);
  today.setHours(0, 0, 0, 0);
  selectedDateObj.setHours(0, 0, 0, 0);
  const isToday = selectedDateObj.getTime() === today.getTime();
  
  // Remove early return: component now always renders; use isToday to control progress visibility
  
  const content = (
    <View style={[
      insideCard ? styles.containerInside : styles.container,
      hasMedia && styles.mediaOverlay
    ]}>
      {/* AI-Powered Quick Tip Only */}
      {(() => {
        const moodObj = dominantMoodForSelectedDate || { key: 'neutral', color: '#CFD8DC', icon: 'sentiment-neutral' };
        const isDark = theme.name === 'dark';
        const moodColor = getSolidMoodColor(moodObj.color || '#8E8E93');
        const quickTip = generateQuickTip(moodObj.key || 'default');
        return (
          <View style={[
            styles.moodStatementCard,
            {
              backgroundColor: isDark ? 'rgba(25, 118, 210, 0.08)' : 'rgba(25, 118, 210, 0.05)',
              borderLeftColor: moodColor,
            }
          ]}>
            <View style={styles.quickTipRow}>
              <View style={[styles.moodIconCircle, { borderColor: moodColor }] }>
                <MaterialIcons name={getMoodIconSafe(moodObj.key)} size={16} color={moodColor} />
              </View>
              <Ionicons name="bulb-outline" size={14} color={isDark ? '#9ED0FF' : '#1976D2'} style={{ marginLeft: 4 }} />
              <Text style={[styles.quickTipText, { color: isDark ? '#E5F2FF' : '#0F3D91' }]}>
                {quickTip}
              </Text>
            </View>
          </View>
        );
      })()}

      {/* Progress Status - Inline Design (only for today) */}
      {isToday && progressData.total > 0 && (
        <View style={[
          styles.progressStatus,
          {
            backgroundColor: theme.name === 'dark' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(52, 199, 89, 0.05)',
            borderLeftColor: theme.name === 'dark' ? '#34C759' : '#34C759'
          }
        ]}>
          <View style={styles.progressIconContainer}>
            <Ionicons name="trending-up" size={16} color="#34C759" />
          </View>
          
          <View style={styles.progressContent}>
            <View style={styles.progressHeader}>
              <Text style={[
                styles.progressText,
                { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
              ]}>{t('progressStatus')}</Text>
              <Text style={[
                styles.progressPercentage,
                { 
                  color: theme.name === 'dark' ? '#34C759' : '#34C759',
                  backgroundColor: theme.name === 'dark' ? 'rgba(52, 199, 89, 0.2)' : 'rgba(52, 199, 89, 0.1)'
                }
              ]}>{progressData.percentage}%</Text>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={[
                styles.progressBar,
                { backgroundColor: theme.name === 'dark' ? 'rgba(52, 199, 89, 0.3)' : 'rgba(52, 199, 89, 0.2)' }
              ]}>
                <View style={[
                  styles.progressBarFill,
                  { width: `${progressData.percentage}%` }
                ]}>
                  <LinearGradient
                    colors={['#34C759', '#30D158']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressGradient}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 30,
    marginTop: 8,
    marginBottom: 4,
  },
  containerInside: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 12,
  },
  mediaOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    marginHorizontal: 16,
    marginTop: 8,
  },

  // Mood Statement Card
  moodStatementCard: {
    // container already handles horizontal margins
    marginTop: 4,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderLeftWidth: 3,
  },
  moodIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickTipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_500Medium',
  },

  // Progress Status Styles
  progressStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    marginTop: 4,
    marginHorizontal: 0,
  },
  progressIconContainer: {
    marginRight: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContent: {
    flex: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
  progressPercentage: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  progressBarContainer: {
    marginBottom: 0,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
    borderRadius: 2,
  },
});

export default DailyMoodSummary;
