import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FlashCalendar from "./FlashCalendar";
import PropTypes from "prop-types";

function MileStone({
  milestone,
  onUpdate,
  onComplete,
  onOpenDetail,
  isLatest = false,
  isCompleted = false,
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
  const [editable, setEditable] = useState(!isCompleted && !(milestone.initialized ?? (title && title.trim() !== "")));

  const inputRef = useRef(null);

  useEffect(() => {
    if (editable) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [editable]);

  const handleEndEditing = useCallback(() => {
    if (!title.trim()) {
      // If title is empty, just keep editing
      return;
    }
    setEditable(false);
    milestone.initialized = true;
    onUpdate?.({
      title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  }, [title, startDate, endDate, onUpdate, milestone]);

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
  let bgColor = "#d3cbe3";
  if (isLatest) bgColor = "#c2d7d0";
  if (isCompleted) bgColor = "#BFBFBF";



  return (
    <View>
        <View style={[styles.container, { backgroundColor: bgColor }]}>
          <TouchableOpacity
            style={styles.cardContent}
            activeOpacity={0.9}
            disabled={editable}
            onPress={() => {
              if (!editable && onOpenDetail) {
                onOpenDetail();
              }
            }}
          >
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
                editable={editable}
                multiline
                onSubmitEditing={handleEndEditing}
                onBlur={handleEndEditing}
              />

              <TouchableOpacity
                style={styles.dateRow}
                onPress={() => !isCompleted && setCalendarVisible(true)}
              >
                <Image source={require("../assets/Timer.png")} style={styles.timerIcon} />
                <Text style={styles.daysText}>{getDaysText()}</Text>
                <Ionicons name="chevron-down" size={18} color="#555" />
              </TouchableOpacity>
            </View>

            {!isCompleted && !editable && (
              <TouchableOpacity onPress={() => onComplete?.()} style={styles.completeBtn}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Complete</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

      <FlashCalendar
        visible={calendarVisible}
        initialStart={startDate}
        initialEnd={endDate}
        onConfirm={handleCalendarConfirm}
        onCancel={() => setCalendarVisible(false)}
        minDate={new Date()}
      />
    </View>
  );
}

export default React.memo(MileStone);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    marginBottom: 10,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    flex: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#BAB0F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    elevation: 2,
  },
  icon: { width: 35, height: 35 },
  body: { flex: 1 },
  titleInput: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    marginBottom: 4,
  },
  dateRow: { flexDirection: "row", alignItems: "center" },
  timerIcon: { width: 16, height: 16, marginRight: 6 },
  daysText: {
    color: "#444",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginRight: 4,
  },
  completeBtn: {
    marginLeft: 8,
    backgroundColor: "#545454",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
});

// PropTypes validation
MileStone.propTypes = {
  milestone: PropTypes.shape({
    id: PropTypes.number,
    title: PropTypes.string,
    completed: PropTypes.bool,
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    initialized: PropTypes.bool,
  }).isRequired,
  onUpdate: PropTypes.func,
  onComplete: PropTypes.func,
  onOpenDetail: PropTypes.func,
  isLatest: PropTypes.bool,
  isCompleted: PropTypes.bool,
};

MileStone.defaultProps = {
  onUpdate: null,
  onComplete: null,
  onOpenDetail: null,
  isLatest: false,
  isCompleted: false,
};
