import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Alert, Pressable, Keyboard, Easing } from "react-native";
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
  isAttachMode = false, // Attach mode aktif mi
  isSelectableForAttach = false, // Bu milestone seçilebilir mi
  onStartAttachMode, // Attach mode başlat
  onSelectForAttach, // Attach için seç
  onDetachMilestone, // Milestone'u parent'ından ayır
  attachModeSourceId = null, // Attach mode'u başlatan milestone ID
  allMilestones = [], // Tüm milestone'lar (child sayısı için)
  isCollapsed = false, // Collapse/expand state
  onToggleCollapse, // Collapse/expand handler
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  // Performance monitoring (sadece development'ta) - geçici olarak devre dışı
  // usePerformanceMonitor('MileStone');
  
  if (!milestone) return null;

  // Format date to "Mar. 13" format (for end date)
  const formatShortDate = useCallback((dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
      return `${months[date.getMonth()]} ${date.getDate()}`;
    } catch (e) {
      return '';
    }
  }, []);

  // Format date to day number only (for start date in calendar icon)
  const formatDayOnly = useCallback((dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return `${date.getDate()}`;
    } catch (e) {
      return '';
    }
  }, []);

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
  
  // Smooth attach/detach animation - initialize later after calculating shouldShowAsChild
  const childIndentAnim = useRef(new Animated.Value(0)).current;
  
  // Smooth collapse/expand animation for children
  const collapseAnim = useRef(new Animated.Value(1)).current; // 1 = visible, 0 = hidden

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

  // Pre-create project data for journal opening (performance optimization)
  const projectData = useMemo(() => ({
    id: 'project-journal',
    title: 'Project Journal',
    taskId: milestone.taskId,
    projectTitle: milestone.projectTitle || currentTask?.title || 'Project',
    isProjectBased: true
  }), [milestone.taskId, milestone.projectTitle, currentTask?.title]);

  // Optimized press handler
  const handlePress = useCallback(() => {
    // Attach mode aktifken normal press işlemlerini engelle
    if (isAttachMode) {
      if (isSelectableForAttach && onSelectForAttach) {
        onSelectForAttach();
      }
      return;
    }
    
    if (!editable && !showDeleteOption) {
      if (onOpenJournal) {
        onOpenJournal(projectData);
      } else if (onOpenDetail) {
        onOpenDetail();
      }
    }
  }, [editable, showDeleteOption, onOpenJournal, onOpenDetail, projectData, isAttachMode, isSelectableForAttach, onSelectForAttach]);

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

  // Calculate children info for this milestone
  const childMilestones = useMemo(() => {
    if (!milestone?.id || !Array.isArray(allMilestones)) return [];
    return allMilestones.filter(m => m?.parentId === milestone.id);
  }, [allMilestones, milestone?.id]);
  
  const hasChildren = childMilestones.length > 0;
  const completedChildren = childMilestones.filter(m => m?.completed).length;
  const progressPercentage = hasChildren 
    ? Math.round((completedChildren / childMilestones.length) * 100) 
    : 0;

  // Check if this milestone should be shown as child
  // Show as child if:
  // 1. Already has a parent
  // 2. Or this is the milestone that started attach mode (will become child)
  const shouldShowAsChild = milestone.parentId || (isAttachMode && milestone.id === attachModeSourceId);

  // Initialize animation value on first render
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      childIndentAnim.setValue(shouldShowAsChild ? 1 : 0);
      // Initialize collapse animation for children
      if (milestone.parentId) {
        collapseAnim.setValue(isCollapsed ? 0 : 1);
      }
      isFirstRender.current = false;
    }
  }, []);

  // Animate child indent when attach/detach
  useEffect(() => {
    if (!isFirstRender.current) {
      Animated.spring(childIndentAnim, {
        toValue: shouldShowAsChild ? 1 : 0,
        useNativeDriver: false,
        tension: 40,
        friction: 8,
      }).start();
    }
  }, [shouldShowAsChild, childIndentAnim]);

  // Animate collapse/expand for child visibility
  useEffect(() => {
    // Only animate if this is a child milestone
    if (milestone.parentId) {
      Animated.timing(collapseAnim, {
        toValue: isCollapsed ? 0 : 1,
        duration: 300,
        useNativeDriver: false,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth easing curve
      }).start();
    }
  }, [isCollapsed, milestone.parentId, collapseAnim]);

  return (
    <>
      <Pressable onPress={() => {
        if (editable) {
          // Cancel milestone creation when touching outside
          setEditable(false);
        }
      }}>
        <Animated.View style={[
          styles.container,
          {
            // Eşit sol/sağ margin için
            marginLeft: childIndentAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 48], // Parent: 20px, Child: 20 + 28 = 48px
            }),
            marginRight: 20, // Sol ile eşit
            // Smooth collapse animation for child milestones
            ...(milestone.parentId && {
              opacity: collapseAnim,
              transform: [
                {
                  scaleY: collapseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1], // Start from 30% for smoother effect
                  })
                },
                {
                  translateY: collapseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0], // Slide effect
                  })
                }
              ],
              maxHeight: collapseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 500], // Smooth height transition
              }),
            }),
          }
        ]}>
          <Pressable
            style={({ pressed }) => [
              styles.milestoneItemClickable,
              hasChildren && styles.parentMilestoneClickable,
              {
                backgroundColor: theme.name === 'dark' ? '#2C2C2E' : 'rgba(0, 122, 255, 0.04)',
                // Remove transforms/opacity changes during drag to avoid visual jitter
                opacity: 1,
              },
              isAttachMode && isSelectableForAttach && {
                borderWidth: 2,
                borderColor: '#FF9800',
                borderStyle: 'dashed',
              },
              isAttachMode && !isSelectableForAttach && {
                opacity: 0.4,
              }
            ]}
            disabled={editable || (isAttachMode && !isSelectableForAttach)}
            onPress={handlePress}
            onLongPress={!isAttachMode ? handleLongPress : undefined}
            delayLongPress={500}
          >
            <View style={[
              styles.iconContainer,
              hasChildren && styles.parentIconContainer,
              {
                shadowColor: 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0,
                shadowRadius: 0,
                elevation: 0,
              }
            ]}>
              {hasChildren ? (
                // Parent milestone icon - Calendar with dates
                <View style={styles.parentIconWrapper}>
                  {/* Large calendar icon with dates inside */}
                  <View style={styles.parentCalendarFrame}>
                    <MaterialIcons 
                      name="calendar-today" 
                      size={44} 
                      color={isCompleted ? "#555" : iconBgColor}
                      style={styles.largeCalendarIcon}
                    />
                    <View style={styles.datesInsideCalendar}>
                      {/* Start date inside calendar - Day only */}
                      <Text style={[
                        styles.startDateText,
                        { color: theme.name === 'dark' ? '#FFFFFF' : '#000000' }
                      ]}>
                        {formatDayOnly(milestone.startDate)}
                      </Text>
                      
                      {/* End date inside calendar - Below start date */}
                      <Text style={[
                        styles.endDateText,
                        { color: theme.name === 'dark' ? '#8E8E93' : '#666' }
                      ]}>
                        {formatShortDate(milestone.endDate)}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Badge and collapse button row */}
                  {!editable && (
                    <View style={styles.badgeCollapseRow}>
                      {/* Child counter badge */}
                      <View style={[
                        styles.childBadgeInline,
                        { 
                          backgroundColor: theme.name === 'dark' ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.1)',
                          borderColor: theme.name === 'dark' ? 'rgba(0, 122, 255, 0.4)' : 'rgba(0, 122, 255, 0.3)'
                        }
                      ]}>
                        <Ionicons name="link" size={8} color="#007AFF" />
                        <Text style={styles.childBadgeTextSmall}>
                          {completedChildren}/{childMilestones.length}
                        </Text>
                      </View>
                      
                      {/* Collapse/Expand button */}
                      <TouchableOpacity 
                        onPress={() => onToggleCollapse?.(milestone.id)}
                        style={styles.collapseButtonInline}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons 
                          name={isCollapsed ? "chevron-forward" : "chevron-down"} 
                          size={12} 
                          color={theme.name === 'dark' ? '#8E8E93' : '#666'} 
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                // Child milestone icon - Simple dot
                <>
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
                </>
              )}
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
                <View style={styles.titleRow}>
                  <Text 
                    style={[
                      styles.milestoneText, 
                      { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' },
                      isCompleted && styles.completedText
                    ]}
                    numberOfLines={3}
                    ellipsizeMode="tail"
                  >
                    {title || ''}
                  </Text>
                </View>
              )}
              
              {/* Date info - NO progress bar */}
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
            {!editable && !isCompleted && !isAttachMode && (
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
                backgroundColor: theme.name === 'dark' ? '#2C2C2E' : 'rgba(0, 122, 255, 0.04)',
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
            {/* Attach/Detach Button - LEFT */}
            {milestone.parentId ? (
              // Detach button for child milestones
              <TouchableOpacity
                style={[styles.themeButton, styles.detachButtonTheme]}
                onPress={() => {
                  hideDeleteOptionWithAnimation();
                  onDetachMilestone?.();
                }}
              >
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="unlink" size={16} color="#FF5722" />
                </View>
                <Text style={styles.themeButtonText}>{t('detach') || 'Detach'}</Text>
              </TouchableOpacity>
            ) : (
              // Attach button for parent milestones
              <TouchableOpacity
                style={[styles.themeButton, styles.attachButtonTheme]}
                onPress={() => {
                  hideDeleteOptionWithAnimation();
                  onStartAttachMode?.();
                }}
              >
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="link" size={16} color="#FF9800" />
                </View>
                <Text style={styles.themeButtonText}>{t('attach') || 'Attach'}</Text>
              </TouchableOpacity>
            )}

            {/* Complete/Reopen Button - MIDDLE */}
            {!isCompleted ? (
              <TouchableOpacity
                style={[styles.themeButton, styles.completeButtonTheme]}
                onPress={() => {
                  hideDeleteOptionWithAnimation();
                  onComplete?.();
                }}
              >
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                </View>
                <Text style={styles.themeButtonText}>Complete</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.themeButton, styles.activeButtonTheme]}
                onPress={() => {
                  // SAFETY CHECK: If this is a child, check if parent is completed
                  if (milestone.parentId && allMilestones) {
                    const parent = allMilestones.find(ms => ms.id === milestone.parentId);
                    if (parent?.completed) {
                      Alert.alert(
                        t('cannotReopenChild') || 'Cannot Reopen',
                        t('parentMustBeActiveFirst') || `Parent milestone "${parent.title}" is completed. Please reopen the parent first.`,
                        [{ text: t('ok') || 'OK', style: 'default' }]
                      );
                      hideDeleteOptionWithAnimation();
                      return;
                    }
                  }
                  
                  hideDeleteOptionWithAnimation();
                  onSetActive?.();
                }}
              >
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="play-circle" size={16} color="#2196F3" />
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
                <Ionicons name="trash" size={16} color="#FF3B30" />
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
        </Animated.View>
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
  
  // Check if children count changed for this milestone
  const prevChildren = (prev.allMilestones || []).filter(m => m?.parentId === prevMs.id);
  const nextChildren = (next.allMilestones || []).filter(m => m?.parentId === nextMs.id);
  
  // Compare key fields that affect rendering
  const sameCore = (
    prevMs.id === nextMs.id &&
    prevMs.title === nextMs.title &&
    prevMs.startDate === nextMs.startDate &&
    prevMs.endDate === nextMs.endDate &&
    prevMs.parentId === nextMs.parentId &&
    prev.isLatest === next.isLatest &&
    prev.isCompleted === next.isCompleted &&
    prev.isDragging === next.isDragging &&
    prev.isAttachMode === next.isAttachMode &&
    prev.isSelectableForAttach === next.isSelectableForAttach &&
    prev.attachModeSourceId === next.attachModeSourceId &&
    prev.isCollapsed === next.isCollapsed &&
    prevChildren.length === nextChildren.length && // Children count changed
    (prev.currentTask?.id || null) === (next.currentTask?.id || null)
  );
  return sameCore;
}

export default memo(MileStone, areMilestonePropsEqual);

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 0,
    overflow: 'hidden', // Prevent content overflow during animation
    // marginLeft and marginRight are handled inline for equal spacing
  },
  milestoneItemClickable: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
    minHeight: 52,
    justifyContent: 'flex-start',
  },
  parentMilestoneClickable: {
    paddingVertical: 12, // Reduced vertical space for parent
    minHeight: 60,
  },
  iconContainer: {
    width: 30,
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 2,
    flexDirection: 'column',
    gap: 4,
  },
  parentIconContainer: {
    width: 70, // Wider for larger icon
    marginTop: 0,
  },
  parentIconWrapper: {
    alignItems: 'center',
    gap: 2,
  },
  parentCalendarFrame: {
    width: 50,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  largeCalendarIcon: {
    position: 'absolute',
  },
  datesInsideCalendar: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
    gap: 0,
  },
  startDateText: {
    fontSize: 11,
    fontFamily: FONTS.BOLD,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 11,
    marginTop: 4,
  },
  endDateText: {
    fontSize: 7,
    fontFamily: FONTS.MEDIUM,
    letterSpacing: -0.2,
    textAlign: 'center',
    lineHeight: 8,
    marginTop: 1,
  },
  badgeCollapseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  childBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
  },
  collapseButtonInline: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(142, 142, 147, 0.1)',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  childBadgeTextSmall: {
    fontSize: 8,
    fontFamily: FONTS.MEDIUM,
    color: '#007AFF',
    letterSpacing: -0.2,
  },
  milestoneText: {
    fontFamily: FONTS.MEDIUM,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.2,
    paddingRight: 54, // Edit tuşu için boşluk
    flexWrap: 'wrap',
    flexShrink: 1,
    flex: 1,
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
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    marginRight: 4,
    lineHeight: 14,
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
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  createButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#545454",
  },
  editButton: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  editButtonText: {
    fontSize: 11,
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
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248, 249, 250, 0.95)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 1000,
    flexWrap: "nowrap",
  },
  themeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    marginHorizontal: 4,
    maxWidth: 100,
  },
  attachButtonTheme: {
    backgroundColor: "#FFF3E0",
    borderWidth: 1,
    borderColor: "#FF9800",
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
  detachButtonTheme: {
    backgroundColor: "#FBE9E7",
    borderWidth: 1,
    borderColor: "#FF5722",
  },
  buttonIconContainer: {
    marginRight: 4,
  },
  themeButtonText: {
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
    color: "#1D1D1F",
    letterSpacing: -0.2,
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
    parentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
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
  currentTask: PropTypes.object,
  isAttachMode: PropTypes.bool,
  isSelectableForAttach: PropTypes.bool,
  onStartAttachMode: PropTypes.func,
  onSelectForAttach: PropTypes.func,
  onDetachMilestone: PropTypes.func,
  attachModeSourceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  allMilestones: PropTypes.array,
  isCollapsed: PropTypes.bool,
  onToggleCollapse: PropTypes.func,
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
  isAttachMode: false,
  isSelectableForAttach: false,
  onStartAttachMode: null,
  onSelectForAttach: null,
  onDetachMilestone: null,
  attachModeSourceId: null,
  allMilestones: [],
  isCollapsed: false,
  onToggleCollapse: null,
};

