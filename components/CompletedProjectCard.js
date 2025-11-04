import React, { useMemo, memo, useRef, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import { FONTS } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const CompletedProjectCard = memo(({ 
  title, 
  startDate, 
  endDate, 
  milestones = [], 
  onPress,
  style,
  compact = false, // Grid view için compact mode
  task = null // Task prop'u eklendi
}) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  
  
  // Milestone istatistikleri
  const milestoneStats = useMemo(() => {
    const total = milestones.length;
    const completed = milestones.filter(m => m.completed).length;
    const journalEntries = task?.journalEntries?.length || 0; // Project-based journal entries
    
    return { total, completed, journalEntries };
  }, [milestones, task?.journalEntries]);

  // Tarih formatı
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const locale = language === 'tr' ? 'tr-TR' : (language || 'en-US');
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(locale, { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } catch (e) {
      return '';
    }
  };

  // Proje süresi hesaplama
  const projectDuration = useMemo(() => {
    if (!startDate || !endDate) return '';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 gün';
    if (diffDays < 7) return `${diffDays} gün`;
    if (diffDays < 30) return `${Math.round(diffDays / 7)} hafta`;
    return `${Math.round(diffDays / 30)} ay`;
  }, [startDate, endDate]);

  // Animation ref for press feedback
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Press animation handlers
  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={[
      {
        // Apple-style touch animation (scale only - no haptic)
        transform: [{ scale: scaleAnim }],
      }
    ]}>
      <Pressable 
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.container, 
          style,
          {
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
            borderColor: theme.name === 'dark' ? '#000000' : 'rgba(0, 0, 0, 0.03)',
            borderWidth: theme.name === 'dark' ? 1.5 : 0.5,
            shadowColor: theme.name === 'dark' ? '#000000' : '#000',
            shadowOpacity: theme.name === 'dark' ? 0.3 : 0.05,
            shadowRadius: theme.name === 'dark' ? 12 : 8,
            elevation: theme.name === 'dark' ? 8 : 1,
          }
        ]} 
        onPress={() => {
          scaleAnim.setValue(1); // Reset immediately before opening
          onPress?.();
        }}
        android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={[
              styles.title,
              { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
            ]} numberOfLines={2}>
              {title}
            </Text>
            <View style={[
              styles.completedBadge,
              {
                backgroundColor: theme.name === 'dark' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)',
              }
            ]}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.completedText}>{t('completed')}</Text>
            </View>
          </View>
        </View>

        {/* Date Range */}
        <View style={styles.dateContainer}>
          <View style={styles.dateItem}>
            <Ionicons 
              name="calendar-outline" 
              size={14} 
              color={theme.name === 'dark' ? '#8E8E93' : '#8E8E93'} 
            />
            <Text style={[
              styles.dateText,
              { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
            ]}>
              {formatDate(startDate)} - {formatDate(endDate)}
            </Text>
          </View>
          <View style={[
            styles.durationBadge,
            {
              backgroundColor: theme.name === 'dark' ? 'rgba(74, 144, 226, 0.2)' : 'rgba(74, 144, 226, 0.1)',
            }
          ]}>
            <Text style={styles.durationText}>{projectDuration}</Text>
          </View>
        </View>

        {/* Statistics */}
        {!compact && (
          <View style={[
            styles.statsContainer,
            {
              backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            }
          ]}>
            <View style={styles.statItem}>
              <Ionicons name="flag" size={16} color="#FF9800" />
              <Text style={[
                styles.statNumber,
                { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
              ]}>{milestoneStats.total}</Text>
              <Text style={[
                styles.statLabel,
                { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
              ]}>Milestone</Text>
            </View>
            
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={[
                styles.statNumber,
                { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
              ]}>{milestoneStats.completed}</Text>
              <Text style={[
                styles.statLabel,
                { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
              ]}>Tamamlandı</Text>
            </View>
            
            <View style={styles.statItem}>
              <Ionicons name="journal" size={16} color="#2196F3" />
              <Text style={[
                styles.statNumber,
                { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
              ]}>{milestoneStats.journalEntries}</Text>
              <Text style={[
                styles.statLabel,
                { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
              ]}>Günlük</Text>
            </View>
          </View>
        )}

        {/* Compact Statistics for Grid View */}
        {compact && (
          <View style={[
            styles.compactStatsContainer,
            {
              backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            }
          ]}>
            <View style={styles.compactStatItem}>
              <Ionicons name="flag" size={12} color="#FF9800" />
              <Text style={[
                styles.compactStatText,
                { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
              ]}>{milestoneStats.total}</Text>
            </View>
            <View style={styles.compactStatItem}>
              <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
              <Text style={[
                styles.compactStatText,
                { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
              ]}>{milestoneStats.completed}</Text>
            </View>
            <View style={styles.compactStatItem}>
              <Ionicons name="journal" size={12} color="#2196F3" />
              <Text style={[
                styles.compactStatText,
                { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }
              ]}>{milestoneStats.journalEntries}</Text>
            </View>
          </View>
        )}

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[
            styles.progressBar,
            {
              backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            }
          ]}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${milestoneStats.total > 0 ? (milestoneStats.completed / milestoneStats.total) * 100 : 0}%` }
              ]} 
            />
          </View>
          <Text style={[
            styles.progressText,
            { color: theme.name === 'dark' ? '#4CAF50' : '#4CAF50' }
          ]}>
            %{milestoneStats.total > 0 ? Math.round((milestoneStats.completed / milestoneStats.total) * 100) : 0} tamamlandı
          </Text>
        </View>

        {/* Footer */}
        <View style={[
          styles.footer,
          {
            borderTopColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
          }
        ]}>
          <View style={styles.footerLeft}>
            <Ionicons name="trophy" size={14} color="#FFD700" />
            <Text style={[
              styles.footerText,
              { color: theme.name === 'dark' ? '#8E8E93' : '#8E8E93' }
            ]}>Başarıyla tamamlandı</Text>
          </View>
          <Ionicons 
            name="chevron-forward" 
            size={16} 
            color={theme.name === 'dark' ? '#8E8E93' : '#C7C7CC'} 
          />
        </View>
    </Pressable>
    </Animated.View>
  );
});

CompletedProjectCard.propTypes = {
  title: PropTypes.string.isRequired,
  startDate: PropTypes.string,
  endDate: PropTypes.string,
  milestones: PropTypes.array,
  onPress: PropTypes.func,
  style: PropTypes.object,
  compact: PropTypes.bool,
  task: PropTypes.object,
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
  },
  header: {
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.SEMI_BOLD,
    color: '#1D1D1F',
    flex: 1,
    marginRight: 12,
    lineHeight: 24,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    fontFamily: FONTS.MEDIUM,
    color: '#4CAF50',
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    fontFamily: FONTS.REGULAR,
    color: '#8E8E93',
  },
  durationBadge: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 12,
    fontFamily: FONTS.MEDIUM,
    color: '#4A90E2',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 18,
    fontFamily: FONTS.BOLD,
    color: '#1D1D1F',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: FONTS.MEDIUM,
    color: '#8E8E93',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: FONTS.MEDIUM,
    color: '#4CAF50',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0, 0, 0, 0.04)',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    fontFamily: FONTS.MEDIUM,
    color: '#8E8E93',
  },
  // Compact styles for grid view
  compactStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
  },
  compactStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactStatText: {
    fontSize: 12,
    fontFamily: FONTS.SEMI_BOLD,
    color: '#1D1D1F',
  },
});

export default CompletedProjectCard;
