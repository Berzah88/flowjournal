import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FlashCalendar from "../components/FlashCalendar";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

const { height } = Dimensions.get("window");
const modalHeight = height * 0.90;

export default function EditModal({ visible, onClose, project, onSave }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  const [title, setTitle] = useState(project?.title || "");
  const [startDate, setStartDate] = useState(
    project?.startDate ? new Date(project.startDate) : new Date()
  );
  const [endDate, setEndDate] = useState(
    project?.endDate ? new Date(project.endDate) : new Date()
  );
  const [calendarVisible, setCalendarVisible] = useState(false);

  const inputRef = useRef(null);

  // Animasyon değerleri - ActiveProject ile aynı
  const translateY = useSharedValue(height);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);
  const dragY = useSharedValue(0);

  // Project değişirse state güncelle
  useEffect(() => {
    setTitle(project?.title || "");
    setStartDate(
      project?.startDate ? new Date(project.startDate) : new Date()
    );
    setEndDate(project?.endDate ? new Date(project.endDate) : new Date());
  }, [project]);

  // Cleanup animations on unmount - handled by hooks

  const handleCalendarConfirm = useCallback(({ startDate: sISO, endDate: eISO }) => {
    let s = new Date(sISO);
    let e = new Date(eISO);
    if (s > e) [s, e] = [e, s];
    setStartDate(s);
    setEndDate(e);
    setCalendarVisible(false);
  }, []);

  const handleSave = useCallback(() => {
    onSave &&
      onSave({
        ...project,
        title: title.trim() || project?.title || "",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    onClose && onClose();
  }, [onSave, onClose, project, title, startDate, endDate]);

  // ActiveProject ile aynı animasyon mantığı
  useEffect(() => {
    if (visible) {
      // Reset values first
      translateY.value = height;
      opacity.value = 0;
      scale.value = 0.95;
      dragY.value = 0;
      
      // Small delay to ensure reset is applied
      setTimeout(() => {
        // Then animate in
        translateY.value = withTiming(0, { duration: 320 });
        scale.value = withTiming(1, { duration: 320 });
        opacity.value = withTiming(1, { duration: 320 });
      }, 50);
      
      // Focus input after animation
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // Reset when not visible
      translateY.value = height;
      opacity.value = 0;
      dragY.value = 0;
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    translateY.value = withTiming(height, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      if (onClose) runOnJS(onClose)();
    });
  }, [onClose]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0 && e.y <= 120) {
        dragY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 120 && e.y <= 120) {
        dragY.value = withTiming(height, { duration: 200 }, () => {
          runOnJS(handleClose)();
        });
      } else {
        dragY.value = withTiming(0, { duration: 150 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value + dragY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[
          styles.container,
          {
            backgroundColor: theme.name === 'dark' ? '#1C1C1E' : '#FFFFFF',
            shadowColor: theme.name === 'dark' ? '#000000' : '#000',
            shadowOpacity: theme.name === 'dark' ? 0.3 : 0.1,
            shadowRadius: theme.name === 'dark' ? 20 : 8,
            elevation: theme.name === 'dark' ? 20 : 20,
          },
          animatedStyle
        ]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <Text style={[
              styles.header,
              { color: theme.name === 'dark' ? '#FFFFFF' : '#545454' }
            ]}>Edit Project</Text>
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                {
                  borderBottomColor: theme.name === 'dark' ? '#636366' : '#ccc',
                  color: theme.name === 'dark' ? '#FFFFFF' : '#333',
                }
              ]}
              placeholder={t('projectTitle')}
              placeholderTextColor={theme.name === 'dark' ? '#8E8E93' : '#999'}
              value={title}
              onChangeText={setTitle}
              selectTextOnFocus
            />
            <TouchableOpacity
              style={[
                styles.dateSelector,
                {
                  backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F5F1F1',
                }
              ]}
              onPress={() => setCalendarVisible(true)}
            >
              <Ionicons 
                name="calendar-outline" 
                size={22} 
                color={theme.name === 'dark' ? '#FF6B6B' : '#6C63FF'} 
              />
              <View style={{ marginLeft: 10 }}>
                <Text style={[
                  styles.dateLabel,
                  { color: theme.name === 'dark' ? '#8E8E93' : '#777' }
                ]}>Project Duration</Text>
                <Text style={[
                  styles.dateValue,
                  { color: theme.name === 'dark' ? '#FFFFFF' : '#545454' }
                ]}>
                  {startDate.toDateString()} → {endDate.toDateString()}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[
                  styles.btn,
                  {
                    backgroundColor: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#eee',
                  }
                ]}
                onPress={handleClose}
              >
                <Text style={[
                  styles.btnText,
                  { color: theme.name === 'dark' ? '#FFFFFF' : '#333' }
                ]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.btn,
                  {
                    backgroundColor: theme.name === 'dark' ? '#FF6B6B' : '#6C63FF',
                  }
                ]}
                onPress={handleSave}
              >
                <Text style={[styles.btnText, { color: "#fff" }]}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </GestureDetector>
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
    backgroundColor: "rgba(0,0,0,0.0)",
    justifyContent: "flex-end",
    zIndex: 9999, // Increased to match other modals for consistency
  },
  container: {
    height: modalHeight,
    padding: 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: "100%",
  },
  header: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 25,
    padding: 10,
  },
  input: {
    borderBottomWidth: 1.5,
    paddingVertical: 8,
    fontSize: 22,
    marginBottom: 25,
    marginTop: 10,
    fontFamily: "Poppins_600SemiBold",
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
  },
  dateLabel: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
  },
  dateValue: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    marginTop: 2,
  },
  btnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 0,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    marginLeft: 10,
  },
  btnText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },
});