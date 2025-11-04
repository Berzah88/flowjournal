import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  BackHandler,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import { useTaskActions } from "../hooks/useTaskContext";
import { usePerformanceMonitor } from "../hooks/usePerformanceMonitor";
import { useSpringAnimation } from "../hooks/useAnimations";
import FlashCalendar from "../components/FlashCalendar";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useEducation } from "../context/EducationContext";
import { Typography } from '../constants';
import { EDUCATION_STEPS } from "../context/EducationContext";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

const { width } = Dimensions.get('window');
export default function AddProjectScreen({ visible, onClose }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { addTask } = useTaskActions();
  const { 
    isEducationActive, 
    currentStep, 
    setEducationProjectId, 
    nextStep 
  } = useEducation();
  
  // Performance monitoring (sadece development'ta) - geçici olarak devre dışı
  // usePerformanceMonitor('AddProjectScreen');
  const [newTitle, setNewTitle] = useState("");
  const [endDate, setEndDate] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const inputRef = useRef(null);

  // Apple-style animation values using custom hook
  const { translateY, opacity, scale } = useSpringAnimation(visible);


  // Android back button handler
  useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      handleCloseModal();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => sub.remove();
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setCalendarVisible(false);
      setNewTitle("");
      setEndDate(new Date());

      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 200);

      return () => clearTimeout(timeout);
    }
  }, [visible]);

  const handleCloseModal = () => {
    // Close modal - animation handled by useSpringAnimation hook
    if (onClose) {
      onClose();
    }
  };

  const handleCalendarConfirm = ({ startDate: sISO, endDate: eISO }) => {
    const s = new Date(sISO);
    const e = new Date(eISO);
    
    if (newTitle.trim() !== "") {
      const newProjectId = Date.now(); // This will be the task ID
      
      addTask({
        id: newProjectId, // Set ID explicitly for education tracking
        title: newTitle.trim(),
        startDate: s.toISOString(),
        endDate: e.toISOString(),
        category: "",
        done: false,
        milestones: [],
      });

      // Education: Move to next step after creating first project
      if (isEducationActive && currentStep === EDUCATION_STEPS.CREATE_PROJECT) {
        setEducationProjectId(newProjectId);
        // Move to next step
        setTimeout(() => {
          nextStep();
        }, 300);
      }
    }
    handleCloseModal();
  };

  // Apple-style animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <TouchableWithoutFeedback onPress={handleCloseModal}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <Animated.View style={[
                styles.modalContent, 
                { backgroundColor: theme.name === 'dark' ? '#2C2C2E' : '#FFFFFF' },
                animatedStyle
              ]}>
                <TextInput
                  ref={inputRef}
                  style={[
                    styles.inputOverlay,
                    { 
                      color: theme.name === 'dark' ? '#FFFFFF' : theme.text,
                      borderBottomColor: theme.name === 'dark' ? '#8E8E93' : '#ccc'
                    }
                  ]}
                  value={newTitle}
                  placeholder={t('enterProjectTitle')}
                  placeholderTextColor={theme.name === 'dark' ? '#8E8E93' : '#999'}
                  onChangeText={setNewTitle}
                  onSubmitEditing={() => {
                    if (newTitle.trim() !== "") setCalendarVisible(true);
                    else Keyboard.dismiss();
                  }}
                  returnKeyType="done"
                  autoFocus
                  multiline={true}
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    { 
                      backgroundColor: newTitle.trim() 
                        ? (theme.name === 'dark' ? '#FF6B6B' : '#6C63FF') 
                        : (theme.name === 'dark' ? '#8E8E93' : '#888') 
                    },
                  ]}
                  disabled={!newTitle.trim()}
                  onPress={() => setCalendarVisible(true)}
                >
                  <Text style={styles.dateButtonText}>{t('addDate')}</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>

      <FlashCalendar
        visible={calendarVisible}
        initialStart={null}
        initialEnd={null}
        onConfirm={handleCalendarConfirm}
        onCancel={() => setCalendarVisible(false)}
        minDate={new Date()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    // Ensure this modal overlay is above other UI (StatusTabs, headers, etc.)
    zIndex: 100000,
    elevation: 100000,
  },
  overlay: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.0)",
    // Match overlay stacking with modalOverlay
    zIndex: 100000,
    elevation: 100000,
  },
  modalContent: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    width: Math.min(340, width - 40), // Responsive: max 340 or screen width - 40px padding
    maxWidth: '90%', // Never exceed 90% of screen width
    elevation: 50,
    // Ensure the modal content itself is above other components
    zIndex: 100001,
  },
  inputOverlay: {
    width: "100%",
    fontSize: 20,
    fontFamily: Typography.fonts.bold,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginVertical: 15,
    paddingVertical: 6,
    minHeight: 60,
    maxHeight: 120,
  },
  dateButton: {
    paddingVertical: 15,
    marginVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: "center",
  },
  dateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: Typography.fonts.bold,
  },
});
