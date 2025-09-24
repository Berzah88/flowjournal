import React, { useState, useRef, useEffect } from "react";
import { getMilestoneColor } from '../utils/milestoneColors';
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
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import FlashCalendar from "./FlashCalendar";
import { FONTS, COLORS, ANIMATION_DURATIONS, SWIPE_THRESHOLDS } from "../constants";
import { useModalAnimation } from "../hooks/useAnimations";

const { width, height } = Dimensions.get("window");

export default function AddMilestoneModal({ visible, onClose, onSave, editingMilestone = null, onEditToggle = null }) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Modal rengini belirle - Renk sistemi artık utils/milestoneColors.js'den yönetiliyor
  const getModalColor = () => {
    if (editingMilestone) {
      return getMilestoneColor(editingMilestone);
    }
    return '#B6CEB4'; // Yeni milestone için varsayılan renk (paletten ilk renk)
  };
  
  // Use custom animation hook
  const { translateY, opacity, scale, closeModal } = useModalAnimation(visible, onClose);
  const backdropOpacity = useSharedValue(0);
  const inputRef = useRef(null);

  // Cleanup animations on unmount - handled by hooks

  useEffect(() => {
    if (visible) {
      // Reset form or load editing milestone
      if (editingMilestone) {
        setTitle(editingMilestone.title || "");
        setStartDate(editingMilestone.startDate ? new Date(editingMilestone.startDate) : new Date());
        setEndDate(editingMilestone.endDate ? new Date(editingMilestone.endDate) : new Date());
        setIsEditing(true);
      } else {
        setTitle("");
        setStartDate(new Date());
        setEndDate(new Date());
        setIsEditing(false);
      }
      
      // Backdrop animation only - modal animation handled by hook
      backdropOpacity.value = withTiming(0.45, { duration: ANIMATION_DURATIONS.NORMAL });

      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 375); // 300 * 1.25 - animasyon bitince focus

      return () => clearTimeout(timeout);
    } else {
      // Reset backdrop when not visible
      backdropOpacity.value = 0;
    }
  }, [visible, editingMilestone, backdropOpacity]);

  const handleCloseModal = () => {
    // Close modal - animation handled by hook
    backdropOpacity.value = withTiming(0, { duration: ANIMATION_DURATIONS.FAST });
    closeModal();
  };

  const handleSave = () => {
    if (!title.trim()) {
      // Focus on title input if empty
      inputRef.current?.focus();
      return;
    }

    const milestoneData = {
      id: editingMilestone ? editingMilestone.id : Date.now().toString(),
      title: title.trim(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      completed: editingMilestone ? editingMilestone.completed : false,
      journalEntries: editingMilestone ? editingMilestone.journalEntries : [],
    };

    // Smooth save animation (25% slower)
    backdropOpacity.value = withTiming(0, { duration: 250 }); // 200 * 1.25
    translateY.value = withSpring(height, {
      damping: 30,
      stiffness: 400, // 500 / 1.25
      mass: 0.8,
    });
    opacity.value = withTiming(0, { duration: 312 }); // 250 * 1.25
    scale.value = withSpring(0.9, {
      damping: 25,
      stiffness: 320, // 400 / 1.25
      mass: 0.6,
    }, (finished) => {
      if (finished) {
        runOnJS(onSave)(milestoneData);
        if (isEditing && onEditToggle) {
          runOnJS(onEditToggle)(false);
        }
        runOnJS(onClose)();
      }
    });
  };

  const handleCalendarConfirm = ({ startDate: sISO, endDate: eISO }) => {
    const s = new Date(sISO);
    const e = new Date(eISO);
    setStartDate(s);
    setEndDate(e);
    setCalendarVisible(false);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
    opacity: opacity.value,
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        <TouchableOpacity 
          style={styles.backdropTouchable} 
          activeOpacity={1} 
          onPress={handleCloseModal}
        />
      </Animated.View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <Animated.View style={[
          styles.milestoneCard, 
          isEditing && styles.editMilestoneCard,
          { backgroundColor: getModalColor() },
          animatedStyle
        ]}>
          {/* Milestone Card Content - MileStone component ile aynı stil */}
          <View style={styles.cardContent}>
            {/* Icon - MileStone ile aynı */}
            <View style={styles.iconWrapper}>
              <Image source={require("../assets/yourDateVisual.png")} style={styles.icon} />
            </View>

            {/* Body */}
            <View style={styles.body}>
              {/* Title Input */}
              <TextInput
                ref={inputRef}
                style={styles.titleInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter milestone title..."
                placeholderTextColor="#999"
                returnKeyType="done"
                onSubmitEditing={handleSave}
                multiline={true}
                textAlignVertical="top"
                maxLength={200}
              />

              {/* Date Row */}
              <TouchableOpacity 
                style={styles.dateRow}
                onPress={() => setCalendarVisible(true)}
                activeOpacity={0.7}
                accessible={true}
                accessibilityLabel="Select milestone dates"
                accessibilityHint="Opens calendar to select start and end dates"
                accessibilityRole="button"
              >
                <Ionicons name="calendar-outline" size={14} color="#7f8c8d" style={styles.timerIcon} />
                <Text style={styles.dateText}>
                  {startDate.toDateString()} → {endDate.toDateString()}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={handleCloseModal}
                accessible={true}
                accessibilityLabel="Cancel milestone creation"
                accessibilityHint="Closes the milestone creation modal without saving"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={18} color="#7f8c8d" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.saveBtn, !title.trim() && styles.saveBtnDisabled]} 
                onPress={handleSave}
                disabled={!title.trim()}
                accessible={true}
                accessibilityLabel={title.trim() ? "Save milestone" : "Save milestone (disabled)"}
                accessibilityHint="Saves the milestone with the entered title and dates"
                accessibilityRole="button"
              >
                <Ionicons name="checkmark" size={18} color={title.trim() ? "#fff" : "#999"} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
      
      <FlashCalendar
        visible={calendarVisible}
        initialStart={startDate}
        initialEnd={endDate}
        onConfirm={handleCalendarConfirm}
        onCancel={() => setCalendarVisible(false)}
        minDate={undefined}
      />
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
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdropTouchable: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  milestoneCard: {
    // MileStone component ile aynı stil
    flexDirection: "row",
    alignItems: "flex-start", // flex-start yaparak üstten hizalama
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: height * 0.15, // Ekranın altında %15 görünsün - daha aşağıda
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
    // backgroundColor dinamik olarak belirleniyor
    width: width - 40,
    minHeight: 80, // Minimum yükseklik
  },
  editMilestoneCard: {
    // backgroundColor dinamik olarak belirleniyor
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start", // flex-start yaparak üstten hizalama
    padding: 14,
    flex: 1,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#BAB0F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    elevation: 2,
    shadowColor: "#BAB0F9",
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
    minHeight: 20, // Minimum yükseklik
    maxHeight: 80, // Maksimum yükseklik (4 satır)
    textAlignVertical: 'top',
  },
  dateRow: { 
    flexDirection: "row", 
    alignItems: "center",
    marginTop: 4,
    paddingVertical: 4,
  },
  timerIcon: { 
    marginRight: 6 
  },
  dateText: {
    fontSize: 12,
    fontFamily: FONTS.REGULAR,
    color: "#7f8c8d",
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Üstten hizalama
    gap: 8,
    marginTop: 4, // Icon ile aynı hizada olması için
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
    backgroundColor: '#8E7DBE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#E0E0E0',
  },
});
