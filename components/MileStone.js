import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Alert, Pressable, Keyboard, Easing, Vibration } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from 'expo-haptics';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import AnimatedReanimated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, Easing as ReanimatedEasing } from 'react-native-reanimated';
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
  onStartAttachMode, // Attach mode'u başlat
  onSelectForAttach, // Attach için seç
  onDetachMilestone, // Milestone'u parent'ından ayır
  attachModeSourceId = null, // Attach mode'u başlatan milestone ID
  allMilestones = [], // Tüm milestone'lar (child sayısı için)
}) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  // Performance monitoring (sadece development'ta) - geçici olarak devre dışı
  // usePerformanceMonitor('MileStone');
  
  if (!milestone) return null;

  // Haptic feedback helper with fallback
  const triggerHaptic = useCallback(async (style = Haptics.ImpactFeedbackStyle.Medium) => {
    try {
      await Haptics.impactAsync(style);
      console.log('✅ Milestone Haptic:', style === Haptics.ImpactFeedbackStyle.Medium ? 'MEDIUM' : 'LIGHT');
    } catch (error) {
      // Fallback to native Vibration
      try {
        const duration = style === Haptics.ImpactFeedbackStyle.Medium ? 50 : 30;
        Vibration.vibrate(duration);
        console.log('✅ Milestone Vibration:', duration + 'ms');
      } catch (vibError) {
        console.log('Haptic feedback not available');
      }
    }
  }, []);

  // Format date to localized short month format (e.g. 'Mar. 13' or 'Mar 13' depending on locale)
  const formatShortDate = useCallback((dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const locale = language === 'tr' ? 'tr-TR' : (language || 'en-US');
      const month = date.toLocaleDateString(locale, { month: 'short' });
      return `${month} ${date.getDate()}`;
    } catch (e) {
      return '';
    }
  }, [language]);

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

  // Format date for circular progress center - compact format
  const formatCompactDate = useCallback((dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const locale = language === 'tr' ? 'tr-TR' : (language || 'en-US');
      const month = date.toLocaleDateString(locale, { month: 'short' });
      return { day: day.toString(), month };
    } catch (e) {
      return { day: '', month: '' };
    }
  }, [language]);

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

  const inputRef = useRef(null);
  
  // Check if this milestone should be shown as child
  const isChildMilestone = milestone.parentId || (isAttachMode && milestone.id === attachModeSourceId);
  
  // NO ANIMATION for child indent - direkt marginLeft kullan (daha stabil)
  // Animasyon titreşim yapıyordu, static daha iyi
  
  // ⚠️ Touch animation kaldırıldı - görsel geri bildirim yok
  // const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Swipe gesture animations - 4 YÖNLÜ (up/down/left/right)
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const swipeActionOpacity = useSharedValue(0);
  const currentSwipeDirection = useSharedValue('none'); // 'up', 'down', 'left', 'right', 'none'
  const hasTriggeredHaptic = useSharedValue(false); // Haptic sadece bir kez tetiklensin

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
  // Use the `language` value from the component scope (useLanguage called at top)
  if (language === 'tr') {
        if (isCompleted) {
          const diff = Math.ceil((endDate - startDate) / 86400000);
          // "X günde tamamlandı"
          return `${diff} günde tamamlandı`;
        } else if (diffStart > 0) {
          // "X gün sonra başlıyor"
          return `${diffStart} gün sonra başlıyor`;
        } else if (diffEnd >= 0) {
          // "X gün sonra bitiyor"
          return `${diffEnd} gün sonra bitiyor`;
        } else {
          // If milestone is past end date and not completed, show overdue / delayed wording
          const days = Math.abs(diffEnd);
          // Prefer localized translation keys defined in LanguageContext
          try {
            // Use singular/plural keys when available
            if (language === 'tr') {
              return days === 1 ? (t('overdue1Day') || `${days} gün gecikme`) : (t('overdueDays', { days }) || `${days} gün gecikme`);
            } else {
              return days === 1 ? (t('overdue1Day') || `${days} day overdue`) : (t('overdueDays', { days }) || `${days} days overdue`);
            }
          } catch (e) {
            // Fallback string
            return language === 'tr' ? `${days} gün gecikme` : `${days} days overdue`;
          }
        }
      } else {
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

  // ⚠️ Touch animations kaldırıldı - görsel geri bildirim yok
  
  // Optimized press handler
  // Press animation for visual feedback
  const [pressScale] = useState(new Animated.Value(1));
  
  const handlePress = useCallback(() => {
    // Attach mode aktifken attach işlemini yap
    if (isAttachMode) {
      if (isSelectableForAttach && onSelectForAttach) {
        onSelectForAttach();
      }
      return;
    }
    
    // Editable değilse ve completed değilse, edit modal aç
    if (!editable && !isCompleted) {
      // Visual feedback - scale animation (haptic yok)
      Animated.sequence([
        Animated.timing(pressScale, {
          toValue: 0.98,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(pressScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Edit modal aç
      setTimeout(() => handleEditToggle(), 50);
    }
  }, [isAttachMode, isSelectableForAttach, onSelectForAttach, editable, isCompleted, pressScale, handleEditToggle]);
  
  // Swipe gesture handlers
  const handleSwipeDelete = useCallback(() => {
    onDelete?.();
  }, [onDelete]);
  
  const handleSwipeComplete = useCallback(() => {
    if (milestone.parentId) {
      // Child: detach
      onDetachMilestone?.();
    } else {
      // Parent: attach
      onStartAttachMode?.();
    }
  }, [milestone.parentId, onDetachMilestone, onStartAttachMode]);
  
  // Attach/Detach handler - worklet dışında tanımla
  const handleSwipeAttach = useCallback(() => {
    if (milestone.parentId) {
      // Child ise detach
      onDetachMilestone?.();
    } else {
      // Parent ise attach mode başlat
      onStartAttachMode?.();
    }
  }, [milestone.parentId, onDetachMilestone, onStartAttachMode]);
  
  // 2-WAY Swipe gesture - Left/Right only (Delete/Complete)
  const swipeGesture = Gesture.Pan()
    .enabled(!editable && !isAttachMode)
    .minDistance(10)
    .activateAfterLongPress(100) // 100ms sonra swipe aktif
    .onStart(() => {
      hasTriggeredHaptic.value = false;
      currentSwipeDirection.value = 'none';
    })
    .onUpdate((e) => {
      const absX = Math.abs(e.translationX);
      const absY = Math.abs(e.translationY);
      
      // Sadece horizontal swipe - vertical'ı ignore et
      if (absX > absY) {
        // Determine direction
        let direction = 'none';
        if (absX > 10) {
          direction = e.translationX > 0 ? 'right' : 'left';
        }
        
        // Haptic feedback sadece bir kez
        if (!hasTriggeredHaptic.value && direction !== 'none') {
          hasTriggeredHaptic.value = true;
          currentSwipeDirection.value = direction;
          runOnJS(triggerHaptic)(Haptics.ImpactFeedbackStyle.Light);
        }
        
        // ⬅️ Left swipe (DELETE) - Kırmızı
        if (e.translationX < -10) {
          translateX.value = Math.max(e.translationX, -100);
          swipeActionOpacity.value = Math.min(absX / 80, 1);
        }
        // ➡️ Right swipe (COMPLETE) - Yeşil
        else if (e.translationX > 10) {
          translateX.value = Math.min(e.translationX, 100);
          swipeActionOpacity.value = Math.min(absX / 80, 1);
        }
      }
    })
    .onEnd((e) => {
      hasTriggeredHaptic.value = false;
      const absX = Math.abs(e.translationX);
      
      // ⬅️ Left swipe (DELETE)
      if (e.translationX < -80) {
        translateX.value = withTiming(0, { duration: 350, easing: ReanimatedEasing.bezier(0.25, 0.1, 0.25, 1) });
        swipeActionOpacity.value = withTiming(0, { duration: 300, easing: ReanimatedEasing.ease });
        runOnJS(handleSwipeDelete)();
      }
      // ➡️ Right swipe (COMPLETE)
      else if (e.translationX > 80) {
        translateX.value = withTiming(0, { duration: 350, easing: ReanimatedEasing.bezier(0.25, 0.1, 0.25, 1) });
        swipeActionOpacity.value = withTiming(0, { duration: 300, easing: ReanimatedEasing.ease });
        runOnJS(handleSwipeComplete)();
      }
      // Reset if not enough swipe
      else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 120, mass: 0.5 });
        swipeActionOpacity.value = withTiming(0, { duration: 250, easing: ReanimatedEasing.ease });
      }
      
      currentSwipeDirection.value = 'none';
    });
  
  const swipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
    ],
    // Opacity kontrolü inline style'da yapılıyor
  }));
  
  // 2 yönlü action opacity'leri (sadece horizontal)
  const deleteActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < 0 ? swipeActionOpacity.value : 0, // Left swipe
  }));
  
  const completeActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 0 ? swipeActionOpacity.value : 0, // Right swipe
  }));

  const locale = language === 'tr' ? 'tr-TR' : (language || 'en-US');

  // Günlükleri tarihlere göre gruplandır
  // ⚠️ GEÇICI OLARAK KALDIRILDI - Journal grouping functions
  /*
  const groupEntriesByDate = useCallback((entries) => {
    const groups = {};
    entries.forEach(entry => {
      const date = new Date(entry.createdAt);
      const dateKey = date.toLocaleDateString(locale, {
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
  }, [locale]);

  const groupedEntries = useMemo(() => groupEntriesByDate(entries), [entries, groupEntriesByDate]);
  */

  // Calculate children info for this milestone
  const childMilestones = useMemo(() => {
    if (!milestone?.id || !Array.isArray(allMilestones)) return [];
    return allMilestones.filter(m => m?.parentId === milestone.id);
  }, [allMilestones, milestone?.id]);
  
  const hasChildren = childMilestones.length > 0;
  const completedChildren = childMilestones.filter(m => m?.completed).length;
  
  // Calculate time-based progress percentage (for parent milestones)
  // NEW LOGIC: From earliest child start to parent end
  const progressPercentage = useMemo(() => {
    if (!hasChildren || !milestone.startDate || !milestone.endDate) return 0;
    
    try {
      const now = new Date();
      const parentEnd = new Date(milestone.endDate);
      
      // Find earliest child start date
      let earliestChildStart = null;
      if (childMilestones.length > 0) {
        earliestChildStart = childMilestones.reduce((earliest, child) => {
          const childStart = new Date(child.startDate);
          return !earliest || childStart < earliest ? childStart : earliest;
        }, null);
      }
      
      // If no children or can't find earliest, fallback to parent start
      const effectiveStart = earliestChildStart || new Date(milestone.startDate);
      
      // If not started yet (before earliest child)
      if (now < effectiveStart) return 0;
      
      // If already ended or completed
      if (now > parentEnd || milestone.completed) return 100;
      
      // Calculate percentage based on elapsed time from earliest child to parent end
      const totalDuration = parentEnd - effectiveStart;
      const elapsedDuration = now - effectiveStart;
      const percentage = (elapsedDuration / totalDuration) * 100;
      
      return Math.max(0, Math.min(100, Math.round(percentage)));
    } catch (error) {
      console.error('Error calculating progress:', error);
      return 0;
    }
  }, [hasChildren, milestone.startDate, milestone.endDate, milestone.completed, childMilestones]);

  // NO ANIMATION - direkt marginLeft hesapla (titreşim önleme)

  return (
    <>
      <Pressable onPress={() => {
        if (editable) {
          // Cancel milestone creation when touching outside
          setEditable(false);
        }
      }}>
        <View style={[
          styles.container,
          {
            // Daha ince, kart olmayan görünüm: sol/sağ boşluk biraz azaltıldı
            // Child milestone'lar için biraz daha indent verildi
            marginLeft: isChildMilestone ? 44 : 16,
            marginRight: 16,
            marginBottom: 0,
            marginTop: 0,
          }
        ]}>
          {/* Swipe Action Backgrounds - Horizontal Only */}
          <View style={styles.swipeActionsContainer}>
            {/* ⬅️ Left: DELETE - Kırmızı */}
            <AnimatedReanimated.View style={[styles.deleteAction, deleteActionStyle]}>
              <Ionicons name="trash" size={22} color="#FFF" />
              <Text style={styles.actionText}>Delete</Text>
            </AnimatedReanimated.View>
            
            {/* ➡️ Right: ATTACH - Sağ tarafta görünsün */}
            <AnimatedReanimated.View style={[styles.completeAction, completeActionStyle]}>
              <Ionicons name={milestone.parentId ? "remove-circle-outline" : "link-outline"} size={22} color="#FFF" />
              <Text style={styles.actionText}>{milestone.parentId ? "Detach" : "Attach"}</Text>
            </AnimatedReanimated.View>
          </View>
          
          <GestureDetector gesture={swipeGesture}>
                <AnimatedReanimated.View style={[swipeAnimatedStyle]}>
              {/* Flat list-style item (no card): press scale kept but background removed */}
              <Animated.View style={{ transform: [{ scale: pressScale }] }}>
                <Pressable
                  style={[
                    styles.milestoneItemClickable,
                    // background and borderRadius removed for all milestones
                    isAttachMode && !isSelectableForAttach ? { opacity: 0.45 } : null,
                  ]}
                  disabled={editable || (isAttachMode && !isSelectableForAttach)}
                  onPress={handlePress}
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
                // Parent milestone - use simplified icon like MyDay ProjectCard
                <View style={styles.parentIconWrapper}>
                  <Pressable
                    onPress={() => {
                      // Toggle complete / reopen
                      try {
                        if (isCompleted) {
                          onSetActive?.();
                        } else {
                          onComplete?.();
                          // Haptic feedback on complete
                          triggerHaptic?.(Haptics.ImpactFeedbackStyle.Medium);
                        }
                      } catch (e) {
                        console.error('Milestone icon press error:', e);
                      }
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                      size={28}
                      color={isCompleted ? '#34C759' : getMilestoneColor(safeMilestone, theme.name)}
                    />
                  </Pressable>

                  {/* Child counter badge (kept) */}
                  {!editable && (
                    <View style={styles.badgeCollapseRow}>
                      <View style={[
                        styles.childBadgeInline,
                        { 
                          backgroundColor: theme.name === 'dark' 
                            ? 'rgba(142, 142, 147, 0.25)' 
                            : 'rgba(142, 125, 190, 0.12)',
                          borderColor: theme.name === 'dark' 
                            ? 'rgba(142, 142, 147, 0.4)' 
                            : 'rgba(142, 125, 190, 0.25)'
                        }
                      ]}>
                        <Ionicons 
                          name="link" 
                          size={8} 
                          color={theme.name === 'dark' ? '#AEAEB2' : '#8E7DBE'} 
                        />
                        <Text style={[
                          styles.childBadgeTextSmall,
                          { color: theme.name === 'dark' ? '#AEAEB2' : '#8E7DBE' }
                        ]}>
                          {completedChildren}/{childMilestones.length}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                // Child milestone icon - same simplified style
                <View style={styles.childIconWrapper}>
                  <Pressable
                    onPress={() => {
                      // For children, behave same: complete or reopen
                      try {
                        if (isCompleted) {
                          onSetActive?.();
                        } else {
                          onComplete?.();
                          triggerHaptic?.(Haptics.ImpactFeedbackStyle.Medium);
                        }
                      } catch (e) {
                        console.error('Milestone icon press error:', e);
                      }
                    }}
                    onLongPress={onStartDrag}
                    delayLongPress={120}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={isCompleted ? '#34C759' : getMilestoneColor(safeMilestone, theme.name)}
                    />
                  </Pressable>
                </View>
              )}
            </View>
            <View style={styles.milestoneContent}>
              {editable ? (
                <TextInput
                  ref={inputRef}
                  style={[styles.milestoneText, { color: theme.name === 'dark' ? '#FFFFFF' : '#1D1D1F' }]}
                  value={title}
                  placeholder={t('enterMilestoneTitle')}
                  placeholderTextColor={theme.name === 'dark' ? '#8E8E93' : '#C7C7CC'}
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

            {/* Top-right buttons column (attach + add-child) - stacked inside milestone area */}
            <View style={styles.topRightButtonsColumn} pointerEvents="box-none">
              {!editable && !isCompleted && !isAttachMode && !milestone.parentId && (
                <Pressable
                  style={({ pressed }) => [
                    styles.addChildButton,
                    {
                      alignSelf: 'flex-end', // Sağ tarafa yasla
                      marginRight: 24, // Header'daki butonla aynı margin
                      marginTop: 0,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 1,
                      borderColor: pressed ? '#FFA726' : '#FFB84D',
                      backgroundColor: 'transparent',
                      justifyContent: 'center',
                      alignItems: 'center',
                      transform: [{ scale: pressed ? 0.92 : 1 }],
                    }
                  ]}
                  onPress={() => {
                    try {
                      onEditToggle?.({ parentId: milestone.id, taskId: milestone.taskId || currentTask?.id, projectTitle: milestone.projectTitle || currentTask?.title || '', title: '' });
                    } catch (e) {
                      console.error('Add child milestone error:', e);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('addChildMilestone') || 'Add child milestone'}
                  accessibilityHint={t('addChildMilestoneHint') || 'Tap to add a new milestone as a child of this one'}
                >
                  <Ionicons
                    name="add"
                    size={14}
                    color={theme.name === 'dark' ? '#FFD580' : '#FF8F00'}
                    style={{
                      textAlign: 'center',
                      textAlignVertical: 'center',
                      backgroundColor: 'transparent',
                    }}
                  />
                </Pressable>
              )}
            </View>

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

      {/* Ince ayırıcı çizgi (divider) */}
        </Animated.View>
                <View style={[styles.divider, { backgroundColor: theme.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />
              </AnimatedReanimated.View>
          </GestureDetector>
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
    prevChildren.length === nextChildren.length && // Children count changed
    (prev.currentTask?.id || null) === (next.currentTask?.id || null)
  );
  return sameCore;
}

export default memo(MileStone, areMilestonePropsEqual);

const styles = StyleSheet.create({
  container: {
    marginTop: 5,
    marginBottom: 5,
    position: 'relative',
    // marginLeft and marginRight are handled inline for equal spacing
  },
  swipeActionsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  // ⬅️ Left swipe: DELETE - Sol tarafta görünsün
  deleteAction: {
    position: 'absolute',
    right: 0, // Sola swipe → Sağda kaldığı için DELETE burada
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: 4,
  },
  // ➡️ Right swipe: ATTACH - Sağ tarafta görünsün
  completeAction: {
    position: 'absolute',
    left: 0, // Sağa swipe → Solda kaldığı için ATTACH burada
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: '#FFB84D', // soft orange
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: 4,
  },
  actionText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  milestoneItemClickable: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 6,
    justifyContent: 'flex-start',
    zIndex: 2, // Action'ların üzerinde olmalı (zIndex: 0)
    // Flat list item - no card background
  },
  parentMilestoneClickable: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  iconContainer: {
    width: 64, // fixed width so parent/child icon area doesn't change and shift text
    alignItems: "center",
    justifyContent: "flex-start",
    flexDirection: 'column',
    gap: 4,
    paddingTop: 2, // Slight top padding for alignment
  },
  parentIconContainer: {
    // width intentionally not set to avoid layout shifts when toggling parent/child state
    marginTop: 0,
    justifyContent: "center", // Parent icons centered
  },
  parentIconWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  childIconWrapper: {
    alignItems: 'center',
    paddingTop: 0, // Child icons at top
  },
  // SVG Circular Progress Bar Styles (Modernized)
  circularProgressContainer: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  progressCircleCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  startDateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  circleStartDayText: {
    fontSize: 13,
    fontFamily: FONTS.BOLD,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 13,
  },
  circleStartMonthText: {
    fontSize: 6,
    fontFamily: FONTS.MEDIUM,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 7,
    marginTop: 1,
  },
  circleEndDateText: {
    fontSize: 8,
    fontFamily: FONTS.MEDIUM,
    fontWeight: '500',
    letterSpacing: -0.2,
    lineHeight: 9,
  },
  circleSeparator: {
    fontSize: 7,
    fontFamily: FONTS.REGULAR,
    letterSpacing: 0,
    lineHeight: 7,
    marginVertical: 0,
  },
  // Badge and Collapse Button Row
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
  childBadgeTextSmall: {
    fontSize: 8,
    fontFamily: FONTS.MEDIUM,
    letterSpacing: -0.2,
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
    marginLeft: 10,
    minWidth: 0,
    maxWidth: '100%',
  },

  divider: {
    height: 1,
    marginLeft: 68, // leave space for icon
    marginRight: 8,
  },

  parentBackground: {
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  milestoneText: {
    fontFamily: FONTS.MEDIUM,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.2,
    paddingRight: 54, // Edit tuşu için boşluk
    flex: 1,
    flexWrap: 'wrap',
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
  attachButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    zIndex: 5,
  },
  addChildButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#FFB84D',
    backgroundColor: 'transparent', // İç kısım tamamen şeffaf
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },

  topRightButtonsColumn: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 8,
    width: 40,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    padding: 2,
  },
  attachButtonText: {
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
  // Compact Action Menu - Edit ve Attach
  actionButtonsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 1000,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
};

