import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Alert, Pressable, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FlashCalendar from "./FlashCalendar";
import JournalCard from "./JournalCard";
import PropTypes from "prop-types";
import { getMilestoneColor, getMilestoneCardColor } from '../utils/milestoneColors';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { FONTS, ANIMATION_DURATIONS } from '../constants';


const MileStone = memo(function MileStone({
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
}) {
  // Performance monitoring (sadece development'ta) - geçici olarak devre dışı
  // usePerformanceMonitor('MileStone');
  
  if (!milestone) return null;

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
      "Emin misiniz? Silinen Milestone Geri alınamaz",
      "",
      [
        {
          text: "İptal",
          style: "cancel",
          onPress: hideDeleteOptionWithAnimation,
        },
        {
          text: "Sil",
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
  };

  // Renk sistemi - kart gövdesi beyaz, icon arkaplanı renkli
  const cardBgColor = useMemo(() => getMilestoneCardColor(), []);
  const iconBgColor = useMemo(() => getMilestoneColor(milestone), [milestone]);

  // Günlük kartları için gerekli fonksiyonlar
  const entries = milestone?.journalEntries?.slice().sort((a, b) => b.id - a.id) || [];

  // Günlükleri tarihlere göre gruplandır
  const groupEntriesByDate = useCallback((entries) => {
    const groups = {};
    entries.forEach(entry => {
      const date = new Date(entry.createdAt);
      const dateKey = date.toLocaleDateString('tr-TR', {
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
                transform: [{ scale: pressed && !editable ? 0.96 : 1 }],
              }
            ]}
            disabled={editable}
            onPress={() => {
              if (!editable && !showDeleteOption) {
                if (onOpenJournal) {
                  onOpenJournal(milestone);
                } else if (onOpenDetail) {
                  onOpenDetail();
                }
              }
            }}
            onLongPress={handleLongPress}
            delayLongPress={500}
          >
            <View style={styles.iconContainer}>
              <Ionicons 
                name="ellipse" 
                size={18} 
                color={isCompleted ? "#555" : iconBgColor} 
              />
            </View>
            <View style={styles.milestoneContent}>
              {editable ? (
                <TextInput
                  ref={inputRef}
                  style={styles.milestoneText}
                  value={title}
                  placeholder="Milestone title"
                  onChangeText={setTitle}
                  editable={editable}
                  onSubmitEditing={handleCreateMilestone}
                  returnKeyType="done"
                  blurOnSubmit={true}
                  multiline={true}
                />
              ) : (
                <Text style={[styles.milestoneText, isCompleted && styles.completedText]}>{title}</Text>
              )}
              
              {/* Date info - only show if not editable or if milestone has dates */}
              {(!editable || (startDate && endDate)) && (
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
                  <Ionicons name="calendar-outline" size={12} color="#666" style={styles.timerIcon} />
                  <Text style={[styles.daysText, isCompleted && styles.completedText]}>{getDaysText()}</Text>
                  {editable && <Ionicons name="chevron-down" size={14} color="#555" />}
                </Pressable>
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
                <Text style={styles.editButtonText}>Edit</Text>
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
          {!editable && groupedEntries.length > 0 && (
            <View style={styles.journalCardsContainer}>
              {groupedEntries.slice(0, 3).map((dayGroup) => (
                <JournalCard 
                  key={dayGroup.date}
                  dayGroup={dayGroup}
                  navigation={navigation}
                  taskId={milestone?.taskId}
                  milestoneId={milestone?.id}
                  isCompleted={isCompleted}
                />
              ))}
              {groupedEntries.length > 3 && (
                <View style={styles.moreEntriesIndicator}>
                  <Text style={styles.moreEntriesText}>+{groupedEntries.length - 3} daha fazla gün</Text>
                </View>
              )}
            </View>
          )}

        {/* Action Options Overlay */}
        {showDeleteOption && (
          <View style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}>
            {/* Close Button - Top Right Corner */}
            <Pressable
              style={({ pressed }) => [
                styles.closeButton,
                {
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                  opacity: pressed ? 0.7 : 1,
                }
              ]}
              onPress={hideDeleteOptionWithAnimation}
            >
              <Ionicons name="close" size={18} color="#666" />
            </Pressable>

            {/* Action Buttons */}
            <View style={{
              flexDirection: "row",
              width: "100%",
              height: "100%",
              borderRadius: 20,
              overflow: "hidden",
            }}>
              {/* Left Half - Delete Button */}
              <Pressable
                style={({ pressed }) => [
                  {
                    flex: 1,
                    backgroundColor: "#ff4444",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                    opacity: pressed ? 0.8 : 1,
                  }
                ]}
                onPress={handleDelete}
              >
                <Ionicons name="trash" size={24} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600", marginTop: 4 }}>Delete</Text>
              </Pressable>

              {/* Right Half - Complete/Set Active Button */}
              {!isCompleted ? (
                <Pressable
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      backgroundColor: "#4CAF50",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                      opacity: pressed ? 0.8 : 1,
                    }
                  ]}
                  onPress={() => {
                    hideDeleteOptionWithAnimation();
                    onComplete?.();
                  }}
                >
                  <Ionicons name="checkmark" size={24} color="#fff" />
                  <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600", marginTop: 4 }}>Complete</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      backgroundColor: "#2196F3",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                      opacity: pressed ? 0.8 : 1,
                    }
                  ]}
                  onPress={() => {
                    hideDeleteOptionWithAnimation();
                    onSetActive?.();
                  }}
                >
                  <Ionicons name="refresh" size={24} color="#fff" />
                  <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600", marginTop: 4 }}>Set Active</Text>
                </Pressable>
              )}
            </View>
          </View>
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
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  // Check if milestone content has changed efficiently
  const milestoneChanged = !prevProps.milestone || !nextProps.milestone ||
    prevProps.milestone.id !== nextProps.milestone.id ||
    prevProps.milestone.title !== nextProps.milestone.title ||
    prevProps.milestone.completed !== nextProps.milestone.completed ||
    prevProps.milestone.startDate !== nextProps.milestone.startDate ||
    prevProps.milestone.endDate !== nextProps.milestone.endDate;
  
  return (
    !milestoneChanged &&
    prevProps.isLatest === nextProps.isLatest &&
    prevProps.isCompleted === nextProps.isCompleted
  );
});

export default MileStone;

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    marginHorizontal: 28,
  },
  milestoneItemClickable: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    minHeight: 40,
    justifyContent: 'flex-start',
    backgroundColor: "rgba(0, 122, 255, 0.04)", // Çok hafif mavi arka plan
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
  milestoneText: {
    fontFamily: FONTS.MEDIUM,
    fontSize: 14,
    color: "#1D1D1F", // Apple'ın koyu gri rengi
    lineHeight: 20,
    letterSpacing: -0.1,
    paddingRight: 50, // Edit tuşu için boşluk
  },
  completedText: {
    color: "#888", // Daha soluk renk completed milestone'lar için
  },
  dateRow: { 
    flexDirection: "row", 
    alignItems: "center",
    marginTop: 4,
  },
  timerIcon: { marginRight: 4 },
  daysText: {
    color: "#666",
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
    borderRadius: 12,
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
    borderRadius: 20,
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
    borderRadius: 18,
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
    borderRadius: 20,
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
    color: "#545454",
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
};
