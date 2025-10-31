import React, { useState, useRef, useEffect } from "react";
import { getMilestoneColor, getMilestoneCardColor } from '../utils/milestoneColors';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
  Keyboard,
  ScrollView,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { FONTS, COLORS, ANIMATION_DURATIONS, SWIPE_THRESHOLDS } from "../constants";
import { useSpringAnimation } from "../hooks/useAnimations";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

const { width, height } = Dimensions.get("window");

export default function AddTaskModal({ visible, onClose, onSave, editingTask = null, existingTasks = [], project = null }) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [title, setTitle] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Determine modal color - Theme aware
  const getModalColor = () => {
    return theme.name === 'dark' ? '#2C2C2E' : '#FFFFFF';
  };
  
  // Use spring animation hook - same as Add Project screen
  const { translateY, opacity, scale } = useSpringAnimation(visible);
  const inputRef = useRef(null);

  // Keyboard listener for dynamic positioning
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Update form when editingTask changes
  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title || "");
      setSelectedDate(editingTask.startDate ? new Date(editingTask.startDate) : new Date());
      setStartDate(editingTask.startDate ? new Date(editingTask.startDate) : null);
      setEndDate(editingTask.endDate ? new Date(editingTask.endDate) : null);
      setIsEditing(true);
    } else {
      setTitle("");
      setSelectedDate(new Date());
      setStartDate(null);
      setEndDate(null);
      setIsEditing(false);
    }
  }, [editingTask]);

  useEffect(() => {
    if (visible) {
      // Reset form or load editing task
      if (editingTask) {
        setTitle(editingTask.title || "");
        setSelectedDate(editingTask.startDate ? new Date(editingTask.startDate) : new Date());
        setStartDate(editingTask.startDate ? new Date(editingTask.startDate) : null);
        setEndDate(editingTask.endDate ? new Date(editingTask.endDate) : null);
        setIsEditing(true);
      } else {
        setTitle("");
        setSelectedDate(new Date());
        setStartDate(null);
        setEndDate(null);
        setIsEditing(false);
      }
      
      // Klavye focus'u hemen yap - modal animasyonu ile senkronize
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 50); // 50ms - modal ve klavye birlikte açılsın

      return () => clearTimeout(timeout);
    } else {
      // Reset editing state when modal closes
      setIsEditing(false);
    }
  }, [visible, editingTask]);

  const handleCloseModal = () => {
    // Close modal - animation handled by useSpringAnimation hook
    if (onClose) {
      onClose();
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      // Focus on title input if empty
      inputRef.current?.focus();
      return;
    }

    // If endDate is not selected, use startDate + 1 day as endDate
    const finalStartDate = startDate || selectedDate;
    const finalEndDate = endDate || (() => {
      const nextDay = new Date(finalStartDate);
      nextDay.setDate(nextDay.getDate() + 1);
      return nextDay;
    })();

    // Fix timezone issue - ensure dates are at start of day in local timezone
    const fixTimezone = (date) => {
      const fixed = new Date(date);
      fixed.setHours(0, 0, 0, 0); // Set to start of day in local timezone
      return fixed;
    };

    const finalStartDateFixed = fixTimezone(finalStartDate);
    const finalEndDateFixed = fixTimezone(finalEndDate);


    const taskData = {
      ...(editingTask && { id: editingTask.id }), // Only provide ID in edit mode
      // If editingTask was passed to prefill (e.g., when adding a child), preserve parent/task fields
      ...(editingTask && editingTask.parentId ? { parentId: editingTask.parentId } : {}),
      ...(editingTask && editingTask.taskId ? { taskId: editingTask.taskId } : {}),
      ...(editingTask && editingTask.projectTitle ? { projectTitle: editingTask.projectTitle } : {}),
      title: title.trim(),
      startDate: finalStartDateFixed.toISOString(),
      endDate: finalEndDateFixed.toISOString(),
      completed: editingTask ? !!editingTask.completed : false,
      journalEntries: editingTask && Array.isArray(editingTask.journalEntries) ? editingTask.journalEntries : [],
    };

    // Save task and close modal - animation handled by useSpringAnimation hook
    onSave(taskData);
    onClose();
  };

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatMonthYear = (date) => {
    const locale = language === 'tr' ? 'tr-TR' : (language || 'en-US');
    try {
      return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    } catch (e) {
      return date.toLocaleString();
    }
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const isSameDay = (date1, date2) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const isDateInRange = (date, start, end) => {
    if (!start || !end) return false;
    const startTime = start.getTime();
    const endTime = end.getTime();
    const dateTime = date.getTime();
    return dateTime >= startTime && dateTime <= endTime;
  };

  const handleDayPress = (dayDate) => {
    if (!startDate || (startDate && endDate)) {
      // Start new selection
      setStartDate(dayDate);
      setEndDate(null);
      setIsSelectingRange(true);
    } else if (startDate && !endDate) {
      // Complete selection
      if (dayDate >= startDate) {
        setEndDate(dayDate);
      } else {
        setEndDate(startDate);
        setStartDate(dayDate);
      }
      setIsSelectingRange(false);
    }
  };

  const handleDayLongPress = (dayDate) => {
    setStartDate(dayDate);
    setEndDate(null);
    setIsSelectingRange(true);
  };

  // Check if a date is part of any existing task (excluding the one being edited)
  const isDateInTask = (date) => {
    if (!existingTasks || existingTasks.length === 0) return false;
    
    return existingTasks.some(task => {
      // Skip the task being edited
      if (editingTask && task.id === editingTask.id) return false;
      // Skip completed milestones - we don't want to display them in the calendar markers
      if (task.completed) return false;
      
      if (!task.startDate || !task.endDate) return false;
      
      const taskStart = new Date(task.startDate);
      const taskEnd = new Date(task.endDate);
      
      // Set to start of day for comparison
      taskStart.setHours(0, 0, 0, 0);
      taskEnd.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      
      const dateTime = checkDate.getTime();
      const startTime = taskStart.getTime();
      const endTime = taskEnd.getTime();
      
      return dateTime >= startTime && dateTime <= endTime;
    });
  };

  // Return list of milestone colors for a given date (one entry per milestone overlapping that date)
  const getMilestonesForDate = (date) => {
    // Only show milestone dots when modal was opened for a specific project
    if (!project) return [];
    if (!existingTasks || existingTasks.length === 0) return [];

    const checkDate = new Date(date);
    checkDate.setHours(0,0,0,0);

    const matched = existingTasks.reduce((acc, task) => {
      // Skip the task being edited
      if (editingTask && task.id === editingTask.id) return acc;
      if (!task.startDate || !task.endDate) return acc;

      const taskStart = new Date(task.startDate);
      const taskEnd = new Date(task.endDate);
      taskStart.setHours(0,0,0,0);
      taskEnd.setHours(0,0,0,0);

      const dateTime = checkDate.getTime();
      // Skip completed milestones entirely
      if (task.completed) return acc;

      if (dateTime >= taskStart.getTime() && dateTime <= taskEnd.getTime()) {
        // Resolve color using existing util (keeps original milestone color behavior)
        const color = getMilestoneColor(task, theme.name === 'dark' ? 'dark' : 'light');
        acc.push(color);
      }
      return acc;
    }, []);

    return matched;
  };

  const renderCalendar = () => {
    // Build a linear list of cells (null = empty leading/trailing cell)
  const daysInMonth = getDaysInMonth(currentMonth);
  // Determine week start index based on locale: Turkish starts Monday (1), English starts Sunday (0)
  const weekStart = language && language.startsWith('tr') ? 1 : 0;
  const jsFirstDay = getFirstDayOfMonth(currentMonth); // 0 (Sun) - 6 (Sat)
  // Adjust first day according to desired week start so leading empties align with headers
  const firstDay = (jsFirstDay - weekStart + 7) % 7; // 0..6
    const cells = [];

    // Leading empty cells
    for (let i = 0; i < firstDay; i++) cells.push(null);

    // Month days
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    // Pad trailing empty cells so total is multiple of 7
    while (cells.length % 7 !== 0) cells.push(null);

    // Chunk into weeks and render as rows to ensure consistent alignment
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    return weeks.map((week, wi) => (
      <View key={`week-${wi}`} style={{ flexDirection: 'row', width: '100%' }}>
        {week.map((cell, ci) => {
          if (cell === null) {
            return <View key={`empty-${wi}-${ci}`} style={styles.calendarDay} />;
          }

          const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), cell);
          const isSelected = isSameDay(dayDate, selectedDate);
          const isToday = isSameDay(dayDate, new Date());
          const isStartDate = startDate && isSameDay(dayDate, startDate);
          const isEndDate = endDate && isSameDay(dayDate, endDate);
          const isInRange = isDateInRange(dayDate, startDate, endDate);
          const dayMilestones = getMilestonesForDate(dayDate);

          return (
            <TouchableOpacity
              key={`day-${wi}-${ci}`}
              style={[
                styles.calendarDay,
                isSelected && !startDate && !endDate && styles.selectedDay,
                isToday && !isSelected && !isInRange && styles.todayDay,
                isStartDate && styles.rangeStartDay,
                isEndDate && styles.rangeEndDay,
                isInRange && !isStartDate && !isEndDate && styles.rangeDay,
              ]}
              onPress={() => handleDayPress(dayDate)}
              onLongPress={() => handleDayLongPress(dayDate)}
              delayLongPress={500}
            >
              <Text style={[
                styles.dayText,
                isSelected && !startDate && !endDate && styles.selectedDayText,
                isToday && !isSelected && !isInRange && styles.todayDayText,
                (isStartDate || isEndDate) && styles.rangeEndDayText,
                isInRange && !isStartDate && !isEndDate && styles.rangeDayText,
              ]}>
                {cell}
              </Text>
              {/* Milestone colored dots (one dot per milestone on that date). Only shown when modal has a project prop. */}
              {dayMilestones && dayMilestones.length > 0 && (() => {
                const MAX_DOTS = 2; // show up to 2 colored dots; if more, show only +n
                if (dayMilestones.length > MAX_DOTS) {
                  // Only show a single +n badge (n = total milestones on that day)
                  return (
                    <View style={styles.milestoneDotsRow} pointerEvents="none">
                      <View style={[styles.milestoneDotMore, { backgroundColor: theme.name === 'dark' ? '#3A3A3C' : '#E6E7EB' }]}>
                        <Text style={[styles.milestoneDotMoreText, { color: theme.name === 'dark' ? '#FFF' : '#111' }]}>{`+${dayMilestones.length}`}</Text>
                      </View>
                    </View>
                  );
                }

                // Otherwise render each milestone as a small colored dot
                return (
                  <View style={styles.milestoneDotsRow} pointerEvents="none">
                    {dayMilestones.map((c, idx) => (
                      <View
                        key={`dot-${wi}-${ci}-${idx}`}
                        style={[styles.milestoneDot, { backgroundColor: c }]}
                      />
                    ))}
                  </View>
                );
              })()}
            </TouchableOpacity>
          );
        })}
      </View>
    ));
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
    opacity: opacity.value,
  }));


  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={handleCloseModal}
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <Animated.View style={[
          styles.milestoneCard, 
          isEditing && styles.editMilestoneCard,
          { 
            backgroundColor: getModalColor(),
            position: 'absolute',
            bottom: keyboardHeight > 0 ? keyboardHeight : 20, // Klavyenin tam üstüne hizala
            maxHeight: keyboardHeight > 0 ? height - keyboardHeight - 60 : height * 0.85, // Klavye açıkken dinamik yükseklik
          },
          animatedStyle
        ]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Title Input with Action Buttons */}
            <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              {/* Calendar Icon */}
              <View style={styles.iconWrapper}>
                <Image source={require("../assets/yourDateVisual.png")} style={styles.icon} />
              </View>
              
              <TextInput
                ref={inputRef}
                style={[
                  styles.titleInputWithButtons,
                  { color: theme.name === 'dark' ? '#FFFFFF' : theme.text }
                ]}
                value={title}
                onChangeText={setTitle}
                placeholder={t('enterTaskTitle')}
                placeholderTextColor={theme.name === 'dark' ? '#8E8E93' : '#999'}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                multiline={true}
                textAlignVertical="top"
                maxLength={200}
              />
              
              {/* Action Buttons */}
              <View style={styles.actionButtonsInline}>
                <TouchableOpacity 
                  style={[
                    styles.cancelBtn,
                    { backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }
                  ]} 
                  onPress={handleCloseModal}
                  accessible={true}
                  accessibilityLabel="Cancel milestone creation"
                  accessibilityHint="Closes the milestone creation modal without saving"
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={18} color={theme.name === 'dark' ? '#FF6B6B' : '#7f8c8d'} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.saveBtn, 
                    !title.trim() && styles.saveBtnDisabled,
                    { backgroundColor: title.trim() ? (theme.name === 'dark' ? '#FF6B6B' : '#6C63FF') : (theme.name === 'dark' ? 'rgba(255, 107, 107, 0.3)' : 'rgba(108, 99, 255, 0.3)') }
                  ]} 
                  onPress={handleSave}
                  disabled={!title.trim()}
                  accessible={true}
                  accessibilityLabel={title.trim() ? "Save milestone" : "Save milestone (disabled)"}
                  accessibilityHint="Saves the milestone with the entered title and dates"
                  accessibilityRole="button"
                >
                  <Ionicons name="checkmark" size={18} color={title.trim() ? "#fff" : (theme.name === 'dark' ? '#8E8E93' : '#999')} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Inline Calendar - Full Width */}
          <View style={styles.calendarContainerFull}>
            {/* Calendar Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity 
                style={styles.navButton}
                onPress={() => navigateMonth(-1)}
              >
                <Ionicons name="chevron-back" size={20} color={theme.name === 'dark' ? '#8E8E93' : '#7f8c8d'} />
              </TouchableOpacity>
              
              <Text style={[styles.monthYearText, { color: theme.text }]}>
                {formatMonthYear(currentMonth)}
              </Text>
              
              <TouchableOpacity 
                style={styles.navButton}
                onPress={() => navigateMonth(1)}
              >
                <Ionicons name="chevron-forward" size={20} color={theme.name === 'dark' ? '#8E8E93' : '#7f8c8d'} />
              </TouchableOpacity>
            </View>

            {/* Day Headers */}
            <View style={styles.dayHeaders}>
              {t('dayAbbreviations').map(day => (
                <Text key={day} style={[styles.dayHeaderText, { color: theme.name === 'dark' ? '#8E8E93' : '#666' }]}>{day}</Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {renderCalendar()}
            </View>
          </View>
          </ScrollView>

        </Animated.View>
      </KeyboardAvoidingView>
      
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999, // Increased from 1000 to ensure modal appears above all other elements
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  milestoneCard: {
    // Yeni layout - column direction
    flexDirection: "column",
    borderRadius: 16,
    marginHorizontal: Math.max(10, width * 0.025), // Responsive margin: minimum 10, max 2.5% of width
    // marginBottom removed - now dynamically set based on keyboard state
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
    // backgroundColor determined dynamically
    width: width - Math.max(20, width * 0.05), // Responsive width with padding
    minHeight: 400, // Minimum height - larger for calendar
    overflow: 'hidden', // Prevent content overflow
    zIndex: 9999, // Ensure modal content appears above all other elements
  },
  editMilestoneCard: {
    // backgroundColor dinamik olarak belirleniyor
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start", // Align from top with flex-start
    padding: 14,
    flex: 1,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#5AC8FA", // Soft Apple blue - softer tone
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    elevation: 2,
    shadowColor: "#5AC8FA",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  icon: { 
    width: 24, 
    height: 24 
  },
  body: { 
    flex: 1, 
    paddingVertical: 4 
  },
  titleInput: {
    fontSize: 14,
    fontFamily: FONTS.MEDIUM,
    marginBottom: 8,
    lineHeight: 20,
    color: "#1a1a1a",
    paddingRight: 50,
    borderWidth: 0,
    backgroundColor: 'transparent',
    minHeight: 20, // Minimum height
    maxHeight: 80, // Maximum height (4 lines)
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align from top
    gap: 8,
    marginTop: 4, // To align with icon
  },
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5AC8FA', // Soft Apple blue - softer tone
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#E0E0E0',
  },
  // New Layout Styles
  titleSection: {
    padding: 20,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleInputWithButtons: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.MEDIUM,
    lineHeight: 22,
    color: "#1a1a1a",
    borderWidth: 0,
    backgroundColor: 'transparent',
    minHeight: 24,
    maxHeight: 80,
    textAlignVertical: 'top',
  },
  actionButtonsInline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 2,
  },
  calendarContainerFull: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  // Calendar Styles
  calendarContainer: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12, // Reduce padding
    marginHorizontal: -8, // Make container much wider
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navButton: {
    width: 28, // Reduced navigation buttons
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYearText: {
    fontSize: 14, // Reduced title
    fontFamily: FONTS.MEDIUM,
    color: '#1a1a1a',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeaderText: {
    flex: 1, // Use flex for equal distribution
    maxWidth: `${100/7}%`, // 7 equal columns
    textAlign: 'center',
    fontSize: 11, // Reduced day headers
    fontFamily: FONTS.REGULAR,
    color: '#7f8c8d',
    marginBottom: 4, // Less spacing
    paddingHorizontal: 2, // Small padding instead of margin
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    justifyContent: 'space-between', // Better distribution
    width: '100%',
  },
  calendarDay: {
    width: `${100/7 - 1}%`, // 7 columns with small gap (14.28% - 1% = ~13.28%)
    aspectRatio: 1, // Keep cells square regardless of width
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 4, // Less spacing
    paddingTop: 6,
    paddingBottom: 20, // extra bottom space reserved for dot/+n badge
    position: 'relative', // allow absolute-positioned overlays (dots) without affecting layout
  },
  selectedDay: {
    backgroundColor: '#5AC8FA', // Soft Apple blue
    borderRadius: 16,
  },
  todayDay: {
    backgroundColor: 'rgba(90, 200, 250, 0.3)', // Soft Apple blue - transparent
    borderRadius: 16,
  },
  dayText: {
    fontSize: 13, // Reduced font
    fontFamily: FONTS.REGULAR,
    color: '#1a1a1a',
  },
  selectedDayText: {
    color: '#fff',
    fontFamily: FONTS.MEDIUM,
  },
  todayDayText: {
    color: '#5AC8FA', // Soft Apple mavi
    fontFamily: FONTS.MEDIUM,
  },
  // Range Selection Styles
  rangeStartDay: {
    backgroundColor: '#5AC8FA', // Soft Apple blue
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  rangeEndDay: {
    backgroundColor: '#5AC8FA', // Soft Apple blue
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  rangeDay: {
    backgroundColor: 'rgba(90, 200, 250, 0.3)', // Soft Apple blue - transparent
    borderRadius: 0,
  },
  rangeEndDayText: {
    color: '#fff',
    fontFamily: FONTS.MEDIUM,
  },
  rangeDayText: {
    color: '#5AC8FA', // Soft Apple mavi
    fontFamily: FONTS.MEDIUM,
  },
  // Milestone dot indicators shown under day numbers in calendar (small colored dots)
  milestoneDotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 2, // move lower inside cell
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  milestoneDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  milestoneDotMore: {
    minWidth: 16,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    paddingHorizontal: 3,
  },
  milestoneDotMoreText: {
    fontSize: 8,
    fontFamily: FONTS.SEMI_BOLD,
  },
  // Note: existingMilestoneDay and existingMilestoneDayText are now inline for theme support
});
