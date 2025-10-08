import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Alert, Pressable, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import FlashCalendar from "./FlashCalendar";
import JournalCard from "./JournalCard";
import PropTypes from "prop-types";
import { getMilestoneColor, getMilestoneCardColor } from '../utils/milestoneColors';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, ANIMATION_DURATIONS } from '../constants';


function MileStone({
  milestone,
  onUpdate,
  onComplete,
  onOpenDetail,
  onDelete,
  onSetActive,
  isLatest = false,
  isCompleted = false,
  onEditToggle,
  onOpenJournal,
  navigation,
  currentTask = null, // Project bilgilerini almak için
  onStartDrag,
  isDragging = false,
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  // Performance monitoring (sadece development'ta) - geçici olarak devre dışı
  // usePerformanceMonitor('MileStone');
  
  if (!milestone) return null;

  // Safely convert various color formats to rgba(r,g,b,a)
  const toRgba = useCallback((color, alpha = 1) => {
    try {
      if (!color) return `rgba(0,0,0,${alpha})`;
      // #RRGGBB or #RGB
      let c = color.trim();
      if (c[0] === '#') {
        if (c.length === 4) {
          const r = parseInt(c[1] + c[1], 16);
          const g = parseInt(c[2] + c[2], 16);
          const b = parseInt(c[3] + c[3], 16);
          return `rgba(${r},${g},${b},${alpha})`;
        }
        if (c.length === 7) {
          const r = parseInt(c.slice(1, 3), 16);
          const g = parseInt(c.slice(3, 5), 16);
          const b = parseInt(c.slice(5, 7), 16);
          return `rgba(${r},${g},${b},${alpha})`;
        }
        // #AARRGGBB
        if (c.length === 9) {
          const a = parseInt(c.slice(1, 3), 16) / 255;
          const r = parseInt(c.slice(3, 5), 16);
          const g = parseInt(c.slice(5, 7), 16);
          const b = parseInt(c.slice(7, 9), 16);
          const outA = Math.max(0, Math.min(1, a * alpha));
          return `rgba(${r},${g},${b},${outA})`;
        }
      }
      // rgb/rgba
      if (c.startsWith('rgb')) {
        const nums = c.replace(/rgba?\(/, '').replace(/\)/, '').split(',').map(x => parseFloat(x.trim()));
        const [r, g, b, a = 1] = nums;
        const outA = Math.max(0, Math.min(1, a * alpha));
        return `rgba(${r|0},${g|0},${b|0},${outA})`;
      }
      // named colors – let RN resolve but wrap as rgba by fallback
      return color;
    } catch (e) {
      return `rgba(0,0,0,${alpha})`;
    }
  }, []);

  // Force a specific alpha without multiplying any existing alpha
  const setAlpha = useCallback((color, alpha = 1) => {
    try {
      if (!color) return `rgba(0,0,0,${alpha})`;
      let c = color.trim();
      if (c[0] === '#') {
        if (c.length === 4) {
          const r = parseInt(c[1] + c[1], 16);
          const g = parseInt(c[2] + c[2], 16);
          const b = parseInt(c[3] + c[3], 16);
          return `rgba(${r},${g},${b},${alpha})`;
        }
        if (c.length === 7) {
          const r = parseInt(c.slice(1, 3), 16);
          const g = parseInt(c.slice(3, 5), 16);
          const b = parseInt(c.slice(5, 7), 16);
          return `rgba(${r},${g},${b},${alpha})`;
        }
        // #AARRGGBB → ignore AA and use provided alpha
        if (c.length === 9) {
          const r = parseInt(c.slice(3, 5), 16);
          const g = parseInt(c.slice(5, 7), 16);
          const b = parseInt(c.slice(7, 9), 16);
          return `rgba(${r},${g},${b},${alpha})`;
        }
      }
      if (c.startsWith('rgb')) {
        const nums = c.replace(/rgba?\(/, '').replace(/\)/, '').split(',').map(x => parseFloat(x.trim()));
        const [r, g, b] = nums; // ignore incoming alpha
        return `rgba(${r|0},${g|0},${b|0},${alpha})`;
      }
      return color;
    } catch (e) {
      return `rgba(0,0,0,${alpha})`;
    }
  }, []);

  // Using solid, fully opaque borders for milestone icon frames

  // Ensure milestone has required properties - useMemo to prevent infinite loop
  const safeMilestone = useMemo(() => ({
    ...milestone,
    title: milestone.title || '',
    id: milestone.id || 'unknown',
    startDate: milestone.startDate || new Date().toISOString(),
    endDate: milestone.endDate || new Date().toISOString()
  }), [milestone?.id, milestone?.title, milestone?.startDate, milestone?.endDate]);

  const [title, setTitle] = useState(milestone.title || "");
  const [startDate, setStartDate] = useState(
    milestone.startDate ? new Date(milestone.startDate) : new Date()
  );
  const [endDate, setEndDate] = useState(
    milestone.endDate ? new Date(milestone.endDate) : new Date()
  );
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [editable, setEditable] = useState(
    !isCompleted && (!title || title.trim() === "")
  );
  const [showDeleteOption, setShowDeleteOption] = useState(false);

  const inputRef = useRef(null);
  const deleteAnimation = useRef(new Animated.Value(0)).current;

  // Update local state when milestone prop changes
  useEffect(() => {
    if (milestone) {
      setTitle(milestone.title || "");
      setStartDate(milestone.startDate ? new Date(milestone.startDate) : new Date());
      setEndDate(milestone.endDate ? new Date(milestone.endDate) : new Date());
    }
  }, [milestone?.id, milestone?.title, milestone?.startDate, milestone?.endDate]);

  useEffect(() => {
    if (editable) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [editable]);

  const showDeleteOptionWithAnimation = useCallback(() => {
    setShowDeleteOption(true);
    Animated.timing(deleteAnimation, {
      toValue: 1,
      duration: ANIMATION_DURATIONS.NORMAL,
      useNativeDriver: true,
    }).start();
  }, [deleteAnimation]);

  const hideDeleteOptionWithAnimation = useCallback(() => {
    Animated.timing(deleteAnimation, {
      toValue: 0,
      duration: ANIMATION_DURATIONS.FAST,
      useNativeDriver: true,
    }).start(() => {
      setShowDeleteOption(false);
    });
  }, [deleteAnimation]);

  const handleLongPress = useCallback(() => {
    // Milestone'lar için basılı tutma işlevselliğini etkinleştir
    // (sadece title'ı olan milestone'lar için - completed veya incomplete fark etmez)
    if (title && title.trim() !== "") {
      showDeleteOptionWithAnimation();
    }
  }, [title, showDeleteOptionWithAnimation]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      t('deleteMilestoneConfirm'),
      "",
      [
        {
          text: t('cancel'),
          style: "cancel",
          onPress: hideDeleteOptionWithAnimation,
        },
        {
          text: t('delete'),
          style: "destructive",
          onPress: () => {
            hideDeleteOptionWithAnimation();
            onDelete?.();
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: hideDeleteOptionWithAnimation,
      }
    );
  }, [onDelete, hideDeleteOptionWithAnimation]);

  const handleEditToggle = useCallback(() => {
    // Open modal for editing
    onEditToggle?.(milestone);
  }, [onEditToggle, milestone]);

  const handleCreateMilestone = useCallback(() => {
    if (!title.trim()) {
      return;
    }
    setEditable(false);
    onUpdate?.({
      title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    // Dismiss keyboard after milestone creation
    Keyboard.dismiss();
  }, [title, startDate, endDate, onUpdate]);


  const handleCalendarConfirm = ({ startDate: sISO, endDate: eISO }) => {
    const s = new Date(sISO);
    const e = new Date(eISO);
    setStartDate(s <= e ? s : e);
    setEndDate(e >= s ? e : s);
    setCalendarVisible(false);
    onUpdate?.({
      title,
      startDate: s.toISOString(),
      endDate: e.toISOString(),
    });
  };

  const getDaysText = () => {
    try {
      const today = new Date();
      const diffStart = Math.ceil((startDate - today) / 86400000);
      const diffEnd = Math.ceil((endDate - today) / 86400000);

      if (isCompleted) {
        const diff = Math.ceil((endDate - startDate) / 86400000);
        return `Completed in ${diff} day${diff !== 1 ? "s" : ""}`;
      } else if (diffStart > 0) {
        return `Starts in ${diffStart} day${diffStart !== 1 ? "s" : ""}`;
      } else if (diffEnd >= 0) {
        return `Ends in ${diffEnd} day${diffEnd !== 1 ? "s" : ""}`;
      } else {
        return `Ended ${Math.abs(diffEnd)} day${Math.abs(diffEnd) !== 1 ? "s" : ""} ago`;
      }
    } catch (error) {
      console.error('Error in getDaysText:', error);
      return '';
    }
  };

  // Renk sistemi - kart gövdesi beyaz, icon arkaplanı renkli
  const cardBgColor = useMemo(() => getMilestoneCardColor(), []);
  const iconBgColor = useMemo(() => getMilestoneColor(safeMilestone), [safeMilestone]);


  // Günlük kartları için gerekli fonksiyonlar - Project-based system
  const entries = []; // Milestone-based journal entries removed

  // Günlükleri tarihlere göre gruplandır
  const groupEntriesByDate = useCallback((entries) => {
    const groups = {};
    entries.forEach(entry => {
      const date = new Date(entry.createdAt);
      const dateKey = date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    });
    
    return Object.keys(groups)
      .sort((a, b) => {
        const dateA = new Date(groups[a][0].createdAt);
        const dateB = new Date(groups[b][0].createdAt);
        return dateB - dateA;
      })
      .map(dateKey => {
        const dayEntries = groups[dateKey];
        return {
          date: dateKey,
          allEntries: dayEntries
        };
      });
  }, []);

  const groupedEntries = useMemo(() => groupEntriesByDate(entries), [entries, groupEntriesByDate]);

  return (
    <>
      <Pressable onPress={() => {
        if (editable) {
          // Cancel milestone creation when touching outside
          setEditable(false);
        }
      }}>
        <View style={styles.container}>
          <Pressable
            style={({ pressed }) => [
              styles.milestoneItemClickable,
              {
                backgroundColor: theme.name === 'dark' ? '#2C2C2E' : 'rgba(0, 122, 255, 0.04)',
                // Remove transforms/opacity changes during drag to avoid visual jitter
                opacity: 1,
              }
            ]}
            disabled={editable}
            onPress={() => {
              if (!editable && !showDeleteOption) {
                if (onOpenJournal) {
                  // Project-based journal system - open journal for the entire project
                  const projectData = {
                    id: 'project-journal',
                    title: 'Project Journal',
                    taskId: milestone.taskId,
                    projectTitle: milestone.projectTitle || 'Project',
                    isProjectBased: true
                  };
                  onOpenJournal(projectData);
                } else if (onOpenDetail) {
                  onOpenDetail();
                }
              }
            }}
            onLongPress={handleLongPress}
            delayLongPress={500}
          >
            <View style={[
              styles.iconContainer,
              {
                shadowColor: 'transparent', // avoid multi-row cumulative shadow weight
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0,
                shadowRadius: 0,
                elevation: 0,
              }
            ]}>
              <View style={[
                styles.iconFrame,
                {
                  borderColor: isCompleted ? '#555' : iconBgColor,
                }
              ]}>
                <Pressable
                  onLongPress={onStartDrag}
                  delayLongPress={120}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons 
                    name="ellipse" 
                    size={10} 
                    color={isCompleted ? "#555" : iconBgColor} 
                  />
                </Pressable>
              </View>
            </View>
            <View style={styles.milestoneContent}>
              {editable ? (
                <TextInput
                  ref={inputRef}
                  style={styles.milestoneText}
                  value={title}
                  placeholder={t('enterMilestoneTitle')}
                  onChangeText={setTitle}
                  editable={editable}
                  onSubmitEditing={handleCreateMilestone}
                  returnKeyType="done"
                  blurOnSubmit={true}
                  multiline={true}
                />
              ) : (
                <Text style={[
                  styles.milestoneText, 
                  { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' },
                  isCompleted && styles.completedText
                ]}>{title || ''}</Text>
              )}
              
              {/* Date info - only show if not editable or if milestone has dates */}
              {(!editable || (startDate && endDate)) && (
                <View style={styles.dateRowContainer}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.dateRow,
                      {
                        transform: [{ scale: pressed && editable ? 0.98 : 1 }],
                        opacity: pressed && editable ? 0.8 : 1,
                      }
                    ]}
                    onPress={() => !isCompleted && editable && setCalendarVisible(true)}
                  >
                    <Ionicons 
                      name="calendar-outline" 
                      size={12} 
                      color={theme.name === 'dark' ? '#8E8E93' : '#666'} 
                      style={styles.timerIcon} 
                    />
                    <Text style={[
                      styles.daysText, 
                      { color: theme.name === 'dark' ? '#8E8E93' : '#666' },
                      isCompleted && styles.completedText
                    ]}>{getDaysText() || ''}</Text>
                    {editable && <Ionicons name="chevron-down" size={14} color={theme.name === 'dark' ? '#8E8E93' : '#555'} />}
                  </Pressable>

                </View>
              )}
            </View>

            {/* Edit Button - Top Right Corner */}
            {!editable && !isCompleted && (
              <Pressable
                style={({ pressed }) => [
                  styles.editButton,
                  {
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                    opacity: pressed ? 0.8 : 1,
                  }
                ]}
                onPress={handleEditToggle}
              >
                <Text style={[
                  styles.editButtonText,
                  { color: theme.name === 'dark' ? '#007AFF' : '#007AFF' }
                ]}>Edit</Text>
              </Pressable>
            )}

            {/* Create Button - Top Right Corner (same position as Edit button) */}
            {editable && title.trim() && (
              <Pressable
                style={({ pressed }) => [
                  styles.createButton,
                  {
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                    opacity: pressed ? 0.8 : 1,
                  }
                ]}
                onPress={handleCreateMilestone}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </Pressable>
            )}
          </Pressable>

          {/* Günlük Kartları */}
          {/* Journal Entries - Project-based system only */}
          {/* Milestone-based journal entries removed */}

        {/* Animated Action Buttons - Theme Consistent */}
        {showDeleteOption && (
          <Animated.View 
            style={[
              styles.actionButtonsContainer,
              {
                backgroundColor: theme.name === 'dark' ? 'rgba(44, 44, 46, 0.95)' : 'rgba(248, 249, 250, 0.95)',
                opacity: deleteAnimation,
                transform: [
                  {
                    scale: deleteAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Complete/Reopen Button - LEFT */}
            {!isCompleted ? (
              <TouchableOpacity
                style={[styles.themeButton, styles.completeButtonTheme]}
                onPress={() => {
                  hideDeleteOptionWithAnimation();
                  onComplete?.();
                }}
              >
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.themeButtonText}>Complete</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.themeButton, styles.activeButtonTheme]}
                onPress={() => {
                  hideDeleteOptionWithAnimation();
                  onSetActive?.();
                }}
              >
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="play-circle" size={20} color="#2196F3" />
                </View>
                <Text style={styles.themeButtonText}>Reopen</Text>
              </TouchableOpacity>
            )}

            {/* Delete Button - RIGHT */}
            <TouchableOpacity
              style={[styles.themeButton, styles.deleteButtonTheme]}
              onPress={handleDelete}
            >
              <View style={styles.buttonIconContainer}>
                <Ionicons name="trash" size={20} color="#FF3B30" />
              </View>
              <Text style={styles.themeButtonText}>Delete</Text>
            </TouchableOpacity>

            {/* Close Button - Elegant */}
            <TouchableOpacity
              style={[
                styles.elegantCloseButton,
                {
                  backgroundColor: theme.name === 'dark' ? 'rgba(44, 44, 46, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                  borderColor: theme.name === 'dark' ? 'rgba(142, 142, 147, 0.3)' : 'rgba(142, 142, 147, 0.2)',
                }
              ]}
              onPress={hideDeleteOptionWithAnimation}
            >
              <Ionicons name="close" size={18} color={theme.name === 'dark' ? '#FFFFFF' : '#8E8E93'} />
            </TouchableOpacity>
          </Animated.View>
        )}
        </View>
      </Pressable>
    
      <FlashCalendar
        visible={calendarVisible}
        initialStart={startDate}
        initialEnd={endDate}
        onConfirm={handleCalendarConfirm}
        onCancel={() => setCalendarVisible(false)}
        minDate={new Date()}
      />
    </>
  );
}

// Memoize to avoid re-rendering unaffected items during/after drag-and-drop
function areMilestonePropsEqual(prevProps, nextProps) {
  const prev = prevProps;
  const next = nextProps;
  const prevMs = prev.milestone || {};
  const nextMs = next.milestone || {};
  // Compare key fields that affect rendering
  const sameCore = (
    prevMs.id === nextMs.id &&
    prevMs.title === nextMs.title &&
    prevMs.startDate === nextMs.startDate &&
    prevMs.endDate === nextMs.endDate &&
    prev.isLatest === next.isLatest &&
    prev.isCompleted === next.isCompleted &&
    prev.isDragging === next.isDragging &&
    (prev.currentTask?.id || null) === (next.currentTask?.id || null)
  );
  return sameCore;
}

export default memo(MileStone, areMilestonePropsEqual);

const styles = StyleSheet.create({
  container: {
    marginTop: 8, // 16'dan 8'e düşürüldü
    marginBottom: 0, // 10'dan 0'a düşürüldü
    marginHorizontal: 28,
  },
  milestoneItemClickable: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    height: 56,
    justifyContent: 'flex-start',
  },
  iconContainer: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlowContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    padding: 0,
  },
  iconFrame: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
  },
  milestoneContent: {
    flex: 1,
    flexDirection: "column",
    marginLeft: 8,
  },
  milestoneText: {
    fontFamily: FONTS.MEDIUM,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
    paddingRight: 50, // Edit tuşu için boşluk
  },
  completedText: {
    color: "#888", // Daha soluk renk completed milestone'lar için
    opacity: 0.7,
  },
  dateRowContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  dateRow: { 
    flexDirection: "row", 
    alignItems: "center",
  },
  timerIcon: { marginRight: 4 },
  daysText: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    marginRight: 4,
    lineHeight: 16,
  },
  completeBtn: {
    marginLeft: 12,
    backgroundColor: "#545454",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#545454",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  actionOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  closeButton: {
    position: "absolute",
    top: -12,
    right: -12,
    width: 36,
    height: 36,
    backgroundColor: "#fff",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    zIndex: 11,
  },
  splitActionCard: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    borderRadius: 24,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    zIndex: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  deleteHalf: {
    flex: 1,
    backgroundColor: "#FF4444",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  completeHalf: {
    flex: 1,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  splitButtonText: {
    color: "#fff",
    fontFamily: "Poppins_600SemiBold",
    marginLeft: 8,
    fontSize: 16,
  },
  createButton: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  createButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#545454",
  },
  editButton: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  editButtonText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },
  // Günlük kartları container
  journalCardsContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  moreEntriesIndicator: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderStyle: "dashed",
    marginLeft: 4,
    marginRight: 20,
  },
  moreEntriesText: {
    fontSize: 10,
    color: "#666",
    fontFamily: "Poppins_500Medium",
    letterSpacing: 0.3,
  },
  // Theme Consistent Action Buttons
  actionButtonsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 60, // Sadece milestone header yüksekliği
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248, 249, 250, 0.95)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 1000,
  },
  themeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginHorizontal: 6,
    minWidth: 80,
  },
  completeButtonTheme: {
    backgroundColor: "#E8F5E8",
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  activeButtonTheme: {
    backgroundColor: "#E3F2FD",
    borderWidth: 1,
    borderColor: "#2196F3",
  },
  deleteButtonTheme: {
    backgroundColor: "#FFEBEE",
    borderWidth: 1,
    borderColor: "#FF3B30",
  },
  buttonIconContainer: {
    marginRight: 6,
  },
  themeButtonText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: "#1D1D1F",
    letterSpacing: -0.1,
  },
  elegantCloseButton: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(142, 142, 147, 0.2)",
  },
});

MileStone.propTypes = {
  milestone: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    completed: PropTypes.bool,
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    initialized: PropTypes.bool,
  }).isRequired,
  onUpdate: PropTypes.func,
  onComplete: PropTypes.func,
  onOpenDetail: PropTypes.func,
  onDelete: PropTypes.func,
  onSetActive: PropTypes.func,
  isLatest: PropTypes.bool,
  isCompleted: PropTypes.bool,
  onEditToggle: PropTypes.func,
  onOpenJournal: PropTypes.func,
  navigation: PropTypes.object,
  currentTask: PropTypes.object, // Project bilgileri için
};

MileStone.defaultProps = {
  onUpdate: null,
  onComplete: null,
  onOpenDetail: null,
  onDelete: null,
  onSetActive: null,
  isLatest: false,
  isCompleted: false,
  onEditToggle: null,
  onOpenJournal: null,
  navigation: null,
  currentTask: null,
};

