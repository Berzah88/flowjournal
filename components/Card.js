import React, { useEffect, useRef, useMemo, useCallback, memo } from "react";
import { View, Text, StyleSheet, Image, Animated, Pressable } from "react-native";
import Svg, { Circle } from "react-native-svg";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import PropTypes from "prop-types";
import { getMilestoneColor, getMilestoneCardColor } from '../utils/milestoneColors';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, ANIMATION_DURATIONS } from '../constants';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Hex rengi RGB'ye çeviren fonksiyon
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 211, g: 203, b: 227 }; // Varsayılan renk
};

// Mood tag'lerini render eden fonksiyon - basit ve temiz
const MoodTags = memo(({ project, theme }) => {
  const recentMoods = useMemo(() => {
    if (!project || !project.journalEntries || project.journalEntries.length === 0) {
      return [];
    }

    // Son 3 mood'u al (en yeni önce)
    return project.journalEntries
      ?.slice()
      ?.sort((a, b) => b.id - a.id) // En yeni entry'ler önce
      ?.filter(entry => entry.mood || entry.moodIcon || entry.moodColor) // Sadece mood'u olan entry'ler
      ?.slice(0, 3); // En fazla 3 mood göster
  }, [project.journalEntries]);

  // Eğer mood yoksa hiçbir şey gösterme
  if (recentMoods.length === 0) {
    return null;
  }

  return (
    <View style={styles.moodTagsContainer}>
      {recentMoods.map((entry, index) => {
        if (!entry.mood && !entry.moodIcon && !entry.moodColor) return null;
        
        const iconName = entry.moodIcon || entry.mood || 'sentiment-satisfied';
        const backgroundColor = entry.moodColor || theme.colors.primary;
        
        return (
          <View 
            key={`${entry.id}-${index}`}
            style={[
              styles.moodTag, 
              { 
                backgroundColor: backgroundColor, // Same color for both themes
                borderColor: theme.name === 'dark' 
                  ? 'rgba(255, 255, 255, 0.2)' 
                  : 'rgba(0, 0, 0, 0.1)',
                borderWidth: 1,
                zIndex: index + 1 // Sağdaki (son eklenen) en yüksek zIndex
              }
            ]}
          >
            <MaterialIcons
              name={iconName}
              size={12}
              color={theme.name === 'dark' ? '#000000' : '#333'}
            />
          </View>
        );
      })}
    </View>
  );
});

