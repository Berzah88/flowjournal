import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Animated, Alert, TouchableWithoutFeedback, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FlashCalendar from "./FlashCalendar";
import PropTypes from "prop-types";

function MileStone({
  milestone,
  onUpdate,
  onComplete,
  onOpenDetail,
  onDelete,
  onSetActive,
  isLatest = false,
  isCompleted = false,
  wasEdited = false,
  onEditToggle,
}) {
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
    !isCompleted && !(milestone.initialized ?? (title && title.trim() !== ""))
  );
  const [showDeleteOption, setShowDeleteOption] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const inputRef = useRef(null);
  const deleteAnimation = useRef(new Animated.Value(0)).current;

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
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [deleteAnimation]);

  const hideDeleteOptionWithAnimation = useCallback(() => {
    Animated.timing(deleteAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowDeleteOption(false);
    });
  }, [deleteAnimation]);

  const handleLongPress = useCallback(() => {
    if (!editable) {
      showDeleteOptionWithAnimation();
    }
  }, [editable, showDeleteOptionWithAnimation]);

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
    const newEditingState = !isEditing;
    setIsEditing(newEditingState);
    
    // Notify parent about edit state change
    onEditToggle?.(newEditingState);
    
    // Focus the input when entering edit mode
    if (newEditingState) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isEditing, onEditToggle]);

  const handleCreateMilestone = useCallback(() => {
    if (!title.trim()) {
      return;
    }
    setEditable(false);
    milestone.initialized = true;
    onUpdate?.({
      title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    // Dismiss keyboard after milestone creation
    Keyboard.dismiss();
  }, [title, startDate, endDate, onUpdate, milestone]);

  const handleEndEditing = useCallback(() => {
    if (!title.trim()) {
      return;
    }
    setIsEditing(false); // Exit edit mode
    onEditToggle?.(false); // Notify parent - this will trigger wasEdited flag
    onUpdate?.({
      title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    Keyboard.dismiss();
  }, [title, startDate, endDate, onUpdate, onEditToggle]);

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

  // Renk düzeni
  let bgColor = "#d3cbe3"; // Varsayılan renk
  if (isCompleted) bgColor = "#BFBFBF"; // Tamamlanmış milestone
  else if (wasEdited) bgColor = "#E8B4B8"; // Edit edilmiş milestone - soft pembe
  else if (isLatest) bgColor = "#c2d7d0"; // En son eklenen milestone

  return (
    <>
      <TouchableWithoutFeedback onPress={() => {
        if (isEditing) {
          setIsEditing(false);
          onEditToggle?.(false);
        }
      }}>
        <View style={[styles.container, { backgroundColor: bgColor }]}>
        <TouchableOpacity
          style={styles.cardContent}
          activeOpacity={0.9}
          disabled={editable}
          onPress={() => {
            if (!editable && onOpenDetail && !showDeleteOption) {
              onOpenDetail();
            }
          }}
          onLongPress={handleLongPress}
          delayLongPress={500}
        >
          {/* Edit Button - Top Right Corner */}
          {!editable && !isCompleted && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditToggle}
              activeOpacity={0.7}
            >
              <Text style={[styles.editButtonText, { color: "#545454" }]}>Edit</Text>
            </TouchableOpacity>
          )}
          <View style={styles.iconWrapper}>
            <Image source={require("../assets/yourDateVisual.png")} style={styles.icon} />
          </View>

          <View style={styles.body}>
            <TextInput
              ref={inputRef}
              style={styles.titleInput}
              value={title}
              placeholder="Milestone title"
              onChangeText={setTitle}
              editable={editable || isEditing}
              onSubmitEditing={editable ? handleCreateMilestone : handleEndEditing}
              returnKeyType="done"
              blurOnSubmit={true}
              multiline={true}
            />

            <TouchableOpacity
              style={styles.dateRow}
              onPress={() => !isCompleted && isEditing && setCalendarVisible(true)}
            >
              <Ionicons name="calendar-outline" size={16} color="#666" style={styles.timerIcon} />
              <Text style={styles.daysText}>{getDaysText()}</Text>
              {isEditing && <Ionicons name="chevron-down" size={18} color="#555" />}
            </TouchableOpacity>

            {/* Create Button - Top Right Corner (same position as Edit button) */}
            {editable && title.trim() && (
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateMilestone}
                activeOpacity={0.7}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            )}
          </View>

        </TouchableOpacity>

        {/* Action Options Overlay */}
        {showDeleteOption && (
          <TouchableWithoutFeedback onPress={hideDeleteOptionWithAnimation}>
            <Animated.View
              style={[
                styles.actionOverlay,
                {
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
              {/* Close Button - Top Right Corner */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={hideDeleteOptionWithAnimation}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color="#666" />
              </TouchableOpacity>

              <TouchableWithoutFeedback>
                <View style={styles.splitActionCard}>
                  {/* Left Half - Delete Button */}
                  <TouchableOpacity
                    style={styles.deleteHalf}
                    onPress={handleDelete}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash" size={24} color="#fff" />
                    <Text style={styles.splitButtonText}>Delete</Text>
                  </TouchableOpacity>

                  {/* Right Half - Complete/Set Active Button */}
                  {!isCompleted ? (
                    <TouchableOpacity
                      style={styles.completeHalf}
                      onPress={() => {
                        hideDeleteOptionWithAnimation();
                        onComplete?.();
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark" size={24} color="#fff" />
                      <Text style={styles.splitButtonText}>Complete</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.completeHalf}
                      onPress={() => {
                        hideDeleteOptionWithAnimation();
                        onSetActive?.();
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="refresh" size={24} color="#fff" />
                      <Text style={styles.splitButtonText}>Set Active</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </TouchableWithoutFeedback>
        )}
        </View>
      </TouchableWithoutFeedback>
    
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

export default React.memo(MileStone);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    marginBottom: 12,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
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
  icon: { width: 24, height: 24 },
  body: { flex: 1, paddingVertical: 4 },
  titleInput: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    marginBottom: 8,
    lineHeight: 20,
    color: "#1a1a1a",
    flexWrap: "wrap",
    paddingRight: 50, // Edit tuşu için boşluk (12px button + 12px padding + 5px margin + 21px text width)
  },
  dateRow: { 
    flexDirection: "row", 
    alignItems: "center",
    marginTop: 4,
  },
  timerIcon: { marginRight: 6 },
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
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  createButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#545454",
  },
  editButton: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: "#545454",
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
    wasEdited: PropTypes.bool,
  }).isRequired,
  onUpdate: PropTypes.func,
  onComplete: PropTypes.func,
  onOpenDetail: PropTypes.func,
  onDelete: PropTypes.func,
  onSetActive: PropTypes.func,
  isLatest: PropTypes.bool,
  isCompleted: PropTypes.bool,
  wasEdited: PropTypes.bool,
  onEditToggle: PropTypes.func,
};

MileStone.defaultProps = {
  onUpdate: null,
  onComplete: null,
  onOpenDetail: null,
  onDelete: null,
  onSetActive: null,
  isLatest: false,
  isCompleted: false,
  wasEdited: false,
  onEditToggle: null,
};