const Card = memo(function Card({ title, startDate, endDate, completed = false, activeMilestones = [], onMilestonePress, onPress, task }) {
  // Performance monitoring (sadece development'ta)
  // Performance monitoring - sadece kritik durumlarda uyar
  usePerformanceMonitor('Card', {
    trackFPS: false, // FPS tracking'i kapat
    warnThreshold: 200, // Daha yüksek threshold
    criticalThreshold: 500 // Daha yüksek critical threshold
  });
  
  // Theme context
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  // Safety check for required props
  if (!title || !startDate || !endDate) {
    return null;
  }
  
  // Memoize expensive calculations
  const { totalDays, remainingDays, progress } = useMemo(() => {
    const total = Math.max(
      1,
      (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
    );
    const remaining = Math.max(
      0,
      (new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    const prog = Math.min(1, (total - remaining) / total);
    
    return {
      totalDays: total,
      remainingDays: remaining,
      progress: prog
    };
  }, [startDate, endDate]);

  // Memoize circle calculations
  const { radius, strokeWidth, center, circumference } = useMemo(() => {
    const r = 28;
    const sw = 8;
    const c = r + sw;
    const circ = 2 * Math.PI * r;
    
    return {
      radius: r,
      strokeWidth: sw,
      center: c,
      circumference: circ
    };
  }, []);

  const animatedValue = useRef(new Animated.Value(0)).current;

  // Memoized milestone press handler
  const handleMilestonePress = useCallback((milestone) => {
    onMilestonePress?.(milestone);
  }, [onMilestonePress]);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: ANIMATION_DURATIONS.VERY_SLOW,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      animatedValue.stopAnimation();
    };
  }, []);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const cardStyle = [styles.card, completed ? styles.completedCard : {}];
  const titleStyle = [styles.title, completed ? styles.completedTitle : {}];
  const daysLeftTextStyle = [styles.daysLeftText, completed ? styles.completedDaysText : {}];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.modernCard,
        { 
          backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
          borderColor: theme.name === 'dark' ? '#000000' : 'rgba(0, 0, 0, 0.03)',
          borderWidth: theme.name === 'dark' ? 1.5 : 0.5,
          shadowColor: theme.name === 'dark' ? '#000000' : '#000',
          shadowOpacity: theme.name === 'dark' ? 0.3 : 0.05,
          shadowRadius: theme.name === 'dark' ? 12 : 8,
          elevation: theme.name === 'dark' ? 8 : 1,
        },
        completed && styles.modernCompletedCard,
        {
          transform: [{ scale: pressed ? 0.98 : 1 }],
        }
      ]}
      onPress={onPress}
    >
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <View style={styles.modernTitleSection}>
          <Text style={[
            styles.modernTitle, 
            { color: theme.name === 'dark' ? '#FF6B6B' : theme.colors.text },
            completed && styles.modernCompletedTitle
          ]}>
            {title}
          </Text>
          
          <View style={[
            styles.modernDateFrame, 
            {
              backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#F2F2F7',
              borderColor: theme.name === 'dark' ? '#2C2C2E' : 'transparent',
              borderWidth: theme.name === 'dark' ? 0.5 : 0,
            },
            completed && styles.modernCompletedDateFrame
          ]}>
            <Text style={[
              styles.modernDateRange, 
              { color: theme.name === 'dark' ? '#8E8E93' : theme.colors.textSecondary },
              completed && styles.modernCompletedDateText
            ]}>
              {new Date(startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })} - {new Date(endDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
            </Text>
          </View>
          
          {/* Project Mood Indicator - Tarihin altında */}
          {task && <MoodTags project={task} theme={theme} />}
        </View>
      </View>

      {/* Modern Bottom Section */}
      <View style={[styles.modernBottomSection, completed && styles.modernCompletedBottomSection]}>
        <View style={styles.modernDaysLeft}>
          <MaterialIcons 
            name="schedule" 
            size={16} 
            color={completed ? theme.colors.textTertiary : theme.colors.primary} 
          />
          <Text style={[
            styles.modernDaysLeftText, 
            { color: theme.colors.textSecondary },
            completed && styles.modernCompletedDaysText
          ]}>
            {completed ? `${Math.ceil(totalDays)} days completed` : `${Math.ceil(remainingDays)} gün kaldı`}
          </Text>
        </View>
        
      </View>


      {/* Completed Stats Section */}
      {completed && (
        <View style={[
          styles.completedStatsSection,
          {
            borderTopColor: theme.name === 'dark' 
              ? 'rgba(255, 255, 255, 0.15)' 
              : 'rgba(199, 199, 204, 0.3)',
          }
        ]}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons 
                name="list" 
                size={16} 
                color={theme.name === 'dark' ? '#AEAEB2' : theme.colors.textTertiary} 
              />
              <Text style={[
                styles.statText, 
                { color: theme.name === 'dark' ? '#AEAEB2' : theme.colors.textSecondary }
              ]}>
                {activeMilestones.length} milestone
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons 
                name="location" 
                size={16} 
                color={theme.name === 'dark' ? '#AEAEB2' : theme.colors.textTertiary} 
              />
              <Text style={[
                styles.statText, 
                { color: theme.name === 'dark' ? '#AEAEB2' : theme.colors.textSecondary }
              ]}>
                {activeMilestones.reduce((total, ms) => 
                  total + (ms.journalEntries?.filter(entry => entry.location).length || 0), 0
                )} konum
              </Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons 
                name="journal" 
                size={16} 
                color={theme.name === 'dark' ? '#AEAEB2' : theme.colors.textTertiary} 
              />
              <Text style={[
                styles.statText, 
                { color: theme.name === 'dark' ? '#AEAEB2' : theme.colors.textSecondary }
              ]}>
                {activeMilestones.reduce((total, ms) => total + (ms.journalEntries?.length || 0), 0)} günlük
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons 
                name="image" 
                size={16} 
                color={theme.name === 'dark' ? '#AEAEB2' : theme.colors.textTertiary} 
              />
              <Text style={[
                styles.statText, 
                { color: theme.name === 'dark' ? '#AEAEB2' : theme.colors.textSecondary }
              ]}>
                {activeMilestones.reduce((total, ms) => 
                  total + (ms.journalEntries?.reduce((entryTotal, entry) => 
                    entryTotal + (entry.images?.length || 0), 0) || 0), 0
                )} medya
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Milestones Listesi - Sadece active projeler için göster */}
      {!completed && activeMilestones.length > 0 && (
        <View style={styles.milestoneList}>
          {(() => {
            // Organize milestones hierarchically
            const organized = [];
            const childrenMap = {};
            
            // Group children by parent
            activeMilestones.forEach(ms => {
              if (ms.parentId) {
                if (!childrenMap[ms.parentId]) {
                  childrenMap[ms.parentId] = [];
                }
                childrenMap[ms.parentId].push(ms);
              }
            });
            
            // Add parents and their children
            activeMilestones.forEach(ms => {
              if (!ms.parentId) {
                organized.push(ms);
                // Add children right after parent
                if (childrenMap[ms.id]) {
                  organized.push(...childrenMap[ms.id]);
                }
              }
            });
            
            return organized.map((ms, index) => {
              const isChild = !!ms.parentId;
              const children = activeMilestones.filter(m => m.parentId === ms.id);
              const hasChildren = children.length > 0;
              const completedChildren = children.filter(m => m.completed).length;
              
              return (
                <View key={ms.id}>
                  <View 
                    style={[
                      styles.milestoneItemClickable,
                      {
                        backgroundColor: theme.name === 'dark' ? '#1C1C1E' : 'rgba(0, 122, 255, 0.04)',
                        borderColor: theme.name === 'dark' ? '#2C2C2E' : 'transparent',
                        borderWidth: theme.name === 'dark' ? 0.5 : 0,
                        marginLeft: isChild ? 20 : 0, // Indent for children
                      },
                      completed && styles.completedMilestoneItem,
                    ]}
                  >
                    <View style={styles.iconContainer}>
                      <Ionicons 
                        name={ms.completed ? "checkmark-circle" : "ellipse"} 
                        size={18} 
                        color={ms.completed ? "#636366" : getMilestoneColor(ms)} 
                      />
                    </View>
                    <View style={styles.milestoneContent}>
                      <Text style={[
                        styles.milestoneText, 
                        { color: theme.name === 'dark' ? '#FFFFFF' : theme.colors.text },
                        completed ? styles.completedMilestoneText : {},
                        ms.completed ? { opacity: 0.9 } : {}
                      ]}>
                        {ms.title || t('untitled')}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            });
          })()}
        </View>
      )}
    </Pressable>
  );
}, (prevProps, nextProps) => {
  // Smart comparison function - only re-render when necessary
  // Check basic props first (fastest)
  if (prevProps.title !== nextProps.title ||
      prevProps.startDate !== nextProps.startDate ||
      prevProps.endDate !== nextProps.endDate ||
      prevProps.completed !== nextProps.completed) {
    return false; // Re-render needed
  }
  
  // Check task object - important for detecting parentId changes
  const prevTask = prevProps.task;
  const nextTask = nextProps.task;
  
  if (prevTask && nextTask) {
    const prevTaskMilestones = prevTask.milestones || [];
    const nextTaskMilestones = nextTask.milestones || [];
    
    if (prevTaskMilestones.length !== nextTaskMilestones.length) {
      return false; // Re-render needed
    }
    
    // Create ID-based map to check parentId changes (order-independent)
    const prevParentIdMap = {};
    const nextParentIdMap = {};
    
    prevTaskMilestones.forEach(ms => {
      if (ms && ms.id) {
        prevParentIdMap[ms.id] = ms.parentId;
      }
    });
    
    nextTaskMilestones.forEach(ms => {
      if (ms && ms.id) {
        nextParentIdMap[ms.id] = ms.parentId;
      }
    });
    
    // Check if any milestone's parentId changed
    for (const id in prevParentIdMap) {
      if (prevParentIdMap[id] !== nextParentIdMap[id]) {
        return false; // Re-render needed - parentId changed!
      }
    }
  }
  
  // Check milestones length (fast)
  const prevMilestones = prevProps.activeMilestones || [];
  const nextMilestones = nextProps.activeMilestones || [];
  
  if (prevMilestones.length !== nextMilestones.length) {
    return false; // Re-render needed
  }
  
  // Check milestones content (only if length matches)
  for (let i = 0; i < prevMilestones.length; i++) {
    const prev = prevMilestones[i];
    const next = nextMilestones[i];
    
    if (!prev || !next) return false;
    
    // Check basic milestone properties including parentId
    if (prev.id !== next.id ||
        prev.title !== next.title ||
        prev.completed !== next.completed ||
        prev.parentId !== next.parentId) {
      return false; // Re-render needed
    }
    
    // Check journal entries length
    const prevEntries = prev.journalEntries || [];
    const nextEntries = next.journalEntries || [];
    
    if (prevEntries.length !== nextEntries.length) {
      return false; // Re-render needed
    }
    
    // Check journal entries content (only if length matches)
    for (let j = 0; j < prevEntries.length; j++) {
      const prevEntry = prevEntries[j];
      const nextEntry = nextEntries[j];
      
      if (!prevEntry || !nextEntry) return false;
      
      // Check mood-related properties
      if (prevEntry.id !== nextEntry.id ||
          prevEntry.mood !== nextEntry.mood ||
          prevEntry.moodIcon !== nextEntry.moodIcon ||
          prevEntry.moodColor !== nextEntry.moodColor ||
          prevEntry.createdAt !== nextEntry.createdAt) {
        return false; // Re-render needed
      }
    }
  }
  
  return true; // No re-render needed
});

export default Card;

const styles = StyleSheet.create({
  // Modern Card Styles
  modernCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
    width: "100%",
    shadowOffset: { width: 0, height: 2 },
  },
  modernCompletedCard: {
    backgroundColor: "#F2F2F7", // Hafif koyu gri arka plan
    borderColor: "#000000", // Siyah border
    borderWidth: 1.5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    paddingVertical: 20, // Üst-alt boşluk artırıldı
    paddingHorizontal: 20, // Yan boşluklar artırıldı
  },
  modernHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20, // Boşluk artırıldı
  },
  modernTitleSection: {
    flex: 1,
    marginRight: 16,
  },
  modernTitle: {
    fontSize: 18,
    fontFamily: FONTS.BOLD,
    letterSpacing: -0.3,
    color: "#1D1D1F",
    lineHeight: 24,
    marginBottom: 4,
  },
  modernDateFrame: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8, // Boşluk artırıldı
  },
  modernDateRange: {
    fontSize: 12,
    fontFamily: FONTS.MEDIUM,
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  modernBottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16, // Boşluk artırıldı
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  modernCompletedBottomSection: {
    borderTopColor: 'rgba(199, 199, 204, 0.3)',
  },
  modernDaysLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernDaysLeftText: {
    fontSize: 13,
    fontFamily: FONTS.MEDIUM,
    color: "#007AFF",
    marginLeft: 6,
  },
  // Completed States - Dengeli Gri Tema
  modernCompletedTitle: {
    color: "#1D1D1F", // Koyu gri metin
  },
  modernCompletedDateFrame: {
    backgroundColor: '#D1D1D6', // Orta gri arka plan
  },
  modernCompletedDateText: {
    color: "#636366", // Orta koyu gri metin
  },
  modernCompletedDaysText: {
    color: "#636366", // Orta koyu gri metin
  },
  modernCompletedMilestoneText: {
    color: "#1D1D1F", // Koyu gri metin
  },
  // Legacy styles (keeping for compatibility)
  card: {
    backgroundColor: "#FFFFFF", // Temiz beyaz arka plan
    padding: 24, // Daha geniş padding
    marginBottom: 20,
    borderRadius: 20,
    width: "100%",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },
  completedCard: {
    backgroundColor: "#2c3e50",
    borderRadius: 24,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.BOLD,
    letterSpacing: -0.3,
    color: "#1D1D1F", // Apple'ın kullandığı koyu gri
    lineHeight: 26,
    flex: 1,
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  projectDateRange: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 12,
    fontFamily: FONTS.MEDIUM,
    color: '#8E8E93',
  },
  completedTitle: {
    color: "#fff",
  },
  completedDateRange: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completedDateText: {
    color: '#fff',
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  daysLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -8,
  },
  daysLeftText: {
    fontFamily: FONTS.MEDIUM,
    color: "#007AFF", // Apple'ın mavi rengi
    fontSize: 15,
    letterSpacing: -0.1,
  },
  completedDaysText: {
    color: "#fff",
  },

  milestoneList: {
    marginTop: 4,
    paddingTop: 0,
  },
  milestoneItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 0,
  },
  milestoneItemClickable: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    minHeight: 48,
    justifyContent: 'flex-start',
  },
  completedMilestoneItem: {
    backgroundColor: "rgba(199, 199, 204, 0.1)", // Şeffaf gri arka plan
    borderWidth: 1,
    borderColor: "rgba(199, 199, 204, 0.2)",
  },
  iconContainer: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneContent: {
    flex: 1,
    flexDirection: "column",
    marginLeft: 8,
  },
  moodContainer: {
    marginTop: 4,
  },
  moodTagsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
    flexWrap: "wrap",
    backgroundColor: 'transparent',
  },
  moodTag: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: -3,
    marginBottom: 2,
    minWidth: 20,
    minHeight: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    zIndex: 1,
  },
  milestoneText: {
    fontFamily: FONTS.MEDIUM,
    fontSize: 14,
    color: "#1D1D1F", // Apple'ın koyu gri rengi
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  // Completed Stats Section
  completedStatsSection: {
    marginTop: 20, // Boşluk artırıldı
    paddingTop: 18, // Boşluk artırıldı
    borderTopWidth: 1,
    borderTopColor: 'rgba(199, 199, 204, 0.3)',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 12, // Satırlar arası boşluk artırıldı
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
  },
  statText: {
    fontSize: 13,
    fontFamily: FONTS.MEDIUM,
    color: "#636366",
    marginLeft: 6,
    letterSpacing: -0.1,
  },
});

// PropTypes validation
Card.propTypes = {
  title: PropTypes.string.isRequired,
  startDate: PropTypes.string.isRequired,
  endDate: PropTypes.string.isRequired,
  completed: PropTypes.bool,
  activeMilestones: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      title: PropTypes.string,
      completed: PropTypes.bool,
    })
  ),
  onMilestonePress: PropTypes.func,
  onPress: PropTypes.func,
  task: PropTypes.object,
};

Card.defaultProps = {
  completed: false,
  activeMilestones: [],
};